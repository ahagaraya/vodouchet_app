# Инструкция по запуску проекта

Подробное руководство для **Windows** (и аналогично для macOS/Linux).  
Краткий обзор: [README.md](README.md). Справочник по файлам: [structure.md](structure.md).

Репозиторий на GitHub: **https://github.com/ahagaraya/vodouchet_app**

---

## 0. Клонирование и первый запуск (с нуля)

Подходит преподавателю, одногруппнику или любому, кто хочет **просто потестировать** проект на своём компьютере.

### Нужны ли API-ключи и токены?

**Нет.** Для локального теста в браузере на том же ПК, где запущен сервер:

- не нужны GitHub token, Expo token, JWT secret, SMTP;
- файлы `server/.env` и `mobile/.env` **можно не создавать** — проект работает с настройками по умолчанию;
- в репозитории уже есть демо-база `server/data.json` и картинки каталога.

Файлы `.env` понадобятся только если вы меняете `JWT_SECRET`, подключаете почту (SMTP) или запускаете приложение с **телефона** по Wi‑Fi (тогда в `mobile/.env` указывают IP компьютера).

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

### Шаг 4. Запустить backend

Оставьте этот терминал открытым:

```bash
cd server
npm start
```

Ожидаемый вывод: `Server started on http://localhost:4000`

Проверка в браузере: http://localhost:4000/api/health → `{"status":"ok"}`

### Шаг 5. Запустить клиент (web)

Откройте **второй** терминал:

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
| Регистрация нового клиента | Код из email смотрите в **консоли терминала server** |
| `EADDRINUSE` на порту 4000 | Закройте старый процесс Node или смените `PORT` в `server/.env` |
| Телефон не видит API | Нужен `mobile/.env` с IP ПК в Wi‑Fi — см. раздел 3 ниже |

Дальше в документе — подробности: настройка `.env`, телефон, APK, типовые ошибки.

---

## 1. Что установить

### Обязательно

- **Windows 10/11** (или macOS / Linux для разработки)
- **Node.js 20.x LTS** или **22.x LTS** (не рекомендуется Node 24)
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

### Backend (`server/.env`)

```bash
cd server
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux
```

Минимально достаточно значений по умолчанию. Для production задайте свой `JWT_SECRET`.

Если SMTP не настроен (`SMTP_USER`, `SMTP_PASS` пустые), коды подтверждения email и сброса пароля **выводятся в консоль сервера**.

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
```

Проверка в браузере:

- http://localhost:4000/api/health → `{"status":"ok"}`
- http://localhost:4000/api/catalog → JSON с каталогом

Если `EADDRINUSE` — порт 4000 занят. Остановите предыдущий процесс Node.js.

**macOS / Linux — освободить порты:**

```bash
lsof -ti:4000 | xargs kill -9
```

---

## 5. Запуск mobile

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

| Что | Где |
|-----|-----|
| БД | `server/data.json` |
| Картинки | `server/public/catalog/item1.png` … `item9.png` |
| URL картинок | `http://<host>:4000/static/catalog/item1.png` |

Коллекции: `users`, `categories`, `catalogItems`, `incomingRequests`, `orders`, `reviews`, `chatMessages`, `complaints`, `auditLog`, `pdAccessLog`.

При **первом запуске** пустая БД заполняется seed из `server/src/db.js`.

---

## 9. Типовые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| «Не удалось подключиться к серверу» | Backend не запущен | `cd server && npm start` |
| Работает на ПК, не на телефоне | Неверный IP / другая сеть | Проверить `.env`, Wi‑Fi, firewall |
| Пустой каталог | Нет связи с API | `GET /api/catalog` с телефона |
| Email-код не приходит | SMTP не настроен | Смотреть консоль сервера |
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
| [defense-qa.md](defense-qa.md) | Ответы на защиту |
