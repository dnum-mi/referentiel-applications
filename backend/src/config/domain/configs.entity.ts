export interface FooterLink {
  label: string;
  title: string;
  href: string;
}

export interface FrontendConfig {
  oidcConfigUrl: string;
  oidcClientId: string;
  version: string;
  environmentLabel?: string;
  footerLinks: FooterLink[];
}
