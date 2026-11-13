# Schémas SBOM embarqués

Fichiers officiels conservés sans modification ; la validation ne télécharge aucun `$ref`.

- CycloneDX : tags `1.5`, `1.6`, `1.7` du dépôt officiel https://github.com/CycloneDX/specification (dossier `schema/`).
- SPDX : tag `v2.3` du dépôt officiel https://github.com/spdx/spdx-spec (fichier `schemas/spdx-schema.json`).
- Les références SPDX/JSF sont isolées par version CycloneDX car leur `$id` est commun mais leur contenu peut évoluer.
- Les licences originales sont conservées à côté des schémas.

L’implémentation AJV conserve les contraintes des schémas. Le contrôle `uniqueItems` utilise une sérialisation canonique conservant l’ordre des tableaux pour éviter une comparaison quadratique des grands inventaires. Les contrôles des références et d’identité complètent les schémas.

## Empreintes SHA-256

- `cyclonedx-1.5-jsf-0.82.schema.json` : `8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae`
- `cyclonedx-1.5-spdx.schema.json` : `4f6e2b05c05d26a4f2dc5879fbc2fca94b0a28db46289d0c51345621b71cfbfc`
- `cyclonedx-1.5.json` : `067f7824b08653839ea050ae9e09ca48375eadc2652b0e2a299476e7db90335b`
- `cyclonedx-1.6-jsf-0.82.schema.json` : `8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae`
- `cyclonedx-1.6-spdx.schema.json` : `baa9d3bd1ed57b6751b0887edead6b5063ff53ff7429cf85d476c6c94af0166e`
- `cyclonedx-1.6.json` : `3e92dddbc30cf7f6a02b80f0942b1a4cfd4fb1c26f1dfc4310afa9d613cafb93`
- `cyclonedx-1.7-cryptography-defs.schema.json` : `018ea7f78b5208ec647cfd10f669cc9c26aba6aceb79c4da7f9c0ef4c99b60de`
- `cyclonedx-1.7-jsf-0.82.schema.json` : `8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae`
- `cyclonedx-1.7-spdx.schema.json` : `54a6288292bc6c90b0d3952f5f939f17436fa76704ffe68a46e5b78539c7cc1b`
- `cyclonedx-1.7.json` : `df472ef4aaf593904c479293723a1a5c191d6672715c93b3c0b5c318f3914221`
- `spdx-2.3.json` : `239208b7ac287b3cf5d9a9af23f9d69863971102a5e1587a27a398b43490b89b`
