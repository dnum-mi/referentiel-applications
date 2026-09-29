import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class NotificationFiltersDto extends PaginationDto {
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
