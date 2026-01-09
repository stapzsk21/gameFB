import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL') || 
                        'postgresql://moyaigra_user:moyaigra_password@localhost:5432/moyaigra_db?schema=public';
    
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });
    
    super({ adapter });
  }

  async onModuleInit() {
    // Подключаемся к БД при старте приложения
    await this.$connect();
  }

  async onModuleDestroy() {
    // Аккуратно закрываем соединение с БД при остановке Nest-приложения
    await this.$disconnect();
  }
}



