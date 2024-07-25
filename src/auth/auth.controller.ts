import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Auth')
@Controller()
export class AuthController {
  // @Public()
  // @UseGuards(AuthGuard('ldap'))
  // @Post('login')
  // async login(@Body() body: LdapLoginDTO, @Request() req: any) {
  //   return req.user;
  // }
}
