import { ApiProperty } from "@nestjs/swagger";
import { Permission, Roles } from "@prisma/client";

export class UserPermissionLogDto {
  @ApiProperty({ description: "ID unique de l'entrée d'historique" })
  id: string;

  @ApiProperty({ description: "Date de la modification" })
  createdAt: Date;

  @ApiProperty({
    enum: Roles,
    enumName: "Roles",
    required: false,
    nullable: true,
    description: "Rôle de l'utilisateur après la modification",
  })
  role: Roles | null;

  @ApiProperty({
    enum: Permission,
    enumName: "Permission",
    isArray: true,
    description:
      "Permissions supplémentaires de l'utilisateur après la modification",
  })
  additionalPermissions: Permission[];

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Email de la personne ayant effectué la modification. Null si la modification est automatique (création de compte) ou si l'auteur a depuis été supprimé.",
  })
  changedByEmail: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Email de l'administrateur réel si la modification a été faite sous impersonation (#2061).",
  })
  impersonatorEmail: string | null;
}
