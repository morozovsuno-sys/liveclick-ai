'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })

    if (error) {
      setError(error.message)
    } else if (data?.user?.identities?.length === 0) {
      setError('Аккаунт с таким email уже существует')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700 text-center">
          <span className="text-4xl">✉️</span>
          <h1 className="text-2xl font-bold text-white mt-4">Подтвердите email</h1>
          <p className="text-gray-400 mt-2">
            Мы отправили письмо на <strong className="text-white">{email}</strong>.<br />
            Перейдите по ссылке в письме для активации аккаунта.
          </p>
          <Link href="/auth/login" className="mt-6 inline-block text-purple-400 hover:text-purple-300">
            Вернуться к входу
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <span className="text-4xl">🎵</span>
          <h1 className="text-2xl font-bold text-white mt-2">Регистрация в LiveClick AI</h1>
          <p className="text-gray-400 mt-1">3 трека бесплатно</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Имя</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-purple-500" required />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-purple-500" required />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:border-purple-500" required minLength={6} />
            <p className="text-gray-500 text-xs mt-1">Минимум 6 символов</p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
            {loading ? 'Регистрирую...' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="text-center text-gray-400 mt-6">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-purple-400 hover:text-purple-300">Войти</Link>
        </p>
      </div>
    </div>
  )
}
