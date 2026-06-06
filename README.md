# backend-sanminimum

Бэкенд для выдачи и управления сертификатами «санминимум» (медицинские справки).
Врачи создают справки, администратор управляет врачами и отчётами, получатели
забирают сертификат через Telegram-бот; уведомления о выпуске и истечении срока
рассылаются по SMS.

## Стек

- **NestJS 10** (TypeScript)
- **Prisma 6** + PostgreSQL
- **Passport JWT** — аутентификация (роли `admin` / `doctor`)
- **nestjs-telegraf** — Telegram-бот выдачи сертификатов
- **Eskiz** — SMS-уведомления (Узбекистан)
- **canvas** — генерация изображения сертификата (Telegram-бот)
- **pdf-lib** + **@pdf-lib/fontkit** + **qrcode** — PDF-сертификат с кириллицей и QR
- **@nestjs/throttler** + **helmet** — rate-limit и security-заголовки

## Требования

- Node.js 18+
- PostgreSQL
- Системные библиотеки для `canvas` (нативная сборка):

  ```bash
  # macOS
  brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
  # Debian/Ubuntu
  sudo apt-get install build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev
  ```

## Переменные окружения

Создайте `.env` в корне проекта:

| Переменная | Назначение | Дефолт |
|------------|------------|--------|
| `DATABASE_URL` | строка подключения PostgreSQL | — (обязательна) |
| `JWT_SECRET` | секрет для подписи JWT | — (обязательна) |
| `TELEGRAM_BOT_TOKEN` | токен Telegram-бота | — (обязательна) |
| `ESKIZ_EMAIL` | логин Eskiz (SMS) | — (обязательна) |
| `ESKIZ_PASSWORD` | пароль Eskiz (SMS) | — (обязательна) |
| `TEMPLATE_PATH` | базовый путь к шаблонам сертификата | — (обязательна) |
| `DOMAIN` | домен для cookie refresh-токена | — |
| `CORS_ORIGIN` | разрешённые origin через запятую | `http://localhost:3000` |
| `PUBLIC_BASE_URL` | базовый URL для ссылки в QR-коде проверки | `http://localhost:4200` |
| `PORT` | порт HTTP-сервера | `4200` |
| `NODE_ENV` | `production` включает `secure` для cookie | — |

## Установка и запуск

```bash
yarn install
npx prisma generate
npx prisma migrate deploy      # применить миграции к БД

# разработка
yarn start:dev
# продакшн
yarn build && yarn start:prod
```

API доступен по префиксу `/api`, по умолчанию на `http://localhost:4200/api`.

## Создание администратора

Учётные данные передаются через окружение (в репозитории не хранятся):

```bash
ADMIN_LOGIN=<логин> ADMIN_PASSWORD=<надёжный_пароль> ADMIN_NAME="Имя" \
  npx ts-node src/admin/script.ts
```

## Основные эндпоинты

| Метод | Путь | Доступ | Назначение |
|-------|------|--------|------------|
| POST | `/api/auth/login` | публично (5 req/min) | вход, выдача токенов |
| POST | `/api/auth/login/access-token` | по refresh-cookie | обновление токенов |
| POST | `/api/auth/logout` | публично | выход |
| POST | `/api/auth/force-logout` | авторизация | сброс всех сессий |
| GET/PUT | `/api/doctor/profile` | doctor | профиль и статистика врача |
| POST | `/api/doctor/profile` | admin | создание врача |
| GET/POST/PUT/DELETE | `/api/reports` | doctor | CRUD справок (DELETE = архивация) |
| PATCH | `/api/reports/:id/archive\|restore` | doctor (владелец) | архив/восстановление |
| GET | `/api/reports/:id/pdf` | doctor (владелец) | PDF-сертификат с QR-кодом проверки |
| GET | `/api/admin/doctors` | admin | список врачей (`?page=&limit=`) |
| GET | `/api/admin/reports` | admin | отчёты (`?page=&limit=&sortBy=&order=`) |
| GET | `/api/admin/stats` | admin | статистика: врачи, активные/архивные, истекающие за 30 дней, просроченные, выданные за 30 дней |
| GET | `/api/certificate/verify/:certificateId` | публично (30 req/min) | проверка подлинности: `valid`/`expired`/`revoked` + ФИО, место работы, даты |
| GET | `/api/certificate/:certificateId/qr` | публично (30 req/min) | PNG QR-кода со ссылкой на проверку (для печати на справке) |

Пагинация (`page`/`limit`) опциональна: без параметров возвращается полный список.

`GET /api/reports` поддерживает фильтры (все опциональны):
`fullName` — поиск по части ФИО (без учёта регистра), `startDate`/`endDate` —
диапазон даты выдачи (ISO), `isDeleted` — архивные/активные, `page`/`limit`.

Эндпоинт проверки публичный и предназначен для работодателей/инспекторов
(в дальнейшем — цель QR-кода на сертификате). Телефон в ответе не возвращается.

## Уведомления

Уведомления (о выпуске, за 10 дней до истечения, после истечения) доставляются
**в первую очередь через Telegram** — если у получателя есть привязанный `chatId`
(он появляется после отправки контакта боту). Если привязки нет или отправка в
Telegram не удалась, используется **SMS (Eskiz)** как fallback. Это снижает
расходы на SMS, сохраняя гарантию доставки.

## Тесты

```bash
yarn test       # unit
yarn test:e2e   # e2e
```

## Скрипты

| Скрипт | Действие |
|--------|----------|
| `yarn start:dev` | запуск в watch-режиме |
| `yarn build` | компиляция в `dist/` |
| `yarn lint` | ESLint с автофиксом |
| `yarn format` | Prettier |
