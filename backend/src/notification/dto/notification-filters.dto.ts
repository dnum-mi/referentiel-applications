import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { NotificationType } from "@prisma/client";
import { PaginationDto } from "src/common/dto";

export class NotificationFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: NotificationType,
    enumName: "NotificationType",
    description:
      "Filtrer par type d’événement. Sans ce paramètre, tous les types sont renvoyés.",
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    type: "integer",
    minimum: 0,
    description: "Numéro de page, à partir de zéro",
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare page?: number;

  @ApiPropertyOptional({
    type: "integer",
    minimum: 0,
    maximum: 100,
    default: 15,
    description: "Nombre de résultats par page, 0 pour supprimer la pagination",
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  declare pageSize?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      "Filtrer sur l'état de lecture : false pour les notifications non lues, true pour les notifications lues. Sans ce paramètre, les deux états sont renvoyés.",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean()
  isRead?: boolean;
}
