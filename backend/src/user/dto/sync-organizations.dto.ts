import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class SyncOrganizationsDto {
  @ApiPropertyOptional({
    description:
      "Si true, traite uniquement les utilisateurs sans organisation (défaut: true)",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  onlyMissing?: boolean = true;
}
