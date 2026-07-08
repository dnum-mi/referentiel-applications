import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateLicenseDto {
  @ApiProperty({
    example: "MIT",
    description: "Nom / identifiant SPDX de la licence",
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: "2.0",
    description: "Version de la licence si pertinent",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string | null;
}

export class LicenseDto extends CreateLicenseDto {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant unique de la licence",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant de l'application",
  })
  @IsString()
  applicationId: string;
}

export class LicenseErrorResponseDto {
  @ApiProperty({
    example: "Cette licence est déjà renseignée pour cette application",
    description: "Message d'erreur en cas de conflit",
  })
  @IsString()
  message: string;
}
