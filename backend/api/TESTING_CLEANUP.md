# Тестирование очистки старых данных

## Способ 1: Ручной вызов через API (рекомендуется) ⭐

### Шаг 1: Запусти сервер
```bash
cd backend/api
npm run start:dev
```

### Шаг 2: Авторизуйся через кошелёк
1. Открой браузер: `http://localhost:5173` (или твой фронтенд)
2. Нажми "Подключить кошелёк"
3. Подпиши сообщение в MetaMask

### Шаг 3: Получи access_token из cookies
1. Открой DevTools (F12)
2. Перейди в Application/Storage → Cookies
3. Найди `access_token` и скопируй его значение

### Шаг 4: Вызови очистку

**Вариант A: Через PowerShell (curl)**
```powershell
$token = "YOUR_ACCESS_TOKEN_HERE"
curl -X POST http://localhost:3001/cleanup -H "Cookie: access_token=$token"
```

**Вариант B: Через браузер (Console)**
```javascript
fetch('http://localhost:3001/cleanup', {
  method: 'POST',
  credentials: 'include', // Отправляет cookies автоматически
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Результат:', data))
.catch(err => console.error('Ошибка:', err));
```

**Вариант C: Через Postman/Insomnia**
- Method: `POST`
- URL: `http://localhost:3001/cleanup`
- Headers: `Cookie: access_token=YOUR_TOKEN`

### Шаг 5: Проверь ответ
```json
{
  "nonces": {
    "count": 5
  },
  "refreshTokens": {
    "count": 2
  }
}
```

## Способ 2: Быстрое тестирование cron-задач (каждую минуту) ⚡

Для быстрого теста можно временно изменить расписание:

1. **Открой `backend/api/src/cleanup/cleanup.service.ts`**

2. **Временно измени расписание:**
   ```typescript
   // Было:
   @Cron(CronExpression.EVERY_6_HOURS)
   @Cron('0 3 * * *')
   
   // Временно для теста (каждую минуту):
   @Cron('0 * * * * *')  // Каждую минуту в 0 секунд
   @Cron('0 * * * * *')  // Каждую минуту в 0 секунд
   ```

3. **Запусти сервер:**
   ```bash
   npm run start:dev
   ```

4. **Подожди 1-2 минуты и смотри логи в консоли:**
   ```
   [CleanupService] Начинаем очистку истёкших nonce...
   [CleanupService] Удалено 5 истёкших/использованных nonce
   [CleanupService] Начинаем очистку истёкших refresh токенов...
   [CleanupService] Удалено 2 истёкших/отозванных refresh токенов
   ```

5. **⚠️ ВАЖНО: Верни нормальное расписание после теста!**
   ```typescript
   @Cron(CronExpression.EVERY_6_HOURS)  // Каждые 6 часов
   @Cron('0 3 * * *')                     // Каждый день в 3:00
   ```

## Способ 3: Проверка через базу данных

1. **Подключись к PostgreSQL:**
   ```bash
   docker exec -it moyaigra_postgres psql -U moyaigra_user -d moyaigra_db
   ```

2. **Проверь количество записей до очистки:**
   ```sql
   SELECT COUNT(*) FROM "Nonce" WHERE "expiresAt" < NOW() OR "used" = true;
   SELECT COUNT(*) FROM "RefreshToken" WHERE "expiresAt" < NOW();
   ```

3. **Вызови очистку через API** (способ 1)

4. **Проверь количество записей после очистки:**
   ```sql
   SELECT COUNT(*) FROM "Nonce" WHERE "expiresAt" < NOW() OR "used" = true;
   SELECT COUNT(*) FROM "RefreshToken" WHERE "expiresAt" < NOW();
   ```

## Способ 4: Создание тестовых данных

Чтобы протестировать очистку, можно создать истёкшие записи:

```sql
-- Создать истёкший nonce
INSERT INTO "Nonce" ("wallet", "nonce", "expiresAt", "used")
VALUES ('0x123...', 'test-nonce', NOW() - INTERVAL '1 day', false);

-- Создать истёкший refresh токен
INSERT INTO "RefreshToken" ("userId", "tokenHash", "expiresAt")
VALUES (1, 'test-hash', NOW() - INTERVAL '1 day');
```

Затем вызови очистку и проверь, что записи удалены.

