import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="text-xl font-bold text-white">LiveClick AI</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/auth/login" className="text-gray-300 hover:text-white transition">
            Войти
          </Link>
          <Link href="/auth/register" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition">
            Попробовать
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          AI Stem Splitter<br />
          <span className="text-purple-400">для живых выступлений</span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Загрузи трек — получи 6 стемов, click track и BPM за 40-120 секунд.
          Mel-Band RoFormer 2024. Оплата через ЮKassa.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition">
            Начать бесплатно
          </Link>
          <Link href="#pricing" className="border border-purple-500 text-purple-300 hover:bg-purple-900/30 px-8 py-4 rounded-xl text-lg font-semibold transition">
            Тарифы
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '🎸', title: '6 стемов', desc: 'Vocals, drums, bass, guitar, piano, other — модель Mel-Band RoFormer 2024' },
            { icon: '🥁', title: 'Click Track', desc: 'Автоматический click track с BPM и beat grid для живых выступлений' },
            { icon: '📹', title: 'RuTube экспорт', desc: 'Публикуй результаты прямо на RuTube из личного кабинета' },
          ].map((f) => (
            <div key={f.title} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center text-white mb-12">Тарифы</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Старт', price: '0', desc: '3 трека/мес бесплатно', features: ['3 загрузки', '6 стемов', 'MP3 качество'] },
            { name: 'Про', price: '990', desc: 'В месяц', features: ['100 загрузок', '6 стемов', 'WAV качество', 'Click track', 'BPM анализ'], popular: true },
            { name: 'Студия', price: '2990', desc: 'В месяц', features: ['Безлимит', '6 стемов', 'WAV 48kHz', 'Click track', 'RuTube экспорт', 'API доступ'] },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-8 border ${
              plan.popular ? 'bg-purple-900/50 border-purple-500' : 'bg-gray-800/50 border-gray-700'
            }`}>
              {plan.popular && <div className="text-purple-300 text-sm font-semibold mb-2">ПОПУЛЯРНЫЙ</div>}
              <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              <div className="text-4xl font-bold text-white my-4">
                {plan.price === '0' ? 'Бесплатно' : `${plan.price}₽`}
                {plan.price !== '0' && <span className="text-lg font-normal text-gray-400">/мес</span>}
              </div>
              <ul className="space-y-2 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className={`block text-center py-3 rounded-lg font-semibold transition ${
                plan.popular ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}>
                Выбрать
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-gray-500 border-t border-gray-800">
        <p>© 2024 LiveClick AI. Оплата через ЮKassa. Поддержка: support@liveclick.ai</p>
      </footer>
    </main>
  )
}
