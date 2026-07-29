-- #2055 : ajoute la fréquence de mise à jour « Jamais » (donnée figée).
-- PostgreSQL ≥ 12 accepte ALTER TYPE ... ADD VALUE dans la transaction de migration
-- tant que la nouvelle valeur n'y est pas utilisée (aucun usage ici).
-- IF NOT EXISTS : la valeur préexiste dans certains environnements (bases éditées
-- à la main), où ADD VALUE simple échouait et bloquait la migration (P3009).
ALTER TYPE "DataUpdateFrequency" ADD VALUE IF NOT EXISTS 'NEVER';
