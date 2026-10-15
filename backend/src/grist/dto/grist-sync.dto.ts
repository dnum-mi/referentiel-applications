import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";
import { GRIST_DOC_ID_PATTERN } from "src/user/dto/update-user.dto";
import {
  DEFAULT_GRIST_COLUMN_FIELDS,
  GRIST_COLUMN_FIELDS,
} from "../grist-columns";

/// Nom des tables écrites par la synchronisation : RefApp, RefApp2, RefApp3…
export const GRIST_TABLE_ID_PATTERN = /^RefApp([2-9]|[1-9]\d+)?$/;
const GRIST_SYNC_TARGETS_MAX = 20;

export class GristSyncTargetDto {
  @ApiProperty({ description: "Identifiant d'un document Grist du profil" })
  @IsString()
  @Matches(GRIST_DOC_ID_PATTERN)
  docId: string;

  @ApiProperty({
    required: false,
    description:
      "Table RefApp existante à mettre à jour (RefApp, RefApp2…). Sans tableId ni newTable : la première table RefApp du document, créée si besoin.",
    example: "RefApp2",
  })
  @IsOptional()
  @IsString()
  @Matches(GRIST_TABLE_ID_PATTERN, {
    message: "tableId doit être RefApp, RefApp2, RefApp3…",
  })
  tableId?: string;

  @ApiProperty({
    required: false,
    description:
      "Créer une nouvelle table : RefApp, ou le premier nom libre parmi RefApp2, RefApp3…",
  })
  @IsOptional()
  @IsBoolean()
  newTable?: boolean;
}

export class GristSyncDto {
  @ApiProperty({
    required: false,
    type: [GristSyncTargetDto],
    description:
      "Documents et tables à synchroniser. Sans cette liste : chaque document du profil, dans sa première table RefApp.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(GRIST_SYNC_TARGETS_MAX)
  @ValidateNested({ each: true })
  @Type(() => GristSyncTargetDto)
  targets?: GristSyncTargetDto[];

  @ApiProperty({
    required: false,
    type: [String],
    enum: GRIST_COLUMN_FIELDS,
    enumName: "GristColumnField",
    example: DEFAULT_GRIST_COLUMN_FIELDS,
    description:
      "Colonnes visibles de la page de recherche, dans l'ordre affiché. Celles que le demandeur ne peut pas voir (ColumnRead) sont ignorées. Sans cette liste : les colonnes affichées par défaut.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(GRIST_COLUMN_FIELDS, { each: true })
  columns?: string[];
}

export class GristDocumentTablesDto {
  @ApiProperty({ description: "Identifiant du document Grist" })
  docId: string;

  @ApiProperty({
    type: [String],
    description:
      "Tables écrites par RefApp dans ce document (RefApp, RefApp2…), dans l'ordre",
  })
  tables: string[];

  @ApiProperty({
    required: false,
    description: "Message d'erreur si le document n'a pas pu être lu",
  })
  error?: string;
}
