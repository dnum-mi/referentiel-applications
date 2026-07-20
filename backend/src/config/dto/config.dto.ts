import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FooterLink, FrontendConfig } from "../domain/configs.entity";

export class FooterLinkDto implements FooterLink {
  @ApiProperty({
    description: "Link label",
    example: "Documentation",
  })
  label: string;

  @ApiProperty({
    description: "Link title (tooltip)",
    example: "Aller à la documentation",
  })
  title: string;

  @ApiProperty({
    description: "Link URL",
    example: "https://documentation.example.com",
  })
  href: string;
}

export class ConfigDto implements FrontendConfig {
  @ApiProperty({
    description: "OIDC configuration URL",
    example:
      "https://auth.sso.interieur.rie.gouv.fr/.well-known/openid-configuration",
  })
  oidcConfigUrl: string;

  @ApiProperty({
    description: "OIDC client ID",
    example: "my-client-id",
  })
  oidcClientId: string;

  @ApiProperty({
    description: "Backend version",
    example: "1.0.0",
  })
  version: string;

  @ApiPropertyOptional({
    description: "Environment label displayed in the header badge",
    example: "developpement",
  })
  environmentLabel?: string;

  @ApiProperty({
    description: "Footer links to display in the application footer",
    type: [FooterLinkDto],
  })
  footerLinks: FooterLinkDto[];

  @ApiProperty({
    description: "Feature flags state, keyed by technical flag key",
    example: { "fulltext-search": true },
    additionalProperties: { type: "boolean" },
    type: "object",
  })
  featureFlags: Record<string, boolean>;
}
