import { ApiProperty } from "@nestjs/swagger";

export class HealthCheckDto {
  @ApiProperty({
    description: "Indique si l'API est en mode maintenance lecture seule",
    example: true,
  })
  maintenance: boolean;

  @ApiProperty({
    description: "Version du backend",
    example: "v1.86.0",
  })
  version: string;

  @ApiProperty({
    description: "État de la connexion à la base de données",
    enum: ["OK", "KO"],
    example: "OK",
  })
  etat: "OK" | "KO";
}

export class HealthCheckErrorDto extends HealthCheckDto {
  @ApiProperty({
    description: "Détail de l'indisponibilité",
    example: "La base de données est indisponible",
  })
  message: string;
}
