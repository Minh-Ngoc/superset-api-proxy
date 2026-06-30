import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateSupersetDashboardDto {
  @IsString()
  @IsNotEmpty()
  embeddedId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\/(?!\/)(?!.*\/$)[a-zA-Z0-9\-_\/]*$/, {
    message:
      'Route phải bắt đầu bằng "/", không chứa "//", không kết thúc bằng "/" và chỉ chứa chữ, số, -, _, /',
  })
  route!: string;

  @IsMongoId()
  @IsNotEmpty()
  applicationId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  rlsTemplateIds?: string[];
}
