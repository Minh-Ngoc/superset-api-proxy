import {
  IsArray,
  IsNumber,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RlsRuleDto {
  @ApiProperty({
    description: 'SQL WHERE clause áp dụng cho dataset',
    example: "region = 'APAC'",
  })
  @IsString()
  @IsNotEmpty()
  clause!: string;

  @ApiProperty({
    description: 'Superset dataset ID áp dụng rule này',
    example: 1,
  })
  @IsNumber()
  dataset!: number;
}

export class GrantDashboardDto {
  @ApiProperty({
    description: 'embeddedId của dashboard (UUID từ Superset)',
    example: '25146715-1e0e-4caf-9e25-51f93c3411ef',
  })
  @IsString()
  @IsNotEmpty()
  embeddedId!: string;

  @ApiPropertyOptional({
    description:
      'RLS rules áp dụng cho role này trên dashboard này. Để trống = không filter row-level.',
    type: [RlsRuleDto],
    example: [{ clause: "region = 'APAC'", dataset: 1 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RlsRuleDto)
  @IsOptional()
  rlsRules?: RlsRuleDto[] = [];
}
