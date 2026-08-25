import { expect, type Locator, type Page } from "@playwright/test";
import { BASE_URL } from "../support/helpers";

/**
 * Socle commun à tous les Page Objects.
 *
 * POM strict : `byTestId` est **protégé** — il n'est utilisable QUE depuis les Page Objects.
 * Les specs ne doivent jamais manipuler de sélecteur (`data-testid`, rôle, CSS) : elles passent
 * exclusivement par les méthodes sémantiques exposées par chaque page.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Locator par `data-testid` — réservé aux Page Objects (encapsulation des sélecteurs). */
  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected async goto(path: string): Promise<void> {
    await this.page.goto(`${BASE_URL}${path}`);
  }

  /**
   * Renseigne un `OrganizationSearchSelect` : saisie de la recherche puis choix dans le select.
   * `testId` désigne le composant lui-même (son `div[role="group"]` racine).
   *
   * Trois pièges, tous constatés :
   * - viser le champ par son libellé attrape d'autres éléments qui le répètent (le bouton
   *   « Synchroniser l'organisation MOA depuis MAIA » porte le même texte en `aria-label`) ;
   * - le select contient DÉJÀ deux options avant toute recherche — le placeholder désactivé de
   *   `DsfrSelect` et l'option vide du composant — donc attendre « plus d'une option » passe
   *   immédiatement, avant l'arrivée des résultats (recherche débouncée à 300 ms) ;
   * - retomber alors sur l'option vide laisse le modèle nul **sans erreur visible** : l'échec
   *   n'apparaît qu'à la validation de l'étape suivante. D'où l'assertion finale.
   */
  protected async selectOrganization(
    testId: string,
    orgPath: string,
  ): Promise<void> {
    const group = this.byTestId(testId);
    await group.locator("input").first().fill(orgPath.slice(0, 10));

    const sel = group.locator("select");
    const filled = sel.locator("option[value]:not([value=''])");
    await expect(filled.first()).toBeAttached({ timeout: 10000 });

    const exact = filled.filter({ hasText: orgPath });
    const target = (await exact.count()) > 0 ? exact.first() : filled.first();
    const value = await target.getAttribute("value");
    if (!value)
      throw new Error(`Aucune organisation sélectionnable pour « ${orgPath} »`);
    await sel.selectOption(value);
    await expect(sel).toHaveValue(value);
  }

  /**
   * Coche une case `DsfrCheckbox` en cliquant son `<label>`, comme le ferait un utilisateur.
   *
   * Deux pièges du composant, tous deux constatés :
   * - il **écrase** le `data-testid` qu'on lui passe par le sien (`input-checkbox-{id}`, id
   *   aléatoire) : le testid posé dans le template n'existe dans aucun élément du DOM, il faut
   *   viser l'input autrement (son `name`, par exemple) ;
   * - son `<label>` recouvre l'input, donc un `check()` direct est intercepté. Cliquer le label
   *   reste fidèle à l'usage réel, là où `{ force: true }` contournerait l'actionabilité et
   *   masquerait un vrai défaut d'accessibilité au clic.
   */
  protected async checkDsfrCheckbox(input: Locator): Promise<void> {
    if (await input.isChecked()) return;
    const id = await input.getAttribute("id");
    if (id) {
      await this.page.locator(`label[for="${id}"]`).click();
    } else {
      await input.check();
    }
    await expect(input).toBeChecked();
  }

  /** Attend le toaster applicatif et, optionnellement, vérifie son contenu. */
  async expectToaster(text?: string | RegExp): Promise<void> {
    const toaster = this.byTestId("app-toaster");
    await expect(toaster).toBeVisible();
    if (text) await expect(toaster).toContainText(text);
  }
}
