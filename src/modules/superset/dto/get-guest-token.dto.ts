import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class GetGuestTokenDto {
  @ApiProperty({
    example: '/dashboard',
    description: 'Route của dashboard trong application',
  })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiProperty({
    example: '/dashboard',
    description: 'Alias cũ của route, giữ tạm để tương thích',
    required: false,
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({
    example: '65f0f0f0f0f0f0f0f0f0f0f0',
    description: 'Application id, dùng khi nhiều application có cùng route',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  applicationId?: string;
}
