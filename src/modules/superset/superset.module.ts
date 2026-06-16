import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SupersetService } from './superset.service';
import { SupersetController } from './superset.controller';
import { SupersetCacheService } from './superset-cache.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 5,
    }),
  ],
  controllers: [SupersetController],
  providers: [SupersetService, SupersetCacheService],
  exports: [SupersetService],
})
export class SupersetModule {}
