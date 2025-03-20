import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RelationType } from '@prisma/client';

export class RelationApplicationDto {
  @ApiProperty()
  @IsString()
  applicationSource: string;

  @ApiProperty()
  @IsString()
  applicationTarget: string;

  @ApiProperty({ enum: RelationType, example: RelationType.is_part_of })
  @IsString()
  @IsEnum(RelationType)
  type: RelationType;
}
