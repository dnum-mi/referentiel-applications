import { SetMetadata } from '@nestjs/common';
import { APP_PERMISSIONS } from '../utils/types';

export const APP_ACTION_KEY = 'action';

export const AppAction = (action: APP_PERMISSIONS) =>
  SetMetadata(APP_ACTION_KEY, action);
