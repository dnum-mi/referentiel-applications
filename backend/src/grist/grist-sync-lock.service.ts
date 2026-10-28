import {
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createHash } from "node:crypto";
import { Client } from "pg";
import databaseConfig from "src/config/configs/database.config";
import type { GristDocument } from "./grist.client";

@Injectable()
export class GristSyncLockService {
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly config: ConfigType<typeof databaseConfig>,
  ) {}

  async run<T>(
    document: GristDocument,
    tableId: string,
    synchronize: (assertHeld: () => void) => Promise<T>,
  ): Promise<T> {
    const identity = JSON.stringify([
      "grist-sync",
      new URL(document.url).href.replace(/\/+$/, ""),
      document.docId,
      tableId,
    ]);
    const key = createHash("sha256")
      .update(identity)
      .digest()
      .readBigInt64BE()
      .toString();
    // Une session dédiée garde le verrou pendant les appels HTTP, sans transaction longue.
    const client = new Client({
      connectionString: this.config.url,
      connectionTimeoutMillis: 10_000,
    });
    let disconnected = false;
    client.on("error", () => {
      disconnected = true;
    });
    client.on("end", () => {
      disconnected = true;
    });
    const assertHeld = () => {
      if (disconnected) {
        throw new ServiceUnavailableException(
          "Le verrou de synchronisation Grist a été perdu. Réessayez.",
        );
      }
    };
    try {
      await client.connect();
      const { rows } = await client.query(
        "SELECT pg_try_advisory_lock($1::bigint) AS locked",
        [key],
      );
      if (!rows[0].locked) {
        throw new ConflictException(
          "Une synchronisation est déjà en cours pour cette table. Réessayez dans quelques instants.",
        );
      }
      assertHeld();
      const result = await synchronize(assertHeld);
      assertHeld();
      return result;
    } finally {
      // Fermer la session libère le verrou même si la synchronisation ou les ACL ont échoué.
      await client.end();
    }
  }
}
