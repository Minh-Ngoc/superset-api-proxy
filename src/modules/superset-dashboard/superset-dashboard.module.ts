import { Module } from '@nestjs/common';
import { SupersetDashboardService } from './superset-dashboard.service';
import { SupersetDashboardController } from './superset-dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { SupersetDashboard, SupersetDashboardSchema } from './schemas/superset-dashboard.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupersetDashboard.name, schema: SupersetDashboardSchema },
    ]),
  ],
  controllers: [SupersetDashboardController],
  providers: [SupersetDashboardService],
  exports: [SupersetDashboardService],
})
export class SupersetDashboardModule {}
