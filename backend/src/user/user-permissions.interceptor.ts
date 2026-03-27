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
export class UserPermissionsInterceptor
  implements
    NestInterceptor<
      UserWithPermissions,
      UserWithPermissions | PaginatedResponseDto<UserWithPermissions>
    >
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<
    UserWithPermissions | PaginatedResponseDto<UserWithPermissions>
  > {
    return next.handle().pipe(
      map((data: UserEntity | PaginatedResponseDto<UserEntity>) => {
        if ("results" in data) return this.mapPaginated(data);
        return this.addPermissionsFromRole(data);
      }),
    );
  }

  private addPermissionsFromRole(user: UserEntity): UserWithPermissions {
    return {
      ...user,
      permissions: roleToPermissions(user.adminLevel),
    };
  }

  private mapPaginated(
    paginated: PaginatedResponseDto<UserEntity>,
  ): PaginatedResponseDto<UserWithPermissions> {
    return {
      results: paginated.results.map((user) => ({
        ...user,
        permissions: roleToPermissions(user.adminLevel),
      })),
      total: paginated.total,
    };
  }
}
