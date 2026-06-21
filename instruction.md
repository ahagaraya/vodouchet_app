# Инструкция по запуску проекта

Подробное руководство для **Windows** (и аналогично для macOS/Linux).  
Краткий обзор: [README.md](README.md). Справочник по файлам: [structure.md](structure.md).  
**SQLite, почта, ngrok:** [docs/setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md).

Репозиторий на GitHub: **https://github.com/ahagaraya/vodouchet_app**

---

## 0. Клонирование и первый запуск (с нуля)

Подходит преподавателю, одногруппнику или любому, кто хочет **просто потестировать** проект на своём компьютере.

### Нужны ли API-ключи и токены?

**Нет.** Для локального теста в браузере на том же ПК, где запущен сервер:

- не нужны GitHub token, Expo token, JWT secret, SMTP;
- файлы `server/.env` и `mobile/.env` **можно не создавать** — проект работает с настройками по умолчанию;
- в репозитории уже есть демо-данные `server/data.json` (импортируются в SQLite при первом запуске) и картинки каталога.

Файлы `.env` **не хранятся в Git** — каждый создаёт свой из шаблона `.env.example`.  
**Не копируйте чужой `server/.env`** (там чужая почта и ngrok). Подробно: **[docs/setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md)**.

Файлы `.env` понадобятся, если нужны **реальные письма на email**, **публичная ссылка через ngrok**, свой `JWT_SECRET` или запуск с **телефона** по Wi‑Fi.

### Шаг 1. Установить Node.js

- **Node.js 20.x или 22.x LTS** с https://nodejs.org/
- Проверка: `node -v` и `npm -v` в терминале

### Шаг 2. Клонировать репозиторий

```bash
git clone https://github.com/ahagaraya/vodouchet_app.git
cd vodouchet_app
```

Через SSH (если настроен ключ на GitHub):

```bash
git clone git@github.com:ahagaraya/vodouchet_app.git
cd vodouchet_app
```

### Шаг 3. Установить зависимости

```bash
cd server
npm install

cd ../mobile
npm install
```

### Шаг 4. Запустить backend (и web на одном порту)

**Вариант A — демо / защита (один терминал):**

```bash
cd mobile
npm run build:web

cd ../server
npm start
```

Откройте http://localhost:4000 — приложение и API вместе.

**Вариант B — только API (Expo отдельно, шаг 5):**

```bash
cd server
npm start
```

Ожидаемый вывод:

```text
Server started on http://localhost:4000
Database: SQLite (.../server/data.sqlite)
Web app: http://localhost:4000/
```

Проверка: http://localhost:4000/api/health → `{"status":"ok"}`

### Шаг 5. Запустить клиент (web)

Если уже выполнили **вариант A** в шаге 4 — этот шаг **не нужен**, приложение на http://localhost:4000.

Для **разработки с hot reload** откройте второй терминал:

```bash
cd mobile
npm start
```

