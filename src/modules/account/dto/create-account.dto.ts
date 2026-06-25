import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAccountDto {
  @ApiProperty({
    example: 'john.doe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => value?.toLowerCase())
  username!: string;

  @ApiProperty({
    example: '123123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  password!: string;

  @ApiProperty({
    example: 'analyst',
    description: 'Tên role (phải tồn tại trong collection roles)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'roleName chỉ được chứa chữ thường, số, dấu gạch ngang/dưới',
  })
  roleName!: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: {
      displayName: 'John Doe',
      email: 'john@example.com',
      department: 'Data',
    },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
