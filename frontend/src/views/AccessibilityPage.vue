<script setup lang="ts">
import { accessibilityDeclaration } from "@/constants/accessibility-declaration";
</script>

<template>
  <div class="fr-container fr-my-2w" data-testid="accessibility-page">
    <h1 class="fr-h1" data-testid="accessibility-page-title">Accessibilité</h1>
    <p class="fr-text--lg">Cette page présente les informations relatives à l'accessibilité du référentiel des applications.</p>

    <h2 class="fr-h2">Déclaration d'accessibilité</h2>
    <p>
      Le référentiel des applications s'engage à rendre ses services accessibles conformément à l'article 47 de la loi n°2005-102 du 11
      février 2005.
    </p>

    <h2 class="fr-h2">État de conformité</h2>
    <p>
      Le référentiel des applications est
      <strong>{{ accessibilityDeclaration.complianceStatus }}</strong>
      au {{ accessibilityDeclaration.rgaaVersion }} (Référentiel Général d'Amélioration de l'Accessibilité) en raison des non-conformités
      énumérées ci-dessous.
    </p>

    <h2 class="fr-h2">Résultats des tests</h2>
    <p>
      L'audit de conformité initial réalisé par le BPSA révèle
      {{ accessibilityDeclaration.nonCompliantCriteria }} critères non conformes et {{ accessibilityDeclaration.issueCount }} problèmes
      d'accessibilité. Le taux de conformité au {{ accessibilityDeclaration.rgaaVersion }} mesuré sur l'échantillon est de
      <strong>{{ accessibilityDeclaration.score }}</strong>
      ({{ accessibilityDeclaration.compliantCriteria }} critères conformes, {{ accessibilityDeclaration.nonCompliantCriteria }} critères non
      conformes et {{ accessibilityDeclaration.nonApplicableCriteria }} critères non applicables).
    </p>

    <h2 class="fr-h2">Établissement de cette déclaration</h2>
    <p>Cette déclaration a été établie le {{ accessibilityDeclaration.establishedAt }}.</p>

    <h2 class="fr-h2">Retour d'information et contact</h2>
    <p>
      Si vous rencontrez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou à une fonctionnalité du site, merci de nous le
      signaler en contactant l'équipe à l'adresse
      <a href="mailto:support-referentiel-applications@interieur.gouv.fr">support-referentiel-applications@interieur.gouv.fr</a>.
    </p>

    <h2 class="fr-h2">Voies de recours</h2>
    <p>
      Cette procédure est à utiliser dans le cas suivant : vous avez signalé au responsable du site un défaut d'accessibilité qui vous
      empêche d'accéder à un contenu ou à un service et vous n'avez pas obtenu de réponse satisfaisante.
    </p>
    <p>Vous pouvez :</p>
    <ul>
      <li>
        écrire un message au
        <a href="https://formulaire.defenseurdesdroits.fr/" target="_blank" rel="noopener noreferrer"
          >Défenseur des droits - nouvelle fenêtre</a
        >&nbsp;;
      </li>
      <li>
        contacter le délégué du
        <a href="https://www.defenseurdesdroits.fr/saisir/delegues" target="_blank" rel="noopener noreferrer"
          >Défenseur des droits dans votre région - nouvelle fenêtre</a
        >&nbsp;;
      </li>
      <li>
        envoyer un courrier par la poste (gratuit, sans timbre) à&nbsp;: Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07.
      </li>
    </ul>
  </div>
</template>
