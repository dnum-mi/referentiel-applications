import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { HostingOptionDto } from "src/hosting-option/dto/hosting-option.dto";

export class CreateHostingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label: string;

  @ApiProperty({ required: false, description: "ID of the hosting option" })
  @IsOptional()
  @IsString()
  hostingOptionId: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;
}

export class UpdateHostingDto extends PartialType(CreateHostingDto) {}

export class HostingDto extends CreateHostingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hostingOption: HostingOptionDto;
}
