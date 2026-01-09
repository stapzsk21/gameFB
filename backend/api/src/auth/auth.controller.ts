import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { NonceDto } from './dto/nonce.dto';
import { VerifyDto } from './dto/verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('nonce')
  @Throttle({ auth: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  async getNonce(@Body() dto: NonceDto) {
    return this.authService.generateNonce(dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ verify: { limit: 10, ttl: 60000 } }) // 10 запросов в минуту
  async verify(
    @Body() dto: VerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifySignature(dto);

    // Устанавливаем токены в httpOnly cookies
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge:
        parseInt(
          this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1800'),
        ) * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge:
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '604800'),
        ) * 1000,
    });

    return {
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge:
        parseInt(
          this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1800'),
        ) * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge:
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '604800'),
        ) * 1000,
    });

    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Очищаем cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return {
      userId: req.user.userId,
      wallet: req.user.wallet,
    };
  }
}

