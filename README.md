# ООО «Водоучет»

Мобильное приложение для клиентов, специалистов и администратора: заявки, заказы, каталог услуг, чаты, отзывы.

**Стек:** React Native + Expo · Node.js + Express

---

## Навигация по документации

| Документ | Для чего |
|----------|----------|
| **[README.md](README.md)** (этот файл) | Обзор проекта, быстрый запуск, демо-логины |
| **[instruction.md](instruction.md)** | Подробная инструкция запуска (Windows, телефон, web, Expo Go) |
| **[structure.md](structure.md)** | Справочник по структуре: файлы, API, экраны, где что править |
| **[intoapp.md](intoapp.md)** | Сборка APK через EAS, установка на Android, QR-код |
| **[concept.md](concept.md)** | Роли, бизнес-процесс, цепочка «заявка → заказ → выезд» |
| **[defense-qa.md](defense-qa.md)** | Ответы на вопросы защиты |
| **[ROADMAP.md](ROADMAP.md)** | Реализованные доработки и идеи для production |
| **[docs/release-and-qr.md](docs/release-and-qr.md)** | Краткий чек-лист: EAS Build, APK, QR |
| **[docs/jmeter-plan.md](docs/jmeter-plan.md)** | План нагрузочного тестирования API (JMeter) |

---

## Структура репозитория

```
Andrey_help/
├── server/          # Backend API (Express, lowdb, JWT, bcrypt)
│   ├── src/
│   │   ├── index.js       # Основные роуты
│   │   ├── db.js          # БД, сиды, enrich-функции
│   │   ├── chatRoutes.js  # Онлайн-чат
│   │   ├── roadmapRoutes.js # Расширенные API (дашборд, жалобы, …)
│   │   └── audit.js       # Журнал аудита и ПДн
│   ├── data.json          # Файловая БД (создаётся/обновляется при работе)
│   └── public/catalog/    # Изображения каталога (item1.png … item9.png)
├── mobile/          # React Native + Expo
│   ├── src/
│   │   ├── App.js         # Навигация (tabs + stack)
│   │   ├── screens/       # Экраны и админ-панели
│   │   ├── components/    # UI-компоненты
│   │   ├── context/       # Auth, корзина заявки, чат
│   │   ├── services/api.js
│   │   └── utils/         # Сортировка, статусы, подтверждения
│   └── eas.json           # Профиль сборки APK (preview)
└── docs/            # Материалы для защиты
```

---

## Развертывание с GitHub (для проверяющего / нового разработчика)

Репозиторий: **https://github.com/ahagaraya/vodouchet_app**

**Секретные ключи вводить не нужно** — для локального запуска на одном ПК достаточно клонировать репозиторий, установить зависимости и запустить backend и клиент. Файлы `.env` опциональны (есть шаблоны `.env.example`).

```bash
git clone https://github.com/ahagaraya/vodouchet_app.git
cd vodouchet_app
```

**Терминал 1 — backend:**

```bash
cd server
npm install
npm start
```

Проверка: http://localhost:4000/api/health

**Терминал 2 — клиент (web):**

```bash
cd mobile
npm install
npm start
```

В терминале Expo нажмите **`w`** → http://localhost:8081

**Вход:** логин `admin`, `anna_k` или `igor_m`, пароль **`Admin1234`**.

Подробная инструкция (Windows, телефон, `.env`): **[instruction.md](instruction.md)**.

---

## Быстрый запуск

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # при необходимости задайте JWT_SECRET
npm start
```

Сервер: **http://localhost:4000**  
Проверка: **http://localhost:4000/api/health**

### 2. Mobile (web)

```bash
cd mobile
npm install
cp .env.example .env   # по умолчанию EXPO_PUBLIC_API_URL=http://localhost:4000/api
npm start
```

В терминале Expo нажмите **`w`** для web, или откройте **http://localhost:8081**.

Для стабильного web-режима без hot reload (как на демо):

```bash
cd mobile
CI=1 EXPO_NO_TELEMETRY=1 npx expo start --web --port 8081 --offline
```

### 3. Mobile (телефон по Wi‑Fi)

1. Узнайте IP ПК (`ipconfig` / `ifconfig`).
2. В `mobile/.env` укажите: `EXPO_PUBLIC_API_URL=http://<IP_ПК>:4000/api`
3. Телефон и ПК — в одной Wi‑Fi сети.
4. Запустите backend и Expo Go / APK.

Подробнее: **[instruction.md](instruction.md)**, APK: **[intoapp.md](intoapp.md)**.

