import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/** Identifiants d'onglet de la fiche (= `tabId`, aussi segment d'URL). */
export type AppTab =
  | "tab-infos"
  | "tab-data"
  | "tab-links"
  | "tab-compliances"
  | "tab-actors"
  | "tab-relations"
  | "tab-statuses"
  | "tab-reports"
  | "tab-modifications"
  | "tab-quality";

/** Page Object — Fiche application (`/applications/:id/:tab?`). */
export class ApplicationPage extends BasePage {
  private currentId = "";

  private root = () => this.byTestId("application-profile");
  // Wrapper stable de l'onglet (DsfrTabContent), visible uniquement quand l'onglet est actif.
  // On ne cible PAS `application-tab-component-*` : ce composant est monté en lazy via
  // `<component :is>` et le data-testid n'atterrit pas toujours sur son nœud racine.
  private tabContent = (tab: AppTab) =>
    this.byTestId(`application-tab-content-${tab}`);

  // --- Navigation ---
  async open(id: string, tab?: AppTab): Promise<void> {
    this.currentId = id;
    await this.goto(`/applications/${id}${tab ? `/${tab}` : ""}`);
    await expect(this.root()).toBeVisible();
    if (tab) await this.expectTabActive(tab);
  }

  async openTab(tab: AppTab): Promise<void> {
    await this.goto(`/applications/${this.currentId}/${tab}`);
    await this.expectTabActive(tab);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root()).toBeVisible();
  }

  async expectTabActive(tab: AppTab): Promise<void> {
    await expect(this.tabContent(tab)).toBeVisible();
    await expect.poll(() => new URL(this.page.url()).pathname).toContain(tab);
  }

  // --- En-tête (titre + tags) ---
  // Seul le tag IQ est toujours rendu ; statut (`v-if statusDate`) et type (`v-if type`) sont
  // conditionnels selon les données → on ne les exige pas (robuste quel que soit le seed).
  async expectHeader(): Promise<void> {
    await expect(this.byTestId("application-title")).toBeVisible();
    await expect(this.byTestId("application-title")).not.toBeEmpty();
    await expect(this.byTestId("application-iq-tag")).toBeVisible();
  }

  // --- Onglets : vérifications sémantiques (table ou état vide, sans fuite de sélecteur) ---
  // `.first()` : certains onglets affichent à la fois un en-tête et un état vide (ex. acteurs) ;
  // on évite ainsi la violation du mode strict quand les deux nœuds coexistent.
  async expectActorsTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("actor-tab").or(this.byTestId("actor-empty-state")).first(),
    ).toBeVisible();
  }

  async expectStatusesTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("statuses-table")
        .or(this.byTestId("statuses-empty"))
        .first(),
    ).toBeVisible();
  }

  async expectCompliancesTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("compliance-table")
        .or(this.byTestId("compliance-empty"))
        .first(),
    ).toBeVisible();
  }

  async expectLinksTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("links-table").or(this.byTestId("links-empty")).first(),
    ).toBeVisible();
  }

  async expectQualityIndexVisible(): Promise<void> {
    await expect(this.byTestId("quality-index")).toBeVisible();
  }

  async expectRelationsWithTarget(): Promise<void> {
    await expect(this.byTestId("relations-table")).toBeVisible();
    await expect(this.byTestId("relation-target-link").first()).toBeVisible();
  }

  // --- Onglet Informations générales (FIC-02) ---
  async expectInfosTabLoaded(): Promise<void> {
    await expect(this.byTestId("informations-generales")).toBeVisible();
    await expect(this.byTestId("info-description")).toBeVisible();
  }

  // Le bouton d'édition est toujours rendu mais `:disabled` selon le droit d'écriture
  // (canEditBase = AppWrite OU AppWritePriority).
  /** Le bouton d'édition des infos est actif (droit d'écriture) — PRM-10. */
  async expectInfoEditAvailable(): Promise<void> {
    await expect(this.byTestId("info-edit-btn")).toBeEnabled();
  }

  /** Le bouton d'édition des infos est désactivé (Lecteur sans droit) — PRM-09. */
  async expectInfoEditDisabled(): Promise<void> {
    await expect(this.byTestId("informations-generales")).toBeVisible();
    await expect(this.byTestId("info-edit-btn")).toBeDisabled();
  }

  // --- Axe RGAA, section dédiée en bas de l'onglet conformités (FIC-06) ---
  async expectRgaaSectionVisible(): Promise<void> {
    await expect(this.page.getByText(/Conformités RGAA/i)).toBeVisible();
    await expect(
      this.byTestId("rgaa-empty").or(this.byTestId("rgaa-add-btn")).first(),
    ).toBeVisible();
  }

  // --- Onglet Sources de données (FIC-09) ---
  async expectDataSourcesTabLoaded(): Promise<void> {
    await expect(this.byTestId("data-application-table")).toBeVisible();
  }

  // --- Onglet Signalements de l'application (FIC-13) ---
  async expectReportsTabLoaded(): Promise<void> {
    await expect(this.byTestId("reports-table")).toBeVisible();
  }

  /** Soumet un signalement depuis l'onglet signalements de la fiche (SIG-02). */
  async submitReportFromApp(description: string): Promise<void> {
    await this.byTestId("reports-report-issue").click();
    await this.byTestId("report-issue-textarea").fill(description);
    await this.byTestId("report-issue-submit-btn").click();
    await this.expectToaster(/prise en compte|proposition/i);
  }

  // --- Onglet Modifications / historique (FIC-14) ---
  async expectModificationsTabLoaded(): Promise<void> {
    await expect(this.byTestId("modifications-table")).toBeVisible();
  }

  // --- Abonnement (bouton sans data-testid → ciblé par nom accessible, encapsulé ici) ---
  private subscribeButton(): Locator {
    return this.root().getByRole("button", { name: /S'abonner|Abonné/i });
  }

  async isSubscribed(): Promise<boolean> {
    return /Abonné/i.test((await this.subscribeButton().innerText()).trim());
  }

  /** S'abonne si ce n'est pas déjà le cas (idempotent). */
  async subscribe(): Promise<void> {
    if (!(await this.isSubscribed())) {
      await this.subscribeButton().click();
      await expect(this.subscribeButton()).toHaveText(/Abonné/i);
    }
  }

  /** Se désabonne si abonné (idempotent). */
  async unsubscribe(): Promise<void> {
    if (await this.isSubscribed()) {
      await this.subscribeButton().click();
      await expect(this.subscribeButton()).toHaveText(/S'abonner/i);
    }
  }

  async expectSubscribed(): Promise<void> {
    await expect(this.subscribeButton()).toHaveText(/Abonné/i);
  }

  /** Copie le lien de la fiche et vérifie le toast de confirmation (FIC-12). */
  async copyLinkAndExpectToast(): Promise<void> {
    // Autorise l'écriture presse-papier (best-effort : certains navigateurs ne la supportent pas).
    await this.page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"])
      .catch(() => {});
    await this.byTestId("application-copy-link-btn").click();
    await this.expectToaster(/Lien copié dans le presse-papier/i);
  }
}
