import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

export class ApplicationStatusDto {
  @ApiProperty({
    description: "ID unique du statut",
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: "ID de l'application",
  })
  @IsUUID()
  applicationId: string;

  @ApiProperty({
    enum: Status,
    description: "Statut de l'application",
    enumName: "ApplicationStatus",
  })
  @IsEnum(Status)
  status: Status;

  @ApiProperty({
    description: "Date du changement de statut",
    required: false,
    nullable: true,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  statusDate: Date | null;

  @ApiProperty({
    description: "Version du statut",
    required: false,
    nullable: true,
  })
  @IsOptional()
  version: string | null;
}

export class CreateApplicationStatusDto {
  @ApiProperty({
    enum: Status,
    description: "Nouveau statut de l'application",
    enumName: "ApplicationStatus",
  })
  @IsEnum(Status)
  status: Status;

  @ApiProperty({
    description: "Date optionnelle du changement de statut",
    required: false,
    nullable: true,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  statusDate?: Date | null;

  @ApiProperty({
    description: "Version du statut",
    required: false,
    nullable: true,
  })
  @IsOptional()
  version?: string | null;
}
