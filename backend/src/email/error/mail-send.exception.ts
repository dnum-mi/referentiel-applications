import { HttpStatus } from "@nestjs/common";
import { HttpException } from "@nestjs/common/exceptions";

export class MailSendException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
