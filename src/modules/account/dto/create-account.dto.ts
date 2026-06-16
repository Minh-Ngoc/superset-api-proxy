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

export class CreateAccountDto {
  @ApiProperty({
    example: 'john.doe',
    description: 'Username phải khớp với username trong Superset',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  username!: string;

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
