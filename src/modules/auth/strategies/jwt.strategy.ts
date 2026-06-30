import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountService } from 'src/modules/account/account.service';

export interface JwtPayload {
  userId: string;
  phone: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private accountService: AccountService,
  ) {
    const jwtSecret = configService.getOrThrow('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT secret is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const account = await this.accountService.findById(payload?.userId);

    if (!account) {
      throw new UnauthorizedException('User Not Found!')
    }

    return {
      userId: account?._id?.toString(),
      phone: account?.phone,
    };
  }
}
