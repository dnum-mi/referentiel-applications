import { LoggingService } from "./logging.service";
import { LoggerService } from "./logger.service";
import { sanitizeHeaders } from "../utils/sanitize-headers.util";

describe("Request header sanitization (#2927)", () => {
  it("masks both authentication headers without changing the request", () => {
    const headers = {
      Authorization: "Bearer SYNTHETIC_BEARER_SECRET",
      "X-RefApp-Token": "SYNTHETIC_REFAPP_SECRET",
      "x-request-marker": "visible-marker",
    };
    expect(sanitizeHeaders(headers)).toEqual({
      Authorization: "Bearer ***",
      "X-RefApp-Token": "***",
      "x-request-marker": "visible-marker",
    });
    expect(headers.Authorization).toBe("Bearer SYNTHETIC_BEARER_SECRET");
    expect(headers["X-RefApp-Token"]).toBe("SYNTHETIC_REFAPP_SECRET");
  });

  it("sanitizes direct LoggingService calls before JSON serialization", async () => {
    const logger = {
      debug: jest.fn(),
      error: jest.fn(),
    };
    const service = new LoggingService(logger as unknown as LoggerService);
    const headers = {
      authorization: "Bearer SYNTHETIC_BEARER_SECRET",
      "x-refapp-token": "SYNTHETIC_REFAPP_SECRET",
      "x-request-marker": "visible-marker",
    };
    await service.logRequest({ correlationId: "synthetic-id", headers });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    const output = JSON.stringify(logger.debug.mock.calls);
    expect(output).toContain("visible-marker");
    expect(output).not.toContain("SYNTHETIC_BEARER_SECRET");
    expect(output).not.toContain("SYNTHETIC_REFAPP_SECRET");
    expect(headers["x-refapp-token"]).toBe("SYNTHETIC_REFAPP_SECRET");
  });
});
