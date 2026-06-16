import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class NativeFilterDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  datasetId!: string;

  @IsString()
  column!: string;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  multiSelect!: boolean;

  @IsOptional()
  @IsString()
  controlValues?: string;
}

class FilterOptions {
  [column: string]: Array<string | number>;
}

export class CreatePermalinkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NativeFilterDto)
  nativeFilters!: NativeFilterDto[];

  @IsObject()
  filterOptions!: FilterOptions;

  @IsString()
  dashboardId!: string;
}
