import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateSupersetApplicationDto } from './dto/create-application.dto';
import { UpdateSupersetApplicationDto } from './dto/update-application.dto';
import { SupersetApplicationService } from './superset-application.service';

@Controller('superset-applications')
export class SupersetApplicationController {
  constructor(
    private readonly applicationService: SupersetApplicationService,
  ) {}

  @Post()
  create(@Body() dto: CreateSupersetApplicationDto) {
    return this.applicationService.create(dto);
  }

  @Get()
  findAll() {
    return this.applicationService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupersetApplicationDto) {
    return this.applicationService.update(id, dto);
  }
}
