import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateUserDto } from "../dto/update-user.dto";
import { Requestor } from "../entities/user.entity";
import { ScopePermissionsException } from "../errors/scope-permissions.exception";

export type FieldAction =
  | { type: "SET"; to: string }
  | { type: "UPDATE"; from: string; to: string }
  | { type: "REMOVE"; from: string }
  | { type: "UNCHANGED" };

export interface UserFieldActions {
  organizationId: FieldAction;
  scopeOrganizationId: FieldAction;
}

@Injectable()
export class ScopedPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanUpdate(
    targetUserId: string,
    dto: UpdateUserDto,
    requestor: Requestor,
  ): Promise<void> {
    const requestorScopePath = requestor?.scopeOrganization?.path;
    // Si le requestor n'a pas de scope, c'est qu'il est super admin et peut tout faire → PAS DE CHECK
    if (!requestorScopePath) return;

    const currentUser = await this.prisma.user.findFirst({
      where: { id: targetUserId },
      include: { scopeOrganization: true, organization: true },
    });

    if (!currentUser) {
      throw new HttpException("Utilisateur introuvable", HttpStatus.NOT_FOUND);
    }

    // Vérifie que le requestor a le droit de modifier l'utilisateur (il doit être dans le scope de l'organisation de l'utilisateur)
    this.assertWithinScope(
      currentUser.organization?.path,
      requestorScopePath,
      "Vous n'avez pas les permissions pour modifier cet utilisateur",
    );

    const actions: UserFieldActions = {
      organizationId: this.resolveFieldAction(
        currentUser.organizationId,
        dto.organizationId,
      ),
      scopeOrganizationId: this.resolveFieldAction(
        currentUser.scopeOrganizationId,
        dto.scopeOrganizationId,
      ),
    };

    await this.assertOrganizationAction(
      actions.organizationId,
      requestorScopePath,
    );
    await this.assertScopeOrganizationAction(
      actions.scopeOrganizationId,
      requestorScopePath,
    );
  }

  private async assertOrganizationAction(
    action: FieldAction,
    requestorScopePath: string,
  ): Promise<void> {
    if (action.type === "UNCHANGED") return;

    if (action.type === "SET") {
      const org = await this.fetchOrganization(action.to);
      this.assertWithinScope(
        org.path,
        requestorScopePath,
        "Vous ne pouvez pas assigner cet utilisateur à une organisation hors de votre périmètre",
      );
    }

    if (action.type === "UPDATE" || action.type === "REMOVE") {
      const fromOrg = await this.fetchOrganization(action.from);
      this.assertWithinScope(
        fromOrg.path,
        requestorScopePath,
        "Vous ne pouvez pas modifier l'organisation actuelle de cet utilisateur",
      );
    }
  }

  private async assertScopeOrganizationAction(
    action: FieldAction,
    requestorScopePath: string,
  ): Promise<void> {
    if (action.type === "UNCHANGED") return;

    if (action.type === "REMOVE") {
      throw new ScopePermissionsException(
        "Seul un administrateur global peut supprimer le périmètre d'un utilisateur",
      );
    }

    const scopeOrg = await this.fetchOrganization(action.to);
    this.assertWithinScope(
      scopeOrg.path,
      requestorScopePath,
      "Vous ne pouvez pas assigner un périmètre hors de votre périmètre",
    );

    if (action.type === "UPDATE") {
      const fromScopeOrg = await this.fetchOrganization(action.from);
      this.assertWithinScope(
        fromScopeOrg.path,
        requestorScopePath,
        "Vous ne pouvez pas modifier le périmètre actuel de cet utilisateur",
      );
    }
  }

  private async fetchOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org)
      throw new HttpException(
        "Organisation introuvable",
        HttpStatus.BAD_REQUEST,
      );
    return org;
  }

  private assertWithinScope(
    targetPath: string | null | undefined,
    requestorScopePath: string,
    message: string,
  ): void {
    if (targetPath && !targetPath.startsWith(requestorScopePath)) {
      throw new ScopePermissionsException(message);
    }
  }

  private resolveFieldAction(
    current: string | null,
    // null -> update la valeur de X -> null, undefined -> ne change pas la valeur de X, string -> update la valeur de X -> string
    incoming: string | null | undefined,
  ): FieldAction {
    if (incoming === current) return { type: "UNCHANGED" };
    if (current === null && incoming !== null)
      return { type: "SET", to: incoming };
    if (current !== null && incoming !== null)
      return { type: "UPDATE", from: current, to: incoming };
    if (current !== null && incoming === null)
      return { type: "REMOVE", from: current };

    return { type: "UNCHANGED" };
  }
}
