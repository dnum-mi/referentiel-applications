import {
  Controller,
  Get,
  INestApplication,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Logger, PARAMS_PROVIDER_TOKEN, Params } from "nestjs-pino";
import { Writable } from "node:stream";
import request from "supertest";
import { AllExceptionsFilter } from "../common/filters/all-exceptions.filter";
import { httpLoggerOptions, LoggerModule } from "./logger.module";

@Controller("synthetic-log-check")
class SyntheticController {
  @Get(":status")
  get(@Param("status") status: string) {
    if (status === "401") throw new UnauthorizedException("Synthetic refusal");
    if (status === "500") throw new Error("Synthetic handler failure");
    return { ok: true };
  }
}

describe("Nest HTTP log redaction (#2927)", () => {
  let app: INestApplication;
  const output: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });

  beforeAll(async () => {
    const params: Params = {
      pinoHttp: [
        {
          ...httpLoggerOptions,
          enabled: true,
          level: "debug",
          transport: undefined,
        },
        stream,
      ],
    };
    const module = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [SyntheticController],
    })
      .overrideProvider(PARAMS_PROVIDER_TOKEN)
      .useValue(params)
      .compile();
    app = module.createNestApplication();
    app.useLogger(app.get(Logger));
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    stream.destroy();
  });

  it.each([200, 401, 500])(
    "keeps request context and exception logs safe for HTTP %i",
    async (status) => {
      output.length = 0;
      await request(app.getHttpServer())
        .get(`/synthetic-log-check/${status}`)
        .set("Authorization", "Bearer SYNTHETIC_NEST_BEARER_SECRET")
        .set("X-RefApp-Token", "SYNTHETIC_NEST_REFAPP_SECRET")
        .set("x-correlation-id", `synthetic-correlation-${status}`)
        .expect(status);

      const serialized = output.join("");
      expect(serialized).toContain(`"statusCode":${status}`);
      expect(serialized).toContain(`synthetic-correlation-${status}`);
      expect(serialized).not.toContain("SYNTHETIC_NEST_BEARER_SECRET");
      expect(serialized).not.toContain("SYNTHETIC_NEST_REFAPP_SECRET");
      if (status === 500) {
        expect(serialized).toContain("Synthetic handler failure");
        expect(serialized).toContain("AllExceptionsFilter");
      }
    },
  );
});
