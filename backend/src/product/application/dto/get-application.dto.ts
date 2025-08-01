import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from "class-validator";
import { priorityRestart, Status } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class ApplicationDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  shortName: string | null;

  @ApiProperty({
    example: "https://example.com/logo.png",
    description: "URL of the application logo",
    nullable: true,
  })
  @IsString()
  logo: string | null;

  @IsString()
  description: string;

  @IsArray()
  targetPopulations: string[];

  @IsArray()
  purposes: string[];

  @IsArray()
  tags: string[];

  @ApiProperty({
    name: "status",
    enum: Status,
    description: "Current status of the application",
    enumName: "ApplicationStatus",
  })
  @IsEnum(Status)
  status?: Status;

  @IsString()
  ownerId: string;

  @ApiProperty({
    enum: priorityRestart,
    required: false,
    enumName: "ApplicationPriorityRestart",
  })
  @IsOptional()
  @IsEnum(priorityRestart)
  priorityRestart?: priorityRestart;

  @IsNumber()
  quality: number | null;
}

export class CountByMonthDto {
  @ApiProperty({
    description: "Month in YYYY-MM format",
    example: "2023-10",
  })
  month: string;

  @ApiProperty({
    description: "Total number of applications for the month",
    example: 150,
  })
  total: number;
}

export class CountByIqDto {
  @ApiProperty({
    description: "Indice de qualité de l'application",
    example: 85,
  })
  iq: number;

  @ApiProperty({
    description: "Total d'applications pour cet indice de qualité",
    example: 30,
  })
  total: number;
}

export class ApplicationSearchResultDto {
  @ApiProperty({
    description: "Liste des applications correspondant aux critères de recherche",
    type: ApplicationDto,
    isArray: true,
  })
  results: ApplicationDto[];

  @ApiProperty({
    description: "Nombre total d'applications correspondant aux critères de recherche",
    example: 100,
  })
  total: number;
}
