# Справочник по структуре проекта

Единая навигация по кодовой базе **Andrey_help**: где что лежит, какие API есть, в каком файле менять поведение.

См. также: [README.md](README.md) (обзор), [instruction.md](instruction.md) (запуск), [defense-qa.md](defense-qa.md) (защита).

---

## 1. Общая структура

```
Andrey_help/
├── server/                 # Backend
├── mobile/                 # React Native + Expo
├── docs/                   # APK, JMeter
├── README.md
├── instruction.md
├── structure.md            # этот файл
├── intoapp.md
├── concept.md
├── defense-qa.md
└── ROADMAP.md
```

---

## 2. Backend (`server/`)

### 2.1. Ключевые файлы

| Файл | Назначение |
|------|------------|
| `server/src/index.js` | Точка входа Express, auth/catalog/orders/client/admin роуты |
| `server/src/db.js` | lowdb, сиды, `enrichOrder`, `enrichRequest`, `enrichReview` |
| `server/src/chatRoutes.js` | Общий чат и чат по заказам, inbox админа |
| `server/src/roadmapRoutes.js` | Дашборд, отчёты, аудит, каталог CRUD, жалобы, профиль, история |
| `server/src/audit.js` | Журнал действий и логи доступа к ПДн |
| `server/src/searchUtils.js` | Поиск заказов/клиентов для админа |
| `server/data.json` | Рабочая БД (JSON) |
| `server/public/catalog/` | Картинки каталога (`item1.png` … `item9.png`) |
| `server/.env` | `JWT_SECRET`, SMTP (из `.env.example`) |

### 2.2. Коллекции в `data.json`

| Коллекция | Назначение |
|-----------|------------|
| `users` | Пользователи: `role` (`admin` / `employee` / `client`), `password_hash`, `phone`, `address`, `verified` |
| `categories` | Категории каталога |
| `catalogItems` | Услуги/товары: цена, `image_url`, `category_id` |
| `incomingRequests` | Заявки клиентов (`source`: `website`, `telegram`, `app`) |
| `orders` | Заказы на выезд: работы, статус, оплата, `assigned_user_id` |
| `reviews` | Отзывы клиентов о специалистах |
| `chatMessages` | Сообщения общего чата и чатов по заказам |
| `complaints` | Претензии клиентов |
| `auditLog` | Журнал действий админа/системы |
| `pdAccessLog` | Логи доступа к персональным данным (152-ФЗ) |
| `supportMessages` | Устаревшая коллекция (legacy, не используется в UI) |

### 2.3. Сортировка на сервере

Списки заявок и заказов сортируются функцией `compareByRecency` в `index.js`:

1. по `created_at` (или `updated_at`) — **новые сверху**;
2. при равной дате — по `id` по убыванию.

Это важно для объединённого списка клиента (заявки + заказы имеют **разные** счётчики id).

На клиенте дополнительная сортировка: `mobile/src/utils/listSort.js` + `ListSortChips`.

---

## 3. API (полный перечень)

Базовый URL: `http://<host>:4000/api`

### 3.1. Авторизация и профиль

| Метод | Путь | Кто | Описание |
|-------|------|-----|----------|
| POST | `/auth/register` | все | Регистрация клиента |
| POST | `/auth/verify` | все | Подтверждение email-кода |
| POST | `/auth/login` | все | Вход, выдача JWT |
| POST | `/auth/forgot-password` | все | Запрос кода сброса |
| POST | `/auth/reset-password` | все | Смена пароля по коду |
| GET | `/profile` | auth | Профиль текущего пользователя |
| PATCH | `/profile` | auth | Редактирование профиля |
| DELETE | `/profile` | auth | Удаление аккаунта |

### 3.2. Каталог и отзывы

