import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({
        example: 'john.doe',
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.toLowerCase())
    username!: string;

    @ApiProperty({
        example: '123123',
    })
    @IsString()
    @IsNotEmpty()
    password!: string;
}