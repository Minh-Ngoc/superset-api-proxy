import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GetGuestTokenDto {
  @ApiProperty({
    example: '/dashboard',
    description: 'Path của page trong portal',
  })
  @IsString()
  @IsNotEmpty()
  path!: string;
}
