import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class AppPermsDto {
  @ApiProperty()
  @IsString()
  actorTypeId: string;

  /// Type d'acteur « administrateur de l'application » : ses acteurs disposent
  /// toujours de tous les droits (lecture + écriture) sur leur application, quels
  /// que soient les droits ci-dessous (forcés côté backend).
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @ApiProperty()
  @IsBoolean()
  AppRead: boolean;

  @ApiProperty()
  @IsBoolean()
  AppWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  AppWritePriority: boolean;

  @ApiProperty()
  @IsBoolean()
  ActorRead: boolean;

  @ApiProperty()
  @IsBoolean()
  ActorWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  ComplianceRead: boolean;

  @ApiProperty()
  @IsBoolean()
  ComplianceWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  HostingRead: boolean;

  @ApiProperty()
  @IsBoolean()
  HostingWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  MetadataRead: boolean;

  @ApiProperty()
  @IsBoolean()
  DataRead: boolean;

  @ApiProperty()
  @IsBoolean()
  DataWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  TechnologyRead: boolean;

  @ApiProperty()
  @IsBoolean()
  TechnologyWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  RelationRead: boolean;

  @ApiProperty()
  @IsBoolean()
  RelationWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  LinkRead: boolean;

  @ApiProperty()
  @IsBoolean()
  LinkWrite: boolean;

  @ApiProperty()
  @IsBoolean()
  ReportRead: boolean;

  @ApiProperty()
  @IsBoolean()
  ReportPost: boolean;

  @ApiProperty()
  @IsBoolean()
  ReportManage: boolean;
}
