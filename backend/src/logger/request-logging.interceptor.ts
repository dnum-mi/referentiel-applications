import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { LoggingService } from "../services/logging.service";
import { sanitizeHeaders } from "../utils/sanitize-headers.util";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const correlationId = request.headers["x-correlation-id"] || uuidv4();
    response.setHeader("X-Correlation-ID", correlationId);

    const logContext = {
      method: request.method,
      url: request.url,
      headers: sanitizeHeaders(request.headers),
      query: request.query,
      params: request.params,
      ip: request.ip,
      correlationId,
    };

    this.logger.log(
      `[${correlationId}] ${logContext.method} ${logContext.url} - start`,
    );

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - start;
        const statusCode = response.statusCode;

        this.logger.log(
          `[${correlationId}] ${logContext.method} ${logContext.url} - ${statusCode} ${duration}ms`,
        );

        // Envoie les données à notre service de logging métier
        this.loggingService.logRequest({
          ...logContext,
          duration,
          statusCode,
          result,
        });
      }),
    );
  }
}
