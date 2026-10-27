import { EventEmitter } from "node:events";
import { Client } from "pg";
import { GristSyncLockService } from "./grist-sync-lock.service";

jest.mock("pg", () => ({ Client: jest.fn() }));

const document = {
  url: "https://grist.example",
  docId: "doc",
  apiKey: "secret",
};

describe("GristSyncLockService", () => {
  let connection: EventEmitter & {
    connect: jest.Mock;
    query: jest.Mock;
    end: jest.Mock;
  };
  const service = new GristSyncLockService({ url: "postgresql://test" });
  beforeEach(() => {
    connection = Object.assign(new EventEmitter(), {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rows: [{ locked: true }] }),
      end: jest.fn().mockResolvedValue(undefined),
    });
    (Client as jest.Mock).mockImplementation(() => connection);
  });

  it("refuse le conflit sans exécuter les écritures et ferme la connexion", async () => {
    connection.query.mockResolvedValue({ rows: [{ locked: false }] });
    const action = jest.fn();
    await expect(service.run(document, "RefApp", action)).rejects.toThrow(
      "déjà en cours",
    );
    expect(action).not.toHaveBeenCalled();
    expect(connection.end).toHaveBeenCalledTimes(1);
  });

  it.each(["error", "end"])(
    "arrête les écritures après l'événement %s",
    async (event) => {
      await expect(
        service.run(document, "RefApp", async (assertHeld) => {
          assertHeld();
          connection.emit(event, new Error("connexion perdue"));
          assertHeld();
        }),
      ).rejects.toThrow("verrou de synchronisation Grist a été perdu");
      expect(connection.end).toHaveBeenCalledTimes(1);
    },
  );

  it("ne renvoie pas de succès si la connexion est perdue pendant le dernier appel", async () => {
    await expect(
      service.run(document, "RefApp", async () => {
        connection.emit("end");
        return "ok";
      }),
    ).rejects.toThrow("verrou de synchronisation Grist a été perdu");
  });

  it("partage la clé entre utilisateurs et URL équivalentes, mais distingue les tables", async () => {
    await service.run(document, "RefApp", async () => {});
    await service.run(
      { ...document, url: "https://GRIST.example:443/", apiKey: "autre" },
      "RefApp",
      async () => {},
    );
    await service.run(document, "RefApp2", async () => {});
    const keys = connection.query.mock.calls.map(([, [key]]) => key);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).not.toBe(keys[2]);
  });

  it("ferme aussi la connexion lorsque sa création échoue", async () => {
    connection.connect.mockRejectedValue(new Error("indisponible"));
    await expect(service.run(document, "RefApp", jest.fn())).rejects.toThrow(
      "indisponible",
    );
    expect(connection.end).toHaveBeenCalledTimes(1);
  });
});
