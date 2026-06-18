import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
   constructor(
        private accountService: AccountService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

  async login(dto: LoginDto) {
    const account = await this.accountService.findByUsername(dto.username);

    if (!account) {
      throw new UnauthorizedException('Account Not Found!');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      account.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect Password!');
    }

    // Generate tokens
    const payload = {
      userId: account._id.toString(),
      phone: account.phone.toString(),
    };

    const jwtAccessTokenExp = this.configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION');
    const jwtRefreshTokenExp = this.configService.getOrThrow('JWT_REFRESH_TOKEN_EXPIRATION');

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.parseExpiration(jwtAccessTokenExp),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.parseExpiration(jwtRefreshTokenExp),
    });


    return {
      accessToken,
      refreshToken,
      user: {
        id: account?._id,
        username: account?.username,
        phone: account?.phone
      },
    };
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}
