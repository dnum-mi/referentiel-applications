import { Controller, Get } from '@nestjs/common';
import { Public, Roles } from 'nest-keycloak-connect';

@Controller()
export class AppController {
  @Public()
  @Get('public')
  getPublic() {
    return { message: 'Public route accessed!' };
  }

  @Roles({ roles: ['user'] })
  @Get('secure')
  getSecure() {
    return { message: 'Secure route accessed!' };
  }
}
