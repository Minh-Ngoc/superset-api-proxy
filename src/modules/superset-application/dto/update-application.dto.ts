import { PartialType } from '@nestjs/swagger';
import { CreateSupersetApplicationDto } from './create-application.dto';

export class UpdateSupersetApplicationDto extends PartialType(
  CreateSupersetApplicationDto,
) {}
