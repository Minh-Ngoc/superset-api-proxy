import { PartialType } from '@nestjs/swagger';
import { CreateRlsTemplateDto } from './create-rls-template.dto';

export class UpdateRlsTemplateDto extends PartialType(CreateRlsTemplateDto) {}
