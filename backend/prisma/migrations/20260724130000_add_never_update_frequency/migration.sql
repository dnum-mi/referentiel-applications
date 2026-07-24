-- #2055 : ajoute la fréquence de mise à jour « Jamais » (donnée figée).
-- PostgreSQL ≥ 12 accepte ALTER TYPE ... ADD VALUE dans la transaction de migration
-- tant que la nouvelle valeur n'y est pas utilisée (aucun usage ici).
ALTER TYPE "DataUpdateFrequency" ADD VALUE 'NEVER';
