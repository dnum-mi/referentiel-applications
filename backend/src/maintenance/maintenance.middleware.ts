import { HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import {
  MAINTENANCE_MESSAGE,
  READ_ONLY_HTTP_METHODS,
} from "./maintenance.constants";
import { MaintenanceService } from "./maintenance.service";

declare module "express" {
  export interface Request {
    maintenanceMode?: boolean;
  }
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const maintenanceMode = await this.maintenanceService.isActive();
      req.maintenanceMode = maintenanceMode;

      if (
        maintenanceMode &&
        !READ_ONLY_HTTP_METHODS.has(req.method.toUpperCase())
      ) {
        res.setHeader("Retry-After", "30");
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          maintenance: true,
          message: MAINTENANCE_MESSAGE,
          error: "Service Unavailable",
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}
