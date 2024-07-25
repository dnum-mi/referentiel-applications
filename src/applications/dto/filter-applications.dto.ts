import { ApiProperty } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
} from 'class-validator';
import { StatutEnum } from '../enums/app-status';
import { SensibiliteEnum } from '../enums/app-sensibilite';
import { PaginationQury } from '../../global-dto/pagination.dto';

export class FilterApplicationsDto extends PaginationQury {
  @ApiProperty()
  @IsString()
  @IsOptional()
  nom?: string | undefined;

  @ApiProperty()
  @IsString()
  @IsOptional()
  organisation?: string | undefined;

  @ApiProperty()
  @IsEnum(SensibiliteEnum)
  @IsOptional()
  sensibilite?: SensibiliteEnum;

  @ApiProperty()
  @IsOptional()
  @IsEnum(StatutEnum)
  statut?: StatutEnum;

  @IsJSON()
  @ApiProperty({
    example: {
      type: 'PAI',
      codeCourt: 'CAN',
    },
    description: `code de l'application dans un référentiel tiers (exemple: API)`,
  })
  @IsOptional()
  code?: string;

  @ApiProperty()
  @IsBooleanString()
  @IsOptional()
  parent?: boolean;
}
