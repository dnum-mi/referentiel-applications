import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUUID } from "class-validator";
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

  @ApiProperty({
    description:
      "Indicates whether the hosting is active, passif or not specified (null).",
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean | null;
}

export class UpdateHostingDto extends PartialType(CreateHostingDto) {}

export class HostingDto extends CreateHostingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hostingOption: HostingOptionDto;
}
