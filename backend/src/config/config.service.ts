import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { appConfig, authLevelConfig } from "./configs";
import oidcConfig from "./configs/oidc.config";
import {
  AuthLevelFrontendConfig,
  FrontendConfig,
} from "./domain/configs.entity";

@Injectable()
export class ConfigService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(oidcConfig.KEY)
    private readonly oidc: ConfigType<typeof oidcConfig>,
    @Inject(authLevelConfig.KEY)
    private readonly authLevel: ConfigType<typeof authLevelConfig>,
  ) {}

  getFrontendConfig(): FrontendConfig {
    return {
      oidcConfigUrl: this.oidc.configUrl,
      oidcClientId: this.oidc.clientId,
      oidcScope: this.oidc.scope,
      version: this.app.version,
      environmentLabel: this.app.environmentLabel,
      footerLinks: this.app.footerLinks,
      authLevel: this.getAuthLevelFrontendConfig(),
    };
  }

  // #1985 : `/config` est publique. Seul ce dont le bandeau a besoin en mode `enforce` y
  // figure — jamais le nom du claim, ses valeurs fortes, les fournisseurs de confiance, ni
  // l'existence du mode `observe`.
  private getAuthLevelFrontendConfig(): AuthLevelFrontendConfig | undefined {
    if (this.authLevel.mode !== "enforce") return undefined;
    const { reauth, helpUrl } = this.authLevel;
    return {
      reauth: reauth.enabled
        ? {
            prompt: reauth.prompt,
            acrValues: reauth.acrValues,
            maxAge: reauth.maxAge,
          }
        : null,
      helpUrl,
    };
  }
}
