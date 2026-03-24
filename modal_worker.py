"""LiveClick AI — Modal GPU Worker
Mel-Band RoFormer 2024.10 + htdemucs_6s hybrid pipeline
"""
import modal
import os
import sys
import uuid
import tempfile
from pathlib import Path

app = modal.App("liveclick-ai")

# GPU image with all ML dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "curl")
    .pip_install(
        "torch==2.4.1",
        "torchaudio==2.4.1",
        "demucs==4.0.1",
        "soundfile==0.12.1",
        "librosa==0.10.2",
        "pydub==0.25.1",
        "numpy==1.26.4",
        "resampy==0.4.3",
        "huggingface-hub==0.24.6",
        "boto3==1.35.0",
        "PyYAML==6.0.2",
    )
    .run_commands(
        "git clone https://github.com/ZFTurbo/Music-Source-Separation-Training /app/mss"
    )
)

# Persistent volume for model weights cache
weights_volume = modal.Volume.from_name("liveclick-weights", create_if_missing=True)


@app.function(
    image=image,
    gpu="A10G",
    memory=16384,
    timeout=1800,
    volumes={"/weights": weights_volume},
    secrets=[modal.Secret.from_name("liveclick-secrets")],
)
def process_track(audio_bytes: bytes, job_id: str, mode: str = "premium") -> dict:
    """Main GPU function: MBR + Demucs hybrid separation + BPM + click"""
    import torch
    import torchaudio
    import soundfile as sf
    import librosa
    import numpy as np
    import boto3
    import yaml
    import json
    from pydub import AudioSegment
    from pydub.generators import Sine

    sys.path.insert(0, "/app/mss")

    # Write input to temp file
    tmp_dir = Path(f"/tmp/{job_id}")
    tmp_dir.mkdir(exist_ok=True)
    input_path = tmp_dir / "input.wav"
    input_path.write_bytes(audio_bytes)

    results = {}

    # ===== STEP 1: MBR Vocals (premium mode only) =====
    mbr_vocals_path = None
    if mode == "premium":
        try:
            mbr_vocals_path = _separate_mbr_vocals(
                str(input_path), str(tmp_dir)
            )
            results["mbr_used"] = True
        except Exception as e:
            print(f"MBR failed, falling back to Demucs: {e}")
            results["mbr_used"] = False

    # ===== STEP 2: htdemucs_6s on original mix =====
    demucs_stems = _separate_demucs(
        str(input_path), str(tmp_dir)
    )

    # ===== STEP 3: Combine stems =====
    final_stems = demucs_stems.copy()
    if mbr_vocals_path:
        final_stems["vocals"] = mbr_vocals_path  # Replace with MBR quality vocals

    # ===== STEP 4: BPM Detection =====
    drums_path = final_stems.get("drums", str(input_path))
    bpm = _detect_bpm(drums_path)
    results["bpm"] = round(bpm, 1)

    # ===== STEP 5: Generate click track =====
    click_path = str(tmp_dir / "click.wav")
    _generate_click(drums_path, click_path, bpm)
    final_stems["click"] = click_path

    # ===== STEP 6: Upload to R2 =====
    stem_urls = _upload_to_r2(final_stems, job_id)
    results["stems"] = {k: v for k, v in stem_urls.items() if k != "click"}
    results["click_track_url"] = stem_urls.get("click")

    return results

def _separate_mbr_vocals(input_path: str, output_dir: str) -> str:
    """Mel-Band RoFormer separation — vocals only"""
    import torch
    import soundfile as sf
    import numpy as np
    from huggingface_hub import hf_hub_download
    import yaml

    # Download weights if not cached
    weights_cache = Path("/weights/mbr_2024_10.ckpt")
    config_cache = Path("/weights/mbr_config.yaml")

    if not weights_cache.exists():
        ckpt = hf_hub_download(
            repo_id="pcunwa/Kim-Mel-Band-Roformer-FT",
            filename="model.ckpt",
            cache_dir="/weights",
        )
        import shutil
        shutil.copy(ckpt, weights_cache)

    if not config_cache.exists():
        cfg = hf_hub_download(
            repo_id="pcunwa/Kim-Mel-Band-Roformer-FT",
            filename="config.yaml",
            cache_dir="/weights",
        )
        shutil.copy(cfg, config_cache)

    sys.path.insert(0, "/app/mss")
    from models.mel_band_roformer import MelBandRoformer

    with open(config_cache) as f:
        cfg = yaml.safe_load(f)

    model = MelBandRoformer(**cfg["model"])
    state = torch.load(weights_cache, map_location="cpu")
    if "state_dict" in state:
        state = state["state_dict"]
    model.load_state_dict(state, strict=False)
    model.eval().cuda() if torch.cuda.is_available() else model.eval()

    audio, sr = sf.read(input_path, dtype="float32", always_2d=True)
    audio = audio.T  # (C, T)
    if sr != 44100:
        import resampy
        audio = resampy.resample(audio, sr, 44100, axis=-1)
    if audio.shape[0] == 1:
        audio = np.concatenate([audio, audio], axis=0)

    chunk_size = 485100
    num_overlap = 4
    step = chunk_size // num_overlap
    mix = torch.tensor(audio, dtype=torch.float32).unsqueeze(0)
    if torch.cuda.is_available():
        mix = mix.cuda()

    B, C, T = mix.shape
    vocals_out = torch.zeros(C, T, device=mix.device)
    weights = torch.zeros(T, device=mix.device)
    hann_win = torch.hann_window(chunk_size, device=mix.device)

    with torch.no_grad():
        for start in range(0, T, step):
            end = min(start + chunk_size, T)
            chunk = mix[:, :, start:end]
            if chunk.shape[-1] < chunk_size:
                pad = torch.zeros(B, C, chunk_size - chunk.shape[-1], device=mix.device)
                chunk = torch.cat([chunk, pad], dim=-1)
            pred = model(chunk)  # (B, 2, C, chunk_size) — vocals + other
            length = end - start
            vocals_out[:, start:end] += pred[0, 0, :, :length] * hann_win[:length]
            weights[start:end] += hann_win[:length]

    weights = weights.clamp(min=1e-8)
    vocals_out = vocals_out / weights.unsqueeze(0)

    out_path = str(Path(output_dir) / "vocals_mbr.wav")
    sf.write(out_path, vocals_out.cpu().numpy().T, 44100)
    return out_path


