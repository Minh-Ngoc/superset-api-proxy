import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SupersetDashboardService } from './superset-dashboard.service';
import { CreateSupersetDashboardDto } from './dto/create-dashboard.dto';
import { UpdateSupersetDashboardDto } from './dto/update-dashboard.dto';
import { GetEmbeddedIdByPathDto } from './dto/get-embedded-id-by-path.dto';

@Controller('superset-dashboards')
export class SupersetDashboardController {
  constructor(private readonly dashboardService: SupersetDashboardService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateSupersetDashboardDto) {
    return this.dashboardService.create(dto);
  }

  @Get('embedded')
  getEmbeddedDashboardByPath(@Query() query: GetEmbeddedIdByPathDto) {
    return this.dashboardService.findByPath(query?.path);
  }

  @Get()
  findAll() {
    return this.dashboardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dashboardService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupersetDashboardDto) {
    return this.dashboardService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dashboardService.remove(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.dashboardService.toggleActive(id);
  }
}
