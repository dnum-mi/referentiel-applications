import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString } from "class-validator";

/// Origine de l'adresse de contact renvoyée par ContactAdminDto : admin dont le scope couvre le
/// périmètre de l'application (local), admin sans scope (global), ou adresse support statique si
/// aucun admin n'existe en base.
export const CONTACT_ADMIN_SOURCES = ["local", "global", "support"] as const;
export type ContactAdminSource = (typeof CONTACT_ADMIN_SOURCES)[number];

export class ContactAdminDto {
  @ApiProperty({
    example: "admin@interieur.gouv.fr",
    description: "Adresse e-mail de l'administrateur à contacter",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    enum: CONTACT_ADMIN_SOURCES,
    description:
      "Origine de l'adresse : admin local au périmètre de l'application, admin global, ou support si aucun admin n'existe",
  })
  @IsString()
  @IsIn(CONTACT_ADMIN_SOURCES)
  source: ContactAdminSource;
}
