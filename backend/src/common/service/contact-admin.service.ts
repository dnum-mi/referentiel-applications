import { Injectable } from "@nestjs/common";
import { Roles } from "@prisma/client";
import { ContactAdminDto } from "src/applications/dto/contact-admin.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { isPathWithinScope } from "../utils/organization-scope.utils";

// Adresse de contact générique, utilisée en dernier recours quand aucun administrateur n'existe
// en base. Même adresse que celle déjà affichée côté frontend (App.vue, AccessibilityPage.vue).
const SUPPORT_FALLBACK_EMAIL =
  "support-referentiel-applications@interieur.gouv.fr";

// Les paths d'organisation n'ont pas une forme unique en base (`/MI/DNUM`, `MI/DNUM`, `TOTO/`) :
// on compare sans séparateurs de bord pour que `/TOTO` et `TOTO/` désignent la même organisation.
const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, "");

const depthOf = (path: string) => path.split("/").filter(Boolean).length;

export interface ResolveContactAdminOptions {
  // Utilisateur à ne jamais renvoyer : un admin scopé ne doit pas se voir proposer lui-même.
  excludeUserId?: string;
}

/**
 * Administrateur à contacter pour un ensemble d'organisations (#2593) : l'admin local dont le
 * périmètre couvre l'une d'elles au plus près (pour `A/B/C` : admin `A/B/C`, sinon `A/B`, sinon
 * `A`), le plus récent à proximité égale ; sinon l'admin global le plus récent, sinon l'adresse
 * support statique.
 *
 * Partagé entre la fiche application (organisations de ses acteurs et directions métier) et le
 * profil utilisateur (organisation de l'utilisateur) : la règle de résolution doit rester unique.
 */
@Injectable()
export class ContactAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveByOrganizationPaths(
    orgPaths: string[],
    options: ResolveContactAdminOptions = {},
  ): Promise<ContactAdminDto> {
    const localAdmin = await this.findClosestLocalAdmin(orgPaths, options);
    if (localAdmin) return { email: localAdmin.email, source: "local" };

    const globalAdmin = await this.findMostRecentGlobalAdmin(options);
    if (globalAdmin) return { email: globalAdmin.email, source: "global" };

    return { email: SUPPORT_FALLBACK_EMAIL, source: "support" };
  }

  private async findClosestLocalAdmin(
    orgPaths: string[],
    { excludeUserId }: ResolveContactAdminOptions,
  ) {
    const targets = orgPaths.map(normalizePath).filter(Boolean);
    if (targets.length === 0) return null;

    // Population réduite (admins scopés) : le filtrage par ancêtre et le tri par proximité se
    // font en mémoire, ce qui tolère les variations de forme des paths.
    const scopedAdmins = await this.prisma.user.findMany({
      where: {
        role: Roles.ADMIN,
        scopeOrganizationId: { not: null },
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
      select: {
        email: true,
        lastPermissionChangeAt: true,
        scopeOrganization: { select: { path: true } },
      },
    });

    const candidates = scopedAdmins.flatMap((admin) => {
      const scope = normalizePath(admin.scopeOrganization?.path ?? "");
      const covers = targets.some((target) => isPathWithinScope(target, scope));
      return covers ? [{ ...admin, depth: depthOf(scope) }] : [];
    });

    candidates.sort(
      (a, b) =>
        b.depth - a.depth ||
        (b.lastPermissionChangeAt?.getTime() ?? 0) -
          (a.lastPermissionChangeAt?.getTime() ?? 0),
    );
    return candidates[0] ?? null;
  }

  private async findMostRecentGlobalAdmin({
    excludeUserId,
  }: ResolveContactAdminOptions) {
    return this.prisma.user.findFirst({
      where: {
        role: Roles.ADMIN,
        scopeOrganizationId: null,
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
      orderBy: { lastPermissionChangeAt: { sort: "desc", nulls: "last" } },
    });
  }
}
