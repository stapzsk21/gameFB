import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { NonceDto } from './dto/nonce.dto';
import { VerifyDto } from './dto/verify.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateNonce(dto: NonceDto) {
    const wallet = dto.address.toLowerCase();
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() +
        parseInt(this.configService.get<string>('NONCE_EXPIRES_IN', '300')) *
          1000,
    );

    // Удаляем старые nonce для этого кошелька
    await this.prisma.nonce.deleteMany({
      where: {
        wallet,
        OR: [{ used: true }, { expiresAt: { lt: new Date() } }],
      },
    });

    // Создаём новый nonce
    await this.prisma.nonce.create({
      data: {
        wallet,
        nonce,
        expiresAt,
      },
    });

    this.logger.log(`Nonce запрошен для кошелька: ${wallet}`);

    const message = `Login to MoyaIGRA: ${nonce}`;
    return { nonce, message };
  }

  async verifySignature(dto: VerifyDto) {
    const wallet = dto.address.toLowerCase();
    const signature = dto.signature;

    // Находим актуальный nonce
    const nonceRecord = await this.prisma.nonce.findFirst({
      where: {
        wallet,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!nonceRecord) {
      this.logger.warn(`Попытка авторизации с недействительным nonce для кошелька: ${wallet}`);
      throw new BadRequestException('Nonce not found or expired');
    }

    const message = `Login to MoyaIGRA: ${nonceRecord.nonce}`;

    // Проверяем подпись
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== wallet) {
        this.logger.warn(`Неверная подпись для кошелька: ${wallet}`);
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Ошибка проверки подписи для кошелька: ${wallet}`, error);
      throw new UnauthorizedException('Invalid signature');
    }

    // Помечаем nonce как использованный
    await this.prisma.nonce.update({
      where: { id: nonceRecord.id },
      data: { used: true },
    });

    // Находим или создаём пользователя
    let user = await this.prisma.user.findUnique({
      where: { wallet },
    });

    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          wallet,
        },
      });

      // Создаём прогресс для нового пользователя
      await this.prisma.progress.create({
        data: {
          userId: user.id,
          score: BigInt(0),
        },
      });

      this.logger.log(`Новый пользователь зарегистрирован: userId=${user.id}, wallet=${wallet}`);
    } else {
      this.logger.log(`Пользователь авторизован: userId=${user.id}, wallet=${wallet}`);
    }

    // Генерируем токены
    const accessToken = this.generateAccessToken(user.id, wallet);
    const refreshToken = await this.generateRefreshToken(user.id);

    this.logger.log(`Токены сгенерированы для пользователя: userId=${user.id}, новый пользователь: ${isNewUser}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        wallet: user.wallet,
      },
    };
  }

  private generateAccessToken(userId: number, wallet: string): string {
    const payload = {
      sub: userId,
      wallet,
      type: 'access',
    };

    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: parseInt(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1800'),
      ),
    });
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(
      Date.now() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '604800'),
        ) *
          1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: { user: true },
    });

    if (!tokenRecord) {
      this.logger.warn(`Попытка обновления токена с недействительным refresh token`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Помечаем старый токен как отозванный
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Генерируем новые токены (ротация)
    const newAccessToken = this.generateAccessToken(
      tokenRecord.userId,
      tokenRecord.user.wallet,
    );
    const newRefreshToken = await this.generateRefreshToken(
      tokenRecord.userId,
    );

    this.logger.log(`Токены обновлены для пользователя: userId=${tokenRecord.userId}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count > 0) {
      // Получаем userId для логирования
      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: { tokenHash },
        include: { user: true },
      });

      if (tokenRecord) {
        this.logger.log(`Пользователь вышел: userId=${tokenRecord.userId}`);
      } else {
        this.logger.log(`Refresh токен отозван (logout)`);
      }
    } else {
      this.logger.warn(`Попытка выхода с недействительным refresh token`);
    }
  }
}

