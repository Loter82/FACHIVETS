# Unipro CRM

SaaS-розширення для існуючих інсталяцій **Unipro ERP** (оптові/роздрібні магазини будматеріалів).
CRM + сегментація + маркетинг-автоматизація + аналітика. **Жодного запису в БД Unipro** — лише читання або JSON-синхронізація.

> Повна архітектура: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Стек

- **Backend:** NestJS · TypeScript · Prisma · PostgreSQL · JWT (+ refresh) · BullMQ (наступні етапи)
- **Frontend:** React · Vite · TypeScript · TailwindCSS · DaisyUI · TanStack Query
- **Інфра:** Docker · pnpm workspaces · GitHub Actions

---

## Структура

```
apps/
  api/                 NestJS API
  web/                 React + Vite
packages/
  shared-types/        DTO-контракти між api і web
  tsconfig/            Базові tsconfig
  eslint-config/       ESLint-пресети
infra/
  docker-compose.yml   Postgres + Redis + Mailhog
docs/
  ARCHITECTURE.md      Архітектурна специфікація
```

---

## Швидкий старт (Windows / PowerShell)

### 1. Передумови

- Node.js **20.11+**
- pnpm **9+** (`corepack enable; corepack prepare pnpm@9.12.0 --activate`)
- Docker Desktop

### 2. Встановлення

```powershell
pnpm install
```

### 3. Запуск інфраструктури (Postgres, Redis, Mailhog)

```powershell
pnpm docker:up
```

### 4. Налаштування API

```powershell
Copy-Item apps\api\.env.example apps\api\.env
cd apps\api
pnpm prisma migrate dev --name init
pnpm prisma:seed
cd ..\..
```

Сід створює демо-тенант і власника:
- email: `owner@demo.local`
- пароль: `Admin1234!`

### 5. Налаштування Web

```powershell
Copy-Item apps\web\.env.example apps\web\.env
```

### 6. Розробка (одночасно api + web)

```powershell
pnpm dev
```

- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api/v1/docs
- Web: http://localhost:5173
- Mailhog UI: http://localhost:8025

---

## Скрипти

| Команда | Опис |
|---|---|
| `pnpm dev` | Запустити api і web одночасно |
| `pnpm build` | Зібрати всі пакети |
| `pnpm typecheck` | TS-перевірка по всіх пакетах |
| `pnpm lint` | ESLint по всіх пакетах |
| `pnpm test` | Тести |
| `pnpm format` | Prettier |
| `pnpm docker:up` / `:down` / `:logs` | Локальна інфра |

API-специфічні (з кореня — через `pnpm --filter @unipro-crm/api ...`):

| Команда | Опис |
|---|---|
| `prisma:migrate` | Створити/застосувати міграцію (dev) |
| `prisma:migrate:deploy` | Деплой міграцій (prod) |
| `prisma:generate` | Згенерувати Prisma Client |
| `prisma:studio` | Prisma Studio |
| `prisma:seed` | Засіяти демо-дані |

---

## Дорожня карта

Дивіться розділ **9. Дорожня карта розробки** у [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Зараз завершено **Етап 0 — Фундамент**. Наступний: **Етап 1 — Синхронізація з Unipro (MSSQL read-only)**.
