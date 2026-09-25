import type { ArgumentsHost } from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";
import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AllExceptionsFilter,
  INTERNAL_ERROR_MESSAGE,
} from "./all-exceptions.filter";

interface CapturedReply {
  body: Record<string, unknown>;
  status: number;
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("constraint failed", {
    code,
    clientVersion: "test",
  });

function setup(headers: Record<string, unknown> = {}) {
  const captured: CapturedReply[] = [];
  const responseHeaders = new Map<string, string>();

  const response = {
    getHeader: (name: string) => responseHeaders.get(name),
    setHeader: (name: string, value: string) =>
      responseHeaders.set(name, value),
  };
  const request = { headers };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  const adapterHost = {
    httpAdapter: {
      getRequestUrl: () => "/api/v2/applications/abc",
      reply: (_res: unknown, body: Record<string, unknown>, status: number) =>
        captured.push({ body, status }),
    },
  } as unknown as HttpAdapterHost;

  const filter = new AllExceptionsFilter(adapterHost);
  return {
    filter,
    host,
    responseHeaders,
    run(exception: unknown) {
      filter.catch(exception, host);
      return captured[captured.length - 1];
    },
  };
}

describe("AllExceptionsFilter (#2292)", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("enveloppe commune", () => {
    it("ajoute corrélation, horodatage et chemin à toute réponse d'erreur", () => {
      const { run } = setup({ "x-correlation-id": "corr-1" });

      const { body, status } = run(new NotFoundException("Introuvable"));

      expect(status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toMatchObject({
        statusCode: 404,
        message: "Introuvable",
        correlationId: "corr-1",
        path: "/api/v2/applications/abc",
      });
      expect(Date.parse(String(body.timestamp))).not.toBeNaN();
    });

    it("reprend l'identifiant déjà posé sur la réponse par l'intercepteur de log", () => {
      const { filter, host, responseHeaders } = setup();
      responseHeaders.set("X-Correlation-ID", "pose-par-intercepteur");

      filter.catch(new NotFoundException(), host);

      expect(responseHeaders.get("X-Correlation-ID")).toBe(
        "pose-par-intercepteur",
      );
    });

    it("génère et publie un identifiant quand l'erreur précède l'intercepteur", () => {
      const { run, responseHeaders } = setup();

      const { body } = run(new ForbiddenException());

      expect(String(body.correlationId)).toHaveLength(36);
      expect(responseHeaders.get("X-Correlation-ID")).toBe(body.correlationId);
    });
  });

  describe("contrats existants préservés", () => {
    it("conserve le tableau de messages de la validation", () => {
      const { run } = setup();

      const { body } = run(
        new BadRequestException({
          statusCode: 400,
          message: ["label trop court", "description requise"],
          error: "Bad Request",
        }),
      );

      expect(body.message).toStrictEqual([
        "label trop court",
        "description requise",
      ]);
    });

    it("conserve les champs métier d'un payload typé lu par le front", () => {
      const { run } = setup();

      const { body } = run(
        new ForbiddenException({
          statusCode: 403,
          strongAuthRequired: true,
          message: "Authentification forte requise.",
          authLevel: { level: "weak", downgraded: true, reason: "password" },
        }),
      );

      expect(body).toMatchObject({
        strongAuthRequired: true,
        authLevel: { level: "weak", downgraded: true, reason: "password" },
        message: "Authentification forte requise.",
      });
    });
  });

  describe("erreurs Prisma", () => {
    it.each([
      ["P2025", HttpStatus.NOT_FOUND],
      ["P2002", HttpStatus.CONFLICT],
      ["P2003", HttpStatus.CONFLICT],
      ["P2000", HttpStatus.BAD_REQUEST],
    ])("traduit %s en %s", (code, expected) => {
      const { run } = setup();

      const { status } = run(prismaError(code));

      expect(status).toBe(expected);
    });

    it("ne divulgue pas le message brut de Prisma", () => {
      const { run } = setup();

      const { body } = run(prismaError("P2002"));

      expect(String(body.message)).not.toContain("constraint failed");
      expect(body.message).toBe(
        "Un enregistrement avec les mêmes valeurs existe déjà.",
      );
    });

    it("laisse un code non métier en erreur interne", () => {
      const { run } = setup();

      const { status, body } = run(prismaError("P2021"));

      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.message).toBe(INTERNAL_ERROR_MESSAGE);
    });

    it("annonce une base injoignable en 503", () => {
      const { run } = setup();

      const { status } = run(
        new Prisma.PrismaClientInitializationError("no connection", "test"),
      );

      expect(status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe("erreurs imprévues", () => {
    it("masque le message interne derrière un texte générique", () => {
      const { run } = setup();

      const { status, body } = run(
        new Error("connect ECONNREFUSED 10.0.0.12:5432"),
      );

      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.message).toBe(INTERNAL_ERROR_MESSAGE);
      expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    });

    it("journalise la cause et la pile avec l'identifiant de corrélation", () => {
      const error = new Error("détail interne");
      const logged = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);
      const { run } = setup({ "x-correlation-id": "corr-9" });

      run(error);

      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining("corr-9"),
        error.stack,
      );
      expect(logged.mock.calls[0][0]).toContain("détail interne");
    });

    it("traite une valeur lancée qui n'est pas une Error", () => {
      const { run } = setup();

      const { status, body } = run("boom");

      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.message).toBe(INTERNAL_ERROR_MESSAGE);
    });
  });
});
