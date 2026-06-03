import { Injectable } from "@nestjs/common";
import { Requestor } from "src/user/entities/user.entity";

@Injectable()
export class QueryBuilderGroupActor {
  public buildByApplication(applicationId: string, user: Requestor) {
    const userOrganization: string | null = user.organization?.path ?? null;
    return `
            SELECT DISTINCT a."actorTypeId"
            FROM "Actor" a
            JOIN "Organization" o ON o.id = a."organizationId"
            WHERE a."applicationId" = '${applicationId}'
              AND a."isGroup" = true
              AND lower('${userOrganization}') LIKE lower(o.path) || '%'
          `;
  }

  public build(user: Requestor) {
    const userOrganization: string | null = user.organization?.path ?? null;
    return `
            SELECT DISTINCT a."actorTypeId"
            FROM "Actor" a
            JOIN "Organization" o ON o.id = a."organizationId"
            WHERE a."isGroup" = true
              AND lower('${userOrganization}') LIKE lower(o.path) || '%'
          `;
  }

  public buildActorIds(user: Requestor) {
    const userOrganization: string | null = user.organization?.path ?? null;
    return `
            SELECT a."id"
            FROM "Actor" a
            JOIN "Organization" o ON o.id = a."organizationId"
            WHERE a."isGroup" = true
              AND lower('${userOrganization}') LIKE lower(o.path) || '%'
          `;
  }
}
