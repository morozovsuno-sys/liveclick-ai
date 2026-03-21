import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'LiveClick AI — AI Stem Splitter для музыкантов',
  description: 'Разделяй треки на стемы, получай click track и BPM за 40-120 секунд. YooKassa, RuTube.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
