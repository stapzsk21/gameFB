import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = this.translateMessage(exceptionResponse);
        error = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = this.translateMessage(responseObj.message || exception.message);
        error = responseObj.error || exception.message;
      }
    } else if (exception instanceof Error) {
      message = this.translateMessage(exception.message);
      error = exception.message;
    }

    // Извлекаем дополнительную информацию
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const userId = (request as any).user?.userId || (request as any).user?.sub || null;
    const wallet = (request as any).user?.wallet || null;

    // Формируем контекст для лога
    const logContext: string[] = [];
    if (userId) logContext.push(`userId=${userId}`);
    if (wallet) logContext.push(`wallet=${wallet}`);
    logContext.push(`ip=${ip}`);

    const contextString = logContext.length > 0 ? ` [${logContext.join(', ')}]` : '';

    // Логируем ошибку с контекстом
    const logMessage = `${request.method} ${request.url} - ${status} - ${message}${contextString}`;
    
    if (status >= 500) {
      // Серверные ошибки - логируем с полным стеком
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      // Клиентские ошибки - логируем как предупреждение
      this.logger.warn(logMessage);
    } else {
      // Другие ошибки
      this.logger.error(logMessage);
    }

    // Форматируем ответ
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Переводит сообщения об ошибках на русский
   */
  private translateMessage(message: string): string {
    const translations: Record<string, string> = {
      'Nonce not found or expired': 'Nonce не найден или истёк. Попробуйте подключиться снова.',
      'Invalid signature': 'Неверная подпись. Попробуйте подключиться снова.',
      'Refresh token not found': 'Токен обновления не найден. Пожалуйста, войдите снова.',
      'Invalid refresh token': 'Неверный токен обновления. Пожалуйста, войдите снова.',
      'Token expired': 'Токен истёк. Пожалуйста, войдите снова.',
      'Unauthorized': 'Не авторизован. Пожалуйста, войдите в систему.',
      'Forbidden': 'Доступ запрещён.',
      'Not found': 'Ресурс не найден.',
      'Bad Request': 'Неверный запрос.',
      'Too Many Requests': 'Слишком много запросов. Пожалуйста, подождите.',
      'Internal Server Error': 'Внутренняя ошибка сервера. Попробуйте позже.',
    };

    // Ищем точное совпадение или частичное
    for (const [key, value] of Object.entries(translations)) {
      if (message.includes(key) || message === key) {
        return value;
      }
    }

    // Если перевод не найден, возвращаем оригинальное сообщение
    return message;
  }
}

