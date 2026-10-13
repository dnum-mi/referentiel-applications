import { isApiSuccess } from "@/api/api-result";
import client from "@/api/index";
import {
  Roles,
  Permission,
  type AuthLevelDto,
  type UserEntity,
  type UpdateUserPreferencesDto,
  type UserFollowedApplicationDto,
  type UserWithPermissions,
} from "@/client/types.gen";
import {
  REAUTH_SUCCESS_MESSAGE,
  STEP_DOWN_MESSAGES,
  consumeReauthAttempt,
  consumeStepDownNotice,
  isStrongAuthRequiredResponse,
  setReauthLoop,
} from "@/composables/use-auth-level";
import type { APP_PERMISSIONS } from "@/models/Application";
import { USER_MANAGER } from "@/services/authentication";
import { clearImpersonationState, getImpersonationState, setImpersonationState, type ImpersonationState } from "@/services/impersonation";
import { defineStore } from "pinia";
import type { User } from "oidc-client-ts";
import { computed, ref } from "vue";
import { useToasterStore } from "./toasterStore";

function getOidcSessionKey(oidcUser: User | null) {
  if (!oidcUser || oidcUser.expired !== false) return undefined;
  const { iss, sub, sid } = oidcUser.profile;
  // Sans identifiant de session, une nouvelle connexion ne peut pas être distinguée
  // d'un renouvellement : on conserve alors l'invalidation complète.
  return iss && sub && sid ? JSON.stringify([iss, sub, sid]) : undefined;
}

