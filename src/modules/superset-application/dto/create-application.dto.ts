import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { SupersetApplicationEnv } from '../schemas/superset-application.schema';

export class CreateSupersetApplicationDto {
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsEnum(SupersetApplicationEnv)
  env!: SupersetApplicationEnv;
}
