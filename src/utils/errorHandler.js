/**
 * Утилита для обработки и форматирования ошибок
 */

/**
 * Извлекает понятное сообщение об ошибке из ответа API
 */
export function getErrorMessage(error) {
  // Если это ошибка сети (нет ответа от сервера)
  if (!error.response) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      return 'Сервер не отвечает. Проверьте подключение к интернету.';
    }
    if (error.message?.includes('timeout')) {
      return 'Превышено время ожидания. Попробуйте позже.';
    }
    return 'Ошибка сети. Проверьте подключение к интернету.';
  }

  // Если есть ответ от сервера
  const { status, data } = error.response;

  // Пытаемся получить сообщение из ответа
  if (data?.message) {
    return data.message;
  }

  // Стандартные сообщения для разных статусов
  const statusMessages = {
    400: 'Неверный запрос. Проверьте введённые данные.',
    401: 'Не авторизован. Пожалуйста, войдите в систему.',
    403: 'Доступ запрещён.',
    404: 'Ресурс не найден.',
    429: 'Слишком много запросов. Пожалуйста, подождите.',
    500: 'Ошибка сервера. Попробуйте позже.',
    502: 'Сервер временно недоступен. Попробуйте позже.',
    503: 'Сервис временно недоступен. Попробуйте позже.',
  };

  return statusMessages[status] || `Ошибка ${status}. Попробуйте позже.`;
}

/**
 * Показывает уведомление об ошибке пользователю
 * (можно заменить на toast-библиотеку в будущем)
 */
export function showError(message) {
  // Временное решение - можно заменить на toast-уведомления
  console.error('Ошибка:', message);
  
  // Если есть глобальная функция для показа уведомлений, используем её
  if (window.showNotification) {
    window.showNotification(message, 'error');
    return;
  }

  // Иначе используем alert (временное решение)
  alert(`❌ ${message}`);
}

/**
 * Обрабатывает ошибку и показывает сообщение пользователю
 */
export function handleError(error, customMessage = null) {
  const message = customMessage || getErrorMessage(error);
  showError(message);
  return message;
}

