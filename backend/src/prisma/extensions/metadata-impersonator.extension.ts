import { Prisma } from "@prisma/client";
import { requestContext } from "src/common/request-context";

/**
 * Renseigne automatiquement `Metadata.impersonatorId` depuis le contexte de
 * requête (#2226) : quand une métadonnée est créée pendant une requête faite
 * sous impersonation, l'administrateur réel est enregistré sans qu'aucun des
 * points de création (services métier, repository) n'ait à le passer.
 */
export const metadataImpersonatorExtension = Prisma.defineExtension({
  name: "metadataImpersonator",
  query: {
    metadata: {
      create({ args, query }) {
        const impersonatorId = requestContext.getStore()?.impersonatorId;
        // Ne complète que les créations en style « unchecked » (scalaires,
        // seul style utilisé dans le code) : mélanger un scalaire à des
        // relations objet (`createdBy: { connect }`) serait rejeté par Prisma.
        const usesRelationObjects =
          "createdBy" in args.data || "impersonator" in args.data;
        if (impersonatorId && !usesRelationObjects) {
          const data = args.data as Prisma.MetadataUncheckedCreateInput;
          data.impersonatorId ??= impersonatorId;
        }
        return query(args);
      },
      createMany({ args, query }) {
        const impersonatorId = requestContext.getStore()?.impersonatorId;
        if (impersonatorId) {
          const rows = Array.isArray(args.data) ? args.data : [args.data];
          for (const row of rows) {
            row.impersonatorId ??= impersonatorId;
          }
        }
        return query(args);
      },
    },
  },
});
