import { Catch, ExceptionFilter } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import { MailSendException } from "../error/mail-send.exception";

@Catch(MailSendException)
export class MailExceptionFilter implements ExceptionFilter {
  constructor(protected logger: Logger) {}
  catch(exception: MailSendException) {
    const { message } = exception;
    this.logger.error(message);
  }
}
