import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { Roles } from "@prisma/client";
import { StepDownException } from "src/auth-level/step-down.exception";
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
    this.assertIsAdministrator(requestor);
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

    this.assertNoPrivilegeEscalation(currentUser, dto);
  }

  /**
   * #2371 — Ni le rôle ni les permissions additionnelles n'étaient contrôlés : un admin scopé
   * pouvait promouvoir sa cible ADMIN (droits globaux) ou lui accorder des permissions comme
   * AdminPanelManage/DataExport. L'attribution du rôle Administrateur et toute modification des
   * permissions additionnelles relèvent d'un administrateur global.
   */
  private assertNoPrivilegeEscalation(
    currentUser: { role: Roles; additionalPermissions: string[] },
    dto: UpdateUserDto,
  ): void {
    if (dto.role === Roles.ADMIN && currentUser.role !== Roles.ADMIN) {
      throw new ScopePermissionsException(
        "Seul un administrateur global peut attribuer le rôle Administrateur",
      );
    }

    if (dto.additionalPermissions !== undefined) {
      const current = [...currentUser.additionalPermissions].sort();
      const requested = [...new Set(dto.additionalPermissions)].sort();
      if (JSON.stringify(current) !== JSON.stringify(requested)) {
        throw new ScopePermissionsException(
          "Seul un administrateur global peut modifier les permissions additionnelles",
        );
      }
    }
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

    if (action.type === "SET" || action.type === "UPDATE") {
      const scopeOrg = await this.fetchOrganization(action.to);
      this.assertWithinScope(
        scopeOrg.path,
        requestorScopePath,
        "Vous ne pouvez pas assigner un périmètre hors de votre périmètre",
      );
    }
  }

  /**
   * Vérifie qu'un administrateur peut impersonner l'utilisateur cible : un
   * admin scopé ne peut impersonner que les utilisateurs dont l'organisation
   * est dans son périmètre (même règle que l'édition, cf. `assertCanUpdate`).
   */
  async assertCanImpersonate(
    targetUserId: string,
    requestor: Requestor,
  ): Promise<void> {
    this.assertIsAdministrator(requestor);
    const requestorScopePath = requestor?.scopeOrganization?.path;
    // Si le requestor n'a pas de scope, c'est qu'il est super admin et peut tout faire → PAS DE CHECK
    if (!requestorScopePath) return;

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId },
      include: { organization: true },
    });

    if (!target) {
      throw new HttpException("Utilisateur introuvable", HttpStatus.NOT_FOUND);
    }

    this.assertWithinScope(
      target.organization?.path,
      requestorScopePath,
      "Vous n'avez pas les permissions pour impersonner cet utilisateur",
    );
  }

  /**
   * Valide l'assignation d'un périmètre à un nouveau principal (ex: le compte
   * de service créé pour un token applicatif), qui n'a donc pas d'état
   * précédent à comparer, contrairement à `assertCanUpdate`.
   */
  async assertCanAssignScopeToNewPrincipal(
    scopeOrganizationId: string | null | undefined,
    requestor: Requestor,
  ): Promise<void> {
    this.assertIsAdministrator(requestor);
    const requestorScopePath = requestor?.scopeOrganization?.path;
    // Si le requestor n'a pas de scope, c'est qu'il est super admin et peut tout faire → PAS DE CHECK
    if (!requestorScopePath) return;

    if (!scopeOrganizationId) {
      throw new ScopePermissionsException(
        "Vous devez assigner un périmètre à l'intérieur du vôtre",
      );
    }

    const scopeOrg = await this.fetchOrganization(scopeOrganizationId);
    this.assertWithinScope(
      scopeOrg.path,
      requestorScopePath,
      "Vous ne pouvez pas assigner un périmètre hors de votre périmètre",
    );
  }

  /**
   * Vérifie que le requestor a le droit de bloquer/débloquer l'accès du
   * `targetUserId` (même règle de périmètre que pour les autres actions
   * d'administration : il doit être dans le scope de l'organisation de la cible).
   */
  async assertCanBlock(
    targetUserId: string,
    requestor: Requestor,
  ): Promise<void> {
    await this.assertTargetWithinScope(
      targetUserId,
      requestor,
      "Vous n'avez pas les permissions pour modifier cet utilisateur",
    );
  }

  /**
   * #1985 : consultation d'un utilisateur (historique des connexions) — mêmes règles que
   * l'administration : rôle administrateur, et cible dans le périmètre pour un admin scopé.
   */
  async assertCanReadTarget(
    targetUserId: string,
    requestor: Requestor,
  ): Promise<void> {
    await this.assertTargetWithinScope(
      targetUserId,
      requestor,
      "Vous n'avez pas les permissions pour consulter cet utilisateur",
    );
  }

  private async assertTargetWithinScope(
    targetUserId: string,
    requestor: Requestor,
    message: string,
  ): Promise<void> {
    this.assertIsAdministrator(requestor);
    const requestorScopePath = requestor?.scopeOrganization?.path;
    if (!requestorScopePath) return;

    const currentUser = await this.prisma.user.findFirst({
      where: { id: targetUserId },
      include: { organization: true },
    });

    if (!currentUser) {
      throw new HttpException("Utilisateur introuvable", HttpStatus.NOT_FOUND);
    }

    this.assertWithinScope(
      currentUser.organization?.path,
      requestorScopePath,
      message,
    );
  }

  /**
   * #2498 : l'administration des utilisateurs (édition des droits, blocage, impersonation,
   * périmètre d'un compte de service) exige le RÔLE administrateur, pas seulement la permission
   * `AdminPanelManage`. Sans ce verrou, un utilisateur non-admin à qui l'on aurait délégué cette
   * permission — et qui n'a pas de périmètre, donc aucun contrôle de scope — se comportait en
   * super-administrateur et pouvait se promouvoir ADMIN.
   */
  private assertIsAdministrator(requestor: Requestor): void {
    // #1985 : défense en profondeur — le principal rétrogradé est déjà VISITOR et la garde de
    // permissions (AdminPanelManage) refuse en amont ; ce second rideau tient même si un refactor
    // reconstruisait le rôle depuis la base ou ouvrait une route sans garde.
    if (requestor?.authLevel?.downgraded) {
      throw new StepDownException("admin-action");
    }
    if (requestor?.role !== Roles.ADMIN) {
      throw new ScopePermissionsException(
        "Cette action est réservée aux administrateurs",
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
    // #2371 : un chemin absent ou vide n'est dans le périmètre d'AUCUN administrateur scopé — un
    // utilisateur sans organisation ne doit pas devenir modifiable/bloquable/impersonnable par un
    // admin scopé (l'ancien `if (targetPath && …)` laissait passer ce cas en silence).
    // L'appartenance est ancrée à la frontière de segment (`scope` lui-même ou un descendant
    // `scope + "/"`), et non un simple préfixe de chaîne (`/SG` ne matche pas `/SGAMI`).
    const withinScope =
      !!targetPath &&
      (targetPath === requestorScopePath ||
        targetPath.startsWith(`${requestorScopePath}/`));
    if (!withinScope) {
      throw new ScopePermissionsException(message);
    }
  }

  private resolveFieldAction(
    current: string | null,
    // null -> update la valeur de X -> null, undefined -> ne change pas la valeur de X, string -> update la valeur de X -> string
    incoming: string | null | undefined,
  ): FieldAction {
    if (incoming === undefined) return { type: "UNCHANGED" };
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
