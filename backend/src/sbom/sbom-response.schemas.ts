import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

const text: SchemaObject = { type: "string" };
const nullableText: SchemaObject = { type: "string", nullable: true };
const integer: SchemaObject = { type: "integer" };
const timestamp: SchemaObject = { type: "string", format: "date-time" };
const comparison: SchemaObject = {
  type: "object",
  required: ["ref", "product", "version"],
  properties: { ref: text, product: text, version: nullableText },
};
export const sbomComponentSchema: SchemaObject = {
  type: "object",
  required: [
    "ref",
    "product",
    "version",
    "purl",
    "ecosystem",
    "technology",
    "type",
    "identificationStatus",
    "context",
  ],
  properties: {
    id: text,
    ref: text,
    product: text,
    version: nullableText,
    purl: nullableText,
    ecosystem: nullableText,
    technology: text,
    type: text,
    importId: text,
    sourceName: text,
    context: { type: "string", enum: ["inventory", "provenance", "excluded"] },
    identificationStatus: {
      type: "string",
      enum: ["identified", "incomplete"],
    },
  },
};
export const sbomPreviewSchema: SchemaObject = {
  type: "object",
  required: [
    "id",
    "sourceName",
    "baseRevision",
    "expiresAt",
    "format",
    "specVersion",
    "warnings",
    "counts",
    "changes",
    "totalComponents",
    "unchanged",
  ],
  properties: {
    id: text,
    sourceName: text,
    baseRevision: integer,
    expiresAt: timestamp,
    createdAt: timestamp,
    status: { type: "string", enum: ["preview", "committed", "unchanged"] },
    format: text,
    specVersion: text,
    projectVersion: nullableText,
    totalComponents: integer,
    unchanged: { type: "boolean" },
    warnings: { type: "array", items: text },
    counts: {
      type: "object",
      required: ["added", "removed", "changed", "unchanged"],
      properties: {
        added: integer,
        removed: integer,
        changed: integer,
        unchanged: integer,
      },
    },
    changes: {
      type: "object",
      required: ["added", "removed", "changed", "unchanged"],
      properties: {
        added: { type: "array", items: comparison },
        removed: { type: "array", items: comparison },
        unchanged: integer,
        changed: {
          type: "array",
          items: {
            type: "object",
            required: ["before", "after"],
            properties: { before: comparison, after: comparison },
          },
        },
      },
    },
  },
};
export const sbomCommitSchema: SchemaObject = {
  type: "object",
  required: ["id", "sourceId", "revision", "unchanged"],
  properties: {
    id: text,
    sourceId: text,
    revision: integer,
    unchanged: { type: "boolean" },
  },
};
export const sbomSourcesSchema: SchemaObject = {
  type: "array",
  items: {
    type: "object",
    required: [
      "id",
      "name",
      "context",
      "active",
      "revision",
      "currentImportId",
      "componentCount",
      "updatedAt",
      "imports",
      "importCount",
    ],
    properties: {
      id: text,
      name: text,
      context: nullableText,
      active: { type: "boolean" },
      revision: integer,
      currentImportId: nullableText,
      componentCount: integer,
      updatedAt: timestamp,
      importCount: integer,
      imports: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: text,
            createdAt: timestamp,
            format: text,
            specVersion: text,
            componentCount: integer,
            status: text,
          },
        },
      },
    },
  },
};
export const sbomDetailSchema: SchemaObject = {
  ...sbomPreviewSchema,
  properties: {
    ...sbomPreviewSchema.properties,
    components: { type: "array", items: sbomComponentSchema },
    relations: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "type", "resolved"],
        properties: {
          from: text,
          to: text,
          type: text,
          resolved: { type: "boolean" },
        },
      },
    },
  },
};
export const sbomComponentsPageSchema: SchemaObject = {
  type: "object",
  required: ["total", "results"],
  properties: {
    total: integer,
    results: { type: "array", items: sbomComponentSchema },
  },
};
export const sbomSourceUpdateSchema: SchemaObject = {
  oneOf: [
    {
      type: "object",
      required: ["removed", "added", "revision"],
      properties: { removed: integer, added: integer, revision: integer },
    },
    {
      type: "object",
      required: ["id", "revision"],
      properties: { id: text, revision: integer },
    },
  ],
};

export const sbomHistoryPageSchema: SchemaObject = {
  type: "object",
  required: ["total", "results"],
  properties: {
    total: integer,
    results: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "createdAt",
          "format",
          "specVersion",
          "componentCount",
          "status",
        ],
        properties: {
          id: text,
          createdAt: timestamp,
          format: text,
          specVersion: text,
          componentCount: integer,
          status: text,
        },
      },
    },
  },
};
