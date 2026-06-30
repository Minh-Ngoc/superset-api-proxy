import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateRlsTemplateDto } from './dto/create-rls-template.dto';
import { UpdateRlsTemplateDto } from './dto/update-rls-template.dto';
import { SupersetRlsTemplateService } from './superset-rls-template.service';

@Controller('superset-rls-templates')
export class SupersetRlsTemplateController {
  constructor(
    private readonly rlsTemplateService: SupersetRlsTemplateService,
  ) {}

  @Post()
  create(@Body() dto: CreateRlsTemplateDto) {
    return this.rlsTemplateService.create(dto);
  }

  @Get()
  findAll(@Query('applicationId') applicationId?: string) {
    return this.rlsTemplateService.findAll(applicationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRlsTemplateDto) {
    return this.rlsTemplateService.update(id, dto);
  }
}
