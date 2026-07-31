import { driver, type Config } from "driver.js";
import { useRouter } from "vue-router";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useUserStore } from "@/stores/userStore";
import { routeNames } from "@/router/route-names";

function fillSearchInput(value: string) {
  const input = document.getElementById("app-search") as HTMLInputElement | null;
  if (!input) return;
  input.value = value;
  // input natif consommé par le v-model / @input de AccessibleAutocomplete.
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// Sélectionne un onglet non actif par défaut en cliquant réellement dessus (plutôt que de
// dupliquer la logique interne de DsfrTabs) : son contenu, monté paresseusement, doit
// exister avant que les étapes suivantes puissent le détailler.
function activateTab(element: Element | undefined) {
  if (element instanceof HTMLElement) element.click();
}

export function useOnboardingTour() {
  const router = useRouter();
  const userStore = useUserStore();
  const { searchApplications } = useApplicationSearch();

  let refAppId: string | null = null;

  // Recherche indépendante des filtres/store de la page de recherche (mêmes options que
  // la recherche globale du header) : on ne veut que l'id de RefApp pour y naviguer.
  async function goToRefAppPage() {
    const response = await searchApplications({ qPrefix: "refapp", page: 0, pageSize: 1, sortBy: "relevance" }, false, false);
    const refApp = response?.results?.[0];
    if (!refApp) return;
    refAppId = refApp.id;
    await router.push({ name: routeNames.PROFILEAPP, params: { id: refApp.id } });
  }

  function startTour() {
    const steps: Config["steps"] = [
      {
        // Pas de `element` : driver.js affiche ce step en popup centrée, sans highlight.
        popover: {
          title: "Bienvenue sur RefApp",
          description:
            "RefApp est le référentiel des applications du SI du ministère de l'Intérieur — vous y retrouvez les applications, leurs acteurs et leur documentation.",
          // Surcharge du bouton "Suivant" par défaut : driver.js n'avance plus tout
          // seul dès qu'on définit onNextClick, donc on rappelle moveNext() nous-mêmes.
          onNextClick: (_element, _step, opts) => {
            fillSearchInput("refapp");
            opts.driver.moveNext();
          },
        },
      },
      {
        element: "#app-search",
        popover: {
          title: "Rechercher une application",
          description: "Cherchez une application par son nom pour accéder à sa fiche.",
          side: "bottom",
          align: "start",
          // Le clic sur "Suivant" cible un bouton hors du champ de recherche : le
          // `onClickOutside` de AccessibleAutocomplete le traite comme un clic extérieur
          // et ferme la liste de résultats avant que le tour ait pu s'y accrocher (#app-search-list
          // disparaît, driver.js attend 3s pour rien). On la rouvre en re-simulant la saisie,
          // synchrone donc appliqué avant que Vue ne patche le DOM sur la fermeture.
          onNextClick: (_element, _step, opts) => {
            fillSearchInput("refapp");
            opts.driver.moveNext();
          },
        },
      },
      {
        element: "#app-search-list",
        // La liste apparaît après le debounce (300ms) + la requête de suggestions :
        // on laisse driver.js attendre son apparition plutôt que de la supposer prête.
        waitForElement: 3000,
        // Un clic sur le résultat (dans la zone surlignée) avance aussi le tour de
        // lui-même, en plus de déclencher la navigation Vue vers la fiche (select()).
        advanceOnClick: true,
        popover: {
          title: "RefApp trouvée",
          description: "Cliquez sur le résultat pour accéder à sa fiche.",
          side: "bottom",
          align: "start",
          // Si l'utilisateur avance via ce bouton plutôt qu'en cliquant le résultat
          // lui-même, on doit quand même naviguer vers la fiche RefApp : l'étape
          // suivante (le bouton "Copier le lien") vit sur cette page.
          onNextClick: (_element, _step, opts) => {
            goToRefAppPage().finally(() => opts.driver.moveNext());
          },
        },
      },
      {
        element: '[data-testid="application-copy-link-btn"]',
        // La fiche charge ses données en asynchrone (onMounted) : on laisse le temps
        // au bouton d'apparaître plutôt que de supposer la page déjà prête, et le tour
        // survit à la navigation puisque le popover vit dans document.body, hors de
        // <RouterView> (App.vue, qui porte ce composable, ne démonte jamais).
        waitForElement: 10000,
        popover: {
          title: "Copier le lien de la fiche",
          description: "Copiez ce lien pour partager ou retrouver facilement cette fiche application.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="application-subscribe-btn"]',
        // Même principe qu'à l'étape "RefApp trouvée" : un clic réel sur le bouton
        // (@click="toggleSubscription" du composant) avance aussi le tour de lui-même.
        advanceOnClick: true,
        popover: {
          title: "S'abonner",
          description: "Abonnez-vous pour être notifié par email à chaque modification apportée à cette application.",
          side: "bottom",
          align: "start",
          // Si l'utilisateur passe par "Suivant" plutôt que de cliquer le bouton, on
          // déclenche l'abonnement nous-mêmes avant d'avancer.
          onNextClick: (_element, _step, opts) => {
            const subscription = refAppId && !userStore.isSubscribed(refAppId) ? userStore.subscribeToApp(refAppId) : Promise.resolve();
            Promise.resolve(subscription).finally(() => opts.driver.moveNext());
          },
        },
      },
      {
        // Onglet déjà actif par défaut à l'arrivée sur la fiche : on ne le clique pas,
        // on se contente de l'expliquer avant de détailler son contenu.
        element: "#tab-infos",
        popover: {
          title: "Informations générales",
          description:
            "Description, objectifs, population concernée, hébergement, dette technique… l'essentiel de la fiche applicative en un coup d'œil.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="info-description"]',
        popover: {
          title: "Description",
          description: "Un résumé de ce que fait l'application, à quoi elle sert.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-testid="info-priority-badge"]',
        popover: {
          title: "Priorité de redémarrage",
          description: "En cas de crise, cette priorité indique dans quel délai l'application doit être remise en service.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="info-technical-debt"]',
        popover: {
          title: "Dette technique",
          description: "Le niveau de dette technique de l'application : maturité technique, maturité métier, maîtrise des coûts MCO.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tab-reports",
        popover: {
          title: "Signalements",
          description: "Une information manquante ou erronée sur cette fiche ? Cet onglet centralise les signalements remontés dessus.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tab-quality",
        // Onglet non actif par défaut : son contenu (quality-actors, etc., étapes
        // suivantes) est monté paresseusement, il faut donc basculer dessus dès qu'il
        // est surligné — que ce soit via "Suivant" ou un clic direct sur l'onglet.
        onHighlightStarted: (element) => activateTab(element),
        popover: {
          title: "Qualité",
          description:
            "L'indicateur de qualité de la fiche : conformités renseignées (DSFR, RGPD…), acteurs et liens complétés. Plus la fiche est complète, meilleur est le score.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="quality-actors"]',
        popover: {
          title: "Acteurs",
          description:
            "Les acteurs identifiés sur la fiche : maîtrise d'ouvrage (MOA), maîtrise d'œuvre (MOE), hébergeur, représentant, TMA…",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-testid="quality-compliance"]',
        popover: {
          title: "Conformités",
          description: "Les conformités renseignées sur l'application : DIMA, PDMA, homologation, RGAA, DSFR, RGPD.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-testid="quality-index"]',
        popover: {
          title: "Indice de qualité",
          description: "Le score global de qualité de la fiche, calculé à partir de tous ces éléments.",
          side: "top",
          align: "start",
        },
      },
    ];

    driver({
      showProgress: true,
      nextBtnText: "Suivant",
      prevBtnText: "Précédent",
      doneBtnText: "Terminé",
      steps,
    }).drive();
  }

  return { startTour };
}
