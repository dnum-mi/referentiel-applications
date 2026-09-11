import client from "@/api/index";
import { Roles, type Permission, type UserEntity, type UserFollowedApplicationDto, type UserWithPermissions } from "@/client/types.gen";
import {
  REAUTH_SUCCESS_MESSAGE,
  STEP_DOWN_MESSAGES,
  consumeReauthAttempt,
  consumeStepDownNotice,
  setReauthLoop,
} from "@/composables/use-auth-level";
import type { APP_PERMISSIONS } from "@/models/Application";
import { USER_MANAGER } from "@/services/authentication";
import { clearImpersonationState, getImpersonationState, setImpersonationState, type ImpersonationState } from "@/services/impersonation";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useToasterStore } from "./toasterStore";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<UserWithPermissions>();
  const authenticated = ref(false);
  // Toutes les réponses sont rattachées à la session qui les a lancées, y compris les
  // préférences et abonnements. Un événement OIDC invalide aussi l'initialisation en cours.
  let sessionGeneration = 0;
  let fetchSequence = 0;
  let preferencesSequence = 0;

  function invalidateSession() {
    sessionGeneration += 1;
    user.value = undefined;
  }
  // État d'impersonation restauré depuis le localStorage (survit au rechargement).
  const impersonation = ref<ImpersonationState | null>(getImpersonationState());
  const isImpersonating = computed(() => impersonation.value !== null);
  // #1985 : niveau d'authentification décidé par le backend (`/users/me`). Toujours conditionner
  // l'affichage sur `downgraded`, jamais sur `level` : en mode observation le niveau peut être
  // faible sans aucun effet sur les droits.
  const authLevel = computed(() => user.value?.authLevel);
  const isAuthDowngraded = computed(() => user.value?.authLevel?.downgraded === true);

  // Écoute les événements OIDC pour maintenir l'état d'authentification à jour
  USER_MANAGER.events.addUserLoaded(() => {
    invalidateSession();
    authenticated.value = true;
    fetchUser();
  });
  USER_MANAGER.events.addUserUnloaded(() => {
    invalidateSession();
    authenticated.value = false;
  });

  // Initialise l'état d'authentification au démarrage
  USER_MANAGER.getUser().then((oidcUser) => {
    if (sessionGeneration !== 0) return;
    authenticated.value = !!oidcUser;
    if (oidcUser) {
      fetchUser();
    }
  });

  const userRole = computed(() => {
    return user.value ? user.value.role : Roles.VISITOR;
  });

  // #1985 : deux `/users/me` peuvent se croiser au retour du callback OIDC (utilisateur chargé
  // au démarrage puis `userLoaded`). Seule la réponse la plus récente compte : une réponse
  // périmée ne doit ni écraser l'état, ni consommer le drapeau de reconnexion.
  async function fetchUser() {
    const generation = sessionGeneration;
    const sequence = ++fetchSequence;
    const response = await client.userControllerFindMe();
    if (generation !== sessionGeneration || sequence !== fetchSequence) return;
    if (response.data && response.response.ok) {
      user.value = response.data;
      settleReauthAttempt();
      notifyStepDown();
      return;
    }
    // #1985 : filet — une impersonation persistée refusée (session rétrogradée) rejoue le header à
    // chaque requête ; si le payload `stepDown` n'est pas parvenu à l'intercepteur (proxy, ancien
    // backend pendant un déploiement), on purge et on repart d'un état propre.
    if (response.response.status === 403 && getImpersonationState()) {
      clearImpersonationState();
      impersonation.value = null;
      globalThis.location.assign("/");
    }
  }

  // Après un rechargement forcé par un 403 `stepDown` (impersonation refusée), explique ce qui
  // vient de se passer : la session d'impersonation a disparu.
  function notifyStepDown() {
    const reason = consumeStepDownNotice();
    if (reason) useToasterStore().addErrorMessage(STEP_DOWN_MESSAGES[reason]);
  }

  // Au retour d'une reconnexion forte (#1985) : succès uniquement si le niveau fort est confirmé,
  // boucle sinon (le fournisseur a renvoyé la même session faible) — le bandeau l'explique.
  // Consommé uniquement sur une réponse réussie : un échec réseau laisse le drapeau au suivant.
  function settleReauthAttempt() {
    const strategy = consumeReauthAttempt();
    if (user.value?.authLevel?.downgraded) {
      // Toujours faible : retenir la voie qui vient d'échouer. Une bascule déjà retenue survit aux
      // rechargements de l'onglet tant qu'aucune session forte n'est constatée.
      if (strategy) setReauthLoop(strategy);
      return;
    }
    setReauthLoop(null);
    if (strategy && user.value?.authLevel?.level === "strong") useToasterStore().addSuccessMessage(REAUTH_SUCCESS_MESSAGE);
  }

  async function updateEmailPreferences(emailNotificationsEnabled: boolean) {
    const generation = sessionGeneration;
    const sequence = ++preferencesSequence;
    const response = await client.userControllerUpdateMe({
      body: { emailNotificationsEnabled },
    });

    if (
      generation === sessionGeneration &&
      sequence === preferencesSequence &&
      user.value &&
      response.data?.id === user.value.id &&
      response.response.ok
    ) {
      // Une réponse de mutation ne rafraîchit jamais les droits de la session.
      user.value.emailNotificationsEnabled = response.data.emailNotificationsEnabled;
    }
  }

  function isSubscribed(appId: string): boolean {
    return user.value?.followedApplications?.some((app: UserFollowedApplicationDto) => app.id === appId) ?? false;
  }

  async function subscribeToApp(appId: string) {
    const generation = sessionGeneration;
    const response = await client.userControllerSubscribe({
      path: { appId },
    });

    if (generation === sessionGeneration && user.value && response.data?.id === user.value.id && response.response.ok) {
      user.value.followedApplications = response.data.followedApplications;
    }
  }

  async function unsubscribeFromApp(appId: string) {
    const generation = sessionGeneration;
    const response = await client.userControllerUnsubscribe({
      path: { appId },
    });

    if (generation === sessionGeneration && user.value && response.data?.id === user.value.id && response.response.ok) {
      user.value.followedApplications = response.data.followedApplications;
    }
  }

  function getBusinessDivisionId(): string | null {
    return user.value?.organization?.businessDivisionId ?? null;
  }

  // Démarre une impersonation : l'admin se fait passer pour `target`. On recharge
  // l'application à la racine pour repartir d'un état propre sous la nouvelle identité.
  async function startImpersonation(target: UserEntity) {
    const generation = sessionGeneration;
    const adminEmail = user.value?.email;
    if (!adminEmail) return;

    const response = await client.userControllerImpersonate({
      path: { id: target.id },
    });

    if (generation === sessionGeneration && response.data && response.response.ok) {
      invalidateSession();
      setImpersonationState({
        userId: target.id,
        userEmail: target.email,
        adminEmail,
      });
      impersonation.value = getImpersonationState();
      globalThis.location.assign("/");
    }
  }

  // Arrête l'impersonation. L'appel part avec le header encore présent pour que le
  // serveur clôture la session côté audit, puis on nettoie l'état et on recharge.
  async function stopImpersonation() {
    const generation = sessionGeneration;
    try {
      await client.userControllerStopImpersonation();
    } finally {
      if (generation === sessionGeneration) {
        invalidateSession();
        clearImpersonationState();
        impersonation.value = null;
        globalThis.location.assign("/");
      }
    }
  }

  // Un admin scopé n'agit que dans son périmètre : organisation cible égale au scope ou
  // descendante à une frontière de segment (`scope + "/"`), jamais un simple préfixe (`/SG` ne
  // couvre pas `/SGAMI`). Une cible SANS organisation n'est dans le périmètre de personne
  // (#2508, même règle que le backend depuis #2371). Sans scope (admin global), tout est permis.
  // Règle unique pour édition, blocage, impersonation…
  function isWithinScope(targetOrganizationPath?: string | null) {
    const scopePath = user.value?.scopeOrganization?.path;
    if (!scopePath) return true;
    if (!targetOrganizationPath) return false;
    return targetOrganizationPath === scopePath || targetOrganizationPath.startsWith(`${scopePath}/`);
  }

  function hasPermissions(permissions: Permission[], userApplicationPerms?: APP_PERMISSIONS[]) {
    if (permissions.length === 0) return true;
    const userPermissions = new Set([
      ...(user.value?.permissions ?? []),
      ...(user.value?.additionalPermissions ?? []),
      ...Array.from(userApplicationPerms ?? []),
    ]);
    return Array.from(userPermissions).some((userPermission) => permissions.includes(userPermission));
  }

  return {
    user,
    userRole,
    authenticated,
    fetchUser,
    updateEmailPreferences,
    isSubscribed,
    subscribeToApp,
    unsubscribeFromApp,
    getBusinessDivisionId,
    hasPermissions,
    isWithinScope,
    impersonation,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
    authLevel,
    isAuthDowngraded,
  };
});
