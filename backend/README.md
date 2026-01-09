# Backend для MoyaIGRA

## Шаг 1: Запуск PostgreSQL через Docker

1. Открой терминал в папке `backend`
2. Запусти Docker контейнер:
```bash
docker compose up -d
```

3. Проверь, что контейнер запущен:
```bash
docker ps
```

Должен появиться контейнер `moyaigra_postgres` со статусом "Up".

4. Остановить контейнер (когда не нужен):
```bash
docker compose down
```

5. Остановить и удалить данные:
```bash
docker compose down -v
```

## Шаг 2: Настройка переменных окружения

1. Скопируй `.env.example` в `.env`:
```bash
cp .env.example .env
```

2. Сгенерируй случайные секреты для JWT (минимум 32 символа каждый):
   - Можно использовать онлайн генератор: https://randomkeygen.com/
   - Или в терминале: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. Замени в `.env`:
   - `JWT_ACCESS_SECRET` - случайная строка для access токенов
   - `JWT_REFRESH_SECRET` - случайная строка для refresh токенов

## Шаг 3: Проверка подключения к БД

После запуска Docker, база данных будет доступна по адресу:
- Host: `localhost`
- Port: `5432`
- Database: `moyaigra_db`
- User: `moyaigra_user`
- Password: `moyaigra_password`

Можно проверить подключение через любой PostgreSQL клиент (pgAdmin, DBeaver, или через psql).

## Следующие шаги

После настройки БД, переходим к установке зависимостей и настройке ORM (Prisma или TypeORM).

