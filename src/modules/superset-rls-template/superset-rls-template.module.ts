import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupersetApplicationModule } from '../superset-application/superset-application.module';
import { RlsTemplate, RlsTemplateSchema } from './schemas/rls-template.schema';
import { SupersetRlsTemplateController } from './superset-rls-template.controller';
import { SupersetRlsTemplateService } from './superset-rls-template.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RlsTemplate.name, schema: RlsTemplateSchema },
    ]),
    SupersetApplicationModule,
  ],
  controllers: [SupersetRlsTemplateController],
  providers: [SupersetRlsTemplateService],
  exports: [SupersetRlsTemplateService],
})
export class SupersetRlsTemplateModule {}
