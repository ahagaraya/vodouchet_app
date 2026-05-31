# Публикация APK и QR-код

Краткий чек-лист для защиты диплома.  
Подробная инструкция: [intoapp.md](../intoapp.md).

---

## Предварительная проверка

1. **Backend:**
   ```bash
   cd server && npm start
   ```
2. **API:**
   - http://localhost:4000/api/health
   - http://localhost:4000/api/catalog
3. **Mobile (локально):**
   ```bash
   cd mobile && npm start
   ```
   Нажмите `w` для web.

---

## Настройка API перед сборкой APK

Файл `mobile/.env` (из `.env.example`):

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api
```

- `192.168.x.x` — локальный IP ПК (`ipconfig` / `ifconfig`).
- **Не** используйте `localhost` для APK на физическом телефоне.
- После смены IP — **пересборка** APK.

---

## Сборка APK (Expo EAS)

Конфиг: `mobile/eas.json`, профиль **`preview`** → `buildType: apk`.

```bash
npm install -g eas-cli
eas login
cd mobile
eas build -p android --profile preview
```

После `finished` — скачайте `.apk` со страницы сборки EAS.

---

## Размещение APK

1. Загрузите APK в облако (Google Drive, Яндекс Диск, Dropbox).
2. Получите **публичную** ссылку (скачивание без авторизации).

---

## QR-код

1. Генератор: https://www.qr-code-generator.com/
2. Вставьте ссылку на APK.
3. Сохраните PNG для презентации / пояснительной записки.
4. Проверьте сканированием с другого телефона.

---

## Что подготовить к защите

| Материал | Описание |
|----------|----------|
| Ссылка на APK | Публичное облако |
| QR-код | PNG на скачивание APK |
| Скриншот | Приложение на устройстве |
| Демо-логины | `admin`, `anna_k`, `igor_m` / `Admin1234` |
| Backend | Запущен на ПК, телефон в той же Wi‑Fi |

---

## Связанные документы

- [README.md](../README.md)
- [intoapp.md](../intoapp.md)
- [instruction.md](../instruction.md)
- [defense-qa.md](../defense-qa.md)
