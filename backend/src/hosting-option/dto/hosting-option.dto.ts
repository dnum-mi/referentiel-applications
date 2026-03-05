import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class CreateHostingOptionDto {
  @ApiProperty({
    description: "Site name (géographique)",
    example: "CER(RENNES)",
  })
  @IsNotEmpty()
  @IsString()
  site: string;

  @ApiProperty({
    description: "Platform name",
    example: "PHYSIQUE",
  })
  @IsNotEmpty()
  @IsString()
  platform: string;

  @ApiProperty({
    description: "Provider name",
    example: "DTNUM",
  })
  @IsNotEmpty()
  @IsString()
  provider: string;

  @ApiProperty({
    description: "Building (optional)",
    example: "B15",
    required: false,
  })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({
    description: "Room (optional)",
    example: "IT2",
    required: false,
  })
  @IsOptional()
  @IsString()
  room?: string;
}

export class UpdateHostingOptionDto extends CreateHostingOptionDto {}

export class HostingOptionFiltersDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  room?: string;
}

export class HostingOptionDto extends CreateHostingOptionDto {
  @ApiProperty({
    description: "Unique identifier of the hosting option",
    example: "12345678-1234-1234-1234-123456789012",
  })
  @IsString()
  id: string;
}
