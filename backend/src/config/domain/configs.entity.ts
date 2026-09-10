export interface FooterLink {
  label: string;
  title: string;
  href: string;
}

/** Paramètres de la reconnexion forte proposée par le bandeau (#1985). */
export interface AuthLevelReauthFrontendConfig {
  prompt: string;
  acrValues?: string;
  maxAge?: number;
}

/**
 * Configuration du niveau d'authentification servie au front (#1985). Présente uniquement en
 * mode `enforce` : `/config` est publique, on n'y expose ni le nom du claim, ni les valeurs
 * fortes, ni les fournisseurs de confiance, ni le mode `observe`.
 */
export interface AuthLevelFrontendConfig {
  /** `null` quand la reconnexion forte est désactivée (AUTH_LEVEL_REAUTH_ENABLED=false). */
  reauth: AuthLevelReauthFrontendConfig | null;
  helpUrl?: string;
}

export interface FrontendConfig {
  oidcConfigUrl: string;
  oidcClientId: string;
  oidcScope: string;
  version: string;
  environmentLabel?: string;
  footerLinks: FooterLink[];
  authLevel?: AuthLevelFrontendConfig;
}
