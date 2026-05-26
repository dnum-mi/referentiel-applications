import { HttpStatus } from "@nestjs/common";
import { HttpException } from "@nestjs/common/exceptions";

export class ScopePermissionsException extends HttpException {
  constructor(public message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}
