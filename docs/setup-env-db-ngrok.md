# Настройка окружения: SQLite, почта и ngrok

Пошаговая инструкция для **нового пользователя** проекта (преподаватель, одногруппник, проверяющий).  
Краткий запуск без настройки: [instruction.md](../instruction.md). Обзор: [README.md](../README.md).

---

## Содержание

1. [Главное правило — свои ключи, не чужие](#1-главное-правило--свои-ключи-не-чужие)
2. [База данных SQLite](#2-база-данных-sqlite)
3. [Подтверждение по email (SMTP)](#3-подтверждение-по-email-smtp)
4. [Публичная ссылка и QR (ngrok)](#4-публичная-ссылка-и-qr-ngrok)
5. [Сводная таблица](#5-сводная-таблица)
6. [Типовые проблемы](#6-типовые-проблемы)

---

## 1. Главное правило — свои ключи, не чужие

| Правило | Зачем |
|---------|--------|
| Файл `server/.env` **не лежит в Git** | В репозитории только шаблон `server/.env.example` |
| Создавать `.env` из шаблона | `cp server/.env.example server/.env` |
| **Не копировать чужой `.env`** | Там чужая почта, чужой ngrok и чужие пароли |
| **Не коммитить** `.env` | Секреты только на вашем ПК (уже в `.gitignore`) |

Если проект передали «на флешке» **вместе с `.env`** — **удалите** его и создайте свой:

```bash
cd server
rm -f .env          # macOS/Linux — удалить чужой файл
cp .env.example .env
```

Windows: удалите `server\.env` вручную, затем `copy .env.example .env`.

---

## 2. База данных SQLite

### Как устроено

| Что | Путь / описание |
|-----|-----------------|
| Рабочая БД | `server/data.sqlite` (создаётся автоматически) |
| Демо-данные / резерв | `server/data.json` (есть в репозитории) |
| Код слоя БД | `server/src/sqliteStore.js` |
| Сиды и бизнес-логика | `server/src/db.js` |

SQLite через встроенный модуль Node.js **`node:sqlite`**.  
Данные хранятся в таблице `app_collections`: каждая коллекция — JSON в поле `payload`.

**Коллекции:** `users`, `categories`, `catalogItems`, `incomingRequests`, `orders`, `reviews`, `chatMessages`, `complaints`, `auditLog`, `pdAccessLog`.

### Первый запуск

1. Запустите сервер: `cd server && npm start`
2. Если `data.sqlite` **нет** или **пуст** — данные импортируются из `data.json`
3. Если и `data.json` нет — заполняется seed из `server/src/db.js` (6 пользователей, каталог, заявки, заказы)

В консоли будет строка:

```text
Database: SQLite (.../server/data.sqlite)
```

> При Node 24+ возможно предупреждение `ExperimentalWarning: SQLite` — это нормально.

### Сброс к демо-данным

```bash
rm server/data.sqlite
cd server && npm start
```

БД пересоздастся и снова импортирует `data.json`.

### Что не нужно настраивать

- Отдельный сервер PostgreSQL / MySQL **не нужен**
- Файл `data.sqlite` **не коммитится** в Git (личные данные после работы с приложением)
- Демо-логины после импорта: `admin`, `anna_k`, `igor_m` — пароль **`Admin1234`**

### Резервная копия

Скопируйте файл `server/data.sqlite` в безопасное место.  
Для «чистого» стенда — удалите `data.sqlite` и перезапустите сервер.

---

## 3. Подтверждение по email (SMTP)

### Без настройки (достаточно для демо)

Регистрация клиента **работает**. Шестизначный код подтверждения выводится в **терминал**, где запущен `npm start` — ищите строку с `[EMAIL]` или кодом.

SMTP **не обязателен** для проверки на localhost.

### С настройкой (письма на настоящую почту)

Нужен **ваш** почтовый ящик. **Не используйте** SMTP из чужого `.env`.

#### Шаг 1. Создать свой `.env`

```bash
cd server
cp .env.example .env
```

#### Шаг 2. Gmail (рекомендуется)

1. Включите **двухфакторную аутентификацию** в Google-аккаунте
2. Создайте **пароль приложения** (не обычный пароль Gmail):  
   https://myaccount.google.com/apppasswords
3. Заполните **свои** данные в `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM=ваш@gmail.com
```

#### Шаг 3. Интерактивная настройка (альтернатива)

```bash
cd server
npm run setup:email
npm run test:email
```

После `test:email` письмо должно прийти **на ваш** адрес.

#### Yandex / Resend

Примеры переменных — в комментариях файла `server/.env.example`.

#### Проверка при регистрации

1. `cd server && npm start`
2. В приложении: «Регистрация» → укажите **ваш** email
3. Код должен прийти на почту (или смотрите консоль сервера, если SMTP не настроен)

---

## 4. Публичная ссылка и QR (ngrok)

### Без ngrok

Приложение доступно только на **этом компьютере**:

- http://localhost:4000

QR в терминале для localhost всё равно печатается.

### С ngrok (телефон / другой человек / другая сеть)

Нужен **ваш** аккаунт ngrok. **Не используйте** чужой URL — он перестанет работать, когда автор выключит свой ПК.

#### Шаг 1. Регистрация и установка

1. https://ngrok.com/signup (бесплатно)
2. Установите CLI: https://ngrok.com/download

#### Шаг 2. Ваш authtoken (один раз на ПК)

Скопируйте токен в личном кабинете: https://dashboard.ngrok.com/get-started/your-authtoken

```bash
ngrok config add-authtoken ВАШ_ТОКЕН_ИЗ_КАБИНЕТА
```

Токен хранится на вашем ПК (`~/.config/ngrok/`), **не** в репозитории.

#### Шаг 3. Автозапуск туннеля (опционально)

В `server/.env`:

```env
AUTO_NGROK=1
```

При `npm start` ngrok поднимется сам и в терминале появится **ваша** ссылка и QR-код (адрес вида `https://....ngrok-free.dev` — это нормально, он выдаётся ngrok автоматически).

#### Шаг 4. Запуск

```bash
cd mobile && npm run build:web
cd ../server && npm start
```

Альтернатива — скрипт:

```bash
./scripts/public-url.sh
```

#### QR для уже известной ссылки

```bash
cd server && npm run qr -- https://ваша-ссылка.ngrok-free.dev/
```

---

## 5. Сводная таблица

| Функция | Ничего не настраивать | Свой `.env` + SMTP | Свой ngrok |
|---------|----------------------|-------------------|------------|
| Вход, каталог, админка на ПК | ✅ localhost | ✅ | ✅ |
| База SQLite с демо-данными | ✅ автоматически | ✅ | ✅ |
| Код регистрации на email | В консоли сервера | На **вашей** почте | — |
| QR / ссылка из интернета | ❌ | — | ✅ |
| APK на телефоне в Wi‑Fi | Нужен `mobile/.env` с IP **вашего** ПК | — | — |

### Минимальный чек-лист нового пользователя

- [ ] `cp server/.env.example server/.env` (не копировать чужой!)
- [ ] `cd server && npm install && npm start` — БД создастся сама
- [ ] (Опционально) Свой SMTP → `npm run setup:email`
- [ ] (Опционально) Свой ngrok → `ngrok config add-authtoken …`, в `.env`: `AUTO_NGROK=1`
- [ ] (Опционально) `cd mobile && npm run build:web` — web на порту 4000

---

## 6. Типовые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| Письма не приходят | SMTP не настроен или чужой `.env` | Свой `.env`, `npm run test:email`; код — в консоли |
| `Invalid login` Gmail | Обычный пароль вместо пароля приложения | https://myaccount.google.com/apppasswords |
| QR ведёт на чужой ngrok | Скопирован чужой `.env` | Удалить `.env`, создать свой, свой authtoken |
| ngrok не поднимается | Нет authtoken | `ngrok config add-authtoken ВАШ_ТОКЕН` |
| Пустая БД / нет пользователей | Повреждён `data.sqlite` | `rm server/data.sqlite && npm start` |
| `ExperimentalWarning: SQLite` | Node 24+ | Можно игнорировать |

---

## Связанные документы

| Файл | Содержание |
|------|------------|
| [instruction.md](../instruction.md) | Полный запуск (Windows, телефон, Expo) |
| [README.md](../README.md) | Обзор проекта |
| [structure.md](../structure.md) | Файлы `sqliteStore.js`, `mail.js`, API |
| [server/.env.example](../server/.env.example) | Шаблон переменных окружения |
| [defense-qa.md](../defense-qa.md) | Ответы на защиту (SQLite, архитектура) |
