import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { UserEntity } from "src/user/entities/user.entity";

export class ApplicationDto {
  @IsString()
  id: string;

  @IsString()
  ownerId: string;
}

class Notifier extends PickType(UserEntity, ["id", "email"]) {}

export class GetAnomalyNotificationDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  applicationId?: string;

  @ValidateNested()
  @Type(() => ApplicationDto)
  application: ApplicationDto;

  @IsString()
  notifierId: string;

  @ApiProperty({ type: Notifier, description: "The user who reported the issue" })
  notifier: Notifier;

  @IsString()
  description: string;

  @IsString()
  status: string;

  @IsString()
  @ApiProperty({
    description: "Date de création de la metadata",
    example: "2023-10-01T12:00:00Z",
    type: String,
  })
  createdAt: Date;

  @IsString()
  updatedAt: Date;
}
