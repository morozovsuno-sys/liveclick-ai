'use client'
export const dynamic = 'force-dynamic'
import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://suno-prompt-saas-production.up.railway.app'

export default function DashboardPage() {
  const [uploading, setUploading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [stems, setStems] = useState<Record<string, string> | null>(null)
  const [clickTrackUrl, setClickTrackUrl] = useState<string | null>(null)
  const [bpm, setBpm] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'profile'>('upload')
  const [jobs, setJobs] = useState<any[]>([])
  const supabase = createClientComponentClient()
  const router = useRouter()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploading(true)
    setError('')
    setJobId(null)
    setJobStatus(null)
    setStems(null)
    setClickTrackUrl(null)
    setBpm(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Не авторизован')
        setUploading(false)
        return
      }
      const token = session.access_token
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${BACKEND_URL}/api/split`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.detail || 'Ошибка загрузки')
      } else {
        setJobId(json.job_id)
        setJobStatus('processing')
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    }
    setUploading(false)
  }, [supabase])

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/status`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        setJobStatus(json.status)
        if (json.status === 'completed') {
          setStems(json.stems)
          setClickTrackUrl(json.click_track_url)
          setBpm(json.bpm)
          clearInterval(interval)
        } else if (json.status === 'failed') {
          setError(json.error || 'Обработка завершилась с ошибкой')
          clearInterval(interval)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [jobId, jobStatus, supabase])

  // Load job history
  useEffect(() => {
    if (activeTab !== 'history') return
    const loadJobs = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${BACKEND_URL}/api/jobs/`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setJobs(Array.isArray(data) ? data : data.jobs || [])
      }
    }
    loadJobs()
  }, [activeTab, supabase])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a'] }, maxFiles: 1
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const stemLabels: Record<string, string> = {
    vocals: '🎤 Вокал',
    no_vocals: '🎸 Минус',
    drums: '🥁 Барабаны',
    bass: '🎸 Бас',
    other: '🎹 Другое',
    click: '🎯 Click Track',
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <span className="text-2xl">🎵</span>
          <span className="ml-2 text-lg font-bold text-white">LiveClick AI</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { key: 'upload', icon: '↑', label: 'Загрузить трек' },
            { key: 'history', icon: '📜', label: 'Мои обработки' },
            { key: 'profile', icon: '👤', label: 'Личный кабинет' },
          ].map((item) => (
            <button key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === item.key ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button onClick={handleLogout} className="w-full text-left text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        {activeTab === 'upload' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Загрузить трек</h1>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition ${
                isDragActive ? 'border-purple-400 bg-purple-900/20' : 'border-gray-600 hover:border-purple-500'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-xl text-gray-300 mb-2">
                {isDragActive ? 'Перетащите файл сюда' : 'Перетащите аудиофайл сюда'}
              </p>
              <p className="text-gray-500">MP3, WAV, FLAC, M4A • до 100 МБ</p>
              {uploading && <p className="text-purple-400 mt-4 animate-pulse">Загрузка на сервер...</p>}
            </div>
            {error && <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-xl">{error}</div>}
            {jobStatus === 'processing' && (
              <div className="mt-6 bg-gray-800 rounded-2xl p-6 border border-yellow-700">
                <p className="text-yellow-400 animate-pulse">⏳ Demucs обрабатывает трек... это может занять 2-5 минут</p>
                <p className="text-gray-400 text-sm mt-2">Job ID: {jobId}</p>
              </div>
            )}
            {jobStatus === 'completed' && stems && (
              <div className="mt-8 bg-gray-800 rounded-2xl p-6 border border-green-700">
                <h2 className="text-xl font-semibold text-white mb-4">✅ Готово! {bpm && <span className="text-purple-400">BPM: {bpm}</span>}</h2>
                <div className="space-y-3">
                  {Object.entries(stems).map(([name, url]) => (
                    <div key={name} className="flex items-center justify-between bg-gray-700 rounded-xl px-4 py-3">
                      <span className="text-white">{stemLabels[name] || name}</span>
                      <a href={url} download className="text-purple-400 hover:text-purple-300 text-sm font-medium">⬇ Скачать</a>
                    </div>
                  ))}
                  {clickTrackUrl && (
                    <div className="flex items-center justify-between bg-gray-700 rounded-xl px-4 py-3">
                      <span className="text-white">{stemLabels['click']}</span>
                      <a href={clickTrackUrl} download className="text-purple-400 hover:text-purple-300 text-sm font-medium">⬇ Скачать</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Мои обработки</h1>
            {jobs.length === 0 ? (
              <div className="text-gray-400">Обработок пока нет</div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job: any) => (
                  <div key={job.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm">{job.original_filename || job.id}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.status === 'completed' ? 'bg-green-900 text-green-400' :
                        job.status === 'failed' ? 'bg-red-900 text-red-400' :
                        'bg-yellow-900 text-yellow-400'
                      }`}>{job.status}</span>
                    </div>
                    {job.bpm && <p className="text-gray-400 text-sm mt-1">BPM: {job.bpm}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Личный кабинет</h1>
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400">Тариф: </span>
                  <span className="text-purple-400 font-semibold">Бесплатный</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
