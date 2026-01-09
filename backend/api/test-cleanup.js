/**
 * Простой скрипт для тестирования очистки через API
 * 
 * Использование:
 * 1. Запусти сервер: npm run start:dev
 * 2. Авторизуйся через кошелёк в браузере
 * 3. Скопируй access_token из cookies браузера
 * 4. Запусти: node test-cleanup.js YOUR_ACCESS_TOKEN
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001';
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('❌ Ошибка: нужно передать access_token как аргумент');
  console.log('Пример: node test-cleanup.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

async function testCleanup() {
  try {
    console.log('🧹 Запускаем очистку старых данных...\n');

    const response = await axios.post(
      `${API_URL}/cleanup`,
      {},
      {
        headers: {
          Cookie: `access_token=${ACCESS_TOKEN}`,
        },
      }
    );

    console.log('✅ Очистка выполнена успешно!\n');
    console.log('Результаты:');
    console.log(`  - Удалено nonce: ${response.data.nonces.count}`);
    console.log(`  - Удалено refresh токенов: ${response.data.refreshTokens.count}\n`);

    if (response.data.nonces.count === 0 && response.data.refreshTokens.count === 0) {
      console.log('ℹ️  Нет старых данных для очистки (это нормально, если база чистая)');
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Ошибка:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Ошибка: сервер не отвечает. Убедись, что сервер запущен на', API_URL);
    } else {
      console.error('❌ Ошибка:', error.message);
    }
    process.exit(1);
  }
}

testCleanup();

