import { ApiProperty } from "@nestjs/swagger";
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
    description: "Keycloak base URL",
    example: "https://keycloak.example.com",
  })
  keycloakUrl: string;

  @ApiProperty({
    description: "Keycloak realm",
    example: "my-realm",
  })
  keycloakRealm: string;

  @ApiProperty({
    description: "Keycloak client ID",
    example: "my-client-id",
  })
  keycloakClientId: string;

  @ApiProperty({
    description: "Backend version",
    example: "1.0.0",
  })
  version: string;

  @ApiProperty({
    description: "Footer links to display in the application footer",
    type: [FooterLinkDto],
  })
  footerLinks: FooterLinkDto[];
}
