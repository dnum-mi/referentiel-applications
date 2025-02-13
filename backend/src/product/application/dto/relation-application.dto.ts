import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { RelationType } from "src/enum";

export class ApplicationRelationDto {
  @ApiProperty({ 
    enum: RelationType,
    description: 'Type de relation entre les applications'
  })
  @IsEnum(RelationType)
  type: RelationType;

  @ApiProperty({
    example: 'd4e5f6',
    description: 'ID de l\'application cible'
  })
  @IsString()
  targetId: string;
}