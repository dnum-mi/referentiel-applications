import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { appConfig } from "./configs";
import keycloakConfig from "./configs/keycloak.config";
import { FrontendConfig } from "./domain/configs.entity";

@Injectable()
export class ConfigService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(keycloakConfig.KEY)
    private readonly keycloak: ConfigType<typeof keycloakConfig>,
  ) {}

  getFrontendConfig(): FrontendConfig {
    return {
      oidcConfigUrl: this.keycloak.configUrl,
      oidcClientId: this.keycloak.clientId,
      version: this.app.version,
      footerLinks: this.app.footerLinks,
    };
  }
}
