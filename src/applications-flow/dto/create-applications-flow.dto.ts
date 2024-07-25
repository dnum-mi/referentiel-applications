import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AppDataFlowOrient } from '../entities/application_flow';

export class CreateApplicationsFlowDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  comments: string | null;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  applicationsourceid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  organisationunitsourceid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  applicationtargetid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  organisationunittargetid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  middleware: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  flowtypeid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  flowprotocolid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  flowperiodid: string | null;

  @ApiProperty()
  @IsOptional()
  @IsEnum(AppDataFlowOrient)
  flowdataorientation: AppDataFlowOrient;

  @ApiProperty()
  @IsOptional()
  @IsString()
  ports: string | null;
}
