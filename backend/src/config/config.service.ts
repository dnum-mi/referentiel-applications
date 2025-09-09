import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import keycloakConfig from "./configs/keycloak.config";
import { FrontendConfig } from "./domain/configs.entity";
import { appConfig } from "./configs";

@Injectable()
export class ConfigService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(keycloakConfig.KEY) private readonly keycloak: ConfigType<typeof keycloakConfig>,
  ) {}

  getFrontendConfig(): FrontendConfig {
    return {
      keycloakUrl: this.keycloak.baseUrl,
      keycloakRealm: this.keycloak.realm,
      keycloakClientId: this.keycloak.clientId,
      version: this.app.version,
    };
  }
}
