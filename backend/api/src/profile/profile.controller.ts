import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProfileService } from './profile.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @Throttle({ profile: { limit: 100, ttl: 60000 } }) // 100 запросов в минуту для GET /profile
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.userId);
  }

  @Patch('progress')
  @Throttle({ short: { limit: 1, ttl: 1000 } }) // 1 запрос в секунду (защита от спама score)
  async updateProgress(@Req() req: any, @Body() dto: UpdateProgressDto) {
    return this.profileService.updateProgress(req.user.userId, dto);
  }
}

