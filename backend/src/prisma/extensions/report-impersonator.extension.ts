import { Prisma } from "@prisma/client";
import { requestContext } from "src/common/request-context";

/**
 * Renseigne automatiquement `Report.impersonatorId` depuis le contexte de
 * requête (#2061) : quand un signalement est créé pendant une requête faite
 * sous impersonation, l'administrateur réel est enregistré sans qu'aucun des
 * points de création (services métier, repository) n'ait à le passer.
 */
export const reportImpersonatorExtension = Prisma.defineExtension({
  name: "reportImpersonator",
  query: {
    report: {
      create({ args, query }) {
        const impersonatorId = requestContext.getStore()?.impersonatorId;
        // Le point de création utilise le style « relation » (`notifier: { connect }`) :
        // on complète donc `impersonator` de la même façon, jamais en scalaire, pour
        // rester cohérent avec le style de la requête (Prisma rejette le mélange).
        if (impersonatorId && !("impersonator" in args.data)) {
          const data = args.data as Prisma.ReportCreateInput;
          data.impersonator = { connect: { id: impersonatorId } };
        }
        return query(args);
      },
    },
  },
});
