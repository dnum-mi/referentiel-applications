import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class RenameSavedFilterDto {
  @ApiProperty({
    description: "Nouveau nom du filtre personnel",
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
