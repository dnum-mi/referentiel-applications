import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { CreateDataSourceDto } from "./create-data-source.dto";
import { PaginationDto } from "src/common/dto";

export class DataSourceDto extends CreateDataSourceDto {
  @ApiProperty({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID de la source de donnée",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID de l'application liée",
  })
  @IsString()
  applicationId: string;
}

export class DataSourceFiltersDto extends PaginationDto {}

export class UpdateDataSourceDto extends PartialType(CreateDataSourceDto) {}
