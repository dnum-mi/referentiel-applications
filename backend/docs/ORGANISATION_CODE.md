# Documentation — Organisation module exemple avec TODO (NestJS + Prisma)

## Introdution

Cette organisation repose surtout sur le S de SOLID : Single Responsibility Principle.
L’idée est simple :
 • chaque fichier, chaque dossier, chaque couche a une seule responsabilité ;
 • on évite de mélanger les rôles (pas de logique métier dans le controller, pas de prisma dans le service ni dans les use cases, etc.).

On touche aussi un peu au D de SOLID (Dependency Inversion) en utilisant des interfaces (Ports) pour que l’application ne dépende pas directement de Prisma.

## Objectif

Ce doc montre une manière d’organiser le code en separant les responsabilités.
Le but est d’avoir :
 • du code plus lisible (on sait ou chercher),
 • du code testable (on peut tester le métier sans base),
 • du code plus évolutif (on change Prisma ou même l’API sans tout casser).

## Organisation

todo/
  domain/
    entities/
      todo.entity.ts
  application/
    dto/
      create-todo.dto.ts
    use-cases/
      create-todo.usecase.ts
      list-todos.usecase.ts
      complete-todo.usecase.ts
      delete-todo.usecase.ts
    map/
      todo.presenter.ts
  infrastructure/
    repository/
      todo.repository.interface.ts
      todo.repository.prisma.ts
  todo.controller.ts
  todo.module.ts

⸻

## Rôle de chaque couche

Domain
 • contient le métier pur : un Todo avec ses props et son comportement
 • pas de dependances techniques (pas de prisma, pas de nest)
 • ex: une methode complete() pour marquer la tache comme faite

⸻

Application
 • regroupe les cas d’usage (use cases)
 • chaque use case = une action (creer, lister, supprimer…)
 • les use cases parlent au contrat (repo interface) et pas direct a Prisma
 • contient aussi :
 • DTO pour valider les entrées
 • Presenter/Mapper pour formater les sorties

⸻

Infrastructure
 • la partie technique
 • todo.repo.interface.ts = contrat que doit respecter un repo (save, findAll…)
 • todo.repository.prisma.ts = implem concrète avec Prisma
 • si demain on change d’ORM, on ne touche pas a l’applicatif ni au domain

⸻

Interface (Controller & Module)
 • Controller : recoit la requete HTTP et appelle le bon use case
 • Module : assemble le tout (brancher les use cases + repo Prisma)

⸻

🔄 Cycle typique (POST /todos)

 1. un client envoie une requete sur /todos
 2. le controller valide l’entrée (DTO) et appelle CreateTodo
 3. le use case construit un Todo et appelle le contrat du repo
 4. l’impl Prisma sauvegarde en base
 5. le resultat est renvoyé via un presenter

⸻

## Bénéfices

 • separation claire : metier ≠ app ≠ technique ≠ interface
 • testabilité : on peut remplacer le repo Prisma par un fake en memoire
 • évolutif : si on passe a Mongo pas besoin de tout réécrire
 • propre : le domaine n’importe jamais Prisma ou Nest

⸻

### Clean archi ?

C’est pas la “clean archi” pure, mais une version pratique :
 • les dépendances vont de l’exterieur vers l’interieur
 • pattern port & adapter :
 • Port = interface du repo
 • Adapter = Prisma repository
 • le domaine reste independant de la technique

🏁 En résumé
 • Domain = regles metier (qu’est-ce qu’un Todo)
 • Application = cas d’usage (create, list, delete, etc)
 • Infrastructure = details techniques (Prisma, DB)
 • Interface = API REST (controller + module)

Organisation simple, claire, testable, et qui permet de faire evoluer le projet sans tout refactorer.
