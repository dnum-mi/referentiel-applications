import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class CreateLabelSourceDto {
  @ApiProperty({
    description: "Source name",
    example: "CODE_PAI",
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  source: string;
}

export class UpdateLabelSourceDto extends CreateLabelSourceDto {}

export class LabelSourceFiltersDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  source?: string;
}

export class LabelSourceDto extends CreateLabelSourceDto {
  @ApiProperty({
    description: "Unique identifier of the label source",
    example: "5708d232-8338-4abf-8f38-8370acc89497",
  })
  @IsString()
  id: string;
}
