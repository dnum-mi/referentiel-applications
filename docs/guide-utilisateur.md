**MISE A JOUR du doc**

# Guide utilisateur RefApp

## Comment accéder à RefApp ?

Ouvrez l'adresse suivante dans votre navigateur :

👉 **https://referentiel-applications.interieur.rie.gouv.fr/recherche-application**

Connectez-vous avec votre compte ministériel (SSO). Vous n'avez pas besoin d'un identifiant RefApp. RefApp crée votre compte à votre première connexion.

Si l'écran « Authentification forte requise » s'affiche, reconnectez-vous avec votre carte agent ou avec la double authentification.

> **Note :** une connexion avec un mot de passe seul ne donne pas accès au référentiel.

---

## À quoi ai-je accès ?

Vos droits dans RefApp ont deux sources : votre rôle et votre type d'acteur sur une application. Ces deux sources s'additionnent.

### 1. Votre rôle

Votre rôle s'applique à toutes les applications du référentiel. Par défaut, votre rôle est **Utilisateur**.

| Rôle                | Droits                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Utilisateur**     | Rechercher les applications. Lire les informations générales, les statuts et les données des fiches. Créer des signalements.         |
| **Lecture totale**  | Droits de l'Utilisateur. Lire toutes les rubriques des fiches : acteurs, hébergement, conformités, technologies, relations et liens. |
| **Écriture totale** | Droits de la Lecture totale. Créer et modifier les fiches. Traiter les signalements.                                                 |
| **Administrateur**  | Droits de l'Écriture totale. Gérer les utilisateurs et leurs droits, sur un périmètre ou sur tout le référentiel.                    |

### 2. Votre type d'acteur sur une application

Un acteur est une personne ou une organisation responsable d'une application. Chaque acteur a un type, par exemple MOA, MOE, TMA, RSSI ou Product Owner.

Si vous êtes acteur d'une application, vous avez des droits supplémentaires sur cette application. Ces droits dépendent de votre type d'acteur. Ils peuvent inclure la modification de certaines rubriques de la fiche.

Si votre organisation est acteur d'une application, vous avez aussi les droits de ce type d'acteur.

> **Note :** le bandeau « Vous n'avez pas accès à l'ensemble des données de cette application » indique que vos droits ne couvrent pas toute la fiche.

---

## Que faire si je ne suis pas acteur de mon application ?

En général, vous devez être acteur d'une application pour modifier sa fiche.

1. Ouvrez la fiche de l'application.
2. Cliquez sur **Faire un signalement**.
3. Dans le signalement, donnez les informations suivantes :
   - votre nom et votre adresse e-mail
   - votre type d'acteur, par exemple MOA, MOE ou Product Owner
   - votre organisation
4. Envoyez le signalement.

Un contributeur ou un administrateur traite votre signalement. Ensuite, cette personne vous ajoute comme acteur de l'application.

Si un acteur de l'application a le droit de modifier les acteurs, il peut aussi vous ajouter.

Vous pouvez suivre votre signalement dans **Mes signalements**.

---

## Que faire pour devenir administrateur ?

Seul un administrateur peut vous donner le rôle d'administrateur. En général, ce rôle couvre un seul périmètre, par exemple votre direction ou votre service.

1. Ouvrez la page **Mon profil**.
2. Lisez la ligne **Administrateur**. Cette ligne donne l'adresse e-mail de l'administrateur à contacter.
3. Envoyez un e-mail à cet administrateur.
4. Dans votre e-mail, donnez les informations suivantes :
   - le périmètre que vous voulez administrer
   - la raison de votre demande, par exemple vos fonctions ou les applications concernées

> **Note :** vous n'avez pas besoin du rôle d'administrateur pour modifier la fiche de votre application. En général, vous devez seulement être acteur de l'application.

---

## Que faire si je ne trouve pas une application ou si sa fiche contient une erreur ?

### Je ne trouve pas une application

1. Recherchez l'application avec d'autres termes : son sigle, son nom complet ou un ancien nom.
2. Retirez vos filtres actifs. Un filtre actif peut masquer l'application.
3. Si vous ne trouvez toujours pas l'application, cliquez sur **Signaler une application manquante**.
4. Dans le signalement, donnez le nom de l'application et son organisation.
5. Si vous connaissez un contact pour cette application, donnez aussi ce contact.

> **Note :** la recherche porte aussi sur les noms alternatifs des applications.

### La fiche contient une erreur

1. Si vous avez le droit de modifier la fiche, corrigez l'erreur dans la fiche.
2. Si vous n'avez pas ce droit, cliquez sur **Faire un signalement** dans la fiche.
3. Dans le signalement, donnez les informations suivantes :
   - la rubrique concernée, par exemple Informations générales, Acteurs ou Hébergement
   - l'information fausse
   - la valeur correcte
   - la source de la valeur correcte (facultatif)
4. Envoyez le signalement.

Un contributeur ou un administrateur traite votre signalement. Un signalement a trois statuts : en attente, en cours et traité.

Vous pouvez suivre votre signalement dans **Mes signalements**. Si vous avez activé les notifications par e-mail, RefApp vous envoie un e-mail à chaque changement de statut.

---

## Comment renseigner les conformités ?

Les conformités sont dans l'onglet **Conformités** de la fiche. Vous devez avoir le droit de modifier les conformités de l'application.

### DIMA et PDMA

