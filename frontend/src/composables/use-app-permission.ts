import { Permission } from "@/client/types.gen";
import type { APP_PERMISSIONS } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

/**
 * Vérifie qu'une des `permissions` est portée par l'utilisateur courant ou par
 * ses permissions sur l'application (`myPerms`). Source unique du motif
 * `hasPermissions([...], Array.from(props.application.myPerms))` répété dans les
 * onglets de la fiche application (#2245) — encapsule la conversion Set → Array
 * et le fallback quand les permissions applicatives sont absentes.
 *
 * `appPerms` accepte un Set/tableau, une ref ou un getter
 * (`() => props.application.myPerms`) pour rester réactif aux changements de props.
 */
export function useAppPermission(
  appPerms: MaybeRefOrGetter<Iterable<APP_PERMISSIONS> | null | undefined>,
  permissions: Permission[],
): ComputedRef<boolean> {
  const userStore = useUserStore();
  return computed(() => userStore.hasPermissions(permissions, Array.from(toValue(appPerms) ?? [])));
}
