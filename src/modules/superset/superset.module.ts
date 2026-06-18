import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SupersetService } from './superset.service';
import { SupersetController } from './superset.controller';
import { SupersetCacheService } from './superset-cache.service';
import { SupersetDashboardModule } from '../superset-dashboard/superset-dashboard.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 5,
    }),
    SupersetDashboardModule,
  ],
  controllers: [SupersetController],
  providers: [SupersetService, SupersetCacheService],
  exports: [SupersetService],
})
export class SupersetModule {}
