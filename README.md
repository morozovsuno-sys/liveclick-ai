# LiveClick AI

> AI-powered stem splitter + click track generator for live bands
> Российский рынок | YooKassa | RuTube

## Что это

**LiveClick AI** — SaaS-сервис для музыкантов. Загрузи любой трек → AI за 40–120 секунд:

- Разделяет на 6 стемов (vocals, drums, bass, guitar, piano, other)
- Определяет BPM и beat grid
- Генерирует синхронизированный клик-трек
- Онлайн микшер стемов
- Экспорт: Stereo L/R + ZIP multitrack

## Тех стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 15, Tailwind, shadcn/ui, wavesurfer.js |
| Backend | FastAPI, Celery, Redis |
| ML | Mel-Band RoFormer 2024.10 + htdemucs_6s |
| GPU Inference | Modal.com (A10G) |
| БД / Auth | Supabase (PostgreSQL + Auth) |
| Хранилище | Cloudflare R2 |
| Оплата | ЮKassa (МИР, СБП, СберПей) |
| Деплой | Railway (backend) + Vercel (frontend) |

## Быстрый старт

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install
npm run dev

# Modal worker
modal deploy modal_worker.py
```

## Тарифы

| План | Цена | Лимит |
|---|---|---|
| Free | 0 ₽ | 3 трека/мес |
| Pro | 149 ₽/мес | 50 треков |
| Studio | 499 ₽/мес | Unlimited + API |

## Лицензия

MIT
