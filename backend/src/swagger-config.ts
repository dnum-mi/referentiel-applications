// src/main.ts
import type { INestApplication } from "@nestjs/common";
import type { OidcConfig } from "./config/configs/oidc.config";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { stringify } from "yaml";
import { API_KEY_HEADER } from "./utils/constants.util";

// Configuration de Swagger
export function setupSwagger(
  app: INestApplication<any>,
  options: {
    writeYaml?: boolean;
    onlyWriteSwagger?: boolean;
  },
  oidcConfig: Pick<OidcConfig, "configUrl" | "clientId">,
) {
  // Extract the base URL from OIDC_CONFIG_URL by removing the .well-known path
  // e.g., "https://auth.sso.interieur.rie.gouv.fr/.well-known/openid-configuration"
  // becomes "https://auth.sso.interieur.rie.gouv.fr"
  const baseUrl = oidcConfig.configUrl.replace(
    /.well-known\/openid-configuration$/,
    "",
  );

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
            authorizationUrl: `${baseUrl}/protocol/openid-connect/auth`,
            tokenUrl: `${baseUrl}/protocol/openid-connect/token`,
            refreshUrl: `${baseUrl}/protocol/openid-connect/token`,
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

  SwaggerModule.setup("/swagger", app, document, {
    explorer: true,
    jsonDocumentUrl: "/swagger/json",
    yamlDocumentUrl: "/swagger/yaml",
    useGlobalPrefix: true,
    swaggerOptions: {
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
