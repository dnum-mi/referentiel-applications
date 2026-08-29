import { Prisma } from "@prisma/client";
import { requestContext } from "src/common/request-context";

/**
 * Renseigne automatiquement `UserPermissionLog.impersonatorId` depuis le
 * contexte de requête (#2061) : quand une entrée d'historique de permissions
 * est créée pendant une requête faite sous impersonation, l'administrateur
 * réel est enregistré sans qu'aucun des points de création n'ait à le passer.
 */
export const userPermissionLogImpersonatorExtension = Prisma.defineExtension({
  name: "userPermissionLogImpersonator",
  query: {
    userPermissionLog: {
      create({ args, query }) {
        const impersonatorId = requestContext.getStore()?.impersonatorId;
        if (impersonatorId) {
          const data =
            args.data as Prisma.UserPermissionLogUncheckedCreateInput;
          data.impersonatorId ??= impersonatorId;
        }
        return query(args);
      },
    },
  },
});
