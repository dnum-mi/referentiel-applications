import { IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { UserEntity } from "src/user/entities/user.entity";

export class ApplicationDto {
  @IsString()
  id: string;

  @IsString()
  ownerId: string;
}

export class GetAnomalyNotificationDto {
  @IsString()
  id: string;

  @IsString()
  applicationId: string;

  @ValidateNested()
  @Type(() => ApplicationDto)
  application: ApplicationDto;

  @IsString()
  notifierId: string;

  @ApiProperty({ type: UserEntity, description: "The user who reported the issue" })
  notifier: UserEntity;

  @IsString()
  description: string;

  @IsString()
  status: string;

  @IsString()
  createdAt: Date;

  @IsString()
  updatedAt: Date;
}
