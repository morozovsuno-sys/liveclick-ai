'use client'
export const dynamic = 'force-dynamic'
import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

export default function DashboardPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
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
      if (!session) {
        setError('Не авторизован')
        setUploading(false)
        return
      }
      const userId = session.user.id
      const fileName = `${userId}/${Date.now()}_${file.name}`
      const { data, error: uploadError } = await supabase.storage
        .from('tracks')
        .upload(fileName, file, { upsert: false })
      if (uploadError) {
        setError(uploadError.message)
      } else {
        setUploadedFile(data?.path || fileName)
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    }
    setUploading(false)
  }, [supabase])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a'] }, maxFiles: 1
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
              {uploading && <p className="text-purple-400 mt-4 animate-pulse">Загрузка...</p>}
            </div>
            {error && <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-xl">{error}</div>}
            {uploadedFile && (
              <div className="mt-8 bg-gray-800 rounded-2xl p-6 border border-green-700">
                <h2 className="text-xl font-semibold text-white mb-2">✅ Файл загружен</h2>
                <p className="text-green-400 text-sm break-all">{uploadedFile}</p>
                <p className="text-gray-400 mt-3">Трек принят в обработку. Результаты появятся в разделе "Мои обработки".</p>
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
