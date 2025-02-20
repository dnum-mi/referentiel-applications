import * as jose from 'jose';
import { UserService } from 'src/user/user.service';

export class AuthUtils {
  static getDecodedToken(req: any): any {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    return jose.decodeJwt(token);
  }

  static async findOrCreateUser(
    decodedToken: any,
    userService: UserService,
  ): Promise<any> {
    return await userService.findOrCreateByEmail(
      decodedToken.email as string,
      decodedToken.sub as string,
    );
  }
}