def _separate_demucs(input_path: str, output_dir: str) -> dict[str, str]:
    """htdemucs_6s separation on original mix"""
    import demucs.separate
    demucs.separate.main([
        "--two-stems=vocals",  # fast mode splits only vocals/no-vocals
        "-n", "htdemucs_6s",
        "-o", output_dir,
        "--mp3",
        input_path,
    ])
    # With 6s model: drums, bass, guitar, piano, vocals, other
    stem_names = ["drums", "bass", "guitar", "piano", "vocals", "other"]
    stems = {}
    for name in stem_names:
        # Demucs output path structure
        p = list(Path(output_dir).rglob(f"{name}.wav"))
        if p:
            stems[name] = str(p[0])
    return stems


def _detect_bpm(audio_path: str) -> float:
    """Multi-window BPM detection with median consensus"""
    import librosa
    import numpy as np
    y, sr = librosa.load(audio_path, mono=True, duration=60)
    bpms = []
    for hop in [256, 512, 1024]:
        bpm, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, trim=False)
        bpms.append(float(bpm))
    return float(np.median(bpms))


def _generate_click(drums_path: str, output_path: str, bpm: float) -> None:
    """Generate synced click track with 4-bar count-in"""
    import librosa
    import numpy as np
    import soundfile as sf
    from pydub import AudioSegment
    from pydub.generators import Sine

    y, sr = librosa.load(drums_path, mono=True, duration=120)
    _, beat_frames = librosa.beat.beat_track(y=y, sr=sr, bpm=bpm, trim=False)
    first_beat_ms = int(beat_frames[0] / sr * 1000) if len(beat_frames) > 0 else 0

    # Beat interval in ms
    beat_ms = int(60000 / bpm)
    total_ms = int(len(y) / sr * 1000)

    # Generate click sounds
    hi = Sine(880).to_audio_segment(duration=50).apply_gain(-10)   # downbeat
    lo = Sine(660).to_audio_segment(duration=50).apply_gain(-12)   # beat

    # Count-in (4 beats before first beat)
    countin_start = first_beat_ms - 4 * beat_ms
    click_track = AudioSegment.silent(duration=total_ms + 4 * beat_ms)

    t = max(0, countin_start)
    beat_num = 0
    while t < len(click_track):
        click = hi if beat_num % 4 == 0 else lo
        click_track = click_track.overlay(click, position=t)
        t += beat_ms
        beat_num += 1

    click_track.export(output_path, format="wav")


def _upload_to_r2(stems: dict[str, str], job_id: str) -> dict[str, str]:
    """Upload all stems to Cloudflare R2"""
    r2 = boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT"],
        aws_access_key_id=os.environ["R2_KEY"],
        aws_secret_access_key=os.environ["R2_SECRET"],
    )
    bucket = os.environ.get("R2_BUCKET", "liveclick-stems")
    public_url = os.environ.get("R2_PUBLIC_URL", "")
    urls = {}

    for stem_name, file_path in stems.items():
        if not Path(file_path).exists():
            continue
        key = f"stems/{job_id}/{stem_name}.wav"
        r2.upload_file(file_path, bucket, key, ExtraArgs={"ContentType": "audio/wav"})
        urls[stem_name] = f"{public_url}/{key}" if public_url else key

    return urls


@app.local_entrypoint()
def test_local():
    """Test with a local file: modal run modal_worker.py"""
    test_file = Path("test.mp3")
    if not test_file.exists():
        print("Put test.mp3 in current directory")
        return
    audio_bytes = test_file.read_bytes()
    result = process_track.remote(audio_bytes, "test-job-001", "premium")
    print("Result:", result)
