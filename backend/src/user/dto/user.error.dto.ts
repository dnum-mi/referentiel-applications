import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ScopePermissionsErrorDto {
  @ApiProperty({
    example: "Scope permissions denied",
    description:
      "Impossible de modifier un utilisateur en dehors de son scope d'organisation.",
  })
  @IsString()
  message: string;
}
