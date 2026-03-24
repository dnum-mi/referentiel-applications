<template>
  <div class="fr-container">
    <div class="fr-grid-row fr-py-2w">
      <div class="fr-col">
        <h1 data-testid="home-title">Le référentiel des applications</h1>
      </div>
    </div>
    <div class="fr-grid-row--gutters">
      <p class="fr-col-md-9">
        Le référentiel des applications recense l’ensemble des produits numériques et logiciels développés et hébergés au sein du système
        d’information du ministère. Il assure la centralisation, la structuration et la gestion efficace de ces applications, afin d’en
        optimiser l’accès et l’usage partagé. Il contribue également à la sécurité, à la protection et à la résilience du système
        d’information.
      </p>
    </div>

    <section class="fr-py-3w">
      <div class="fr-grid-row">
        <div class="fr-col">
          <h2 data-testid="home-objectives-title">Objectifs du référentiel</h2>
        </div>
      </div>
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-12 fr-col-sm-4">
          <div class="fr-tile" data-testid="home-tile-centralisation">
            <div class="fr-tile__body">
              <img src="/assets/svg-centralize.svg" alt="" />
              <h3 class="fr-tile__title">Centralisation</h3>
              <p class="fr-tile__desc fr-text--sm">Rassembler toutes les fiches produits dans un seul point de vérité.</p>
            </div>
          </div>
        </div>
        <div class="fr-col-12 fr-col-sm-4">
          <div class="fr-tile" data-testid="home-tile-access">
            <div class="fr-tile__body">
              <img src="/assets/svg-loupe.svg" alt="" />
              <h3 class="fr-tile__title">Facilité d'accès</h3>
              <p class="fr-tile__desc fr-text--sm">Avoir une vue d'ensemble claire des produits à disposition des utilisateurs.</p>
            </div>
          </div>
        </div>
        <div class="fr-col-12 fr-col-sm-4">
          <div class="fr-tile" data-testid="home-tile-dependencies">
            <div class="fr-tile__body">
              <img src="/assets/svg-dependencies.svg" alt="" />
              <h3 class="fr-tile__title">Gestion des dépendances</h3>
              <p class="fr-tile__desc fr-text--sm">Comprendre les interconnexions et dépendances entre applications.</p>
            </div>
          </div>
        </div>
        <div class="fr-col-12 fr-col-sm-4">
          <div class="fr-tile" data-testid="home-tile-maintenance">
            <div class="fr-tile__body">
              <img src="/assets/svgviewer-output(3).svg" alt="" />
              <h3 class="fr-tile__title">Amélioration de la maintenance</h3>
              <p class="fr-tile__desc fr-text--sm">Simplifier les processus de mise à jour et d’audit.</p>
            </div>
          </div>
        </div>
        <div class="fr-col-12 fr-col-sm-4">
          <div class="fr-tile" data-testid="home-tile-exploitability">
            <div class="fr-tile__body">
              <img src="/assets/svg-stats.svg" alt="" />
              <h3 class="fr-tile__title">Amélioration de l'exploitabilité</h3>
              <p class="fr-tile__desc fr-text--sm">mesurer les impactes d'incidents opérationnels.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="fr-py-3w">
      <div class="fr-grid-row">
        <div class="fr-col">
          <h2 data-testid="home-beta-title">Envie de devenir beta testeur ?</h2>
        </div>
      </div>
      <div class="fr-grid-row">
        <a
          class="fr-col fr-btn fr-btn--secondary fr-btn--md"
          data-testid="home-contact-link"
          title="Contacter l’équipe sur Tchap"
          aria-label="Contacter l’équipe sur Tchap"
          href="https://www.tchap.gouv.fr/#/room/!ydoKqFOXRAQPQYFvqa:agent.interieur.tchap.gouv.fr?via=agent.interieur.tchap.gouv.fr"
          target="_blank"
          ><span class="fr-icon-mail-open-line fr-icon--sm fr-mr-1w"></span>
          Nous Contacter sur Tchap
        </a>
      </div>
    </section>
  </div>
</template>
