// src/main.ts
import type { INestApplication } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import type { KeycloakConfig } from "./config/keycloak.config";

// Configuration de Swagger
export function setupSwagger(
  app: INestApplication<any>,
  options: {
    writeYaml?: boolean
    onlyWriteSwagger?: boolean
    baseUrl: string
  },
  keycloakConfig: Pick<KeycloakConfig, "baseUrl" | "realm" | "clientId">,
) {
  const config = new DocumentBuilder()
    .setTitle("API Référentiel Applications")
    .setDescription("API pour la gestion des applications")
    .setExternalDoc("Specification JSON", `${options.baseUrl}/api/v2/swagger/json`)
    .addServer(options.baseUrl)
    .setVersion("2.0")
    .addOAuth2(
      {
        type: "oauth2",
        description: "OAuth2 authentication using Keycloak",
        flows: {
          authorizationCode: {
            authorizationUrl: `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/auth`,
            tokenUrl: `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
            refreshUrl: `${keycloakConfig.baseUrl}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
            scopes: {
              openid: "OpenID scope",
              profile: "Profile scope",
            },
          },
        },
      },
      "oauth2",
    )
    .addSecurityRequirements("oauth2")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("/swagger", app, document, {
    explorer: true,
    jsonDocumentUrl: "/swagger/json",
    yamlDocumentUrl: "/swagger/yaml",
    useGlobalPrefix: true,
    swaggerOptions: {
      oauth2RedirectUrl: `${options.baseUrl}/api/v2/swagger/oauth2-redirect.html`,
      usePkceWithAuthorizationCodeGrant: true,
      initOAuth: {
        scopes: ["openid", "profile"],
        clientId: keycloakConfig.clientId,
      },
    },
  });

  if (options.writeYaml) {
    const yamlContent = stringify(document, { });
    // Écriture au format YAML
    setTimeout(() => {
      writeFile(join(__dirname, "../..", "openapi", "swagger.yaml"), yamlContent)
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
