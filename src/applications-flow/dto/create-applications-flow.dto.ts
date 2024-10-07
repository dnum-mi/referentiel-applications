import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AppDataFlowOrient } from '../entities/application_flow';

export class CreateApplicationsFlowDto {
  @IsOptional()
  @IsString()
  comments: string | null;

  @IsOptional()
  @IsUUID()
  applicationsourceid: string | null;

  @IsOptional()
  @IsUUID()
  organisationunitsourceid: string | null;

  @IsOptional()
  @IsUUID()
  applicationtargetid: string | null;

  @IsOptional()
  @IsUUID()
  organisationunittargetid: string | null;

  @IsOptional()
  @IsString()
  middleware: string | null;

  @IsOptional()
  @IsString()
  flowtypeid: string | null;

  @IsOptional()
  @IsString()
  flowprotocolid: string | null;

  @IsOptional()
  @IsString()
  flowperiodid: string | null;

  @IsOptional()
  @IsEnum(AppDataFlowOrient)
  flowdataorientation: AppDataFlowOrient;

  @IsOptional()
  @IsString()
  ports: string | null;
}
