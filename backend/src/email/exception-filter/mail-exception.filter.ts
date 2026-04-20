import { Catch, ExceptionFilter } from "@nestjs/common";
import { LoggerService } from "src/logger/logger.service";
import { MailSendException } from "../error/mail-send.exception";

@Catch(MailSendException)
export class MailExceptionFilter implements ExceptionFilter {
  constructor(protected logger: LoggerService) {}
  catch(exception: MailSendException) {
    const { message } = exception;
    this.logger.error(message);
  }
}
