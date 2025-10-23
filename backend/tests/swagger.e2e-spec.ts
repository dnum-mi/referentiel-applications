import type { OpenAPIObject } from "@nestjs/swagger";
import type { ReferenceObject, ResponseObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface.js";
import request from "supertest";
import { setupTestSuite } from "./setup";

const methods = ["get", "post", "put", "delete", "patch", "options", "head"] as const;
describe("Test Swagger documentation", () => {
  const app = setupTestSuite();
  let openapiSpec: OpenAPIObject = {
    info: {
      title: "Referentiel Applications API",
      version: "1.0.0",
      description: "API documentation for Referentiel Applications",
    },
    openapi: "3.0.0",
    paths: {},
  };

  beforeAll(async () => {
    const response = await request(app().getHttpServer())
      .get("/swagger/json");
    openapiSpec = response.body as OpenAPIObject;
  });

  it("should return the OpenAPI spec", async () => {
    expect(Object.keys(openapiSpec.paths).length).toBeGreaterThan(0);
  });

  it("test all paths and responses", () => {
    for (const [path, pathObject] of Object.entries(openapiSpec.paths)) {
      for (const method of methods) {
        if (!pathObject[method]) {
          continue;
        }
        // check that post like method also define a request body
        if (["post", "put", "patch"].includes(method) && !pathObject[method].requestBody) {
          throw new Error(`Missing request body: ${method.toUpperCase()} ${path}`);
        }

        try {
          expect(pathObject[method].responses).toBeDefined();
        } catch (error) {
          throw new Error(`Missing responses: ${method.toUpperCase()} ${path}: ${error}`);
        }

        try {
          expect(pathObject[method].description || pathObject[method].summary).toBeDefined();
        } catch (error) {
          throw new Error(`Missing description or summary: ${method.toUpperCase()} ${path}: ${error}`);
        }

        for (const [code, response] of Object.entries(pathObject[method].responses)) {
          const castedResponse = response as ResponseObject | ReferenceObject;
          try {
            expect(response).toBeDefined();
          } catch (error) {
            throw new Error(`Missing object: ${method.toUpperCase()} ${path} ${code}: ${error}`);
          }
          // @ts-ignore
          if (!["202", "204", "404", "403", "409", "503"].includes(code) && !castedResponse.$ref && !castedResponse.content) {
            throw new Error(`Missing ref or content: ${method.toUpperCase()} ${path} ${code}`);
          }
        }
      }
    }
  });

  it.skip("test all schemas", async () => {
    const response = await request(app().getHttpServer())
      .get("/swagger/yaml");
    const openapiYaml = response.text;
    expect(openapiYaml).not.toContain("properties: {}");
  });
});
