import { ApiProperty } from "@nestjs/swagger";
import { FrontendConfig } from "../domain/configs.entity";

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
}