| Метод | Путь | Кто | Описание |
|-------|------|-----|----------|
| GET | `/catalog` | все | Каталог (+ `?categoryId=`) |
| GET | `/reviews` | все | Список отзывов |
| POST | `/reviews` | client | Новый отзыв |
| GET | `/reviews/mine` | employee | Отзывы о специалисте |
| GET | `/specialists` | auth | Список специалистов для выбора в заявке |

### 3.3. Специалист (выезды)

| Метод | Путь | Кто | Описание |
|-------|------|-----|----------|
| GET | `/orders` | employee | Назначенные выезды |
| GET | `/orders/:id` | employee | Карточка выезда |
| PATCH | `/orders/:id/report` | employee | Отчёт: статус, оплата, работы |
| POST | `/orders/:id/extra-works` | employee | Доп. работы на объекте |

### 3.4. Клиент

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/client/requests` | Список заявок + заказов клиента |
| GET/POST/PATCH | `/client/requests`, `/client/requests/:id` | CRUD заявки |
| PATCH | `/client/requests/:id/cancel` | Отмена заявки |
| POST | `/client/requests/:id/proposal/respond` | Ответ на предложение цены |
| POST | `/client/requests/:id/reschedule` | Запрос переноса даты |
| GET/PATCH | `/client/orders/:id` | Просмотр/редактирование заказа |
| PATCH | `/client/orders/:id/cancel` | Отмена заказа |
| POST | `/client/orders/:id/extra-works/:workId/respond` | Согласие на доп. работу |
| GET | `/client/reviewable-orders` | Заказы для отзыва |
| GET | `/client/history` | История обращений |
| GET/POST | `/client/complaints` | Претензии |

### 3.5. Админ

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/admin/requests` | Активные заявки |
| PATCH | `/admin/requests/:id` | Редактирование заявки |
| POST | `/admin/requests/:id/proposal` | Отправить предложение клиенту |
| PATCH | `/admin/requests/:id/reschedule` | Решение по переносу |
| GET/POST/PATCH | `/admin/orders`, `/admin/orders/:id` | Заказы |
| GET | `/admin/search?q=` | Поиск |
| GET | `/admin/clients`, `/admin/clients/:id` | Клиенты |
| GET | `/admin/employees` | Специалисты |
| GET | `/admin/users`, `/admin/users/:id` | Все пользователи (+ ПДн) |
| GET | `/admin/dashboard` | Сводка |
| GET | `/admin/reports?month=` | Отчёты |
| GET | `/admin/audit` | Журнал |
| CRUD | `/admin/catalog/items`, `/admin/catalog/categories` | Каталог |
| POST | `/admin/reviews/:id/reply` | Ответ на отзыв |
| GET/PATCH | `/admin/complaints`, `/admin/complaints/:id` | Претензии |

### 3.6. Чат

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/chat/general` | Общий чат пользователя |
| GET/POST | `/chat/orders/:orderId` | Чат по заказу |
| GET | `/admin/chat/inbox` | Inbox админа (непрочитанные) |
| GET/POST | `/admin/chat/general/:userId` | Переписка админа с пользователем |

### 3.7. Публичное и служебное

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/public/requests` | Заявка с сайта (без авторизации) |
| GET | `/health` | Проверка работы сервера |
| GET | `/static/catalog/*` | Статика изображений |

### Middleware

- `auth` — проверка JWT
- `adminOnly` — только `role === "admin"`
- `employeeOnly` — только `role === "employee"`
- `clientOnly` — только `role === "client"`

---

## 4. Mobile (`mobile/`)

### 4.1. Навигация (`App.js`)

**Нижние вкладки (зависят от роли):**

| Вкладка | Кто видит |
|---------|-----------|
| Главная | все |
| Мои заявки | client |
| Выезды | employee |
| Админ | admin |
| Каталог | все |
| Контакты | все |
| Отзывы | все |
| Профиль | все |

**Stack-экраны:** Login, Register, Verify, ForgotPassword, Privacy, OrderDetail, ClientRequestForm, ClientOrderDetail, ChatThread, EmployeeReviews, ProfileEdit, ClientHistory.

