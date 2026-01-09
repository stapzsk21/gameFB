import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: true,
      },
    });

    if (!user) {
      this.logger.warn(`Попытка получить профиль несуществующего пользователя: userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    const score = user.progress ? Number(user.progress.score) : 0;
    this.logger.debug(`Профиль получен: userId=${userId}, score=${score}`);

    return {
      id: user.id,
      wallet: user.wallet,
      score,
      createdAt: user.createdAt,
    };
  }

  async updateProgress(userId: number, dto: { score?: number; increment?: number }) {
    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { progress: true },
    });

    if (!user) {
      this.logger.warn(`Попытка обновить прогресс несуществующего пользователя: userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    // Если прогресс не существует, создаём
    if (!user.progress) {
      const newScore = BigInt(dto.score || dto.increment || 0);
      const newProgress = await this.prisma.progress.create({
        data: {
          userId,
          score: newScore,
        },
      });

      this.logger.log(`Прогресс создан для пользователя: userId=${userId}, score=${Number(newScore)}`);

      return {
        score: Number(newProgress.score),
        updatedAt: newProgress.updatedAt,
      };
    }

    // Обновляем прогресс
    const oldScore = Number(user.progress.score);
    let newScore: bigint;
    if (dto.increment !== undefined) {
      // Инкрементируем score
      newScore = user.progress.score + BigInt(dto.increment);
    } else if (dto.score !== undefined) {
      // Устанавливаем новое значение
      newScore = BigInt(dto.score);
    } else {
      throw new Error('Either score or increment must be provided');
    }

    const updatedProgress = await this.prisma.progress.update({
      where: { userId },
      data: {
        score: newScore,
      },
    });

    const finalScore = Number(updatedProgress.score);
    this.logger.log(`Прогресс обновлён: userId=${userId}, старый score=${oldScore}, новый score=${finalScore}, изменение=${finalScore - oldScore}`);

    return {
      score: finalScore,
      updatedAt: updatedProgress.updatedAt,
    };
  }
}

