import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { ValidationExceptionFilter } from "../common/filters/validation-exception.filter";

/**
 * Configure global validation pipe for the application
 * This configuration is shared between main app and tests
 */
export function setupGlobalValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Add global exception filter to log validation errors
  app.useGlobalFilters(new ValidationExceptionFilter());
}
