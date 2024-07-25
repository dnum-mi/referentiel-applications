import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SensibiliteEnum } from '../enums/app-sensibilite';
import { StatutEnum } from '../enums/app-status';
import { CreateActeurDto } from '../../acteurs/dto/create-acteur.dto';
import { CreateOrganisationDto } from '../../organisations/dto/create-organisation.dto';
import { Type } from 'class-transformer';
import { CreateInstanceDto } from '../../instances/dto/create-instance.dto';
import { CreateComplianceDto } from 'src/compliances/dto/create-compliance.dto';

export class CreateActorRole {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateActeurDto)
  acteur: CreateActeurDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrganisationDto)
  organisation?: CreateOrganisationDto;

  @IsNotEmpty()
  @IsString()
  role: string;
}

export class ApplicationCode {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  typeCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  codeCourt: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  longcode: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  comments: string;
}
export class CreateApplicationDto
  implements Partial<Prisma.AppApplicationCreateInput>
{
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  longname: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ default: 'SVBUS' })
  @IsString()
  @IsOptional()
  typeApplication?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ApplicationCode)
  @IsOptional()
  codeApplication?: ApplicationCode[];

  @ApiProperty({ default: 'S1' })
  @IsString()
  @IsOptional()
  sensibilite?: SensibiliteEnum;

  @ApiProperty({ default: 'BLD' })
  @IsNotEmpty()
  statut: StatutEnum;

  @ApiProperty()
  @IsOptional()
  @IsUUID(undefined, { always: false })
  parent?: string | undefined;

  @ApiProperty()
  @IsOptional()
  @IsString()
  organisation?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  organisationid?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateActorRole)
  @IsOptional()
  acteurRoles?: CreateActorRole[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateInstanceDto)
  @IsOptional()
  instances?: CreateInstanceDto[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreateComplianceDto)
  @IsOptional()
  conformite?: CreateComplianceDto[];
}
