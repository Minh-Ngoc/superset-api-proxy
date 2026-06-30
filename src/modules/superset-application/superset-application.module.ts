import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SupersetApplication,
  SupersetApplicationSchema,
} from './schemas/superset-application.schema';
import { SupersetApplicationController } from './superset-application.controller';
import { SupersetApplicationService } from './superset-application.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupersetApplication.name, schema: SupersetApplicationSchema },
    ]),
  ],
  controllers: [SupersetApplicationController],
  providers: [SupersetApplicationService],
  exports: [SupersetApplicationService],
})
export class SupersetApplicationModule {}