export const useUserStore = defineStore("userStore", () => {
  const user = ref<UserWithPermissions>();
  const authenticated = ref(false);
  const sessionInitialized = ref(false);
  const deniedAuthLevel = ref<AuthLevelDto>();
  // Toutes les réponses sont rattachées à la session qui les a lancées, y compris les
  // préférences et abonnements. Un événement OIDC invalide aussi l'initialisation en cours.
  let sessionGeneration = 0;
  let fetchSequence = 0;
  let preferencesSequence = 0;
  let gristSettingsSequence = 0;
  // Un refus /me retire les droits mais garde l'identité OIDC connue pour une reprise.
  // Cette clé ne permet de conserver la vue qu'après une validation backend réussie.
  let oidcSessionKey: string | undefined;
  let requiresSessionRevalidation = false;

  function invalidateSession() {
    sessionGeneration += 1;
    requiresSessionRevalidation = false;
    user.value = undefined;
    deniedAuthLevel.value = undefined;
  }
  // État d'impersonation restauré depuis le localStorage (survit au rechargement).
  const impersonation = ref<ImpersonationState | null>(getImpersonationState());
  const isImpersonating = computed(() => impersonation.value !== null);
  // #1985 : niveau d'authentification décidé par le backend (`/users/me`). Toujours conditionner
  // l'affichage sur `downgraded`, jamais sur `level` : en mode observation le niveau peut être
  // faible sans aucun effet sur les droits.
  const authLevel = computed(() => deniedAuthLevel.value ?? user.value?.authLevel);
  const isAuthDowngraded = computed(() => authLevel.value?.downgraded === true);
  const hasApplicationAccess = computed(() => authenticated.value && !!user.value && !isAuthDowngraded.value);
  // #2801 : la capacité ouvre la vue transverse pour les profils à périmètre.
  // Les droits sur les fiches (notamment ceux d'acteur) ne l'accordent pas.
  const canListTechnologies = computed(
    () =>
      hasApplicationAccess.value &&
      [Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN].some((role) => role === user.value?.role) &&
      hasPermissions([Permission.TECHNOLOGY_LIST]),
  );

  function requireStrongAuth(level: AuthLevelDto) {
    invalidateSession();
    deniedAuthLevel.value = level;
    clearImpersonationState();
    impersonation.value = null;
    settleReauthAttempt();
  }

  // Écoute les événements OIDC pour maintenir l'état d'authentification à jour
  USER_MANAGER.events.addUserLoaded((oidcUser) => {
    const nextSessionKey = getOidcSessionKey(oidcUser);
    if (hasApplicationAccess.value && nextSessionKey && nextSessionKey === oidcSessionKey) {
      // Un renouvellement valide de la même session ne doit pas démonter la vue
      // et perdre la saisie. Le backend revalide toujours les droits avec le nouveau jeton.
      sessionGeneration += 1;
    } else {
      invalidateSession();
    }
    oidcSessionKey = nextSessionKey;
    requiresSessionRevalidation = true;
    authenticated.value = true;
    sessionInitialized.value = true;
    void fetchUser();
  });
  USER_MANAGER.events.addUserUnloaded(() => {
    // signinStrong retire le jeton avant la redirection. Garder l'écran de refus
    // permet de réessayer si le fournisseur est injoignable à cette étape.
    const denied = isAuthDowngraded.value ? authLevel.value : undefined;
    oidcSessionKey = undefined;
    invalidateSession();
    deniedAuthLevel.value = denied;
    authenticated.value = false;
    sessionInitialized.value = true;
  });

  // Initialise l'état d'authentification au démarrage
  USER_MANAGER.getUser().then((oidcUser) => {
    if (sessionGeneration !== 0) return;
    oidcSessionKey = getOidcSessionKey(oidcUser);
    authenticated.value = !!oidcUser;
    sessionInitialized.value = true;
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
    let response;
    try {
      response = await client.userControllerFindMe();
    } catch (error) {
      if (generation !== sessionGeneration || sequence !== fetchSequence) return;
      if (!requiresSessionRevalidation) throw error;
      invalidateSession();
      return;
    }
    if (generation !== sessionGeneration || sequence !== fetchSequence) return;
    if (response.data && isApiSuccess(response)) {
      requiresSessionRevalidation = false;
      deniedAuthLevel.value = undefined;
      user.value = response.data;
      settleReauthAttempt();
      notifyStepDown();
      return;
    }
    if (response.response?.status === 403 && isStrongAuthRequiredResponse(response.error)) {
      requireStrongAuth(response.error.authLevel);
      return;
    }
    // #1985 : filet — une impersonation persistée refusée (session rétrogradée) rejoue le header à
    // chaque requête ; si le payload `stepDown` n'est pas parvenu à l'intercepteur (proxy, ancien
    // backend pendant un déploiement), on purge et on repart d'un état propre.
    if (response.response?.status === 403 && getImpersonationState()) {
      clearImpersonationState();
      impersonation.value = null;
      globalThis.location.assign("/");
    }
    if (requiresSessionRevalidation) invalidateSession();
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
    if (authLevel.value?.downgraded) {
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
    if (generation !== sessionGeneration || sequence !== preferencesSequence) return;
    if (!isApiSuccess(response) || !response.data) throw new Error("La mise à jour des préférences de notification a échoué.");

    if (
      generation === sessionGeneration &&
      sequence === preferencesSequence &&
      user.value &&
      response.data?.id === user.value.id &&
      isApiSuccess(response)
    ) {
      // Une réponse de mutation ne rafraîchit jamais les droits de la session.
      user.value.emailNotificationsEnabled = response.data.emailNotificationsEnabled;
    }
  }

  /// Met à jour la configuration Grist du profil : seuls les champs fournis changent, `null` efface
  /// l'URL ou la clé. La clé n'est jamais relue : le profil indique seulement si elle est enregistrée.
  /// Lève une erreur si le backend refuse la configuration (identifiant ou URL mal formés…).
  async function updateGristSettings(settings: Pick<UpdateUserPreferencesDto, "gristDocIds" | "gristUrl" | "gristApiKey">) {
    const generation = sessionGeneration;
    const sequence = ++gristSettingsSequence;
    const response = await client.userControllerUpdateMe({ body: settings });
    if (!isApiSuccess(response)) {
      throw new Error("Erreur lors de la mise à jour de la configuration Grist.");
    }

    if (generation === sessionGeneration && sequence === gristSettingsSequence && user.value && response.data?.id === user.value.id) {
      user.value.gristDocIds = response.data.gristDocIds;
      user.value.gristUrl = response.data.gristUrl;
      user.value.hasGristApiKey = response.data.hasGristApiKey;
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
    if (generation !== sessionGeneration) return;
    if (!isApiSuccess(response) || !response.data) throw new Error("L’abonnement à l’application a échoué.");

    if (generation === sessionGeneration && user.value && response.data?.id === user.value.id && isApiSuccess(response)) {
      user.value.followedApplications = response.data.followedApplications;
    }
  }

  async function unsubscribeFromApp(appId: string) {
    const generation = sessionGeneration;
    const response = await client.userControllerUnsubscribe({
      path: { appId },
    });
    if (generation !== sessionGeneration) return;
    if (!isApiSuccess(response) || !response.data) throw new Error("Le désabonnement de l’application a échoué.");

    if (generation === sessionGeneration && user.value && response.data?.id === user.value.id && isApiSuccess(response)) {
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

    if (generation !== sessionGeneration) return;
    if (!isApiSuccess(response) || !response.data) throw new Error("La connexion sous cette identité a échoué.");

    if (generation === sessionGeneration) {
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
    const normalizedScope = scopePath.replace(/\/+$/, "").toLowerCase();
    const normalizedTarget = targetOrganizationPath.replace(/\/+$/, "").toLowerCase();
    if (!normalizedScope) return false;
    return normalizedTarget === normalizedScope || normalizedTarget.startsWith(`${normalizedScope}/`);
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
    updateGristSettings,
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
    hasApplicationAccess,
    canListTechnologies,
    sessionInitialized,
    requireStrongAuth,
  };
});
