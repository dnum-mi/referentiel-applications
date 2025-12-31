import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { ApplicationType, priorityRestart } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";
import { CreateApplicationStatusDto } from "src/statuses/dto/application-status.dto";

const LABEL_STRING_REGEX =
  /^(?=.*\p{Script=Latin})(?!\s)(?!.+\s$)[\p{Script=Latin}0-9 .-]+$/u;
export class CreateLabelDto {
  @ApiProperty({
    example: "CODE_PAI",
    description: "Source of the label",
  })
  @IsString()
  @IsOptional()
  source: string | null;

  @ApiProperty({ example: "My App", description: "Value of the label" })
  @IsString()
  @Matches(LABEL_STRING_REGEX, {
    message: "Le label contient des caractères invalides",
  })
  value: string | null;
}

export class CreateApplicationDto {
  @ApiProperty({
    example: "My Application",
    description: "Label of the application",
  })
  @IsString()
  @Matches(LABEL_STRING_REGEX, {
    message:
      "Le label ne peut pas être vide ou contenir uniquement des espaces",
  })
  label: string;

  @ApiProperty({
    example: "short-app-name",
    description: "Short name of the application",
    required: false,
  })
  @IsOptional()
  @IsString()
  shortName: string;

  @ApiProperty({
    example: "http://example.com/logo.png",
    description: "Logo URL of the application",
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    example: "An amazing application",
    description: "Description of the application",
  })
  @IsString()
  @IsNotEmpty({ message: "La description ne peut pas être vide" })
  description: string;

  @ApiProperty({
    type: [String],
    example: ["population 1", "population 2"],
    description: "population associated with the application",
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  targetPopulations?: string[];

  @ApiProperty({
    enum: priorityRestart,
    required: false,
    enumName: "ApplicationPriorityRestart",
  })
  @IsOptional()
  @IsEnum(priorityRestart)
  priorityRestart?: priorityRestart;

  @ApiProperty({
    type: [String],
    example: ["finance", "HR"],
    description: "Purposes of the application",
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  purposes?: string[];

  @ApiProperty({
    enum: ApplicationType,
    required: false,
    enumName: "ApplicationType",
    description: "Type of the application",
    example: "business",
  })
  @IsOptional()
  @IsEnum(ApplicationType)
  type?: ApplicationType;

  @ApiProperty({
    type: [String],
    example: ["tag1", "tag2"],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: "Statut initial de l'application",
    required: false,
    example: {
      status: "under_construction",
      statusDate: "2024-01-15T10:30:00Z",
    },
    type: () => CreateApplicationStatusDto,
  })
  @ValidateNested()
  @Type(() => CreateApplicationStatusDto)
  status: CreateApplicationStatusDto;

  @ApiProperty({
    type: [CreateLabelDto],
    description: "Liste des labels alternatifs associés à l'application",
    example: [
      {
        source: "",
        value: "My App",
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabelDto)
  labels: CreateLabelDto[];
}

export class PatchApplicationDto extends PartialType(
  OmitType(CreateApplicationDto, ["status"]),
) {}
