# Инструкция: сборка APK и запуск на Android

Полный процесс для проекта **Andrey_help**:

1. собрать APK через EAS;
2. установить на телефон;
3. запустить backend на ПК;
4. подготовить QR для скачивания APK.

См. также: [docs/release-and-qr.md](docs/release-and-qr.md), [instruction.md](instruction.md), [docs/setup-env-db-ngrok.md](docs/setup-env-db-ngrok.md), [README.md](README.md).

---

## 0. Что нужно заранее

### На ПК (Windows / macOS)

- Node.js 20.x или 22.x LTS
- npm
- Аккаунт Expo: https://expo.dev/signup
- EAS CLI: `npm install -g eas-cli`

### На телефоне Android

- Разрешение на установку APK из неизвестных источников (если потребуется)

---

## 1. Подготовка проекта

```bash
cd server && npm install
cd ../mobile && npm install
```

---

## 2. Настройка API для APK

APK на телефоне **не может** обращаться к `localhost` — нужен IP компьютера в локальной сети.

### 2.1 Узнать IP

**Windows:**

```bash
ipconfig
```

**macOS / Linux:**

```bash
ifconfig
```

Найдите IPv4 Wi‑Fi адаптера, например `192.168.1.72`.

### 2.2 Файл `mobile/.env`

```bash
cd mobile
copy .env.example .env    # Windows
```

Содержимое:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.72:4000/api
```

Подставьте **свой** IP.

> Адрес API читается из `EXPO_PUBLIC_API_URL` в `mobile/src/services/api.js`.  
> После смены IP обязательна **пересборка APK**.

---

## 3. Вход в Expo / EAS

```bash
npm install -g eas-cli
eas login
eas whoami
```

---

## 4. Сборка APK (EAS Build)

В проекте настроен `mobile/eas.json`, профиль **`preview`** → сборка `.apk`.

```bash
cd mobile
eas build -p android --profile preview
```

Этапы:

1. `queued` — ожидание в очереди (5–30 мин);
2. `in progress` — сборка (8–20 мин);
3. `finished` — ссылка на скачивание APK.

---

## 5. Установка APK на телефон

1. Скачайте APK со страницы EAS Build.
2. Передайте на телефон (Telegram, Drive, USB).
3. Откройте файл и установите.

---

## 6. Запуск backend перед использованием APK

```bash
cd server
npm start
```

Ожидаемый вывод:

```text
Server started on http://localhost:4000
Database: SQLite (.../server/data.sqlite)
```

**Обязательно:**

- телефон и ПК в **одной Wi‑Fi** сети;
- IP в `EXPO_PUBLIC_API_URL` соответствует текущей сети;
- backend запущен на порту 4000.

При смене Wi‑Fi: новый `ipconfig` → обновить `.env` → **пересобрать APK**.

---

## 7. Проверка перед защитой

| Роль | Логин | Пароль | Что показать |
|------|-------|--------|--------------|
| Админ | `admin` | `Admin1234` | Заявки, заказы, чаты, сводка |
| Клиент | `anna_k` | `Admin1234` | Заявки, каталог, чат |
| Специалист | `igor_m` | `Admin1234` | Выезды, отчёт |

Если данные не загружаются — проверьте backend и IP в `.env`.

---

## 8. QR-код на скачивание APK

1. Загрузите APK в облако (Google Drive, Яндекс Диск) с **публичной** ссылкой.
2. Сгенерируйте QR: https://www.qr-code-generator.com/
3. Вставьте ссылку на APK, сохраните PNG.
4. Проверьте сканированием с другого телефона.

---

## 9. Типовые проблемы

| Проблема | Решение |
|----------|---------|
| APK установился, данных нет | Проверить `EXPO_PUBLIC_API_URL`, запустить backend |
| EAS build не стартует | `eas whoami`, интернет, команда из папки `mobile` |
| `EADDRINUSE: 4000` | Остановить старый процесс на порту 4000 |
| После смены Wi‑Fi не работает | Новый IP → `.env` → `eas build` |

---

## 10. Чек-лист к защите

- [ ] Backend запущен (`npm start` в `server`)
- [ ] APK собран с правильным `EXPO_PUBLIC_API_URL`
- [ ] APK установлен на телефон
- [ ] Телефон и ПК в одной Wi‑Fi
- [ ] Ссылка на APK в облаке + QR-код
- [ ] Демо-логины: `admin` / `anna_k` / `igor_m`, пароль `Admin1234`

---

## Связанные документы

- [README.md](README.md) — обзор проекта
- [instruction.md](instruction.md) — локальный запуск
- [docs/release-and-qr.md](docs/release-and-qr.md) — краткий чек-лист EAS
- [defense-qa.md](defense-qa.md) — вопросы защиты