- La **DIMA** (délai d'indisponibilité maximale admissible) est la durée maximale pendant laquelle l'application peut être indisponible.
- La **PDMA** (perte de données maximale admissible) est la quantité maximale de données que l'application peut perdre. Elle est exprimée en durée depuis la dernière sauvegarde.

**Quelle valeur saisir ?** Saisissez les valeurs du **dossier d'homologation** de l'application. Ces valeurs font référence.

N'utilisez pas une autre source, par exemple une valeur demandée par le métier ou une valeur négociée entre la MOA, la MOE et l'hébergeur. Si une de ces valeurs est différente du dossier d'homologation, saisissez la valeur du dossier d'homologation.

1. Ouvrez le dossier d'homologation de l'application.
2. Trouvez la DIMA et la PDMA dans ce dossier.
3. Dans la fiche, ouvrez l'onglet **Conformités**.
4. Pour la DIMA, sélectionnez la valeur dans le champ **Durée d'interruption maximale**.
5. Pour la PDMA, sélectionnez la valeur dans le champ **Durée (heures)**.

> **Note :** si vous n'avez pas accès au dossier d'homologation, demandez-le au RSSI ou à la MOE de l'application.

---

## Comment importer les dépendances d'une application avec un SBOM ?

Un **SBOM** est un fichier qui décrit les composants logiciels d'un projet. RefApp peut l'importer pour renseigner les dépendances déclarées, leurs versions et leur provenance. Le contenu dépend du fichier fourni : un import ne garantit pas que toutes les dépendances réellement utilisées sont présentes.

Les formats acceptés sont **CycloneDX JSON 1.5, 1.6 et 1.7**, ainsi que **SPDX JSON 2.3**. Les fichiers XML et les autres versions ne sont pas acceptés. Par défaut, un fichier peut contenir jusqu'à **20 Mio**, **50 000 composants** et **200 000 relations** entre composants. L'équipe d'exploitation peut ajuster ces limites.

### Importer ou mettre à jour une source

Vous devez disposer du droit de modifier les technologies de l'application. Pour consulter les composants et l'historique, vous devez également disposer du droit de lecture des technologies.

1. Ouvrez la fiche de l'application, puis l'onglet **Technologies**.
2. Dans **Dépendances importées par SBOM**, cliquez sur **Importer un SBOM**.
3. Choisissez la **Source de l'inventaire**. Pour un premier import, créez une source avec un nom explicite, par exemple `backend` ou `frontend`. Pour mettre à jour un inventaire existant, sélectionnez sa source dans la liste.
4. Ajoutez, si nécessaire, le **Contexte** et la **Version du projet**, puis sélectionnez le fichier JSON.
5. Cliquez sur **Analyser le fichier**. L'analyse présente les ajouts, changements, retraits et composants inchangés. Elle ne modifie pas l'inventaire courant.
6. Vérifiez le détail des changements et les avertissements, puis cliquez sur **Confirmer l'import**.

L'analyse reste valable **24 heures**. Si elle a expiré, ou si quelqu'un a modifié la même source entre l'analyse et la confirmation, relancez l'analyse et examinez les nouveaux changements. Vos droits sont vérifiés de nouveau au moment de confirmer.

Chaque source possède son propre inventaire. Remplacer le SBOM du `backend` met à jour uniquement cette source : les composants absents du nouveau fichier sont retirés de son inventaire courant. Les autres sources et les technologies saisies manuellement sont conservées. Plusieurs versions d'un même composant peuvent coexister, et un composant présent dans deux sources garde ses deux provenances.

Si le fichier décrit le même inventaire, la confirmation conserve une trace de vérification sans dupliquer les composants.

### Consulter les composants et l'historique

La liste des composants est paginée et permet de rechercher un produit, une version ou un identifiant de paquet. La provenance **SBOM** et le nom de la source sont affichés. Les composants dont l'identification est incomplète restent consultables ; ils ne sont pas écartés silencieusement.

Les outils qui ont produit le SBOM, les éléments d'historique et les composants explicitement exclus du projet restent consultables dans le détail de l'import. Ils ne sont pas comptés parmi les dépendances actives de l'application.

Dans **Sources et historique**, vous pouvez consulter les imports confirmés, leurs composants et leurs relations. Pour retirer une source de l'inventaire courant, cliquez sur **Prévisualiser la désactivation**, vérifiez le nombre de composants concernés, puis sur **Confirmer la désactivation**. Son historique est conservé. Vous pouvez réactiver cette source en la sélectionnant lors d'un nouvel import.

### Retrouver ces données dans la vue Technologies et les exports

La vue **Technologies**, avec le filtre **Toutes les technologies**, inclut les composants des sources SBOM actives dans votre périmètre autorisé. Les exports les distinguent avec les colonnes **Provenance** et **Source SBOM**. L'accès à cette vue et le droit d'export sont distincts des droits sur la fiche ; contactez votre administrateur si nécessaire.

L'import SBOM ne calcule pas de fin de vie pour les composants importés et ne recherche pas encore les failles de sécurité. Une date absente ou la mention **Fin de vie non évaluée** ne signifie donc pas qu'un composant est à jour ou sans vulnérabilité. Les filtres de fin de vie ne retiennent pas ces composants non évalués.

---

## Besoin d'aide ?

Si ce guide ne répond pas à votre question, contactez l'administrateur indiqué dans **Mon profil**. Vous pouvez aussi cliquer sur **Contacter l'équipe** dans RefApp.
