import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Простой тестовый эндпоинт, чтобы проверить подключение к БД
  @Get('debug/users-count')
  async getUsersCount() {
    const count = await this.prisma.user.count();
    return { count };
  }
}
