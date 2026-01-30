export class FooterLink {
  label: string;
  title: string;
  href: string;
}

export class FrontendConfig {
  oidcConfigUrl: string;
  oidcClientId: string;
  version: string;
  footerLinks: FooterLink[];
}
