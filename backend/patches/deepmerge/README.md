# Correctif local de deepmerge

Copie privée du bundle CommonJS et des déclarations de `deepmerge@4.3.1`
(MIT, licence conservée), dérivés du commit amont
`5b87756a5671635679001cbac72aa42f23472c81`. Le nom et la version
`@refapp/deepmerge@4.3.1-refapp.1` identifient ce correctif local ; il n’est pas
publié sur npm.

L’avis [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
ne liste aucune version officielle corrigée au 28 octobre 2026. Les seuls
changements fonctionnels du bundle sont le refus de `__proto__` dans les boucles de copie de
la cible et de fusion de la source, y compris dans les objets imbriqués.
L’API, les options et les types amont sont conservés.

Les workspaces backend et frontend utilisent un override vers cette copie,
également disponible pendant l’installation Docker grâce au dossier `patches`.
Leurs tests `deepmerge-security.spec.ts` vérifient les cas de pollution et
les principales options utilisées par les outils de compilation et de test.
Les deux copies doivent rester identiques. Remplacer cet override par une version
officielle corrigée dès qu’elle est disponible et validée.
