import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { BadRequestException, Catch, Logger } from "@nestjs/common";

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Log validation errors with debug level
    this.logger.debug({
      message: "Validation error (400)",
      method: request.method,
      url: request.url,
      body: request.body,
      error: exceptionResponse,
    });

    response.status(status).json(exceptionResponse);
  }
}
