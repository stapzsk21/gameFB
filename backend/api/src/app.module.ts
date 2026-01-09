import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Включаем поддержку cron задач (должен быть первым)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'], // Ищем .env в текущей папке и на уровень выше
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 минута по умолчанию
        limit: 20, // 20 запросов в минуту по умолчанию
      },
      {
        name: 'short',
        ttl: 1000, // 1 секунда
        limit: 1, // 1 запрос
      },
      {
        name: 'auth',
        ttl: 60000, // 1 минута
        limit: 5, // 5 запросов
      },
      {
        name: 'verify',
        ttl: 60000, // 1 минута
        limit: 10, // 10 запросов
      },
      {
        name: 'profile',
        ttl: 60000, // 1 минута
        limit: 100, // 100 запросов в минуту для GET /profile
      },
    ]),
    PrismaModule,
    AuthModule,
    ProfileModule,
    CleanupModule, // Модуль для очистки старых данных
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
