import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://liveclick-ai-production.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

export async function uploadTrack(file: File, token: string) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/v1/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJobs(token: string) {
  const res = await fetch(`${API_URL}/api/v1/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJob(jobId: string, token: string) {
  const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function createSSEConnection(
  jobId: string,
  token: string,
  onProgress: (data: Record<string, unknown>) => void
) {
  const url = `${API_URL}/api/v1/sse/jobs/${jobId}?token=${token}`
  const es = new EventSource(url)
  es.onmessage = (e) => {
    try { onProgress(JSON.parse(e.data)) } catch {}
  }
  es.onerror = () => es.close()
  return es
}
