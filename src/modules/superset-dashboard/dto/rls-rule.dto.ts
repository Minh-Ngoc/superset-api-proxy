import { IsArray, IsInt, IsNotEmpty, IsString } from "class-validator";

export class RlsRuleDto {
  @IsInt()
  @IsNotEmpty()
  dataset!: number;
 
  /**
   * Clause template, phải chứa {{phone}} nếu cần filter theo user.
   * Ví dụ: "hierarchy_phone IS NOT NULL AND hierarchy_phone @> ARRAY['{{phone}}']"
   */
  @IsString()
  @IsNotEmpty()
  clause!: string;

  @IsArray()
  @IsString({ each: true })
  variables!: string[];
}