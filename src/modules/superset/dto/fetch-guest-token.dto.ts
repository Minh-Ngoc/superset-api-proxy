import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class FetchGuestTokenDto {
  @IsOptional()
  rlsRules?: { clause: string; dataset: number }[];

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    example: '25146715-1e0e-4caf-9e25-51f93c3411ef',
    description: 'Embedded UUID của dashboard trong Superset',
  })
  @IsUUID()
  @IsNotEmpty()
  embeddedId!: string;
}
