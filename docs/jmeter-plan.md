# Нагрузочное тестирование API (JMeter)

План нагрузочного тестирования серверной части приложения ООО «Водоучет».

См. также: [README.md](../README.md), [defense-qa.md](../defense-qa.md).

---

## Цель

Проверить производительность REST API при одновременных запросах:

- служебные endpoint'ы;
- каталог (основная нагрузка при просмотре);
- отзывы;
- раздача статики изображений.

---

## Стенд

| Параметр | Значение |
|----------|----------|
| Backend | Node.js + Express + SQLite (`node:sqlite`) |
| Порт | 4000 (API + web при наличии `mobile/dist`) |
| БД | `server/data.sqlite` (импорт из `data.json` при первом запуске) |
| Статика | `/static/catalog/item1.png` … |

Перед тестом запустите сервер:

```bash
cd server && npm start
```

---

## Базовый сценарий (Thread Group)

| Параметр | Значение |
|----------|----------|
| Number of Threads (users) | 50 |
| Ramp-up Period | 10 sec |
| Loop Count | 20 |

**HTTP Request Defaults:**

- Server: `localhost`
- Port: `4000`
- Protocol: `http`

---

## Запросы

| № | Метод | Путь | Назначение |
|---|-------|------|------------|
| 1 | GET | `/api/health` | Проверка доступности |
| 2 | GET | `/api/catalog` | Каталог услуг |
| 3 | GET | `/api/reviews` | Список отзывов |
| 4 | GET | `/static/catalog/item1.png` | Локальная статика |

### Расширенный сценарий (опционально)

| Метод | Путь | Примечание |
|-------|------|------------|
| POST | `/api/auth/login` | Body: `{"login":"admin","password":"Admin1234"}` |
| GET | `/api/profile` | Header: `Authorization: Bearer <token>` |

---

## Listeners (отчёты)

- **Summary Report** — сводка
- **Aggregate Report** — среднее, медиана, throughput
- **View Results Tree** — только для отладки (отключить на финальном прогоне)

---

## Что включить в пояснительную записку

1. Конфигурация стенда (ОС, CPU, RAM, версия Node.js).
2. Параметры Thread Group (50 users, 10 s ramp-up, 20 loops).
3. Таблица результатов по каждому endpoint:
   - среднее время ответа (ms);
   - throughput (req/sec);
   - error %.
4. Скриншоты Summary / Aggregate Report.
5. Краткий вывод: выдерживает ли прототип учебную нагрузку.

---

## Критерии успешности (пример для курсовой)

| Метрика | Порог |
|---------|-------|
| Error % | < 1% |
| Среднее время `/api/catalog` | < 500 ms при 50 VU |
| Среднее время `/api/health` | < 100 ms |

> SQLite — файловая СУБД; при высокой конкуренции **записей** возможны задержки. Для production рекомендуется PostgreSQL. Сценарий ниже — преимущественно **чтение** (GET).

---

## Ограничения учебного стенда

- Тест выполняется на локальном ПК, не в облаке.
- Нет HTTPS — для JMeter это допустимо.
- Параллельные **записи** (POST/PATCH) в сценарий лучше не включать без отдельной подготовки данных.

---

## Связанные документы

- [README.md](../README.md)
- [structure.md](../structure.md) — список API
- [defense-qa.md](../defense-qa.md)
