import { Logger, Module } from '@nestjs/common';
import { SupersetModule } from './modules/superset/superset.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { RoleModule } from './modules/role/role.module';
import { AccountModule } from './modules/account/account.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { SupersetDashboardModule } from './modules/superset-dashboard/superset-dashboard.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt.guard';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── MongoDB ──────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('MONGODB_DB_NAME', 'superset_embed'),
        // Connection pool
        maxPoolSize: config.get<number>('MONGODB_MAX_POOL', 10),
        minPoolSize: config.get<number>('MONGODB_MIN_POOL', 2),
        // Timeouts
        serverSelectionTimeoutMS: 5_000,
        connectTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        // Auto-create indexes khi khởi động
        autoIndex: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    RedisModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const host = config.getOrThrow<string>('REDIS_HOST');
        const port = config.getOrThrow<number>('REDIS_PORT');
        const username = config.get<string>('REDIS_USERNAME');
        const password = config.get<string>('REDIS_PASSWORD');

        const logger = new Logger('RedisModule');
        logger.log(`Connecting to Redis: ${host}:${port}`);

        return {
          type: 'single',
          options: {
            host,
            port,
            username,
            password,
            onClientCreated(client) {
              client.on('connect', () => logger.log(`Redis connected: ${host}:${port}`));
              client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    SupersetModule,
    RoleModule,
    AccountModule,
    SupersetDashboardModule,
    AuthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
