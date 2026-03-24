import Link from 'next/link'

export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '0 ₽',
      period: '',
      tracks: '3 трека / мес',
      features: ['6 стемов', 'MP3 экспорт', 'Клик-трек'],
      cta: 'Начать бесплатно',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '149 ₽',
      period: '/мес',
      tracks: '50 треков / мес',
      features: ['6 стемов', 'FLAC экспорт', 'Клик-трек', 'Приоритет в очереди', 'История 90 дней'],
      cta: 'Выбрать Pro',
      highlight: true,
    },
    {
      name: 'Studio',
      price: '499 ₽',
      period: '/мес',
      tracks: 'Безлимит',
      features: ['6 стемов', 'FLAC/WAV', 'API доступ', 'Bulk upload', 'История навсегда', 'Email поддержка'],
      cta: 'Выбрать Studio',
      highlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <span className="font-bold">LiveClick AI</span>
        </Link>
        <Link href="/auth/login" className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition">
          Войти
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-20">
        <h1 className="text-5xl font-black text-center mb-4">Тарифы</h1>
        <p className="text-white/50 text-center mb-12">Оплата через ЮКасса · МИР · СБП · СберПей</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-8 border relative ${
                p.highlight
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                  🔥 Популярный
                </span>
              )}
              <h2 className="font-bold text-xl mb-1">{p.name}</h2>
              <div className="text-4xl font-black mb-1">
                {p.price}
                <span className="text-lg text-white/50">{p.period}</span>
              </div>
              <p className="text-white/50 text-sm mb-6">{p.tracks}</p>
              <ul className="space-y-2 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="text-white/70 text-sm flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className={`block text-center py-3 rounded-xl font-bold transition ${
                  p.highlight
                    ? 'bg-purple-500 hover:bg-purple-400 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-6">Частые вопросы</h2>
          <div className="grid md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
            {[
              { q: 'Что такое кредит?', a: '1 кредит = 1 трек. Списывается при начале обработки.' },
              { q: 'Как быстро обрабатывается трек?', a: '40–120 секунд для большинства треков до 5 минут.' },
              { q: 'Могу отменить подписку?', a: 'Да, в любой момент без штрафов.' },
              { q: 'Какие форматы поддерживаются?', a: 'MP3, WAV, FLAC, OGG, M4A, MP4 до 100 МБ.' },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="font-semibold mb-2">{q}</p>
                <p className="text-white/50 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-white/30 text-sm border-t border-white/5">
        © 2026 LiveClick AI · ЮКасса · Россия
      </footer>
    </div>
  )
}
