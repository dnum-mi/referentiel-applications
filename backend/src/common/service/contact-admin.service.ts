import { Injectable } from "@nestjs/common";
import { Roles } from "@prisma/client";
import { ContactAdminDto } from "src/applications/dto/contact-admin.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { ancestorPathsOf } from "../utils/organization-scope.utils";

// Adresse de contact générique, utilisée en dernier recours quand aucun administrateur n'existe
// en base. Même adresse que celle déjà affichée côté frontend (App.vue, AccessibilityPage.vue).
const SUPPORT_FALLBACK_EMAIL =
  "support-referentiel-applications@interieur.gouv.fr";

/**
 * Administrateur à contacter pour un ensemble d'organisations (#2593) : l'admin local le plus
 * récent dont le périmètre couvre l'une d'elles, sinon l'admin global le plus récent, sinon
 * l'adresse support statique.
 *
 * Partagé entre la fiche application (organisations de ses acteurs et directions métier) et le
 * profil utilisateur (organisation de l'utilisateur) : la règle de résolution doit rester unique.
 */
@Injectable()
export class ContactAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveByOrganizationPaths(
    orgPaths: string[],
  ): Promise<ContactAdminDto> {
    const localAdmin =
      orgPaths.length > 0
        ? await this.findMostRecentLocalAdmin(orgPaths)
        : null;
    if (localAdmin) return { email: localAdmin.email, source: "local" };

    const globalAdmin = await this.findMostRecentGlobalAdmin();
    if (globalAdmin) return { email: globalAdmin.email, source: "global" };

    return { email: SUPPORT_FALLBACK_EMAIL, source: "support" };
  }

  private async findMostRecentLocalAdmin(orgPaths: string[]) {
    const ancestorPaths = [...new Set(orgPaths.flatMap(ancestorPathsOf))];
    if (ancestorPaths.length === 0) return null;

    return this.prisma.user.findFirst({
      where: {
        role: Roles.ADMIN,
        scopeOrganization: {
          OR: ancestorPaths.map((path) => ({
            path: { equals: path, mode: "insensitive" },
          })),
        },
      },
      orderBy: { lastPermissionChangeAt: { sort: "desc", nulls: "last" } },
    });
  }

  private async findMostRecentGlobalAdmin() {
    return this.prisma.user.findFirst({
      where: { role: Roles.ADMIN, scopeOrganizationId: null },
      orderBy: { lastPermissionChangeAt: { sort: "desc", nulls: "last" } },
    });
  }
}