Глобально: `SupportChatWidget`, `ConfirmHost` (диалоги Да/Нет на web).

### 4.2. Контексты

| Файл | Назначение |
|------|------------|
| `context/AuthContext.js` | Токен, профиль, login/logout, `tokenRef` (fix race при выходе) |
| `context/RequestCartContext.js` | Корзина позиций каталога для заявки |
| `context/SupportChatContext.js` | Состояние виджета чата |

### 4.3. HTTP-клиент

`mobile/src/services/api.js` — все вызовы API.  
Базовый URL: `process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api"`.

### 4.4. Экраны (`mobile/src/screens/`)

| Файл | Назначение |
|------|------------|
| `HomeScreen.js` | Главная, быстрые ссылки по роли |
| `CatalogScreen.js` | Каталог, сетка карточек, «В заявку» |
| `ContactsScreen.js` / `.web.js` | Контакты, карта (native / ссылка на web) |
| `ProfileScreen.js` | Профиль, выход, редактирование |
| `ProfileEditScreen.js` | Смена телефона, email, адреса |
| `LoginScreen.js` | Вход |
| `RegisterScreen.js` | Регистрация клиента + согласие ПДн |
| `VerifyScreen.js` | Код подтверждения email |
| `ForgotPasswordScreen.js` | Восстановление пароля |
| `PrivacyScreen.js` | Политика конфиденциальности |
| `ReviewsScreen.js` | Отзывы; клиент пишет по завершённому заказу |
| `EmployeeReviewsScreen.js` | Отзывы о специалисте |
| `ClientRequestsScreen.js` | Заявки и заказы клиента + сортировка |
| `ClientRequestFormScreen.js` | Создание/редактирование заявки, автозаполнение из профиля |
| `ClientOrderDetailScreen.js` | Заказ: таймлайн, чат, доп. работы, отмена |
| `ClientHistoryScreen.js` | История обращений |
| `OrdersScreen.js` | Выезды специалиста + сортировка |
| `OrderDetailScreen.js` | Карточка выезда, отчёт |
| `ChatThreadScreen.js` | Поток переписки |
| `AdminScreen.js` | Админ: вкладки + форма заказа |
| `AdminDashboardPanel.js` | Сводка |
| `AdminReportsPanel.js` | Отчёты |
| `AdminCatalogPanel.js` | CRUD каталога |
| `AdminAuditPanel.js` | Журнал |
| `AdminComplaintsPanel.js` | Претензии |
| `AdminSearchPanel.js` | Поиск |
| `AdminClientsPanel.js` | Клиенты |
| `AdminChatsPanel.js` | Чаты админа |

### 4.5. Компоненты (`mobile/src/components/`)

| Компонент | Назначение |
|-----------|------------|
| `ActionButton` | Кнопки (варианты, размеры, danger для отмены) |
| `BottomActions` | Нижняя панель кнопок |
| `FormActionBar` | Кнопки формы админа (создание заказа) |
| `ButtonRow` | Горизонтальный ряд кнопок |
| `ScreenHeader` | Заголовок экрана |
| `SectionCard` | Карточка секции |
| `StatusBadge` | Бейдж статуса заявки/заказа |
| `ListSortChips` | Чипы сортировки списков |
| `ReviewSortChips` | Сортировка отзывов |
| `OrderTimeline.js` | Таймлайн статусов заказа |
| `OrderChatBlock.js` | Блок чата в карточке заказа |
| `ChatPanel.js` | UI чата |
| `SupportChatWidget.js` | Плавающий онлайн-чат |
| `ConfirmHost.js` | Модальный диалог Да/Нет (web) |
| `CatalogPickerPanel.js` | Выбор позиций каталога |
| `SearchablePicker.js` | Поисковый выпадающий список |
| `RefreshButton` | Кнопка обновления |
| `FeedbackBanner` | Баннер сообщений |
| `StarRating` | Звёзды рейтинга |
| `HeaderBackButton` | Кнопка «Назад» |

