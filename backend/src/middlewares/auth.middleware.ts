import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/helpers';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const decodedToken = AuthUtils.getDecodedToken(req);
      req.user = await AuthUtils.findOrCreateUser(
        decodedToken,
        this.userService,
      );
      next();
    } catch (error) {
      throw new UnauthorizedException("L'authentification a échoué");
    }
  }
}
