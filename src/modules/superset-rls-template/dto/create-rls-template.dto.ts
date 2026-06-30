import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateRlsTemplateDto {
  @IsInt()
  @IsNotEmpty()
  dataset!: number;

  @IsString()
  @IsNotEmpty()
  clause!: string;

  @IsArray()
  @IsString({ each: true })
  variables!: string[];

  @IsMongoId()
  @IsNotEmpty()
  applicationId!: string;
}
