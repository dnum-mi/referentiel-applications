import { IsEnum, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { RelationType } from "@prisma/client";
import { ApplicationMinimalDto } from "src/product/application/dto/get-application.dto";

export class RelationApplicationDto {
  @ApiProperty()
  @IsString()
  applicationTargetId: string;

  @ApiProperty({ enum: RelationType, enumName: "relationType" })
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

  @ApiProperty({
    type: ApplicationMinimalDto,
  })
  sourceApplication: ApplicationMinimalDto;

  @ApiProperty({
    type: ApplicationMinimalDto,
  })
  targetApplication: ApplicationMinimalDto;

  @ApiProperty({ enum: RelationType, enumName: "relationType" })
  @IsString()
  @IsEnum(RelationType)
  type: RelationType;
}
