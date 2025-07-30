import { SetMetadata } from '@nestjs/common';
import { AdminLevel as AdmLevel } from 'src/user/entities/user.entity';

export const ADMIN_LEVEL_KEY = 'adminLevel';
export const RequiredAdminLevel = (level: AdmLevel) =>
  SetMetadata(ADMIN_LEVEL_KEY, level);
