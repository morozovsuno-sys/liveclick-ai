import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600 rounded-full opacity-20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full opacity-15 blur-[120px] animate-pulse" style={{animationDelay:'1s'}} />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-pink-600 rounded-full opacity-10 blur-[120px] animate-pulse" style={{animationDelay:'2s'}} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold">
            L
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">LiveClic</span><span className="text-purple-400"> AI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <Link href="#features" className="hover:text-white transition-colors">Возможности</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Тарифы</Link>
          <Link href="#how" className="hover:text-white transition-colors">Как работает</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
            Войти
          </Link>
          <Link href="/auth/register" className="text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-2 rounded-full font-medium transition-all shadow-lg shadow-purple-500/25">
            Попробовать
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          Mel-Band RoFormer 2024 · Обработка 40–120 сек
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
          <span className="block text-white">Раздели трек</span>
          <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            на 6 стемов
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/50 max-w-xl mb-10 leading-relaxed">
          Загрузи аудио — получи вокал, барабаны, бас, гитару, пианино и click track за пару минут. ИИ-модель уровня студии.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/auth/register" className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5">
            Начать бесплатно
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
          <Link href="/pricing" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all backdrop-blur-sm">
            Тарифы
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-center">
          {[['40–120с', 'Время обработки'],['6', 'Стемов на выходе'],['BPM', 'Click track'],['4K+', 'Треков обработано']].map(([val, label]) => (
            <div key={label}>
              <div className="text-3xl font-black text-white">{val}</div>
              <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-center text-3xl md:text-4xl font-bold mb-4 text-white">
          Всё что нужно музыканту
        </h2>
        <p className="text-center text-white/40 mb-16">Профессиональные инструменты, доступные каждому</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🎸', title: '6 стемов', desc: 'Vocals, drums, bass, guitar, piano, other — модель Mel-Band RoFormer 2024', color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20' },
            { icon: '🥁', title: 'Click Track', desc: 'Автоматический click track с BPM и beat grid для живых выступлений', color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/20' },
            { icon: '📺', title: 'RuTube экспорт', desc: 'Публикуй результаты прямо на RuTube из личного кабинета', color: 'from-pink-500/20 to-pink-500/5', border: 'border-pink-500/20' },
            { icon: '⚡', title: 'Быстро', desc: 'От 40 секунд до 2 минут на трек благодаря GPU-ускорению', color: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/20' },
            { icon: '🔒', title: 'Безопасно', desc: 'Файлы хранятся зашифрованными и удаляются по запросу', color: 'from-green-500/20 to-green-500/5', border: 'border-green-500/20' },
            { icon: '💳', title: 'ЮКасса', desc: 'Оплата через ЮКассу — карты РФ, СБП, кошельки', color: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/20' },
          ].map((f) => (
            <div key={f.title} className={`relative group p-6 rounded-2xl bg-gradient-to-br ${f.color} border ${f.border} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}>
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-center text-3xl md:text-4xl font-bold mb-4 text-white">Как это работает</h2>
        <p className="text-center text-white/40 mb-16">Три простых шага до готового результата</p>
        <div className="flex flex-col md:flex-row gap-8">
          {[['01', 'Загрузи трек', 'MP3, WAV, FLAC до 100MB. Drag & drop или выбери файл.'],
            ['02', 'ИИ обрабатывает', 'Mel-Band RoFormer разделяет аудио на стемы за 40–120 секунд.'],
            ['03', 'Скачай результат', 'ZIP с 6 стемами + click track. Экспорт в RuTube по желанию.'],
          ].map(([num, title, desc]) => (
            <div key={num} className="flex-1 relative">
              <div className="text-7xl font-black text-white/5 mb-4">{num}</div>
              <h3 className="text-xl font-bold text-white mb-2 -mt-8">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 backdrop-blur-sm">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Готов попробовать?</h2>
          <p className="text-white/50 mb-8">Первые 3 трека бесплатно. Без кредитки.</p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl shadow-purple-500/30">
            Начать бесплатно
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">L</div>
          <span>LiveClic AI © 2026</span>
        </div>
        <div className="flex gap-6">
          <Link href="/pricing" className="hover:text-white/60 transition-colors">Тарифы</Link>
          <Link href="/auth/login" className="hover:text-white/60 transition-colors">Войти</Link>
        </div>
      </footer>
    </div>
  );
}
