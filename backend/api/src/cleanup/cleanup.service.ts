import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Очистка истёкших и использованных nonce
   * Запускается каждые 6 часов
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupExpiredNonces() {
    this.logger.log('Начинаем очистку истёкших nonce...');

    try {
      const now = new Date();

      // Удаляем все nonce, которые:
      // 1. Истекли (expiresAt < now)
      // 2. Или были использованы (used = true)
      const result = await this.prisma.nonce.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true },
          ],
        },
      });

      this.logger.log(`Удалено ${result.count} истёкших/использованных nonce`);
      return result;
    } catch (error) {
      this.logger.error('Ошибка при очистке nonce:', error);
      throw error;
    }
  }

  /**
   * Очистка истёкших и отозванных refresh токенов
   * Запускается каждый день в 3:00 ночи
   */
  @Cron('0 3 * * *') // Каждый день в 3:00
  async cleanupExpiredRefreshTokens() {
    this.logger.log('Начинаем очистку истёкших refresh токенов...');

    try {
      const now = new Date();

      // Удаляем все refresh токены, которые:
      // 1. Истекли (expiresAt < now)
      // 2. Или были отозваны и истекли (revokedAt не null и expiresAt < now)
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            {
              revokedAt: { not: null },
              expiresAt: { lt: now },
            },
          ],
        },
      });

      this.logger.log(`Удалено ${result.count} истёкших/отозванных refresh токенов`);
      return result;
    } catch (error) {
      this.logger.error('Ошибка при очистке refresh токенов:', error);
      throw error;
    }
  }

  /**
   * Ручная очистка (можно вызвать через API для тестирования)
   */
  async cleanupAll() {
    this.logger.log('Ручная очистка всех старых данных...');

    const nonceResult = await this.cleanupExpiredNonces();
    const tokenResult = await this.cleanupExpiredRefreshTokens();

    return {
      nonces: nonceResult,
      refreshTokens: tokenResult,
    };
  }
}

