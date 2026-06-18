import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from "class-validator";
import { RlsRuleDto } from "./rls-rule.dto";

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
      'Path phải bắt đầu bằng "/", không chứa "//", không kết thúc bằng "/" và chỉ chứa chữ, số, -, _, /',
  })
  path!: string;
 
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
 
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RlsRuleDto)
  rls!: RlsRuleDto[];
}