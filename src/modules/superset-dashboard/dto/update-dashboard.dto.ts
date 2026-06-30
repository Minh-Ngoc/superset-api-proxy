import { PartialType } from '@nestjs/swagger';
import { CreateSupersetDashboardDto } from './create-dashboard.dto';

export class UpdateSupersetDashboardDto extends PartialType(
  CreateSupersetDashboardDto,
) {}
