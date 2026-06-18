import { IsNotEmpty, IsString } from "class-validator";

export class GetEmbeddedIdByPathDto {
    @IsString()
    @IsNotEmpty()
    path!: string;
}