---

## Демо-логины

Пароль для всех тестовых пользователей: **`Admin1234`**

| Роль | Логин | Что проверить |
|------|--------|----------------|
| Администратор | `admin` | Вкладка «Админ»: заявки, заказы, сводка, чаты, клиенты |
| Специалист (монтажник) | `igor_m` | «Выезды», отчёт по заказу, доп. работы |
| Специалист (поверитель) | `sergey_p` | Назначенные выезды |
| Клиент | `anna_k` | «Мои заявки», каталог → «В заявку», отзывы, чат |

Дополнительные сотрудники в seed: `olga_o`, `maria_l`.

---

## Роли и основные функции

### Клиент (`client`)
- Регистрация с подтверждением email, восстановление пароля
- Заявки на выезд (создание, редактирование, отмена с подтверждением)
- Корзина каталога в заявке, выбор желаемого специалиста
- Заказы: таймлайн статусов, чат по заказу, доп. работы, перенос даты
- Отзывы по завершённым заказам, претензии, история обращений
- Онлайн-чат с администратором (`SupportChatWidget`)
- Сортировка списка заявок/заказов (новые, по активности, по дате выезда)

### Специалист (`employee`)
- Раздел «Выезды» — только назначенные опубликованные заказы
- Карточка выезда: адрес, работы, контакт, отчёт (статус, оплата, причина отказа)
- Дополнительные работы на объекте (с согласованием клиента)
- Свои отзывы (`EmployeeReviewsScreen`)

### Администратор (`admin`)
- **Сводка** — дашборд (заявки, просрочки, выручка)
- **Отчёты** — выезды и выручка за месяц
- **Заявки** — входящие (сайт, Telegram, приложение), согласование, предложение цены
- **Заказы** — все выезды, назначение специалиста, публикация
- **Каталог** — CRUD категорий и позиций
- **Журнал** — аудит действий
- **Претензии** — обработка жалоб клиентов
- **Поиск** — по заказам и клиентам
- **Клиенты** — карточки клиентов
- **Создать / Редактировать** — форма заказа с каталогом и чатом по заказу
- **Чаты** — переписка с клиентами и сотрудниками (бейдж непрочитанных)

---

## Соответствие требованиям диплома

| № | Требование | Реализация |
|---|------------|------------|
| 1 | Роли admin / employee / client | `users.role`, middleware `adminOnly`, `employeeOnly`, `clientOnly` |
| 2 | Админ-раздел | `AdminScreen` + панели (дашборд, отчёты, заявки, заказы, …) |
| 3 | Клиент: заявки и заказы | `ClientRequestsScreen`, `ClientRequestFormScreen`, `ClientOrderDetailScreen` |
| 4 | Регистрация только клиентов | `POST /api/auth/register` + валидация логина/пароля |
| 5 | Пароли в хэше | bcrypt → `password_hash` |
| 6 | Seed-данные | 6 пользователей, 9 позиций каталога, заявки, заказы, отзывы |
| 7 | Каталог с категориями | `GET /api/catalog`, фильтр, «В заявку» для клиента |
| 8 | React Native + Expo | `mobile/` |
| 9 | Экраны: главная, каталог, контакты, профиль, отзывы, чат, админ | см. `App.js` |
| 10 | Подтверждение email | `POST /api/auth/verify`, `VerifyScreen` |
| 11 | Согласие на ПДн | чекбокс в регистрации + `PrivacyScreen` |
| 12 | Обратная связь | `SupportChatWidget`, чат по заказу |
| 13 | Адаптивность | сетка каталога, web + native контакты |
| 14 | APK и QR | `intoapp.md`, `docs/release-and-qr.md` |
| 15 | Нагрузочное тестирование | `docs/jmeter-plan.md` |

---

## Технические детали (кратко)

- **API URL:** `EXPO_PUBLIC_API_URL` в `mobile/.env` (не хардкод в коде).
- **Авторизация:** JWT в заголовке `Authorization: Bearer …`.
- **Сортировка списков:** по `created_at` на сервере; на клиенте — чипы (`ListSortChips`): новые, старые, по активности, по дате выезда.
- **Подтверждения:** диалоги «Да / Нет» (web — `ConfirmHost`, native — `Alert`).
- **Дизайн:** `theme.js`, `styles/common.js`, компоненты `ActionButton`, `SectionCard`, `StatusBadge`.

Полный справочник: **[structure.md](structure.md)**.  
Ответы на защиту: **[defense-qa.md](defense-qa.md)**.
