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

Votre rôle s'applique à toutes les applications du référentiel. Par défaut, votre rôle est **Visiteur**.

| Rôle               | Droits                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Visiteur**       | Rechercher les applications. Lire les informations générales des fiches. Créer des signalements.                  |
| **Lecteur**        | Droits du Visiteur. Lire toutes les rubriques des fiches : acteurs, hébergement, conformités, relations et liens. |
| **Contributeur**   | Droits du Lecteur. Créer et modifier les fiches. Traiter les signalements.                                        |
| **Administrateur** | Droits du Contributeur. Gérer les utilisateurs et leurs droits, sur un périmètre ou sur tout le référentiel.      |

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

## Besoin d'aide ?

Si ce guide ne répond pas à votre question, contactez l'administrateur indiqué dans **Mon profil**. Vous pouvez aussi cliquer sur **Contacter l'équipe** dans RefApp.
