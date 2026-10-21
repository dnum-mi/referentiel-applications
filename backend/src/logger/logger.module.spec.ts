import { createServer } from "node:http";
import { once } from "node:events";
import { Writable } from "node:stream";
import pinoHttp from "pino-http";
import request from "supertest";
import { httpLoggerOptions } from "./logger.module";

const authorization = "Bearer SYNTHETIC_BEARER_SECRET";
const apiToken = "SYNTHETIC_REFAPP_SECRET";

describe("HTTP log redaction (#2927)", () => {
  it.each(
    [200, 401, 403, 500].flatMap((status) =>
      [false, true].map((mixedCase) => ({ status, mixedCase })),
    ),
  )("removes authentication secrets for %p", async ({ status, mixedCase }) => {
    const output: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        output.push(chunk.toString());
        callback();
      },
    });
    const logger = pinoHttp(
      {
        ...httpLoggerOptions,
        // Exercise production JSON serialization even when Jest silences HTTP logs.
        enabled: true,
        level: "debug",
        transport: undefined,
      },
      stream,
    );
    let receivedHeaders: Record<string, unknown>;
    const server = createServer((req, res) => {
      logger(req, res);
      receivedHeaders = { ...req.headers };
      if (status === 500) {
        req.log.error(
          { err: new Error("Synthetic handler failure") },
          "failed",
        );
      }
      res.statusCode = status;
      res.end("synthetic response");
    });

    try {
      await request(server)
        .get("/synthetic-log-check")
        .set(mixedCase ? "aUtHoRiZaTiOn" : "authorization", authorization)
        .set(mixedCase ? "X-RefApp-Token" : "x-refapp-token", apiToken)
        .set("x-request-marker", "visible-marker")
        .expect(status);

      const finished = once(stream, "finish");
      stream.end();
      await finished;
      const serialized = output.join("");
      expect(output.length).toBeGreaterThan(0);
      expect(serialized).toContain("visible-marker");
      expect(serialized).toContain(`"statusCode":${status}`);
      expect(serialized).not.toContain(authorization);
      expect(serialized).not.toContain("SYNTHETIC_BEARER_SECRET");
      expect(serialized).not.toContain(apiToken);
      expect(serialized).not.toContain('"authorization"');
      expect(serialized).not.toContain('"x-refapp-token"');
      expect(receivedHeaders).toMatchObject({
        authorization,
        "x-refapp-token": apiToken,
      });
    } finally {
      server.close();
      stream.destroy();
    }
  });
});
