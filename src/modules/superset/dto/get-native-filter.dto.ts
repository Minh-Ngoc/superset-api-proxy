import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetNativeFilterDto {
  @ApiProperty({
    example: '25146715-1e0e-4caf-9e25-51f93c3411ef',
    description: 'Dashboard ID trong Superset',
  })
  @IsString()
  @IsNotEmpty()
  dashboardId!: string;
}
