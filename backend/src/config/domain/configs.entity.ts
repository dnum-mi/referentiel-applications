export class FooterLink {
  label: string;
  title: string;
  href: string;
}

export class FrontendConfig {
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  version: string;
  footerLinks: FooterLink[];
}
