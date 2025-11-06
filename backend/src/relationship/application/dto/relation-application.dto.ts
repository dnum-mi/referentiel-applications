import { ApiProperty } from "@nestjs/swagger";
import { RelationType, Status } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";
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

export class GraphNodeDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: Status, enumName: "Status" })
  @IsEnum(Status)
  status?: Status;
}

export class GraphEdgeDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  sourceId: string;

  @ApiProperty()
  @IsString()
  sourceLabel: string;

  @ApiProperty()
  @IsString()
  targetId: string;

  @ApiProperty()
  @IsString()
  targetLabel: string;

  @ApiProperty({ enum: RelationType, enumName: "relationType" })
  @IsString()
  @IsEnum(RelationType)
  type: RelationType;
}

export class RelationGraphDto {
  @ApiProperty({
    type: [GraphNodeDto],
    description: "Liste des applications (nœuds du graphe)",
  })
  nodes: GraphNodeDto[];

  @ApiProperty({
    type: [GraphEdgeDto],
    description: "Liste des relations (arêtes du graphe)",
  })
  edges: GraphEdgeDto[];

  @ApiProperty({
    description: "ID de l'application racine",
  })
  rootId: string;
}
