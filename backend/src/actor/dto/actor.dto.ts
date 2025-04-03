import { IsString, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { ActorType } from '@prisma/client';

export class CreateActorDto {
  @ApiProperty({
    example: 'Responsable',
    description: "Rôle de l'acteur",
    required: false,
  })
  @IsString()
  @IsOptional()
  role: string;

  @ApiProperty({
    example: 'example@example.com',
    description: "Email de l'acteur (Optionel)",
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Jean',
    description: 'Prénom de l’acteur',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Nom de l’acteur',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiProperty({ enum: ActorType, required: false })
  @IsOptional()
  @IsEnum(ActorType)
  type?: ActorType;

  @ApiProperty({
    example: '9965dc19-1c5a-472d-83e3-8bf65093c86c',
    description: "ID de l'organization lié (Optionel)",
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    example: '035869dc-47a6-4cee-828f-f6a28d050b35',
    description: "ID de l'application lié (Optionel)",
    required: false,
  })
  @IsOptional()
  @IsString()
  applicationId?: string;
}

export class UpdateActorDto extends PartialType(CreateActorDto) {
  @ApiHideProperty()
  @IsOptional()
  id?: string;
}
