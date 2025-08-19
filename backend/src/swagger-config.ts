// src/main.ts
import type { INestApplication } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";

// Configuration de Swagger
export function setupSwagger(
  app: INestApplication<any>,
  writeYaml = process.env.WRITE_SWAGGER_YAML === "true",
) {
  const config = new DocumentBuilder()
    .setTitle("API Référentiel Applications")
    .setDescription("API pour la gestion des applications")
    .setVersion("2.0")
    .addOAuth2(
      {
        type: "oauth2",
        description: "OAuth2 authentication using Keycloak",
        flows: {
          authorizationCode: {
            authorizationUrl: `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
            tokenUrl: `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
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
      oauth2RedirectUrl: "http://localhost:3500/api/v2/swagger/oauth2-redirect.html",
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      usePkceWithAuthorizationCodeGrant: true,
    },
  });

  if (writeYaml) {
    const yamlContent = stringify(document);
    // Écriture au format YAML
    setTimeout(() => {
      writeFile(join(__dirname, "../..", "openapi", "swagger.yaml"), yamlContent)
        .catch((error) => {
          console.error("Error writing Swagger YAML file:", error);
        })
        .finally(() => {
          if (process.env.ONLY_WRITE_SWAGGER === "true") {
          // Si on ne veut que générer le fichier YAML et pas démarrer l'application
            process.exit(0);
          }
        });
    }, 1000);
  }
}
