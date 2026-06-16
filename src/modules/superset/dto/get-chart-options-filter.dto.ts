import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetChartOptionsFilterDto {
  @ApiProperty({
    example: '25146715-1e0e-4caf-9e25-51f93c3411ef',
    description: 'Dashboard ID trong Superset',
  })
  @IsString()
  @IsNotEmpty()
  datasetId!: string;

  @IsArray()
  @IsString({ each: true })
  columns!: string[];
}
