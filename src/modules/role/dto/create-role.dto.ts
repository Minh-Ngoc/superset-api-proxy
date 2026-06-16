import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardPermissionDto {
  @ApiProperty({ example: '25146715-1e0e-4caf-9e25-51f93c3411ef' })
  @IsUUID()
  embeddedId!: string;

  @ApiPropertyOptional({
    example: [{ clause: "region = 'APAC'", dataset: 1 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  rlsRules?: { clause: string; dataset: number }[];
}

export class CreateRoleDto {
  @ApiProperty({ example: 'analyst' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'name chỉ được chứa chữ thường, số, dấu gạch ngang/dưới',
  })
  name!: string;

  @ApiProperty({ example: 'Data Analyst' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean;

  @ApiPropertyOptional({ type: [DashboardPermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardPermissionDto)
  @IsOptional()
  dashboardPermissions?: DashboardPermissionDto[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
