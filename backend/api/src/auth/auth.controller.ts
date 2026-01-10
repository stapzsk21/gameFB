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

    // Настройки cookies для cross-domain (фронтенд и бэкенд на разных доменах)
    // В production используем sameSite: 'none' + secure: true для cross-domain
    // В development используем sameSite: 'lax' + secure: false для localhost
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // sameSite: 'none' требует secure: true
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      // Не устанавливаем domain для cross-domain cookies
      maxAge:
        parseInt(
          this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1800'),
        ) * 1000,
    };

    // В development можно использовать domain для тестирования
    if (cookieDomain && !isProduction) {
      cookieOptions.domain = cookieDomain;
    }

    res.cookie('access_token', result.accessToken, cookieOptions);

    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
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

            const cookieOptions: any = {
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? ('none' as const) : ('lax' as const),
              maxAge:
                parseInt(
                  this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1800'),
                ) * 1000,
            };

            if (cookieDomain && !isProduction) {
              cookieOptions.domain = cookieDomain;
            }

            res.cookie('access_token', result.accessToken, cookieOptions);

            res.cookie('refresh_token', result.refreshToken, {
              ...cookieOptions,
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

    // Очищаем cookies с теми же настройками, что и при установке
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    
    const clearCookieOptions: any = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };

    res.clearCookie('access_token', clearCookieOptions);
    res.clearCookie('refresh_token', clearCookieOptions);

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

