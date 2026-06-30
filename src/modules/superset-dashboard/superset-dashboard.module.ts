import { Module } from '@nestjs/common';
import { SupersetDashboardService } from './superset-dashboard.service';
import { SupersetDashboardController } from './superset-dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { SupersetApplicationModule } from '../superset-application/superset-application.module';
import { SupersetRlsTemplateModule } from '../superset-rls-template/superset-rls-template.module';
import {
  SupersetDashboard,
  SupersetDashboardSchema,
} from './schemas/superset-dashboard.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupersetDashboard.name, schema: SupersetDashboardSchema },
    ]),
    SupersetApplicationModule,
    SupersetRlsTemplateModule,
  ],
  controllers: [SupersetDashboardController],
  providers: [SupersetDashboardService],
  exports: [SupersetDashboardService],
})
export class SupersetDashboardModule {}
