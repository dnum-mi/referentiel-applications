import { driver, type Config } from "driver.js";
import { useRouter } from "vue-router";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useUserStore } from "@/stores/userStore";
import { useOnboardingProgress } from "@/composables/use-onboarding-progress";
import { routeNames } from "@/router/route-names";

function fillSearchInput(value: string) {
  const input = document.getElementById("app-search") as HTMLInputElement | null;
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickTabButton(tabButtonId: string) {
  document.getElementById(tabButtonId)?.click();
}

const chapterPopoverDefaults = {
  showProgress: true,
  nextBtnText: "Suivant",
  prevBtnText: "Précédent",
  doneBtnText: "Terminé",
  smoothScroll: true,
};

export function useOnboardingTour() {
  const router = useRouter();
  const userStore = useUserStore();
  const { searchApplications, setFilter } = useApplicationSearch();
  const { markChapterCompleted } = useOnboardingProgress();

  let referenceApp: { id: string; label: string } | null = null;

  async function resolveReferenceApp(): Promise<{ id: string; label: string } | null> {
    const mine = await searchApplications({ myApplications: true, page: 0, pageSize: 1, sortBy: "quality", order: "desc" }, false, false);
    const bestOwnApp = mine?.results?.[0];
    if (bestOwnApp) return { id: bestOwnApp.id, label: bestOwnApp.label };

    const response = await searchApplications({ qPrefix: "refapp", page: 0, pageSize: 1, sortBy: "relevance" }, false, false);
    const refApp = response?.results?.[0];
    return refApp ? { id: refApp.id, label: refApp.label } : null;
  }

  async function goToReferenceAppPage() {
    const app = referenceApp ?? (await resolveReferenceApp());
    if (!app) return;
    referenceApp = app;
    await router.push({ name: routeNames.PROFILEAPP, params: { id: app.id } });
  }

  async function startProfileChapter() {
    await router.push({ name: routeNames.PROFILE }).catch(() => {});

    const steps: Config["steps"] = [
      {
        element: "#informations",
        waitForElement: 3000,
        popover: {
          title: "Mes informations",
          description: "Vos informations de profil, votre organisation et vos préférences de notification.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="user-profile-table"]',
        popover: {
          title: "Organisation et email",
          description: "Votre organisation de rattachement et l'adresse email utilisée pour vous contacter.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="user-profile-email-notifications-checkbox"]',
        popover: {
          title: "Préférences de notification",
          description: "Activez ou désactivez la réception des notifications par email pour les applications que vous suivez.",
          side: "top",
          align: "start",
        },
      },
      {
        // Onglet non actif par défaut : son contenu est monté paresseusement, il faut
        // donc basculer dessus dès qu'il est surligné, peu importe le chemin emprunté.
        element: "#tokens",
        onHighlightStarted: () => clickTabButton("tokens"),
        popover: {
          title: "Mes tokens",
          description: "Les tokens applicatifs vous permettent d'accéder à l'API du référentiel depuis un script ou un autre outil.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="token-create-btn"]',
        popover: {
          title: "Créer un token",
          description: "Créez un token personnel (nom, description, date d'expiration) : la valeur générée ne sera affichée qu'une fois.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#follow",
        onHighlightStarted: () => clickTabButton("follow"),
        popover: {
          title: "Mes abonnements",
          description: "La liste des applications auxquelles vous êtes abonné.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="user-followed-apps-table"]',
        popover: {
          title: "Applications suivies",
          description:
            "L'application à laquelle vous vous êtes abonné au chapitre précédent devrait apparaître ici. Désabonnez-vous à tout moment.",
          side: "top",
          align: "start",
        },
      },
      {
        // Pas de title/testid stable sur ce lien du footer : ciblé via son href Tchap.
        element: '[data-testid="footer"] a[href*="tchap.gouv.fr"]',
        popover: {
          title: "Une question ?",
          description:
            "Rejoignez le canal de discussion RefApp sur Tchap, en bas de page, pour échanger avec l'équipe et les autres utilisateurs.",
          side: "top",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            markChapterCompleted("profile");
            opts.driver.destroy();
            startApplicationSheetChapter();
          },
        },
      },
    ];

    driver({ ...chapterPopoverDefaults, steps }).drive();
  }

  async function startApplicationSheetChapter() {
    await goToReferenceAppPage();

    const steps: Config["steps"] = [
      {
        popover: {
          title: "Fiche application",
          description: "Retrouvez ici les acteurs, l'organisation porteuse, les technologies utilisées.",
        },
      },
      {
        element: `ul[aria-label="Informations sur l'application"]`,
        popover: {
          title: "Des onglets selon vos droits",
          description:
            "Les onglets affichés dépendent de vos droits d'accès : selon votre profil, certaines informations peuvent ne pas être visibles.",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            clickTabButton("tab-actors");
            opts.driver.moveNext();
          },
        },
      },
      {
        element: '[data-testid="actor-tab"]',
        waitForElement: 3000,
        popover: {
          title: "Acteurs",
          description:
            "Les acteurs qui interviennent sur l'application : maîtrise d'ouvrage (MOA), maîtrise d'œuvre (MOE), hébergeur, représentant…",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            clickTabButton("tab-infos");
            opts.driver.moveNext();
          },
        },
      },
      {
        element: '[data-testid="info-business-divisions-container"]',
        waitForElement: 3000,
        onHighlighted: (element) => {
          element?.scrollIntoView({ block: "center", behavior: "smooth" });
        },
        popover: {
          title: "Organisation porteuse",
          description: "La direction métier qui porte l'application.",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            clickTabButton("tab-technologies");
            opts.driver.moveNext();
          },
          onPrevClick: (_element, _step, opts) => {
            clickTabButton("tab-actors");
            opts.driver.movePrevious();
          },
        },
      },
      {
        element: '[data-testid="technology-tab"]',
        waitForElement: 3000,
        popover: {
          title: "Technologies",
          description:
            "Les technologies utilisées par l'application (langages, frameworks, bases de données…), quand elles sont renseignées.",
          side: "bottom",
          align: "start",
          onPrevClick: (_element, _step, opts) => {
            clickTabButton("tab-infos");
            opts.driver.movePrevious();
          },
          onNextClick: (_element, _step, opts) => {
            markChapterCompleted("sheet");
            opts.driver.destroy();
            startActorChapter();
          },
        },
      },
    ];

    driver({ ...chapterPopoverDefaults, steps }).drive();
  }

  async function startActorChapter() {
    await router.push({ name: routeNames.SEARCHAPP }).catch(() => {});

    const steps: Config["steps"] = [
      {
        popover: {
          title: "Vos applications & votre rôle",
          description:
            "Si vous êtes déclaré comme acteur sur une ou plusieurs applications (maîtrise d'ouvrage, chef de projet, hébergeur…), c'est probablement la raison n°1 de votre connexion à RefApp : voici comment les retrouver et mettre à jour vos informations.",
        },
      },
      {
        popover: {
          title: "Qu'est-ce qu'un acteur ?",
          description:
            "Un acteur est une personne référencée avec un rôle précis sur une application (MOA, MOE, chef de projet, hébergeur…). Selon vos droits d'accès, l'onglet Acteurs d'une fiche ne vous sera pas forcément accessible.",
        },
      },
      {
        element: '[data-testid="my-apps-filter-toggle"]',
        advanceOnClick: true,
        popover: {
          title: "Filtrer sur vos applications",
          description: "Activez ce filtre pour ne voir que les applications où vous êtes référencé comme acteur.",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            setFilter({ myApplications: true, page: 0 });
            opts.driver.moveNext();
          },
        },
      },
      {
        element: '[data-testid="sidebar-total-count"]',
        popover: {
          title: "Vos applications",
          description: "Le nombre d'applications où vous apparaissez comme acteur. Ouvrez-en une pour mettre à jour vos informations.",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            markChapterCompleted("actor");
            opts.driver.destroy();
            startHelpChapter();
          },
        },
      },
    ];

    driver({ ...chapterPopoverDefaults, steps }).drive();
  }

  async function startHelpChapter() {
    await goToReferenceAppPage();

    const steps: Config["steps"] = [
      {
        element: "#tab-reports",
        waitForElement: 10000,
        onHighlightStarted: () => clickTabButton("tab-reports"),
        popover: {
          title: "Une erreur sur une fiche ?",
          description: "Signalez-la ici : une information manquante, erronée ou obsolète sur cette application.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="reports-report-issue"]',
        popover: {
          title: "Signaler un problème",
          description: "Décrivez le problème rencontré : l'équipe en charge de l'application sera notifiée.",
          side: "top",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            markChapterCompleted("help");
            opts.driver.destroy();
            startTimeChapter();
          },
        },
      },
    ];

    driver({ ...chapterPopoverDefaults, steps }).drive();
  }

  async function startTimeChapter() {
    await router.push({ name: routeNames.TIMEPAGE }).catch(() => {});

    const steps: Config["steps"] = [
      {
        element: '[data-testid="technical-debt-chart-section"]',
        waitForElement: 10000,
        popover: {
          title: "Diagramme Time",
          description:
            "Ce diagramme positionne les applications selon leur maturité technique et leur maturité métier : un coup d'œil sur la dette technique du portefeuille.",
          side: "top",
          align: "start",
        },
      },
      {
        element: '[data-testid="technical-debt-point"]',
        waitForElement: 5000,
        popover: {
          title: "Survolez, cliquez",
          description:
            "Survolez un point pour voir son détail (maturité technique, métier, maîtrise des coûts). Cliquez dessus pour ouvrir sa fiche application.",
          side: "left",
          align: "start",
        },
      },
      {
        element: '[data-testid="time-filters"]',
        popover: {
          title: "Un droit d'accès nécessaire",
          description:
            "Vous ne voyez rien, ou seulement vos propres applications ? Cette vue complète du portefeuille nécessite un droit d'accès dédié. Sans lui, seules les applications où vous êtes acteur s'affichent — et rien si vous n'êtes acteur nulle part.",
          side: "right",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            markChapterCompleted("time");
            opts.driver.destroy();
          },
        },
      },
    ];

    driver({ ...chapterPopoverDefaults, steps }).drive();
  }

  async function startSearchChapter() {
    await router.push({ name: routeNames.ACCUEIL }).catch(() => {});

    referenceApp = await resolveReferenceApp();
    const searchTerm = referenceApp?.label ?? "refapp";

    const steps: Config["steps"] = [
      {
        element: '[data-testid="home-intro"]',
        waitForElement: 5000,
        popover: {
          title: "Le référentiel des applications",
          description:
            "Le référentiel des applications recense l'ensemble des produits numériques et logiciels développés et hébergés au sein du système d'information du ministère.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-testid="home-objectives-section"]',
        popover: {
          title: "Objectifs du référentiel",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            fillSearchInput(searchTerm);
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
          onNextClick: (_element, _step, opts) => {
            fillSearchInput(searchTerm);
            opts.driver.moveNext();
          },
        },
      },
      {
        element: "#app-search-list",
        waitForElement: 3000,
        advanceOnClick: true,
        popover: {
          title: `${searchTerm} trouvée`,
          description: "Cliquez sur le résultat pour accéder à sa fiche.",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            goToReferenceAppPage().finally(() => opts.driver.moveNext());
          },
        },
      },
      {
        element: '[data-testid="application-copy-link-btn"]',
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
        advanceOnClick: true,
        popover: {
          title: "S'abonner",
          description: "Abonnez-vous pour être notifié par email à chaque modification apportée à cette application.",
          side: "bottom",
          align: "start",
          onNextClick: (_element, _step, opts) => {
            const appId = referenceApp?.id;
            const subscription = appId && !userStore.isSubscribed(appId) ? userStore.subscribeToApp(appId) : Promise.resolve();
            Promise.resolve(subscription).finally(() => opts.driver.moveNext());
          },
        },
      },
      {
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
        onHighlightStarted: () => clickTabButton("tab-quality"),
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
          onNextClick: (_element, _step, opts) => {
            markChapterCompleted("search");
            opts.driver.destroy();
            startProfileChapter();
          },
        },
      },
    ];

    driver({ ...chapterPopoverDefaults, steps }).drive();
  }

  const chaptersById: Record<string, () => void> = {
    search: startSearchChapter,
    profile: startProfileChapter,
    sheet: startApplicationSheetChapter,
    actor: startActorChapter,
    help: startHelpChapter,
    time: startTimeChapter,
  };

  function startChapter(chapterId: string) {
    chaptersById[chapterId]?.();
  }

  function startTour() {
    startChapter("search");
  }

  return { startTour, startChapter };
}
