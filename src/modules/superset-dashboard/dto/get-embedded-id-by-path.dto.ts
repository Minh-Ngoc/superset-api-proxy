import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class GetEmbeddedIdByPathDto {
  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsMongoId()
  applicationId?: string;
}