### 4.6. Утилиты (`mobile/src/utils/`)

| Файл | Назначение |
|------|------------|
| `listSort.js` | Сортировка: new / old / status / visit |
| `reviewSort.js` | Сортировка отзывов |
| `statusLabels.js` | Статусы, `isOrderItem`, правила отмены/редактирования |
| `confirm.js` | Подтверждения (web + native) |
| `catalogSelection.js` | Корзина каталога → API payload |
| `specialistStats.js` | Статистика специалистов в picker |
| `navigation.js` | Хелперы навигации |
| `feedback.js` | Toast/alert обратной связи |
| `chatActions.js` | Действия чата |

### 4.7. Дизайн-система

- `mobile/src/theme.js` — цвета, отступы, радиусы, тени
- `mobile/src/styles/common.js` — `screen`, `listCard`, `input`, `divider`, `fieldLabel`

---

## 5. Где менять конкретные вещи

| Задача | Файл |
|--------|------|
| Тестовые логины (seed) | `server/src/db.js` |
| Текущие пользователи | `server/data.json` → `users` |
| Правила пароля при регистрации | `server/src/index.js` → `/auth/register` |
| Каталог (данные) | `server/data.json` → `catalogItems` |
| Картинки каталога | `server/public/catalog/` + `image_url` в data |
| Сортировка списков (логика) | `mobile/src/utils/listSort.js` |
| Сортировка по умолчанию на API | `server/src/index.js` → `compareByRecency` |
| Подтверждение отмены заявки | `ClientRequestsScreen.js`, `ClientRequestFormScreen.js`, `utils/confirm.js` |
| Автозаполнение адреса/телефона в заявке | `ClientRequestFormScreen.js`, профиль клиента |
| Вкладки админа | `AdminScreen.js` |
| URL backend для APK | `mobile/.env` → `EXPO_PUBLIC_API_URL` |
| JWT secret | `server/.env` → `JWT_SECRET` |
| Email-код (SMTP) | `server/.env`, `sendCodeEmail` в `index.js` |

---

## 6. Запуск

### Backend

```bash
cd server && npm install && npm start
```

### Mobile (разработка)

```bash
cd mobile && npm install && npm start
```

### Mobile (web, стабильный режим)

```bash
cd mobile
CI=1 EXPO_NO_TELEMETRY=1 npx expo start --web --port 8081 --offline
```

После изменений в `CI=1` режиме нужен **перезапуск** Expo.

---

## 7. Частые проблемы

| Проблема | Решение |
|----------|---------|
| `EADDRINUSE: 4000` | Остановить старый процесс на порту 4000 |
| Телефон не видит API | Одна Wi‑Fi, правильный IP в `.env`, firewall |
| Новая заявка «в середине» списка | Обновить backend (сортировка по `created_at`) и клиент (`listSort.js`) |
| Web: карта не работает | Используется `ContactsScreen.web.js` |
| Картинки каталога 404 | Проверить `http://localhost:4000/static/catalog/item1.png` |
| Выход со 2-го клика | Исправлено через `tokenRef` в `AuthContext.js` |
| Код email не приходит | SMTP не настроен — код в консоли сервера |

---

## 8. Документация проекта

| Файл | Содержание |
|------|------------|
| [README.md](README.md) | Обзор, быстрый старт, навигация |
| [instruction.md](instruction.md) | Подробный запуск (Windows) |
| [intoapp.md](intoapp.md) | APK + QR |
| [concept.md](concept.md) | Бизнес-процесс |
| [defense-qa.md](defense-qa.md) | Вопросы защиты |
| [ROADMAP.md](ROADMAP.md) | Доработки |
| [docs/release-and-qr.md](docs/release-and-qr.md) | EAS Build |
| [docs/jmeter-plan.md](docs/jmeter-plan.md) | JMeter |
