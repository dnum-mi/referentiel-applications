import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { UserEntity, UserWithPermissions } from "./entities/user.entity";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { PaginatedResponseDto } from "src/common/dto";

// TODO we should add verification
@Injectable()
export class UserPermissionsInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Certaines routes du contrôleur ne renvoient pas un UserEntity (ex: un
        // tableau, comme l'historique des permissions) : on les laisse passer
        // inchangées, seul un User(s) doit voir ses permissions dérivées du rôle.
        if (Array.isArray(data)) return data;
        if (data && typeof data === "object" && "results" in data) {
          return this.mapPaginated(data as PaginatedResponseDto<UserEntity>);
        }
        return this.addPermissionsFromRole(data as UserEntity);
      }),
    );
  }

  private addPermissionsFromRole(user: UserEntity): UserWithPermissions {
    return {
      ...user,
      permissions: roleToPermissions(user.role),
    };
  }

  private mapPaginated(
    paginated: PaginatedResponseDto<UserEntity>,
  ): PaginatedResponseDto<UserWithPermissions> {
    return {
      results: paginated.results.map((user) => ({
        ...user,
        permissions: roleToPermissions(user.role),
      })),
      total: paginated.total,
    };
  }
}