Когда появится меню Expo, нажмите клавишу **`w`** — откроется web-версия (обычно http://localhost:8081).

Альтернатива без меню:

```bash
cd mobile
CI=1 EXPO_NO_TELEMETRY=1 npx expo start --web --port 8081 --offline
```

### Шаг 6. Войти в приложение

Пароль для всех демо-пользователей: **`Admin1234`**

| Логин | Роль | Что посмотреть |
|-------|------|----------------|
| `admin` | Администратор | Вкладка «Админ» |
| `anna_k` | Клиент | «Мои заявки», каталог |
| `igor_m` | Специалист | «Выезды» |

### Частые вопросы после клона

| Вопрос | Ответ |
|--------|--------|
| Нужно ли создавать `.env`? | Нет, для web на localhost |
| Где взять пароль? | `Admin1234` (см. таблицу выше) |
| Регистрация нового клиента | Код в **консоли server** (без SMTP) или на **вашей** почте — [setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md) |
| Нужен ли чужой `.env`? | **Нет.** Создайте свой: `cp server/.env.example server/.env` |
| Публичная ссылка / QR | Свой **ngrok** — [setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md) |
| Где база данных? | `server/data.sqlite` — [setup-env-db-ngrok.md § 2](docs/setup-env-db-ngrok.md#2-база-данных-sqlite) |
| Сброс БД | `rm server/data.sqlite && cd server && npm start` |
| `EADDRINUSE` на порту 4000 | Закройте старый процесс Node или смените `PORT` в `server/.env` |
| Телефон не видит API | Нужен `mobile/.env` с IP ПК в Wi‑Fi — см. раздел 3 ниже |

Дальше в документе — подробности: настройка `.env`, телефон, APK, типовые ошибки.

---

## 1. Что установить

### Обязательно

- **Windows 10/11** (или macOS / Linux для разработки)
- **Node.js 20.x, 22.x LTS** или **24.x** (SQLite через встроенный `node:sqlite`; возможно предупреждение `ExperimentalWarning`)
- **npm** (устанавливается с Node.js)

### Для теста на телефоне

- **Expo Go** (Android / iOS) — из App Store / Google Play  
  или собранный **APK** (см. [intoapp.md](intoapp.md))

### Для защиты диплома (дополнительно)

- **eas-cli:** `npm install -g eas-cli`
- **Apache JMeter** + **Java 11+** — см. [docs/jmeter-plan.md](docs/jmeter-plan.md)
- Аккаунт Expo: https://expo.dev/signup

---

## 2. Установка зависимостей

Если вы уже выполнили **раздел 0**, этот шаг можно пропустить.

```bash
cd server
npm install

cd ../mobile
npm install
```

Пути замените на свой каталог проекта, например `C:\Projects\vodouchet_app\`.

---

## 3. Настройка окружения

Полная инструкция по **SQLite, почте (SMTP) и ngrok** — в отдельном документе:

**[docs/setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md)**

Кратко:

```bash
cd server
cp .env.example .env    # macOS/Linux
# copy .env.example .env   # Windows
```

- **Без `.env`** — работает localhost; код регистрации в консоли; БД создаётся сама.
- **Со своим `.env`** — письма на вашу почту (`npm run setup:email`) и публичный QR через ngrok.

### Backend (`server/.env`)

Минимально достаточно значений по умолчанию. Для production задайте свой `JWT_SECRET`.

### Mobile (`mobile/.env`)

```bash
cd mobile
copy .env.example .env
```

**Web / эмулятор на том же ПК:**

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

**Телефон по Wi‑Fi (APK или Expo Go):**

1. Узнайте IP ПК: `ipconfig` (Windows) или `ifconfig` (macOS).
2. Найдите IPv4 активного Wi‑Fi адаптера, например `192.168.1.72`.
3. Укажите в `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.72:4000/api
```

> URL задаётся через переменную окружения `EXPO_PUBLIC_API_URL`, а **не** через правку `api.js`.

После смены IP для APK нужна **пересборка** (`eas build`).

---

## 4. Запуск backend

```bash
cd server
npm start
```

Ожидаемый вывод:

```text
Server started on http://localhost:4000
Database: SQLite (.../server/data.sqlite)
Web app: http://localhost:4000/
```

Проверка в браузере:

- http://localhost:4000/api/health → `{"status":"ok"}`
- http://localhost:4000/api/catalog → JSON с каталогом
- http://localhost:4000/ → web-приложение (если выполнен `npm run build:web` в `mobile/`)

**Публичная ссылка (ngrok + QR):** см. [docs/setup-env-db-ngrok.md § 4](docs/setup-env-db-ngrok.md#4-публичная-ссылка-и-qr-ngrok) или `./scripts/public-url.sh`

Если `EADDRINUSE` — порт 4000 занят. Остановите предыдущий процесс Node.js.

**macOS / Linux — освободить порты:**

```bash
lsof -ti:4000 | xargs kill -9
```

---

## 5. Запуск mobile

Если web уже открывается на http://localhost:4000 (сборка `build:web`) — этот раздел нужен только для **разработки**.

### Вариант A: Expo (разработка)

```bash
cd mobile
npm start
```

- **Web:** нажмите `w` в терминале или откройте http://localhost:8081
- **Телефон:** отсканируйте QR в **Expo Go**
- **Tunnel** (если Wi‑Fi блокирует): `npx expo start --tunnel`

### Вариант B: Web без hot reload (демо / CI)

```bash
cd mobile
CI=1 EXPO_NO_TELEMETRY=1 npx expo start --web --port 8081 --offline
```

После изменений кода в этом режиме **перезапустите** команду.

---

## 6. Демо-аккаунты

Пароль для всех: **`Admin1234`**

| Логин | Роль | Раздел для проверки |
|-------|------|---------------------|
| `admin` | Администратор | «Админ» |
| `igor_m` | Специалист | «Выезды» |
| `sergey_p` | Специалист | «Выезды» |
| `anna_k` | Клиент | «Мои заявки» |

Дополнительно в seed: `olga_o`, `maria_l` (сотрудники).

---

## 7. Что проверить после запуска

### Админ (`admin`)

1. Вкладка **Заявки** — список, сортировка, «В заказ».
2. Вкладка **Заказы** — редактирование, публикация.
3. **Сводка**, **Отчёты**, **Каталог**, **Чаты**.
4. **Создать** — форма заказа с выбором клиента и специалиста.

### Клиент (`anna_k`)

1. **Мои заявки** — новая заявка сверху (сортировка «Сначала новые»).
2. **Каталог** → «В заявку» → оформление.
3. **Отзывы** — написать отзыв по завершённому заказу.
4. Плавающий **онлайн-чат** (виджет справа внизу).

### Специалист (`igor_m`)

1. **Выезды** — карточки с адресом, датой, контактом.
2. Открыть выезд → отчёт, доп. работы.

---

## 8. База данных и статика

Подробно: **[docs/setup-env-db-ngrok.md § 2](docs/setup-env-db-ngrok.md#2-база-данных-sqlite)**

| Что | Где |
|-----|-----|
| БД (рабочая) | `server/data.sqlite` |
| Демо-данные / резерв | `server/data.json` |
| Картинки | `server/public/catalog/item1.png` … `item9.png` |

---

## 9. Типовые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| «Не удалось подключиться к серверу» | Backend не запущен | `cd server && npm start` |
| Работает на ПК, не на телефоне | Неверный IP / другая сеть | Проверить `.env`, Wi‑Fi, firewall |
| Пустой каталог | Нет связи с API | `GET /api/catalog` с телефона |
| Email-код не приходит | SMTP не настроен | [setup-env-db-ngrok.md § 3](docs/setup-env-db-ngrok.md#3-подтверждение-по-email-smtp) |
| Web: ошибка maps | Нормально | Используется `ContactsScreen.web.js` |
| Изменения не видны в web | Режим `CI=1` | Перезапустить Expo |

---

## 10. Связанные документы

| Документ | Содержание |
|----------|------------|
| [README.md](README.md) | Обзор и навигация |
| [structure.md](structure.md) | Где что в коде |
| [intoapp.md](intoapp.md) | Сборка APK |
| [docs/release-and-qr.md](docs/release-and-qr.md) | EAS + QR |
| [docs/jmeter-plan.md](docs/jmeter-plan.md) | Нагрузочные тесты |
| [docs/setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md) | SQLite, SMTP, ngrok |
| [scripts/public-url.sh](scripts/public-url.sh) | Web + сервер + ngrok |
| [defense-qa.md](defense-qa.md) | Ответы на защиту |
