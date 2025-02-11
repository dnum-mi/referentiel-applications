import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { decodeJwt } from 'jose';
import { ApplicationService } from 'src/product/application.service';

@Injectable()
export class CombinedInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CombinedInterceptor.name);

  constructor(private readonly applicationService: ApplicationService) {}

  private logObjectParams: Partial<LogObjectParams>;

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, headers, query, params, ip, body } = request;
    const correlationId = headers['x-correlation-id'] || uuidv4();
    const { user, loginTime } = this.extractUserFromToken(
      headers,
      correlationId,
    );
    const entityType = this.getEntityType(url);
    const userAgent = headers['user-agent'] || 'Inconnu';
    const referer = headers['referer'] || headers['referrer'] || 'Inconnu';
    const sanitizedHeaders = this.sanitizeHeaders(headers);
    const requestSize = this.getRequestSize(body);

    response.setHeader('X-Correlation-ID', correlationId);

    this.logObjectParams = {
      method,
      url,
      headers: sanitizedHeaders,
      query,
      params,
      ip,
      data: body,
      correlationId,
      user,
      userAgent,
      entityType,
      loginTime,
      referer,
      requestSize,
    };

    // Step: Start
    this.logAction({
      message: `Début du traitement de la requête ${method} ${url}`,
      action: 'request_start',
      step: 'start',
    });

    // Log for GET method with specific route
    if (method === 'GET' && url.includes('application/search')) {
      const label = query.label;

      if (label) {
        this.logAction({
          message: `Recherche d'application avec le label "${label}"`,
          action: 'search',
          step: 'middle',
          extra: { query },
        });
      }
    }

    if (entityType === 'Application' || entityType === 'Notification') {
      try {
        let applicationId: string | undefined;

        if (entityType === 'Application') {
          applicationId = params.id;
        } else if (entityType === 'Notification') {
          applicationId = params.applicationId || body.applicationId;
        }

        if (applicationId) {
          const application = await this.getApplicationById(applicationId);
          const label = this.getLabel(application);
          this.logObjectParams.label = label;

          // Step: Middle
          this.logAction({
            message: `[${correlationId}] Traitement de l'entité ${entityType}: "${label}"`,
            action: 'process_entity',
            step: 'middle',
          });
        } else {
          this.logger.warn(
            `[${correlationId}] applicationId non trouvé pour l'entité ${entityType}.`,
          );
          this.logAction({
            message: `applicationId non trouvé pour l'entité ${entityType}.`,
            action: 'error',
            step: 'middle',
          });
        }
      } catch (error) {
        this.logger.error(
          `[${correlationId}] Erreur lors de la récupération de l'application pour ${entityType}: ${error}`,
        );
        this.logAction({
          message: `Erreur lors de la récupération de l'application pour ${entityType}: ${error}`,
          action: 'error',
          step: 'middle',
        });
      }
    }

    if (method === 'POST') {
      this.logAction({
        message: `Début création de ${entityType}`,
        action: 'create',
        step: 'middle',
      });
    }

    if (method === 'PATCH' || method === 'PUT') {
      const oldData = await this.getOldData(params.id);
      this.logAction({
        message: `Début mise à jour de ${entityType} ${params.id}`,
        action: 'update',
        step: 'start',
        extra: { oldData },
      });
    }

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - start;
        const statusCode = response.statusCode;
        this.logObjectParams.statusCode = statusCode;

        this.logAction({
          message: `[${correlationId}] Réponse envoyée pour ${method} ${url}`,
          action: 'update_send',
          step: 'end',
          durationMs: duration,
          statusCode,
        });

        if (entityType === 'Application' || entityType === 'Notification') {
          if (method === 'POST') {
            this.logAction({
              message: `Création terminée de ${this.logObjectParams.entityType} "${this.logObjectParams.label}"`,
              action: 'create',
              step: 'end',
              data: result,
            });
          }

          if (method === 'PATCH' || method === 'PUT') {
            const oldData = this.getOldData(params.id);
            const modifiedFields = this.getModifiedFields(oldData, body);
            this.logAction({
              message: `Mise à jour terminée pour ${this.logObjectParams.entityType} "${this.logObjectParams.label}"`,
              action: 'update',
              step: 'end',
              extra: { modifiedFields },
            });
          }
        }
      }),
    );
  }

  private getLabel(application): string {
    if (
      this.logObjectParams.entityType === 'Application' ||
      this.logObjectParams.entityType === 'Notification'
    ) {
      return application?.label || this.logObjectParams.params.id;
    }

    return '';
  }

  private async getOldData(id: string) {
    if (this.logObjectParams.entityType !== 'Application') return;

    try {
      return await this.getApplicationById(id);
    } catch (error) {
      this.logger.error(
        `[${this.logObjectParams.correlationId}] Erreur lors de la récupération de l'ancienne version de l'application ${id}`,
        error,
      );
      this.logAction({
        message: `Erreur lors de la récupération de l'ancienne version de l'application ${id}`,
        action: 'error',
        step: 'middle',
      });
      return;
    }
  }

  private getModifiedFields(
    oldData: any,
    newData: any,
  ): Record<string, { before: any; after: any }> {
    const modifiedFields: Record<string, { before: any; after: any }> = {};

    if (!oldData || !newData) return modifiedFields;

    for (const key of Object.keys(newData)) {
      if (oldData[key] !== newData[key]) {
        modifiedFields[key] = { before: oldData[key], after: newData[key] };
      }
    }

    return modifiedFields;
  }

  private async getApplicationById(id: string) {
    return await this.applicationService.getApplicationById(id);
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitizedHeaders = { ...headers };
    if (sanitizedHeaders.authorization) {
      sanitizedHeaders.authorization = 'Bearer ***';
    }
    return sanitizedHeaders;
  }

  private extractUserFromToken(
    headers: any,
    correlationId: string,
  ): { user: any; loginTime?: string } {
    if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
      const token = headers.authorization.split(' ')[1];
      try {
        const decodedToken = decodeJwt(token);
        if (decodedToken && decodedToken.sub) {
          const loginTime = decodedToken.iat
            ? new Date(decodedToken.iat * 1000).toISOString()
            : undefined;
          return { user: decodedToken.sub, loginTime };
        }
        this.logger.error(
          `[${correlationId}] La claim "sub" est absente du token décodé.`,
        );
        this.logAction({
          message: `La claim "sub" est absente du token décodé.`,
          action: 'error',
          step: 'middle',
        });
      } catch (error) {
        this.logger.error(
          `[${correlationId}] Erreur lors du décodage du token: ${error}`,
        );
        this.logAction({
          message: `Erreur lors du décodage du token: ${error}`,
          action: 'error',
          step: 'middle',
        });
      }
    }
    return { user: null };
  }

  private getEntityType(url: string): string {
    if (url.includes('notifications')) {
      return 'Notification';
    } else if (url.includes('applications')) {
      return 'Application';
    }
    return 'Inconnu';
  }

  private getRequestSize(body: any): number {
    if (!body) return 0;
    try {
      return Buffer.byteLength(JSON.stringify(body));
    } catch (error) {
      this.logger.warn('Impossible de calculer la taille de la requête', error);
      this.logAction({
        message: `Impossible de calculer la taille de la requête`,
        action: 'error',
        step: 'middle',
      });
      return 0;
    }
  }

  private logAction(extra: {
    action: string;
    step: string;
    [key: string]: any;
  }): void {
    this.logger.log({
      ...this.logObjectParams,
      ...extra,
      step: extra.step || 'unspecified',
      message: extra.message
        ? `[${this.logObjectParams.correlationId}] ${extra.message}`
        : '',
    });
  }
}

type LogObjectParams = {
  correlationId: string;
  method: string;
  url: string;
  query: any;
  params: any;
  ip: string;
  headers: any;
  user: any;
  userAgent: string;
  label?: string;
  extra?: any;
  data?: any;
  entityType: string;
  action?: string;
  message?: string;
  loginTime?: string;
  statusCode?: number;
  responseBody?: any;
  referer?: string;
  requestSize?: number;
  step?: string;
};
