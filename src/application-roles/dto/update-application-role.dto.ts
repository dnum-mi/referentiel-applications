import { PartialType } from '@nestjs/swagger';
import { CreateApplicationRoleDto } from './create-application-role.dto';

export class UpdateApplicationRoleDto extends PartialType(
  CreateApplicationRoleDto,
) {}
