import { Controller, Post, UseGuards } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cleanup')
@UseGuards(JwtAuthGuard) // Только для авторизованных пользователей
export class CleanupController {
  constructor(private cleanupService: CleanupService) {}

  /**
   * Ручная очистка старых данных (для тестирования)
   * POST /cleanup
   */
  @Post()
  async cleanup() {
    return await this.cleanupService.cleanupAll();
  }
}

