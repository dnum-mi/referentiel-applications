import { expect, type Page } from "@playwright/test";

const MAILPIT_API = "http://localhost:8025/api/v1";

/** Petit client Mailpit (boîte mail de dev) pour vérifier l'envoi d'emails. */
export class Mailpit {
  constructor(private readonly page: Page) {}

  /** Vide la boîte de réception. */
  async clear(): Promise<void> {
    await this.page.request.delete(`${MAILPIT_API}/messages`);
  }

  /** Attend qu'un email destiné à `email` arrive (polling Mailpit). */
  async expectMessageTo(email: string, timeout = 20000): Promise<void> {
    await expect
      .poll(
        async () => {
          const res = await this.page.request.get(`${MAILPIT_API}/messages`);
          if (!res.ok()) return 0;
          const data = (await res.json()) as {
            messages?: Array<{ To?: Array<{ Address?: string }> }>;
          };
          return (data.messages ?? []).filter((m) =>
            (m.To ?? []).some(
              (t) => t.Address?.toLowerCase() === email.toLowerCase(),
            ),
          ).length;
        },
        { timeout, intervals: [1000, 1000, 2000] },
      )
      .toBeGreaterThan(0);
  }
}
