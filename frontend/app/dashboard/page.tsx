'use client'

export const dynamic = 'force-dynamic';
import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function DashboardPage() {
  const [uploading, setUploading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'profile'>('upload')
  const supabase = createClientComponentClient()
  const router = useRouter()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post(`${API_URL}/api/split`, formData, {
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'multipart/form-data' }
      })
      setJobId(res.data.job_id)
      pollStatus(res.data.job_id, session?.access_token)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки')
    }
    setUploading(false)
  }, [supabase])

  const pollStatus = async (id: string, token?: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setJobStatus(res.data)
        if (res.data.status === 'done' || res.data.status === 'failed') {
          clearInterval(interval)
        }
      } catch (err) {
        clearInterval(interval)
      }
    }, 3000)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a'] }, maxFiles: 1
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
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

      {/* Main content */}
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
              {uploading && <p className="text-purple-400 mt-4 animate-pulse">Загрузка...</p>}
            </div>

            {error && <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-xl">{error}</div>}

            {jobStatus && (
              <div className="mt-8 bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Статус обработки</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${
                    jobStatus.status === 'done' ? 'bg-green-400' : 
                    jobStatus.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
                  }`} />
                  <span className="text-gray-300 capitalize">{jobStatus.status}</span>
                </div>
                {jobStatus.status === 'done' && jobStatus.stems && (
                  <div>
                    <h3 className="text-white font-medium mb-3">Стемы:</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(jobStatus.stems).map(([stem, url]: [string, any]) => (
                        <a key={stem} href={url} download
                          className="flex items-center gap-2 bg-gray-700 rounded-lg px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-600 transition">
                          <span>↓</span>
                          <span className="capitalize">{stem}</span>
                        </a>
                      ))}
                    </div>
                    {jobStatus.bpm && (
                      <div className="mt-4 flex gap-4">
                        <div className="bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-2">
                          <span className="text-purple-300">🥁 BPM: {jobStatus.bpm}</span>
                        </div>
                        {jobStatus.click_track_url && (
                          <a href={jobStatus.click_track_url} download
                            className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-green-300 hover:text-green-200 transition">
                            ↓ Click Track
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Мои обработки</h1>
            <div className="text-gray-400">История загрузок будет здесь</div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Личный кабинет</h1>
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400">Тариф: </span>
                  <span className="text-purple-400 font-semibold">Про</span>
                </div>
                <div>
                  <span className="text-gray-400">Использовано: </span>
                  <span className="text-white">0 / 100 загрузок</span>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition">
                    Управлять подпиской
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
