import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AuthLevelFrontendConfig,
  AuthLevelReauthFrontendConfig,
  FooterLink,
  FrontendConfig,
} from "../domain/configs.entity";

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

export class AuthLevelReauthConfigDto implements AuthLevelReauthFrontendConfig {
  @ApiProperty({
    enum: ["prompt", "logout"],
    enumName: "AuthLevelReauthStrategy",
    description:
      "prompt : redirection vers le fournisseur avec le paramètre prompt ; logout : déconnexion complète de la session SSO puis nouvelle connexion",
  })
  strategy: "prompt" | "logout";

  @ApiProperty({
    description: "Paramètre `prompt` de la demande d'autorisation OIDC",
    example: "login",
  })
  prompt: string;

  @ApiPropertyOptional({
    description: "Paramètre `acr_values` de la demande d'autorisation OIDC",
  })
  acrValues?: string;

  @ApiPropertyOptional({
    description:
      "Paramètre `max_age` (secondes) de la demande d'autorisation OIDC",
  })
  maxAge?: number;
}

export class AuthLevelConfigDto implements AuthLevelFrontendConfig {
  @ApiProperty({
    description:
      "Paramètres de la reconnexion forte ; null si elle est désactivée",
    type: () => AuthLevelReauthConfigDto,
    nullable: true,
  })
  reauth: AuthLevelReauthConfigDto | null;

  @ApiPropertyOptional({
    description:
      "Page d'aide (utiliser sa carte agent, activer la double authentification)",
  })
  helpUrl?: string;
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
    description: "OIDC scopes requested by the frontend",
    example: "openid profile email",
  })
  oidcScope: string;

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

  @ApiPropertyOptional({
    description:
      "Contrôle du niveau d'authentification (#1985) : présent uniquement quand la rétrogradation est appliquée",
    type: () => AuthLevelConfigDto,
  })
  authLevel?: AuthLevelConfigDto;
}
