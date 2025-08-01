import { IsOptional, IsString } from "class-validator";

export class FiltersDto {
  @IsOptional()
  @IsString()
  applicationId?: string;
}
