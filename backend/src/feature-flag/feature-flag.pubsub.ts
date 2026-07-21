import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Client } from "pg";
import databaseConfig from "src/config/configs/database.config";

/** Canal Postgres utilisé pour propager les invalidations entre instances. */
const CHANNEL = "feature_flags_changed";

/**
 * Propagation temps réel des bascules de feature flags entre instances backend,
 * via Postgres LISTEN/NOTIFY (aucune infrastructure supplémentaire : la base
 * est déjà le point commun de toutes les instances).
 *
 * - `publishInvalidation()` (appelé au PATCH) émet un NOTIFY ;
 * - chaque instance écoute le canal sur une connexion dédiée et invalide son
 *   cache local à réception — la bascule se propage en quelques millisecondes,
 *   le TTL du cache ne restant qu'un filet de sécurité (panne du canal).
 *
 * Résilience : la connexion d'écoute se rétablit seule (backoff plafonné) ; un
 * échec n'empêche jamais le boot ni ne casse une requête.
 */
@Injectable()
export class FeatureFlagPubSub implements OnModuleInit, OnModuleDestroy {
  private static readonly RECONNECT_BASE_MS = 1_000;
  private static readonly RECONNECT_MAX_MS = 30_000;

  private readonly logger = new Logger(FeatureFlagPubSub.name);
  private listener: Client | null = null;
  private reconnectDelay = FeatureFlagPubSub.RECONNECT_BASE_MS;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closed = false;
  private readonly subscribers = new Set<() => void>();

  constructor(
    @Inject(databaseConfig.KEY)
    private readonly database: ConfigType<typeof databaseConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.listener?.end().catch(() => undefined);
    this.listener = null;
  }

  /** Enregistre un rappel exécuté à chaque invalidation reçue (toutes instances). */
  subscribe(callback: () => void): void {
    this.subscribers.add(callback);
  }

  /** Diffuse une invalidation à toutes les instances (y compris celle-ci). */
  async publishInvalidation(key: string): Promise<void> {
    try {
      // pg_notify via la connexion d'écoute : pas de requête paramétrable en
      // NOTIFY, pg_notify() l'est.
      await this.listener?.query("SELECT pg_notify($1, $2)", [CHANNEL, key]);
    } catch (error) {
      // Sans canal, les autres instances retomberont sur le TTL du cache.
      this.logger.warn(
        `NOTIFY feature flags impossible (propagation par TTL) : ${String(error)}`,
      );
    }
  }

  private async connect(): Promise<void> {
    if (this.closed) return;
    const client = new Client({ connectionString: this.database.url });
    try {
      await client.connect();
      client.on("notification", (message) => {
        if (message.channel !== CHANNEL) return;
        this.logger.debug?.(
          `Invalidation de cache reçue (flag « ${message.payload} »)`,
        );
        for (const callback of this.subscribers) callback();
      });
      client.on("error", (error) => {
        this.logger.warn(`Canal feature flags perdu : ${String(error)}`);
        this.scheduleReconnect();
      });
      await client.query(`LISTEN ${CHANNEL}`);
      this.listener = client;
      this.reconnectDelay = FeatureFlagPubSub.RECONNECT_BASE_MS;
      this.logger.log("Canal de propagation des feature flags actif (LISTEN)");
    } catch (error) {
      this.logger.warn(
        `Connexion au canal feature flags impossible : ${String(error)}`,
      );
      await client.end().catch(() => undefined);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const previous = this.listener;
    this.listener = null;
    void previous?.end().catch(() => undefined);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, this.reconnectDelay);
    // Le timer ne doit pas retenir le process (tests, arrêt propre).
    this.reconnectTimer.unref?.();
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      FeatureFlagPubSub.RECONNECT_MAX_MS,
    );
  }
}
