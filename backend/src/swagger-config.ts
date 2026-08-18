// src/main.ts
import type { INestApplication } from "@nestjs/common";
import type { AppConfig } from "./config/configs/app.config";
import type { OidcConfig } from "./config/configs/oidc.config";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { stringify } from "yaml";
import { API_KEY_HEADER } from "./utils/constants.util";

const API_PREFIX = "/api/v2";
const SWAGGER_PATH = "/swagger";

function getRealmUrl(configUrl: string) {
  return configUrl
    .trim()
    .replace(/\/\.well-known\/openid-configuration\/?$/, "")
    .replace(/\/+$/, "");
}

function getSwaggerPublicUrl(
  options: Pick<AppConfig, "host" | "port" | "swaggerPublicUrl">,
) {
  if (options.swaggerPublicUrl) {
    return options.swaggerPublicUrl.trim().replace(/\/+$/, "");
  }

  const host = options.host === "0.0.0.0" ? "localhost" : options.host;

  return `http://${host}:${options.port}`;
}

// Configuration de Swagger
export function setupSwagger(
  app: INestApplication,
  options: Pick<
    AppConfig,
    "host" | "port" | "swaggerPublicUrl" | "writeYaml" | "onlyWriteSwagger"
  >,
  oidcConfig: Pick<OidcConfig, "configUrl" | "clientId">,
) {
  const realmUrl = getRealmUrl(oidcConfig.configUrl);
  const swaggerPublicUrl = getSwaggerPublicUrl(options);

  const config = new DocumentBuilder()
    .setTitle("API Référentiel Applications")
    .setDescription("API pour la gestion des applications")
    .setVersion("2.0")
    .addOAuth2(
      {
        type: "oauth2",
        description: "OAuth2 authentication using OIDC",
        flows: {
          authorizationCode: {
            authorizationUrl: `${realmUrl}/protocol/openid-connect/auth`,
            tokenUrl: `${realmUrl}/protocol/openid-connect/token`,
            refreshUrl: `${realmUrl}/protocol/openid-connect/token`,
            scopes: {
              openid: "OpenID scope",
              profile: "Profile scope",
            },
          },
        },
      },
      "oauth2",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: API_KEY_HEADER,
        in: "header",
        description: "Token authentication",
      },
      "api_key",
    )
    .addSecurityRequirements("oauth2")
    .addSecurityRequirements("api_key")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    explorer: true,
    jsonDocumentUrl: `${SWAGGER_PATH}/json`,
    yamlDocumentUrl: `${SWAGGER_PATH}/yaml`,
    useGlobalPrefix: true,
    swaggerOptions: {
      oauth2RedirectUrl: `${swaggerPublicUrl}${API_PREFIX}${SWAGGER_PATH}/oauth2-redirect.html`,
      usePkceWithAuthorizationCodeGrant: true,
      initOAuth: {
        scopes: ["openid", "profile"],
        clientId: oidcConfig.clientId,
      },
    },
  });

  if (options.writeYaml) {
    const yamlContent = stringify(document, {});
    // Écriture au format YAML
    setTimeout(() => {
      writeFile(
        join(__dirname, "../..", "openapi", "swagger.yaml"),
        yamlContent,
      )
        .catch((error) => {
          console.error("Error writing Swagger YAML file:", error);
        })
        .finally(() => {
          if (options.onlyWriteSwagger) {
            // Si on ne veut que générer le fichier YAML et pas démarrer l'application
            process.exit(0);
          }
        });
    }, 1000);
  }
}
