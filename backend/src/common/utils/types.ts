import { Prisma } from '@prisma/client';

export type GLOBAL_PERMISSIONS = 'read' | 'write' | 'admin';
export type GLOBAL_PERMS_MAP = Record<GLOBAL_PERMISSIONS, boolean>;
export type APP_PERMISSIONS = Exclude<
  keyof typeof Prisma.AppPermissionsScalarFieldEnum,
  'actorTypeId'
>;
export type APP_PERMS_MAP = Partial<Record<APP_PERMISSIONS, boolean>>;
