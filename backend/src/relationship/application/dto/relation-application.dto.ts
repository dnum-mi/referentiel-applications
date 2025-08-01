import { IsEnum, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { RelationType } from "@prisma/client";

export class RelationApplicationDto {
  @ApiProperty()
  @IsString()
  applicationTargetId: string;

  @ApiProperty({ enum: RelationType, example: RelationType.is_part_of, enumName: "relationType" })
  @IsString()
  @IsEnum(RelationType)
  type: RelationType;
}

export class RelationDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  applicationSourceId: string;

  @ApiProperty()
  @IsString()
  applicationTargetId: string;

  @ApiProperty()
  sourceApplication: {
    id: string
    label: string
  };

  @ApiProperty()
  @IsString()
  targetApplication: {
    id: string
    label: string
  };

  @ApiProperty({ enum: RelationType, example: RelationType.is_part_of, enumName: "relationType" })
  @IsString()
  @IsEnum(RelationType)
  type: RelationType;
}
