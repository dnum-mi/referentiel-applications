import { nextTick, onMounted } from "vue";

const DEVISE = "Liberté, égalité, fraternité";
const OPERATOR_LINK_TITLE = "Accueil - Ministère de l'intérieur - Référentiel des Applications";

/**
 * Corrections d'accessibilité RGAA appliquées au gabarit global (header / footer)
 * pour les points que `@gouvminint/vue-dsfr` n'expose ni via props ni via slots.
 * Réf. issue #1775 (lot E) : RGAA-008, RGAA-013, RGAA-014.
 * RGAA 9.1 : le titre de service n'est pas un titre de niveau 1, seul le h1 de la page l'est.
 *
 * Le header et le footer ne sont montés qu'une fois et leurs blocs marque /
 * titre de service ne sont pas re-rendus (logoText / serviceTitle constants),
 * donc ces retouches DOM restent stables. Les opérations sont idempotentes.
 */
function applyRgaaEnhancements() {
  // RGAA-008 / RGAA-013 — restituer la devise « Liberté, égalité, fraternité »,
  // rendue par DSFR via des pseudo-éléments CSS et donc muette pour les lecteurs d'écran.
  document.querySelectorAll<HTMLElement>(".fr-logo").forEach((logo) => {
    if (logo.querySelector("[data-rgaa-devise]")) return;
    const span = document.createElement("span");
    span.className = "fr-sr-only";
    span.dataset.rgaaDevise = "";
    span.textContent = DEVISE;
    logo.appendChild(span);
  });

  // RGAA-014 — intitulé du lien logo du footer cohérent avec le texte visible.
  document.querySelectorAll<HTMLAnchorElement>("a.fr-footer__brand-link").forEach((link) => {
    if (!link.getAttribute("title")) {
      link.setAttribute("title", OPERATOR_LINK_TITLE);
    }
  });
}

/** À appeler depuis le composant racine (App.vue). */
export function useRgaaGlobalA11y() {
  onMounted(() => {
    nextTick(() => {
      applyRgaaEnhancements();
      // Filet de sécurité si le footer est peint au frame suivant.
      requestAnimationFrame(applyRgaaEnhancements);
    });
  });
}
