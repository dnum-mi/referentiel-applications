import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { FeatureFlagService } from "src/feature-flag/feature-flag.service";
import { appConfig } from "./configs";
import oidcConfig from "./configs/oidc.config";
import { FrontendConfig } from "./domain/configs.entity";

@Injectable()
export class ConfigService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(oidcConfig.KEY)
    private readonly oidc: ConfigType<typeof oidcConfig>,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async getFrontendConfig(): Promise<FrontendConfig> {
    return {
      oidcConfigUrl: this.oidc.configUrl,
      oidcClientId: this.oidc.clientId,
      version: this.app.version,
      environmentLabel: this.app.environmentLabel,
      footerLinks: this.app.footerLinks,
      featureFlags: await this.featureFlagService.getEnabledMap(),
    };
  }
}
