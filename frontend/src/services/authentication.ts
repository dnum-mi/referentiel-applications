import type { KeycloakInitOptions } from "keycloak-js";
import Keycloak from "keycloak-js";
import { getConfig } from "./config";

export const keycloakInitOptions: KeycloakInitOptions = {
  onLoad: "check-sso",
  flow: "standard",
};

const config = await getConfig();
if (config instanceof Error) {
  throw config;
}

const keycloakConfig = {
  keycloakUrl: config.keycloakUrl,
  keycloakRealm: config.keycloakRealm,
  keycloakClientId: config.keycloakClientId,
};

let authentication: Keycloak;

export function getAuthentication(): Keycloak {
  if (!authentication) {
    authentication = new Keycloak({
      url: keycloakConfig.keycloakUrl,
      realm: keycloakConfig.keycloakRealm,
      clientId: keycloakConfig.keycloakClientId,
    });
    authentication.onAuthSuccess = () => {
      if (
        !(
          authentication.refreshTokenParsed?.exp &&
          authentication.tokenParsed?.exp &&
          authentication.refreshTokenParsed.exp > authentication.tokenParsed.exp
        )
      ) {
        return;
      }
      console.warn("Keycloak misconfiguration : refreshToken should not expire before token.");
      const refreshTokenDelay = (authentication.tokenParsed.exp * 1000 - Date.now()) / 2;
      setTimeout(() => {
        authentication.updateToken();
      }, refreshTokenDelay);
    };
    authentication.onTokenExpired = () => {
      authentication.updateToken(30);
    };
  }
  return authentication;
}

export async function authenticationInit() {
  const currentUrl = new URL(window.location.href);
  const redirectUri = `${window.location.origin}${currentUrl.pathname}${currentUrl.search}`;
  try {
    const { onLoad, flow } = keycloakInitOptions;
    const keycloak = getAuthentication();
    await keycloak.init({
      onLoad,
      flow,
      redirectUri,
    });
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("échec d'initialisation du keycloak");
  }
}

export async function keycloakLogin() {
  try {
    const keycloak = getAuthentication();
    const currentUrl = new URL(window.location.href);
    const redirectUri = `${window.location.origin}${currentUrl.pathname}${currentUrl.search}`;
    await keycloak.login({ redirectUri });
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("échec de connexion au keycloak");
  }
}

export async function keycloakLogout() {
  try {
    const keycloak = getAuthentication();
    await keycloak.logout();
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("échec de déconnexion du keycloak");
  }
}
