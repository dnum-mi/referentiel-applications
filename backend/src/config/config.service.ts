import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { appConfig } from "./configs";
import oidcConfig from "./configs/oidc.config";
import { FrontendConfig } from "./domain/configs.entity";

@Injectable()
export class ConfigService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(oidcConfig.KEY)
    private readonly oidc: ConfigType<typeof oidcConfig>,
  ) {}

  getFrontendConfig(): FrontendConfig {
    return {
      oidcConfigUrl: this.oidc.configUrl,
      oidcClientId: this.oidc.clientId,
      version: this.app.version,
      environmentLabel: this.app.environmentLabel,
      footerLinks: this.app.footerLinks,
    };
  }
}
