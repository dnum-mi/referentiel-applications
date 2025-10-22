import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString } from "class-validator";

export class AppPermsDto {
  @ApiProperty()
  @IsString()
  actorTypeId: string;

  @ApiProperty()
  @IsBoolean()
  readBase: boolean;

  @ApiProperty()
  @IsBoolean()
  writeBase: boolean;

  @ApiProperty()
  @IsBoolean()
  writePriorityRestart: boolean;

  @ApiProperty()
  @IsBoolean()
  readActors: boolean;

  @ApiProperty()
  @IsBoolean()
  writeActors: boolean;

  @ApiProperty()
  @IsBoolean()
  readCompliances: boolean;

  @ApiProperty()
  @IsBoolean()
  writeCompliances: boolean;

  @ApiProperty()
  @IsBoolean()
  readHostings: boolean;

  @ApiProperty()
  @IsBoolean()
  writeHostings: boolean;

  @ApiProperty()
  @IsBoolean()
  readMetadata: boolean;

  @ApiProperty()
  @IsBoolean()
  readRelations: boolean;

  @ApiProperty()
  @IsBoolean()
  writeRelations: boolean;

  @ApiProperty()
  @IsBoolean()
  readLinks: boolean;

  @ApiProperty()
  @IsBoolean()
  writeLinks: boolean;

  @ApiProperty()
  @IsBoolean()
  readAnomalyNotifications: boolean;

  @ApiProperty()
  @IsBoolean()
  postAnomalyNotifications: boolean;

  @ApiProperty()
  @IsBoolean()
  manageAnomalyNotifications: boolean;
}
