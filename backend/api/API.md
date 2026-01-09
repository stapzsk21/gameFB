# API Документация - MoyaIGRA Backend

## Общая информация

**Базовый URL:** `http://localhost:3001` (development)  
**Формат данных:** JSON  
**Авторизация:** JWT токены в HTTP-only cookies

---

## Содержание

- [Аутентификация](#аутентификация)
  - [Получить nonce](#1-получить-nonce)
  - [Проверить подпись и авторизоваться](#2-проверить-подпись-и-авторизоваться)
  - [Обновить токены](#3-обновить-токены)
  - [Выйти](#4-выйти)
  - [Получить текущего пользователя](#5-получить-текущего-пользователя)
- [Профиль](#профиль)
  - [Получить профиль](#1-получить-профиль)
  - [Обновить прогресс](#2-обновить-прогресс)
- [Утилиты](#утилиты)
  - [Проверка здоровья](#1-проверка-здоровья)
  - [Отладка: количество пользователей](#2-отладка-количество-пользователей)
  - [Очистка данных](#3-очистка-данных)
- [Коды ошибок](#коды-ошибок)
- [Rate Limiting](#rate-limiting)
- [Примеры использования](#примеры-использования)

---

## Аутентификация

### 1. Получить nonce

Запрашивает одноразовый nonce для подписи сообщения кошельком.

**Endpoint:** `POST /auth/nonce`

**Rate Limit:** 5 запросов в минуту

**Запрос:**
```json
{
  "address": "0x008baaf59a5e2332260bb3d93c3f970511903725"
}
```

**Параметры:**
- `address` (string, required) - Ethereum адрес кошелька (формат: `0x` + 40 hex символов)

**Ответ (200 OK):**
```json
{
  "nonce": "a1b2c3d4e5f6...",
  "message": "Login to MoyaIGRA: a1b2c3d4e5f6..."
}
```

**Ошибки:**
- `400 Bad Request` - Неверный формат адреса
- `429 Too Many Requests` - Превышен лимит запросов

---

### 2. Проверить подпись и авторизоваться

Проверяет подпись сообщения и выдает JWT токены.

**Endpoint:** `POST /auth/verify`

**Rate Limit:** 10 запросов в минуту

**Запрос:**
```json
{
  "address": "0x008baaf59a5e2332260bb3d93c3f970511903725",
  "signature": "0x1234abcd..."
}
```

**Параметры:**
- `address` (string, required) - Ethereum адрес кошелька
- `signature` (string, required) - Подпись сообщения, полученного в `/auth/nonce`

**Ответ (200 OK):**
```json
{
  "user": {
    "id": 1,
    "wallet": "0x008baaf59a5e2332260bb3d93c3f970511903725"
  }
}
```

**Cookies (устанавливаются автоматически):**
- `access_token` - JWT токен доступа (30 минут по умолчанию)
- `refresh_token` - JWT токен обновления (7 дней по умолчанию)

**Ошибки:**
- `400 Bad Request` - Nonce не найден или истёк
- `401 Unauthorized` - Неверная подпись
- `429 Too Many Requests` - Превышен лимит запросов

**Примечания:**
- Если пользователь с таким кошельком не существует, он будет автоматически создан
- Nonce можно использовать только один раз
- Nonce истекает через 5 минут после создания

---

### 3. Обновить токены

Обновляет access и refresh токены.

**Endpoint:** `POST /auth/refresh`

**Авторизация:** Требуется (refresh_token в cookies)

**Запрос:**
```
(без тела, refresh_token берётся из cookies)
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

**Cookies (обновляются автоматически):**
- `access_token` - новый JWT токен доступа
- `refresh_token` - новый JWT токен обновления

**Ошибки:**
- `401 Unauthorized` - Refresh токен не найден или недействителен

**Примечания:**
- Старый refresh токен отзывается (ротация токенов)
- Новые токены устанавливаются в cookies автоматически

---

### 4. Выйти

Выходит из системы и отзывает refresh токен.

**Endpoint:** `POST /auth/logout`

**Авторизация:** Опциональна (если есть refresh_token, он будет отозван)

**Запрос:**
```
(без тела, refresh_token берётся из cookies если есть)
```

**Ответ (200 OK):**
```json
{
  "success": true
}
```

**Cookies (очищаются автоматически):**
- `access_token` - удаляется
- `refresh_token` - удаляется

**Ошибки:**
- Нет (всегда возвращает успех, даже если пользователь не авторизован)

---

### 5. Получить текущего пользователя

Возвращает информацию о текущем авторизованном пользователе.

**Endpoint:** `GET /auth/me`

**Авторизация:** Требуется (access_token в cookies)

**Запрос:**
```
(без тела, access_token берётся из cookies)
```

**Ответ (200 OK):**
```json
{
  "userId": 1,
  "wallet": "0x008baaf59a5e2332260bb3d93c3f970511903725"
}
```

**Ошибки:**
- `401 Unauthorized` - Токен не найден, истёк или недействителен

---

## Профиль

### 1. Получить профиль

Возвращает полную информацию о профиле пользователя, включая текущий score.

**Endpoint:** `GET /profile`

**Авторизация:** Требуется (access_token в cookies)

**Rate Limit:** 100 запросов в минуту

**Запрос:**
```
(без тела, access_token берётся из cookies)
```

**Ответ (200 OK):**
```json
{
  "id": 1,
  "wallet": "0x008baaf59a5e2332260bb3d93c3f970511903725",
  "score": 150,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Поля ответа:**
- `id` (number) - ID пользователя
- `wallet` (string) - Ethereum адрес кошелька
- `score` (number) - Текущий счёт игрока
- `createdAt` (string) - Дата регистрации (ISO 8601)

**Ошибки:**
- `401 Unauthorized` - Токен не найден, истёк или недействителен
- `404 Not Found` - Пользователь не найден
- `429 Too Many Requests` - Превышен лимит запросов

---

### 2. Обновить прогресс

Обновляет счёт игрока.

**Endpoint:** `PATCH /profile/progress`

**Авторизация:** Требуется (access_token в cookies)

**Rate Limit:** 1 запрос в секунду

**Запрос:**
```json
{
  "score": 200
}
```

**Или:**
```json
{
  "increment": 50
}
```

**Параметры:**
- `score` (number, optional) - Установить новый счёт (должен быть >= 0)
- `increment` (number, optional) - Увеличить счёт на указанное значение (должен быть >= 0)
- **Важно:** Должен быть указан либо `score`, либо `increment` (но не оба)

**Ответ (200 OK):**
```json
{
  "score": 200,
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

**Поля ответа:**
- `score` (number) - Новый счёт после обновления
- `updatedAt` (string) - Время обновления (ISO 8601)

**Ошибки:**
- `400 Bad Request` - Неверные параметры (оба параметра указаны или ни один)
- `401 Unauthorized` - Токен не найден, истёк или недействителен
- `404 Not Found` - Пользователь не найден
- `429 Too Many Requests` - Превышен лимит запросов (слишком частые обновления)

**Примеры:**

Установить счёт:
```json
{
  "score": 100
}
```

Увеличить счёт:
```json
{
  "increment": 25
}
```

---

## Утилиты

### 1. Проверка здоровья

Проверяет, что сервер работает.

**Endpoint:** `GET /`

**Авторизация:** Не требуется

**Запрос:**
```
(без параметров)
```

**Ответ (200 OK):**
```
Hello World!
```

---

### 2. Отладка: количество пользователей

Возвращает количество зарегистрированных пользователей (для отладки).

**Endpoint:** `GET /debug/users-count`

**Авторизация:** Не требуется

**Запрос:**
```
(без параметров)
```

**Ответ (200 OK):**
```json
{
  "count": 42
}
```

**Примечания:**
- Этот эндпоинт предназначен только для разработки
- В продакшене рекомендуется удалить или защитить этот эндпоинт

---

### 3. Очистка данных

Ручная очистка истёкших nonce и refresh токенов (для тестирования).

**Endpoint:** `POST /cleanup`

**Авторизация:** Требуется (access_token в cookies)

**Запрос:**
```
(без тела, access_token берётся из cookies)
```

**Ответ (200 OK):**
```json
{
  "nonces": {
    "count": 15
  },
  "refreshTokens": {
    "count": 3
  }
}
```

**Поля ответа:**
- `nonces.count` (number) - Количество удалённых nonce
- `refreshTokens.count` (number) - Количество удалённых refresh токенов

**Ошибки:**
- `401 Unauthorized` - Токен не найден, истёк или недействителен

**Примечания:**
- Автоматическая очистка выполняется по расписанию:
  - Nonce: каждые 6 часов
  - Refresh токены: каждый день в 3:00 ночи
- Этот эндпоинт предназначен для ручной очистки при необходимости

---

## Коды ошибок

### Стандартные HTTP коды

| Код | Описание | Когда возникает |
|-----|----------|----------------|
| `200` | OK | Успешный запрос |
| `400` | Bad Request | Неверные параметры запроса, неверный формат данных |
| `401` | Unauthorized | Токен не найден, истёк или недействителен |
| `403` | Forbidden | Доступ запрещён |
| `404` | Not Found | Ресурс не найден |
| `429` | Too Many Requests | Превышен лимит запросов (rate limiting) |
| `500` | Internal Server Error | Внутренняя ошибка сервера |

### Формат ответа с ошибкой

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/auth/verify",
  "method": "POST",
  "message": "Nonce не найден или истёк. Попробуйте подключиться снова.",
  "error": "Bad Request"
}
```

### Частые ошибки и решения

**"Nonce not found or expired"**
- Причина: Nonce истёк (5 минут) или уже использован
- Решение: Запросите новый nonce через `/auth/nonce`

**"Invalid signature"**
- Причина: Подпись не соответствует адресу кошелька
- Решение: Убедитесь, что подписываете правильное сообщение правильным кошельком

**"Too Many Requests"**
- Причина: Превышен лимит запросов
- Решение: Подождите указанное время и повторите запрос

**"Unauthorized"**
- Причина: Токен истёк или недействителен
- Решение: Используйте `/auth/refresh` для обновления токенов или авторизуйтесь заново

---

## Rate Limiting

API защищено от злоупотреблений с помощью rate limiting. Лимиты применяются к каждому IP адресу.

### Лимиты по эндпоинтам

| Эндпоинт | Лимит | Временное окно |
|----------|-------|----------------|
| `POST /auth/nonce` | 5 запросов | 1 минута |
| `POST /auth/verify` | 10 запросов | 1 минута |
| `GET /profile` | 100 запросов | 1 минута |
| `PATCH /profile/progress` | 1 запрос | 1 секунда |
| Остальные эндпоинты | 20 запросов | 1 минута (по умолчанию) |

### Ответ при превышении лимита

```json
{
  "statusCode": 429,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/auth/nonce",
  "method": "POST",
  "message": "Слишком много запросов. Пожалуйста, подождите.",
  "error": "Too Many Requests"
}
```

---

## Примеры использования

### Полный цикл авторизации (JavaScript/TypeScript)

```javascript
// 1. Подключить кошелёк (MetaMask)
const accounts = await window.ethereum.request({ 
  method: 'eth_requestAccounts' 
});
const address = accounts[0];

// 2. Получить nonce
const nonceResponse = await fetch('http://localhost:3001/auth/nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Важно для cookies
  body: JSON.stringify({ address })
});
const { message } = await nonceResponse.json();

// 3. Подписать сообщение
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, address]
});

// 4. Проверить подпись и авторизоваться
const verifyResponse = await fetch('http://localhost:3001/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Важно для cookies
  body: JSON.stringify({ address, signature })
});
const { user } = await verifyResponse.json();
console.log('Авторизован как:', user);

// 5. Получить профиль
const profileResponse = await fetch('http://localhost:3001/profile', {
  method: 'GET',
  credentials: 'include' // Важно для cookies
});
const profile = await profileResponse.json();
console.log('Профиль:', profile);

// 6. Обновить score
const updateResponse = await fetch('http://localhost:3001/profile/progress', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Важно для cookies
  body: JSON.stringify({ score: 100 })
});
const updated = await updateResponse.json();
console.log('Обновлённый score:', updated);

// 7. Выйти
await fetch('http://localhost:3001/auth/logout', {
  method: 'POST',
  credentials: 'include' // Важно для cookies
});
```

### Использование с Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true, // Важно для cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Получить nonce
const { data: nonceData } = await api.post('/auth/nonce', {
  address: '0x008baaf59a5e2332260bb3d93c3f970511903725'
});

// Проверить подпись
const { data: userData } = await api.post('/auth/verify', {
  address: '0x008baaf59a5e2332260bb3d93c3f970511903725',
  signature: '0x1234abcd...'
});

// Получить профиль
const { data: profile } = await api.get('/profile');

// Обновить score
const { data: updated } = await api.patch('/profile/progress', {
  score: 200
});
```

### Использование с cURL

```bash
# 1. Получить nonce
curl -X POST http://localhost:3001/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x008baaf59a5e2332260bb3d93c3f970511903725"}' \
  -c cookies.txt

# 2. Проверить подпись (после подписания сообщения)
curl -X POST http://localhost:3001/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"0x008baaf59a5e2332260bb3d93c3f970511903725","signature":"0x1234abcd..."}' \
  -b cookies.txt \
  -c cookies.txt

# 3. Получить профиль
curl -X GET http://localhost:3001/profile \
  -b cookies.txt

# 4. Обновить score
curl -X PATCH http://localhost:3001/profile/progress \
  -H "Content-Type: application/json" \
  -d '{"score":150}' \
  -b cookies.txt

# 5. Выйти
curl -X POST http://localhost:3001/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

---

## Примечания

### Cookies

- Токены хранятся в HTTP-only cookies для безопасности
- Cookies автоматически отправляются браузером при каждом запросе
- В запросах из JavaScript обязательно используйте `credentials: 'include'` или `withCredentials: true`

### Сеть

- API работает с Ethereum Sepolia testnet
- Адреса кошельков должны быть валидными Ethereum адресами (формат: `0x` + 40 hex символов)

### Безопасность

- Nonce одноразовые и истекают через 5 минут
- Refresh токены ротируются при каждом обновлении
- Все токены хранятся в HTTP-only cookies
- Rate limiting защищает от злоупотреблений

### Автоматическая очистка

- Истёкшие nonce удаляются каждые 6 часов
- Истёкшие refresh токены удаляются каждый день в 3:00 ночи

---

## Версия API

**Текущая версия:** 1.0.0  
**Дата последнего обновления:** 2024-01-15

---

## Поддержка

При возникновении проблем:
1. Проверьте формат запроса и параметры
2. Убедитесь, что используете правильный базовый URL
3. Проверьте, что cookies включены в запросах
4. Проверьте логи сервера для детальной информации об ошибках
