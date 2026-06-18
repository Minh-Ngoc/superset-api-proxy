import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [
    PassportModule,
    AccountModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.getOrThrow('JWT_SECRET');
        const accessTokenExpiration = configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION');

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: accessTokenExpiration as StringValue,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
