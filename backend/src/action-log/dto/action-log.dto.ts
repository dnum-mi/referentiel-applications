import { ApiProperty, ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto";
import { UserEntity } from "src/user/entities/user.entity";

class ActionLogUserDto extends PickType(UserEntity, ["id", "email"]) {}

export class ActionLogFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Date minimum (inclusive)",
    example: "2023-01-01T00:00:00.000Z",
    type: String,
  })
  @IsOptional()
  @IsDateString()
  createdAtGte?: string;

  @ApiPropertyOptional({
    description: "Date maximum (inclusive)",
    example: "2023-12-31T23:59:59.999Z",
    type: String,
  })
  @IsOptional()
  @IsDateString()
  createdAtLte?: string;

  @ApiPropertyOptional({
    description:
      "Recherche libre sur le chemin de la requête ou l'email de l'identité effective / de l'administrateur réel",
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ActionLogDto {
  @ApiProperty({ description: "ID unique de l'entrée du journal" })
  id: string;

  @ApiProperty({ description: "Date de la requête" })
  createdAt: Date;

  @ApiProperty({ description: "Méthode HTTP de la requête" })
  method: string;

  @ApiProperty({ description: "Chemin de la requête (sans query string)" })
  path: string;

  @ApiProperty({ description: "Code de statut HTTP renvoyé" })
  statusCode: number;

  @ApiProperty({
    type: ActionLogUserDto,
    description:
      "Identité effective de la requête (la cible en cas d'impersonation)",
  })
  user: ActionLogUserDto;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "ID de l'administrateur réel si l'action a été faite sous impersonation",
  })
  impersonatorId?: string | null;

  @ApiProperty({
    type: ActionLogUserDto,
    required: false,
    nullable: true,
    description:
      "Administrateur réel si l'action a été faite sous impersonation",
  })
  impersonator?: ActionLogUserDto | null;
}
