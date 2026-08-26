# Changelog

## [1.88.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.87.0...v1.88.0) (2026-08-26)


### Features

* add correlation detection engine with signals, scoring and scheduled job ([#2324](https://github.com/dnum-mi/referentiel-applications/issues/2324)) ([3637d56](https://github.com/dnum-mi/referentiel-applications/commit/3637d5654cc1b3271423381ff5540b9c9345fb26))
* add correlation suggestion accept, reject and run endpoints ([#2319](https://github.com/dnum-mi/referentiel-applications/issues/2319)) ([b0cd58b](https://github.com/dnum-mi/referentiel-applications/commit/b0cd58bf1bede322338424108c204c7e09afcfc3))
* add correlation suggestions list endpoint ([#2318](https://github.com/dnum-mi/referentiel-applications/issues/2318)) ([0a52d1c](https://github.com/dnum-mi/referentiel-applications/commit/0a52d1c8cd283444ed1d511878fa4b02a1050f8d))
* add creator for actor type ([#2303](https://github.com/dnum-mi/referentiel-applications/issues/2303)) ([eca0cd8](https://github.com/dnum-mi/referentiel-applications/commit/eca0cd800b7914f68a18fe56d779f65748b93dab))
* add iq action cta ([#2325](https://github.com/dnum-mi/referentiel-applications/issues/2325)) ([b2522b9](https://github.com/dnum-mi/referentiel-applications/commit/b2522b92eaa26b50f590459f237b0b9b42bc6090))
* add IQ campaign ([#2350](https://github.com/dnum-mi/referentiel-applications/issues/2350)) ([ae7fd00](https://github.com/dnum-mi/referentiel-applications/commit/ae7fd00282447f1d96f92a20a8b161791d022380))
* add is_correlated_with relation type and CorrelationSuggestion model ([#2323](https://github.com/dnum-mi/referentiel-applications/issues/2323)) ([d8fc50a](https://github.com/dnum-mi/referentiel-applications/commit/d8fc50a602ee50ab8d7c7db8bda31102c211ae70))
* add notifications center ([#2328](https://github.com/dnum-mi/referentiel-applications/issues/2328)) ([474c3d9](https://github.com/dnum-mi/referentiel-applications/commit/474c3d928d026f1b862d2d7ad5466e0334d2117c))
* add polling for notification center ([#2360](https://github.com/dnum-mi/referentiel-applications/issues/2360)) ([91b2a06](https://github.com/dnum-mi/referentiel-applications/commit/91b2a066737ea880bda7ee788621b0d03fecfc0b))
* add saved filter for app ([#2309](https://github.com/dnum-mi/referentiel-applications/issues/2309)) ([7c2bd39](https://github.com/dnum-mi/referentiel-applications/commit/7c2bd39bd563860035ec99dcd7286975a7912c89))
* add the correlation review tab to the admin panel ([#2351](https://github.com/dnum-mi/referentiel-applications/issues/2351)) ([25a9d06](https://github.com/dnum-mi/referentiel-applications/commit/25a9d0620d5c3b9d2a0d36725469c9cf35ba1231))
* add the cross-cutting end-of-life overview ([#2356](https://github.com/dnum-mi/referentiel-applications/issues/2356)) ([505ecf7](https://github.com/dnum-mi/referentiel-applications/commit/505ecf7cf8a4f74103029807938d288edf93ff8d))
* alert application owners when a technology reaches end of life ([#2357](https://github.com/dnum-mi/referentiel-applications/issues/2357)) ([72d46c2](https://github.com/dnum-mi/referentiel-applications/commit/72d46c20f5f475b482ece507e6a45945f9dc71a4))
* display and filter the correlation relation ([#2352](https://github.com/dnum-mi/referentiel-applications/issues/2352)) ([78cb132](https://github.com/dnum-mi/referentiel-applications/commit/78cb132adae9002f810565cad035a9e609865347))


### Bug Fixes

* filter admin user list by requestor scope ([#2327](https://github.com/dnum-mi/referentiel-applications/issues/2327)) ([07c3d7f](https://github.com/dnum-mi/referentiel-applications/commit/07c3d7f368e415e58794fc9060d65785ff572f65))
* **frontend:** force reload of pre-v1.86 clients on service worker update ([#2306](https://github.com/dnum-mi/referentiel-applications/issues/2306)) ([#2307](https://github.com/dnum-mi/referentiel-applications/issues/2307)) ([58da275](https://github.com/dnum-mi/referentiel-applications/commit/58da27535af487a68c714f1a652a2a3cc875e02f))
* realign the committed OpenAPI contract with the backend and gate it in CI ([#2349](https://github.com/dnum-mi/referentiel-applications/issues/2349)) ([ee0b4e9](https://github.com/dnum-mi/referentiel-applications/commit/ee0b4e9ae087a6671b12101bfd89cbb77606fc0a))
* resync actor edit form when the modal reopens with a different actor ([#2361](https://github.com/dnum-mi/referentiel-applications/issues/2361)) ([9501966](https://github.com/dnum-mi/referentiel-applications/commit/9501966bfb971adb42c561201c6bca26d611b7f6))
* upsert technology stack entries case-insensitively ([#2317](https://github.com/dnum-mi/referentiel-applications/issues/2317)) ([4f2af54](https://github.com/dnum-mi/referentiel-applications/commit/4f2af54d1977b74bcc390518b91b07c60986aa41))

## [1.87.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.86.1...v1.87.0) (2026-08-17)


### Features

* add default actor ([#2219](https://github.com/dnum-mi/referentiel-applications/issues/2219)) ([d5da745](https://github.com/dnum-mi/referentiel-applications/commit/d5da745ce24395e65bbe833d68f94ae1a8e3a7bc))
* add historic and tracking for sending email ([#2223](https://github.com/dnum-mi/referentiel-applications/issues/2223)) ([f3695f0](https://github.com/dnum-mi/referentiel-applications/commit/f3695f09c3fc9eff3f06f7fac6e8cfc8a3a3bc68))
* add historic for user permissions and role updating ([#2207](https://github.com/dnum-mi/referentiel-applications/issues/2207)) ([acf1521](https://github.com/dnum-mi/referentiel-applications/commit/acf15219856d8cbd4d8df58087c42ca014271997))
* add label tooltip for technical debt card and modal ([#2220](https://github.com/dnum-mi/referentiel-applications/issues/2220)) ([4bbece3](https://github.com/dnum-mi/referentiel-applications/commit/4bbece3dcce51129e0061f56d70b730db49121ca))
* add maintenance read-only mode ([#2201](https://github.com/dnum-mi/referentiel-applications/issues/2201)) ([629a495](https://github.com/dnum-mi/referentiel-applications/commit/629a4959b167863e883a2e61e5e0f7b9b87bf7e9))
* add quality null for app decommissionned and deleted ([#2244](https://github.com/dnum-mi/referentiel-applications/issues/2244)) ([f0eebec](https://github.com/dnum-mi/referentiel-applications/commit/f0eebecdd7304b095bb60eb2272d748875214cb0))
* add warning if user create app without any permissions read ([#2237](https://github.com/dnum-mi/referentiel-applications/issues/2237)) ([504c226](https://github.com/dnum-mi/referentiel-applications/commit/504c226e715e26ca5d1b238fede135f62ba9e534))
* admin can ban user ([#2240](https://github.com/dnum-mi/referentiel-applications/issues/2240)) ([ea6eec9](https://github.com/dnum-mi/referentiel-applications/commit/ea6eec91ab183cb28c2063fe12afcc3546d134ac))
* afficher l'admin réel sur les modifications faites sous impersonification ([#2227](https://github.com/dnum-mi/referentiel-applications/issues/2227)) ([03b93ac](https://github.com/dnum-mi/referentiel-applications/commit/03b93ac2102f3c3cb4e4bec4e18e06caf2e56e43))
* centralized action log middleware with impersonation traceability ([#2225](https://github.com/dnum-mi/referentiel-applications/issues/2225)) ([60323d8](https://github.com/dnum-mi/referentiel-applications/commit/60323d82a480ed2b27014f10d105d521a8e990d2))
* disable automatic email crons by default behind EMAIL_CRON_ENABLED ([#2216](https://github.com/dnum-mi/referentiel-applications/issues/2216)) ([417b149](https://github.com/dnum-mi/referentiel-applications/commit/417b149d1efccaf6cb77adbef10c976a39f64bda))
* normalize all tag with lowecase ([#2202](https://github.com/dnum-mi/referentiel-applications/issues/2202)) ([41370be](https://github.com/dnum-mi/referentiel-applications/commit/41370bed9f4767479925c6763aacd21379896514))
* panel admin directions métier + rattachement aux organisations ([#2218](https://github.com/dnum-mi/referentiel-applications/issues/2218)) ([68d627f](https://github.com/dnum-mi/referentiel-applications/commit/68d627fe74b03b53f6d37dfed269c81c209c0280))
* restreindre l'impersonification au périmètre de l'admin local ([#2221](https://github.com/dnum-mi/referentiel-applications/issues/2221)) ([5cd2eb2](https://github.com/dnum-mi/referentiel-applications/commit/5cd2eb25a310de22eb3cc4968adc63fdd6f397cc))
* **technology:** complete endoflife.date EOL verification ([#1789](https://github.com/dnum-mi/referentiel-applications/issues/1789)) ([#2234](https://github.com/dnum-mi/referentiel-applications/issues/2234)) ([540a119](https://github.com/dnum-mi/referentiel-applications/commit/540a119dc38d5876c34c3257f4557f3d785baefa))


### Bug Fixes

* add organization check all organisations from business id for admin scope ([#2214](https://github.com/dnum-mi/referentiel-applications/issues/2214)) ([ecd6369](https://github.com/dnum-mi/referentiel-applications/commit/ecd63694c11dd7f6e27a68e47a1a8c0bd49e69cd))
* update reamde ([#2239](https://github.com/dnum-mi/referentiel-applications/issues/2239)) ([7f690de](https://github.com/dnum-mi/referentiel-applications/commit/7f690defcd43ec60ddd6ea3e8012ea109a4b7dba))
* update status label for spec test ([#2304](https://github.com/dnum-mi/referentiel-applications/issues/2304)) ([f0f902d](https://github.com/dnum-mi/referentiel-applications/commit/f0f902dd3d244fba61be0b14d5db4835c5aa4f32))

## [1.86.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.86.0...v1.86.1) (2026-07-30)


### Bug Fixes

* **migration:** make add_never_update_frequency idempotent ([#2156](https://github.com/dnum-mi/referentiel-applications/issues/2156)) ([960d35c](https://github.com/dnum-mi/referentiel-applications/commit/960d35c880ad17f2660740dd998d13ce1fc3a44f)), closes [#2055](https://github.com/dnum-mi/referentiel-applications/issues/2055)
* restore rgaa accessibility score ([#2181](https://github.com/dnum-mi/referentiel-applications/issues/2181)) ([e763770](https://github.com/dnum-mi/referentiel-applications/commit/e763770bfd88acf6d870a24dae7d823c4d5c1bd4))

## [1.86.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.85.0...v1.86.0) (2026-07-29)


### Features

* add gap between portfeuille & general information in app side filter ([#2124](https://github.com/dnum-mi/referentiel-applications/issues/2124)) ([3b2997b](https://github.com/dnum-mi/referentiel-applications/commit/3b2997b757de48f1eb029d2e29a6cc2a812d754d))
* **frontend:** update app version without hard refresh ([#2158](https://github.com/dnum-mi/referentiel-applications/issues/2158)) ([f8c2de6](https://github.com/dnum-mi/referentiel-applications/commit/f8c2de689c77eef807c9653067cd1f1295ac6588))
* update time with new name for mco ([#2159](https://github.com/dnum-mi/referentiel-applications/issues/2159)) ([8430c54](https://github.com/dnum-mi/referentiel-applications/commit/8430c547335e312b3d008f694a2c6d32577f1b76))


### Bug Fixes

* add label to technical debt chart if shortname is not existing ([#2154](https://github.com/dnum-mi/referentiel-applications/issues/2154)) ([566253e](https://github.com/dnum-mi/referentiel-applications/commit/566253e402c3523ed8ea178727e6e30bdb2fbd31))
* synchronize all loading in batch data admin ([#2155](https://github.com/dnum-mi/referentiel-applications/issues/2155)) ([f5e7b55](https://github.com/dnum-mi/referentiel-applications/commit/f5e7b554327a88e4b67921b2fa2a8b18e03fab5d))
* **tests:** stop polluting the dev database from test runs ([#2117](https://github.com/dnum-mi/referentiel-applications/issues/2117)) ([#2151](https://github.com/dnum-mi/referentiel-applications/issues/2151)) ([ef19258](https://github.com/dnum-mi/referentiel-applications/commit/ef192580ba1effcfbc3ff7a43613ee33e13eb5bb))
* use correct default value for mdit filter ([#2147](https://github.com/dnum-mi/referentiel-applications/issues/2147)) ([6599352](https://github.com/dnum-mi/referentiel-applications/commit/65993521acc3dffe23db451d89c2d175d2a03ddc))

## [1.85.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.84.0...v1.85.0) (2026-07-24)


### Features

* add multiple businessdivision ([#2114](https://github.com/dnum-mi/referentiel-applications/issues/2114)) ([1be1e6e](https://github.com/dnum-mi/referentiel-applications/commit/1be1e6e2b5b34ffca2d6efdc4fb8083b4f463226))


### Bug Fixes

* **admin:** keep the user edit modal open across list refreshes ([#1830](https://github.com/dnum-mi/referentiel-applications/issues/1830)) ([#2115](https://github.com/dnum-mi/referentiel-applications/issues/2115)) ([962310e](https://github.com/dnum-mi/referentiel-applications/commit/962310e6c8babf8476eb1f331dfb68f24fe10534))
* **data-catalog:** add the NEVER update frequency ([#2055](https://github.com/dnum-mi/referentiel-applications/issues/2055)) ([#2116](https://github.com/dnum-mi/referentiel-applications/issues/2116)) ([b289960](https://github.com/dnum-mi/referentiel-applications/commit/b2899600eeb2ecbd13e3af74fe7b796a9345e611))
* **permissions:** hide the technology tab from users without rights ([#2088](https://github.com/dnum-mi/referentiel-applications/issues/2088)) ([#2089](https://github.com/dnum-mi/referentiel-applications/issues/2089)) ([517be66](https://github.com/dnum-mi/referentiel-applications/commit/517be665a71af1626e266162bfa6bad7294ad524))
* **permissions:** retrait du mécanisme isAdmin (revert [#2031](https://github.com/dnum-mi/referentiel-applications/issues/2031)) ([#2086](https://github.com/dnum-mi/referentiel-applications/issues/2086)) ([93b982f](https://github.com/dnum-mi/referentiel-applications/commit/93b982f8fe08c6dbf457ee789551ad6ac3250dc2))
* **ui:** homogénéiser matrice des droits et onglets de la fiche (libellés, ordre, en-tête sticky) ([#2090](https://github.com/dnum-mi/referentiel-applications/issues/2090)) ([b35b7b2](https://github.com/dnum-mi/referentiel-applications/commit/b35b7b219dc2446708b6833c95768ea00128a70a))
* **ui:** step-2 creation form labels ([#2054](https://github.com/dnum-mi/referentiel-applications/issues/2054)) ([#2118](https://github.com/dnum-mi/referentiel-applications/issues/2118)) ([b5fbd17](https://github.com/dnum-mi/referentiel-applications/commit/b5fbd17be6332e8636e53758e6c9081bd2662bff))

## [1.84.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.83.0...v1.84.0) (2026-07-21)


### Features

* add missing endpoint for data catalog and add front actions ([#2024](https://github.com/dnum-mi/referentiel-applications/issues/2024)) ([5b58c76](https://github.com/dnum-mi/referentiel-applications/commit/5b58c766048c195d2c0de164e11b36b9b2c14867))

## [1.83.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.82.1...v1.83.0) (2026-07-20)


### Features

* **license:** remove the Licenses feature (model, API, UI, tests) ([#2057](https://github.com/dnum-mi/referentiel-applications/issues/2057)) ([f6653a8](https://github.com/dnum-mi/referentiel-applications/commit/f6653a8c8f0c483f89d195e164f9c1d920882bad))
* **permissions:** matrice de droits Technologie + fix enregistrement colonne Données ([#2059](https://github.com/dnum-mi/referentiel-applications/issues/2059)) ([19f7460](https://github.com/dnum-mi/referentiel-applications/commit/19f746041e146b7662f340fda74ce7eba9394570))
* **technology:** rework the technology stack by technology (product, doc link, EOL) ([#2058](https://github.com/dnum-mi/referentiel-applications/issues/2058)) ([bf78829](https://github.com/dnum-mi/referentiel-applications/commit/bf78829cd360bbf6115f8c5a9421ef1175bb3aab))

## [1.82.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.82.0...v1.82.1) (2026-07-16)


### Bug Fixes

* **a11y:** RGAA lot L — contraste couleurs & éléments graphiques ([#1782](https://github.com/dnum-mi/referentiel-applications/issues/1782)) ([7b6c505](https://github.com/dnum-mi/referentiel-applications/commit/7b6c505f9c3e5d7527837c45d2f91adac27a026d))
* **applications:** afficher le libellé de statut même sans date ([#2017](https://github.com/dnum-mi/referentiel-applications/issues/2017)) ([#2019](https://github.com/dnum-mi/referentiel-applications/issues/2019)) ([bc75773](https://github.com/dnum-mi/referentiel-applications/commit/bc75773aab8431160379274403b8e41e7354d148))
* **e2e:** éditer une ligne de matrice non verrouillée (débloque la release 1.82.1) ([#2052](https://github.com/dnum-mi/referentiel-applications/issues/2052)) ([547efb7](https://github.com/dnum-mi/referentiel-applications/commit/547efb718d85d08606fad611475fb20c72093e40))
* **permissions:** l'admin d'une application a les droits complets (lecture + écriture) sur sa propre application ([#2028](https://github.com/dnum-mi/referentiel-applications/issues/2028)) ([#2031](https://github.com/dnum-mi/referentiel-applications/issues/2031)) ([22eeb78](https://github.com/dnum-mi/referentiel-applications/commit/22eeb78b746ad510bc17359fcfaaf115efbd43be))
* **qa:** look up campaign issues via REST list, not the rate-limited search API ([#2053](https://github.com/dnum-mi/referentiel-applications/issues/2053)) ([97f9fba](https://github.com/dnum-mi/referentiel-applications/commit/97f9fba6c6b6252b01ef9b6d07be261faa4facbd))
* **search:** recherche globale du header — préfixe + fiabilisation complète ([#2025](https://github.com/dnum-mi/referentiel-applications/issues/2025)) ([#2030](https://github.com/dnum-mi/referentiel-applications/issues/2030)) ([cae2dee](https://github.com/dnum-mi/referentiel-applications/commit/cae2dee1c33fc5e4dc37adc6a4863cc161832575))

## [1.82.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.81.0...v1.82.0) (2026-07-10)


### Features

* add rgaa n ([#1986](https://github.com/dnum-mi/referentiel-applications/issues/1986)) ([56d7648](https://github.com/dnum-mi/referentiel-applications/commit/56d7648fd6bdf055f9be4ae34ded5372c894d976))
* add write permission for edit data app ([#1980](https://github.com/dnum-mi/referentiel-applications/issues/1980)) ([d913b97](https://github.com/dnum-mi/referentiel-applications/commit/d913b9753e0d9c69eb96877a3d19bdd8c3d9347d))
* **applications:** stack technique & licences sur la fiche d'application ([#1099](https://github.com/dnum-mi/referentiel-applications/issues/1099)) ([6f9d877](https://github.com/dnum-mi/referentiel-applications/commit/6f9d8778929dce52e379a8b6464cde2449963cb3))
* **rgaa:** lot G — formulaires (obligatoire, erreurs, formats & suggestions) ([ea2b000](https://github.com/dnum-mi/referentiel-applications/commit/ea2b000082d41c14532ee7dacf5dfd3b9c218742))
* tags et sélections ([#1992](https://github.com/dnum-mi/referentiel-applications/issues/1992)) ([34f3926](https://github.com/dnum-mi/referentiel-applications/commit/34f39267f5ef316e6121de24d49d476181456373))
* trier les types dacteur ([#1974](https://github.com/dnum-mi/referentiel-applications/issues/1974)) ([1d2a331](https://github.com/dnum-mi/referentiel-applications/commit/1d2a33187fb1498ede4b6740aa9e3d029dcb34a8))


### Bug Fixes

* **a11y:** rendre le graphique TIME responsive et corriger le text-spacing RGAA ([#1978](https://github.com/dnum-mi/referentiel-applications/issues/1978)) ([91817ee](https://github.com/dnum-mi/referentiel-applications/commit/91817ee8f968763a19d4c5ed3a12911358a30dc7))
* **a11y:** renseigner le taux de conformité et la date de la déclaration d'accessibilité ([#1935](https://github.com/dnum-mi/referentiel-applications/issues/1935)) ([d8c7982](https://github.com/dnum-mi/referentiel-applications/commit/d8c79829034ec927e06bd78c5cc8e0fd8462474a))
* **e2e:** restore missing actor filter options and fix scope-admin login reuse (ADM-16) ([#2012](https://github.com/dnum-mi/referentiel-applications/issues/2012)) ([7f6c336](https://github.com/dnum-mi/referentiel-applications/commit/7f6c3363829e7d28502bcaa7035061fcff0cdfb4))


### Performance Improvements

* **search:** speed up application search end to end ([#1975](https://github.com/dnum-mi/referentiel-applications/issues/1975)) ([ca7d336](https://github.com/dnum-mi/referentiel-applications/commit/ca7d336567124640b47c272ffe8ca915ad6d33c7))

## [1.81.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.80.1...v1.81.0) (2026-07-04)


### Features

* fp8 gerer tokens applicatifs admin 1885 ([#1939](https://github.com/dnum-mi/referentiel-applications/issues/1939)) ([778eea7](https://github.com/dnum-mi/referentiel-applications/commit/778eea71f32c8f5dfd3676c27c323e0075878dc7))
* **rgaa:** fix keyboard trap and SPA focus management (RGAA-026, RGAA-041) ([#1919](https://github.com/dnum-mi/referentiel-applications/issues/1919)) ([ff04216](https://github.com/dnum-mi/referentiel-applications/commit/ff04216428be375c0a216d7e22175dff2468a298))
* status date is optional ([#1925](https://github.com/dnum-mi/referentiel-applications/issues/1925)) ([3b22f5c](https://github.com/dnum-mi/referentiel-applications/commit/3b22f5cc65fe4ab39addc2ec3a68e9402f0d3907))


### Bug Fixes

* **a11y:** rgaa lot e global template - header, footer, landmarks, titles ([#1775](https://github.com/dnum-mi/referentiel-applications/issues/1775)) ([#1921](https://github.com/dnum-mi/referentiel-applications/issues/1921)) ([e13ec3a](https://github.com/dnum-mi/referentiel-applications/commit/e13ec3aabcbcd6009abcaf6a8746338cf44ce7f4))
* **a11y:** rgaa lot f group fields with fieldset/legend ([#1776](https://github.com/dnum-mi/referentiel-applications/issues/1776)) ([#1932](https://github.com/dnum-mi/referentiel-applications/issues/1932)) ([2b469a6](https://github.com/dnum-mi/referentiel-applications/commit/2b469a6487622433d9516151cbce8a83c8f6d1a9))
* **a11y:** rgaa lot i status messages via aria-live and focus management ([#1779](https://github.com/dnum-mi/referentiel-applications/issues/1779)) ([#1930](https://github.com/dnum-mi/referentiel-applications/issues/1930)) ([ec01b62](https://github.com/dnum-mi/referentiel-applications/commit/ec01b62890c08578f15e97578ba2815760e38918))
* **a11y:** rgaa lot j explicit links and new-window mentions ([#1780](https://github.com/dnum-mi/referentiel-applications/issues/1780)) ([#1922](https://github.com/dnum-mi/referentiel-applications/issues/1922)) ([f4aeeda](https://github.com/dnum-mi/referentiel-applications/commit/f4aeedae17ba16b9d54d90df64b367c321a920b6))
* **a11y:** rgaa lot m time chart transcription and label ([#1770](https://github.com/dnum-mi/referentiel-applications/issues/1770)) ([#1924](https://github.com/dnum-mi/referentiel-applications/issues/1924)) ([5e10628](https://github.com/dnum-mi/referentiel-applications/commit/5e10628c5bfce463fd542a5d97edfa2a2eed7135))
* **a11y:** rgaa lot o accessibility statement and footer mention ([#1784](https://github.com/dnum-mi/referentiel-applications/issues/1784)) ([#1929](https://github.com/dnum-mi/referentiel-applications/issues/1929)) ([4e81c4e](https://github.com/dnum-mi/referentiel-applications/commit/4e81c4eb260afb8c45d68e95f4658f34ab1cc54d))
* add is group and maia import for moa/moe when app creation ([#1927](https://github.com/dnum-mi/referentiel-applications/issues/1927)) ([303bed4](https://github.com/dnum-mi/referentiel-applications/commit/303bed4920cde12500e9ee964ca1c38da46a7d8b))
* add validate by default in filter apps ([#1931](https://github.com/dnum-mi/referentiel-applications/issues/1931)) ([625329f](https://github.com/dnum-mi/referentiel-applications/commit/625329f892b054fe4d40d37eacba92e079448f37))
* **e2e:** disambiguate "Détails de la modification" heading locator (HIS-04/05/07/10) ([#1966](https://github.com/dnum-mi/referentiel-applications/issues/1966)) ([cdd2011](https://github.com/dnum-mi/referentiel-applications/commit/cdd2011dc663a9a49ca7bb4c65d5bf2144208272))
* total value for mdit is now correct ([#1923](https://github.com/dnum-mi/referentiel-applications/issues/1923)) ([600bdf6](https://github.com/dnum-mi/referentiel-applications/commit/600bdf6de677cc5b6e3a3407df0a7b8fd8305576))
* update refapptable  with sorting ([#1916](https://github.com/dnum-mi/referentiel-applications/issues/1916)) ([01de11c](https://github.com/dnum-mi/referentiel-applications/commit/01de11cf14615be13d851b2ade5485ffa414fa98))
* update search page POM with defautl value for sorting ([#1965](https://github.com/dnum-mi/referentiel-applications/issues/1965)) ([55632de](https://github.com/dnum-mi/referentiel-applications/commit/55632de574d9c7254023d3f03b3c25d2c7cc9e7b))

## [1.80.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.80.0...v1.80.1) (2026-06-26)


### Bug Fixes

* **docker:** make frontend image writable under OpenShift arbitrary UID ([#1914](https://github.com/dnum-mi/referentiel-applications/issues/1914)) ([4778a34](https://github.com/dnum-mi/referentiel-applications/commit/4778a34dd96de70d76f23a0f5fdf22e0d0ced06e))

## [1.80.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.79.0...v1.80.0) (2026-06-26)


### Features

* [RGAA] Lot A — combobox / autocomplete accessible ([#1823](https://github.com/dnum-mi/referentiel-applications/issues/1823)) ([1126589](https://github.com/dnum-mi/referentiel-applications/commit/1126589d54aa7e2431f1511f141e86e56eb070eb))
* 1772 rgaa lot b étiquettes de champs manquantes critère 111 ([#1820](https://github.com/dnum-mi/referentiel-applications/issues/1820)) ([37147ab](https://github.com/dnum-mi/referentiel-applications/commit/37147abfe902a0994da4a53d6866dfe42166c9f8))
* add check maia email when edit user ([#1818](https://github.com/dnum-mi/referentiel-applications/issues/1818)) ([6ab7b35](https://github.com/dnum-mi/referentiel-applications/commit/6ab7b358e0d8118922668cdb5b55917c5e58a294))
* add global modification by actor in panel admin ([#1888](https://github.com/dnum-mi/referentiel-applications/issues/1888)) ([e0c5645](https://github.com/dnum-mi/referentiel-applications/commit/e0c564570284b08e9fadc1dc76a9fbc9c756dea7))
* add MditCampaign and ImpersonationLog models to schema ([#1874](https://github.com/dnum-mi/referentiel-applications/issues/1874)) ([9b794ac](https://github.com/dnum-mi/referentiel-applications/commit/9b794accd13cc746f7e5d98c0afcc9e34b963909))
* generic Excel import with Conformités sheet ([#753](https://github.com/dnum-mi/referentiel-applications/issues/753)) ([#1881](https://github.com/dnum-mi/referentiel-applications/issues/1881)) ([459389f](https://github.com/dnum-mi/referentiel-applications/commit/459389fcbf1550d62c8d0ecd7e20bee654fefa90))
* impersonation d'un utilisateur par un administrateur ([#1764](https://github.com/dnum-mi/referentiel-applications/issues/1764)) ([#1873](https://github.com/dnum-mi/referentiel-applications/issues/1873)) ([cb4a99e](https://github.com/dnum-mi/referentiel-applications/commit/cb4a99e3eaa48e8979df1ddc73ba04c5fddbb4df))
* implement compliance filters and update related components ([#1788](https://github.com/dnum-mi/referentiel-applications/issues/1788)) ([07ddf45](https://github.com/dnum-mi/referentiel-applications/commit/07ddf45c904740d3151eff65ccb38572d1853be3))
* import des acteurs depuis un fichier Excel ([#751](https://github.com/dnum-mi/referentiel-applications/issues/751)) ([#1876](https://github.com/dnum-mi/referentiel-applications/issues/1876)) ([02c2429](https://github.com/dnum-mi/referentiel-applications/commit/02c24294aea1c1e4c5223240501238eecc59753b))
* import Excel applique les droits par application et consigne les refus ([#1890](https://github.com/dnum-mi/referentiel-applications/issues/1890)) ([#1892](https://github.com/dnum-mi/referentiel-applications/issues/1892)) ([5396d13](https://github.com/dnum-mi/referentiel-applications/commit/5396d1349a2874bef15d1c69222b74d83054f1a2))
* import Excel des onglets applications et hébergements ([#752](https://github.com/dnum-mi/referentiel-applications/issues/752)) ([#1889](https://github.com/dnum-mi/referentiel-applications/issues/1889)) ([13836f8](https://github.com/dnum-mi/referentiel-applications/commit/13836f8a91ca5cc7ba1fb97745af09771612879f))
* millésime MDIT — campagnes dette IT + sélecteur Time + admin ([#1848](https://github.com/dnum-mi/referentiel-applications/issues/1848)) ([#1872](https://github.com/dnum-mi/referentiel-applications/issues/1872)) ([c584396](https://github.com/dnum-mi/referentiel-applications/commit/c5843966c54e433bef57e51ddf59388554749dab))
* pouvoir tracer les modifications de la matrice des droits dans lhistorique de refapp ([#1899](https://github.com/dnum-mi/referentiel-applications/issues/1899)) ([45e1eea](https://github.com/dnum-mi/referentiel-applications/commit/45e1eeae97755d2ea7d945cdaa0392fa80ee3cb0))
* recherche full-text des applications ([#1753](https://github.com/dnum-mi/referentiel-applications/issues/1753)) ([#1842](https://github.com/dnum-mi/referentiel-applications/issues/1842)) ([94fb28e](https://github.com/dnum-mi/referentiel-applications/commit/94fb28e2eb4260f5bfcb6833b17d5749951916ae))
* restrict DIMA/PDMA duration to allowed values ([#1901](https://github.com/dnum-mi/referentiel-applications/issues/1901)) ([#1910](https://github.com/dnum-mi/referentiel-applications/issues/1910)) ([59fe778](https://github.com/dnum-mi/referentiel-applications/commit/59fe7786fae74f1fbe46c11b6b948ebef72b4798))
* tests add more non regression tests ([#1853](https://github.com/dnum-mi/referentiel-applications/issues/1853)) ([31c1c04](https://github.com/dnum-mi/referentiel-applications/commit/31c1c04d4c3bdd395b06f8f3e8f4c0c97d74a179))


### Bug Fixes

* **a11y:** use native elements over ARIA roles in Vue components ([#1897](https://github.com/dnum-mi/referentiel-applications/issues/1897)) ([#1907](https://github.com/dnum-mi/referentiel-applications/issues/1907)) ([108da04](https://github.com/dnum-mi/referentiel-applications/commit/108da047fe011c4964d340100a913c304c3f2a8f))
* add interval value into iqchart ([#1879](https://github.com/dnum-mi/referentiel-applications/issues/1879)) ([acfb7b7](https://github.com/dnum-mi/referentiel-applications/commit/acfb7b79e1f6e1169b4171d29330752af50d140e))
* do not allow empty source name for label creation ([#1875](https://github.com/dnum-mi/referentiel-applications/issues/1875)) ([36f8fc2](https://github.com/dnum-mi/referentiel-applications/commit/36f8fc26a116619c172fc03fb83ce2ca57390919))
* **docker:** drop world-writable perms on frontend image (sonar S2612) ([#1904](https://github.com/dnum-mi/referentiel-applications/issues/1904)) ([ad0675d](https://github.com/dnum-mi/referentiel-applications/commit/ad0675d3dad381247840f83c503af4577f4b9fa3))
* **frontend:** corrige un bug de type AdminActorsTab et la config des tests unitaires ([#1906](https://github.com/dnum-mi/referentiel-applications/issues/1906)) ([23e9ed0](https://github.com/dnum-mi/referentiel-applications/commit/23e9ed0e1b599d676d4739c0c5a55ffe30b25d33))
* handle undefined value into scope permission service ([#1880](https://github.com/dnum-mi/referentiel-applications/issues/1880)) ([558c25c](https://github.com/dnum-mi/referentiel-applications/commit/558c25cc196da865d26f1aa5faffea79a7ae4b4e))
* logout user when 401 ([#1843](https://github.com/dnum-mi/referentiel-applications/issues/1843)) ([c9c9e79](https://github.com/dnum-mi/referentiel-applications/commit/c9c9e797bc06a10cd390b73a4c29c8bf46c0d3a2))
* mdit représentation graphique ([#1871](https://github.com/dnum-mi/referentiel-applications/issues/1871)) ([03067d0](https://github.com/dnum-mi/referentiel-applications/commit/03067d0784593c6de0fe6e9c8d8ce27d1dd7794f))
* provide compare function for array sorts (sonar S2871) ([#1902](https://github.com/dnum-mi/referentiel-applications/issues/1902)) ([a55744c](https://github.com/dnum-mi/referentiel-applications/commit/a55744cdd6589d94a3f8d233c5da081c77ab3489))
* relabel "Maîtrise des coûts" & rename costMaturity → costContainment ([#1900](https://github.com/dnum-mi/referentiel-applications/issues/1900)) ([#1909](https://github.com/dnum-mi/referentiel-applications/issues/1909)) ([39fde52](https://github.com/dnum-mi/referentiel-applications/commit/39fde52a0d842184e4c9778973e935289bea2e1d))
* **security:** résolution des alertes de code scanning CodeQL ([#1846](https://github.com/dnum-mi/referentiel-applications/issues/1846)) ([7612506](https://github.com/dnum-mi/referentiel-applications/commit/7612506412ecb76f13fb6948405f316ac62ded7d))
* **statuses:** remove dead Promise fallback in find (sonar S6544) ([#1903](https://github.com/dnum-mi/referentiel-applications/issues/1903)) ([db12e33](https://github.com/dnum-mi/referentiel-applications/commit/db12e33aff9cd5b22a9b1a75eb26454479a19ecb))
* update OIDC Swagger URLs and refactor FooterLink interface ([#1719](https://github.com/dnum-mi/referentiel-applications/issues/1719)) ([431bab7](https://github.com/dnum-mi/referentiel-applications/commit/431bab7d07df09ceb7240b201998c8103bbe3e71))

## [1.79.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.78.0...v1.79.0) (2026-06-11)


### Features

* add favoris app and add my app with actor group ([#1756](https://github.com/dnum-mi/referentiel-applications/issues/1756)) ([569430a](https://github.com/dnum-mi/referentiel-applications/commit/569430a8f26a0ed0b2b5bef891d2bf6fa77fe105))
* add maia import into actor form ([#1762](https://github.com/dnum-mi/referentiel-applications/issues/1762)) ([853035c](https://github.com/dnum-mi/referentiel-applications/commit/853035cd210ddee63aa4c165462275eb40052ed0))
* add new value to columns and fix permission ([#1787](https://github.com/dnum-mi/referentiel-applications/issues/1787)) ([5f7fcd1](https://github.com/dnum-mi/referentiel-applications/commit/5f7fcd1d46b2ffa29e29a3b878b01476fbf9c844))
* add restriction and reset value for ecoindex ([#1758](https://github.com/dnum-mi/referentiel-applications/issues/1758)) ([f9e475e](https://github.com/dnum-mi/referentiel-applications/commit/f9e475e45cf8a1ed83314a7a6f729c00ecafce76))
* attach maia organisation when create user ([#1793](https://github.com/dnum-mi/referentiel-applications/issues/1793)) ([f707d15](https://github.com/dnum-mi/referentiel-applications/commit/f707d152d126a4b25e85367d76e3f1fed51af102))
* reorder hosting fields and ensure filter updates handle null values ([#1768](https://github.com/dnum-mi/referentiel-applications/issues/1768)) ([54eff91](https://github.com/dnum-mi/referentiel-applications/commit/54eff915d24efc1f1fc95a95aec72aa3ed782299))

## [1.78.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.77.0...v1.78.0) (2026-06-01)


### Features

* :sparkles: add eco_index_target_url to compliance field labels ([#1738](https://github.com/dnum-mi/referentiel-applications/issues/1738)) ([3b9fd37](https://github.com/dnum-mi/referentiel-applications/commit/3b9fd375b7d81a1167c385dcc7543184b5d7252b))
* :sparkles: add maia references to organizations for maia org imports ([#1747](https://github.com/dnum-mi/referentiel-applications/issues/1747)) ([49d6a41](https://github.com/dnum-mi/referentiel-applications/commit/49d6a41a77142ad1dcf642fb69df7ff592152ed3))
* create the restriction for admin panel users ([#1741](https://github.com/dnum-mi/referentiel-applications/issues/1741)) ([4a11721](https://github.com/dnum-mi/referentiel-applications/commit/4a117210be957d92f1cf401eff1f16f0ab445284))
* **data-catalog:** implement data tab with backend, DTOs, UI and tests ([2dffd67](https://github.com/dnum-mi/referentiel-applications/commit/2dffd67d121f80bb494236ca8c42d8c7bbfa4a71))


### Bug Fixes

* :bug: fix IQ not being correctly updated ([#1742](https://github.com/dnum-mi/referentiel-applications/issues/1742)) ([74c5a6d](https://github.com/dnum-mi/referentiel-applications/commit/74c5a6d104fb68c6b89a1629ac67e725d2b8b68b))

## [1.77.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.76.0...v1.77.0) (2026-05-22)


### Features

* :sparkles: add user organizations synchronization  from MAIA ([#1734](https://github.com/dnum-mi/referentiel-applications/issues/1734)) ([9ee3b5c](https://github.com/dnum-mi/referentiel-applications/commit/9ee3b5cca50e4752863698c26689f49d8274b191))

## [1.76.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.75.0...v1.76.0) (2026-05-20)


### Features

* :sparkles: replace random data with business data ([9a9246e](https://github.com/dnum-mi/referentiel-applications/commit/9a9246ec47a0c35c780d12e6560c1c91c4d87d7e))
* add filtering for data sourcing name ([#1706](https://github.com/dnum-mi/referentiel-applications/issues/1706)) ([303a13c](https://github.com/dnum-mi/referentiel-applications/commit/303a13ca8c704ec4d78e602050b8580186224a1d))
* add group actors ([#1721](https://github.com/dnum-mi/referentiel-applications/issues/1721)) ([28b3282](https://github.com/dnum-mi/referentiel-applications/commit/28b3282b44e80375859e11c12c4083e2b1b80339))
* add quality summary for quality tabs ([#1717](https://github.com/dnum-mi/referentiel-applications/issues/1717)) ([846efe7](https://github.com/dnum-mi/referentiel-applications/commit/846efe7ab6b5307b181e303a8036f139de4901b3))


### Bug Fixes

* :bug: add RGPD compliance filter ([#1697](https://github.com/dnum-mi/referentiel-applications/issues/1697)) ([68be78f](https://github.com/dnum-mi/referentiel-applications/commit/68be78f49313e87abab4b4a00181b3738310fe3b))
* :bug: update priorityRestart  to be nullable in DTO and Swagger documentation ([#1727](https://github.com/dnum-mi/referentiel-applications/issues/1727)) ([932f005](https://github.com/dnum-mi/referentiel-applications/commit/932f005192324fd69a3e6fa9063e512680b5086b))
* add application id to checker permission in update application service ([#1710](https://github.com/dnum-mi/referentiel-applications/issues/1710)) ([500e1d2](https://github.com/dnum-mi/referentiel-applications/commit/500e1d2d5f02a3e7089db342eaa87aa1df10bcfd))
* add trace for rgaa into metadata ([#1720](https://github.com/dnum-mi/referentiel-applications/issues/1720)) ([e653da8](https://github.com/dnum-mi/referentiel-applications/commit/e653da8b29a07e8fa7ebb286a22cd88328a59aca))
* add unique constraint for log user connexion by day by user ([#1714](https://github.com/dnum-mi/referentiel-applications/issues/1714)) ([1ce8ffc](https://github.com/dnum-mi/referentiel-applications/commit/1ce8ffc0cab95675d0fa0e60bf5e8e4c7ace1681))

## [1.75.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.74.0...v1.75.0) (2026-04-30)


### Features

* affichage optionnel time search ([#1687](https://github.com/dnum-mi/referentiel-applications/issues/1687)) ([06ac4a3](https://github.com/dnum-mi/referentiel-applications/commit/06ac4a391c394446fac3a4ffde5e1d9bfab0984a))


### Bug Fixes

* :bug: move eco index position ([131a9a6](https://github.com/dnum-mi/referentiel-applications/commit/131a9a62b68328a2af6cbd6f8a423aa25626f118))
* :bug: move eco index position and delete useless button ([c06f577](https://github.com/dnum-mi/referentiel-applications/commit/c06f5770b065170edbf5cd45567719b27676d938))
* update logo for centralisation tile on homepage ([#1692](https://github.com/dnum-mi/referentiel-applications/issues/1692)) ([b0f58c6](https://github.com/dnum-mi/referentiel-applications/commit/b0f58c6d20e0c3d29639bc1e1362816df08489ec))

## [1.74.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.73.1...v1.74.0) (2026-04-29)


### Features

* :lipstick: update refapp logo ([#1689](https://github.com/dnum-mi/referentiel-applications/issues/1689)) ([312ead5](https://github.com/dnum-mi/referentiel-applications/commit/312ead51e1e6db7adf1f33d9ecf9ec60f66139bb))
* :sparkles: add mulitple rgaa compliances ([#1684](https://github.com/dnum-mi/referentiel-applications/issues/1684)) ([37167a4](https://github.com/dnum-mi/referentiel-applications/commit/37167a4f301d020e18dc1579eb542ad60b8278e5))


### Bug Fixes

* add permissions application when using userstore ([#1691](https://github.com/dnum-mi/referentiel-applications/issues/1691)) ([50559f6](https://github.com/dnum-mi/referentiel-applications/commit/50559f6b448a927407bb150ad0808d324d3a8600))

## [1.73.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.73.0...v1.73.1) (2026-04-28)


### Bug Fixes

* :bug: update API method for fetching technical debt info ([#1685](https://github.com/dnum-mi/referentiel-applications/issues/1685)) ([d1c3fe7](https://github.com/dnum-mi/referentiel-applications/commit/d1c3fe73404ef69b3ab75b488bd679d98e3a480d))

## [1.73.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.72.0...v1.73.0) (2026-04-27)


### Features

* :sparkles: add "My Applications" filter for quick access ([d7b6636](https://github.com/dnum-mi/referentiel-applications/commit/d7b66368538326cb24f64c5fd1dd2f32023fe3ef))
* :sparkles: add copy-to-clipboard button for application URL ([e2f1859](https://github.com/dnum-mi/referentiel-applications/commit/e2f18590ee071eaef4da0c9f5789478e861a09d4))
* :sparkles: add dataSource table, fakers and endpoints ([f880723](https://github.com/dnum-mi/referentiel-applications/commit/f880723010c8aff3c89d75b8ce0d29e7590f62b5))
* :sparkles: add the status version ([2ca8ed2](https://github.com/dnum-mi/referentiel-applications/commit/2ca8ed231ed150b7c7f7750e885f83508e35124b))
* historic for mdit ([#1671](https://github.com/dnum-mi/referentiel-applications/issues/1671)) ([43f82b6](https://github.com/dnum-mi/referentiel-applications/commit/43f82b69897bdbe66089672dba674e8c4484f926))


### Bug Fixes

* delete link in notice in app.vue ([8278afd](https://github.com/dnum-mi/referentiel-applications/commit/8278afd3d81ec6443ba528298461869d45cb7de1))
* organization permissions guard ([#1674](https://github.com/dnum-mi/referentiel-applications/issues/1674)) ([e0489b6](https://github.com/dnum-mi/referentiel-applications/commit/e0489b64e82898aece1640ba9ba6a4d45c1d4584))
* rename 'signalant' to 'notifier' in report filters and service ([#1683](https://github.com/dnum-mi/referentiel-applications/issues/1683)) ([3c39889](https://github.com/dnum-mi/referentiel-applications/commit/3c39889d105e32272f5e7ca220ab46a01e6f48b9))
* tab report show the same data and set limit max for page size ([#1678](https://github.com/dnum-mi/referentiel-applications/issues/1678)) ([04f42a6](https://github.com/dnum-mi/referentiel-applications/commit/04f42a611167e97c07482583a3407604a81c0298))
* use vue matomo instead custom plugin ([#1672](https://github.com/dnum-mi/referentiel-applications/issues/1672)) ([40e7bc7](https://github.com/dnum-mi/referentiel-applications/commit/40e7bc74d717626e94d38c5220654138d3367397))
* use watcher for start and end date in iqchart ([#1682](https://github.com/dnum-mi/referentiel-applications/issues/1682)) ([530f87d](https://github.com/dnum-mi/referentiel-applications/commit/530f87debd51d4bfd78f9d4caebf279a43eaa1f7))

## [1.72.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.71.0...v1.72.0) (2026-04-15)


### Features

* :sparkles: add eco index calculation feature ([#1604](https://github.com/dnum-mi/referentiel-applications/issues/1604)) ([24817d2](https://github.com/dnum-mi/referentiel-applications/commit/24817d23e3b2ac1b07c957fc8f08bfbfcee924f5))
* centralize log to log service ([#1656](https://github.com/dnum-mi/referentiel-applications/issues/1656)) ([32a1152](https://github.com/dnum-mi/referentiel-applications/commit/32a115204aad0e4072d104405d586b287723fee5))


### Bug Fixes

* :lipstick: fix UI labels and wording ([55a5218](https://github.com/dnum-mi/referentiel-applications/commit/55a521882d3af5a4f1cfd02d16c922c07c98e3ae))
* :lipstick: UI buttons and label fixes ([aaa7bbf](https://github.com/dnum-mi/referentiel-applications/commit/aaa7bbfecacdd347255cac816615818eef629e73))
* add the correct permissions for application form editing ([#1657](https://github.com/dnum-mi/referentiel-applications/issues/1657)) ([520bb1b](https://github.com/dnum-mi/referentiel-applications/commit/520bb1b53da5a2692e6534de49f859d36c0782c1))

## [1.71.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.70.0...v1.71.0) (2026-04-13)


### Features

* add mdit permissions and add app list by default for user ([#1649](https://github.com/dnum-mi/referentiel-applications/issues/1649)) ([f96ba62](https://github.com/dnum-mi/referentiel-applications/commit/f96ba62d972c582bf6671b1e5e121258a53547b0))
* remove organization closure ([#1651](https://github.com/dnum-mi/referentiel-applications/issues/1651)) ([ce014a2](https://github.com/dnum-mi/referentiel-applications/commit/ce014a2a7a776b61e63138438d15b7bc5c0135b5))


### Bug Fixes

* add relation on log user ([#1647](https://github.com/dnum-mi/referentiel-applications/issues/1647)) ([f932e24](https://github.com/dnum-mi/referentiel-applications/commit/f932e24aefa71388b999f7f8e90d679294af03c7))
* transform input value to number for pdma and dima duration in form ([#1645](https://github.com/dnum-mi/referentiel-applications/issues/1645)) ([9c35933](https://github.com/dnum-mi/referentiel-applications/commit/9c35933493f057acb561c9dd4e8b30db909fd388))
* use auto for tabs heigh in dsfrTabs ([#1650](https://github.com/dnum-mi/referentiel-applications/issues/1650)) ([8f14fe5](https://github.com/dnum-mi/referentiel-applications/commit/8f14fe582ac0c3096022daf20670dfb14682e0ec))

## [1.70.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.69.0...v1.70.0) (2026-04-08)


### Features

* add log for user ([#1641](https://github.com/dnum-mi/referentiel-applications/issues/1641)) ([cfd0639](https://github.com/dnum-mi/referentiel-applications/commit/cfd06395aa1fcedf1b9f252240208a6e0c0df153))


### Bug Fixes

* add tilde for axios packages ([#1638](https://github.com/dnum-mi/referentiel-applications/issues/1638)) ([7ae2451](https://github.com/dnum-mi/referentiel-applications/commit/7ae2451fd8327698edf9bcb69d9ca2c45e9e9b95))

## [1.69.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.68.2...v1.69.0) (2026-04-02)


### Features

* refacto droits adminLevel capabilities ([#1612](https://github.com/dnum-mi/referentiel-applications/issues/1612)) ([05579e3](https://github.com/dnum-mi/referentiel-applications/commit/05579e357684d053ecbc4384eac742d8d91cedd6))


### Bug Fixes

* update base email template ([#1635](https://github.com/dnum-mi/referentiel-applications/issues/1635)) ([dfcd088](https://github.com/dnum-mi/referentiel-applications/commit/dfcd088b9f291a4cb9984348c90f3857cf53273f))

## [1.68.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.68.1...v1.68.2) (2026-03-27)


### Bug Fixes

* conformity date ([#1629](https://github.com/dnum-mi/referentiel-applications/issues/1629)) ([0311a5f](https://github.com/dnum-mi/referentiel-applications/commit/0311a5fe6f411fe818a89291c95237e3b0a5fd61))

## [1.68.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.68.0...v1.68.1) (2026-03-27)


### Bug Fixes

* add tabs heigh auto for Dsfr Tabs ([#1627](https://github.com/dnum-mi/referentiel-applications/issues/1627)) ([2aed712](https://github.com/dnum-mi/referentiel-applications/commit/2aed7121c517c3e6833a5d083334a9188a022900))
* update query build for organization ([#1621](https://github.com/dnum-mi/referentiel-applications/issues/1621)) ([51dbc36](https://github.com/dnum-mi/referentiel-applications/commit/51dbc367d3035425e4d54825e72c4ce85ffd8d74))

## [1.68.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.67.0...v1.68.0) (2026-03-24)


### Features

* add filter for service mediation ([#1605](https://github.com/dnum-mi/referentiel-applications/issues/1605)) ([066a7b5](https://github.com/dnum-mi/referentiel-applications/commit/066a7b586feac0c6c95066652d3331fe280f2427))
* add mediation service in relation apps ([#1593](https://github.com/dnum-mi/referentiel-applications/issues/1593)) ([1057122](https://github.com/dnum-mi/referentiel-applications/commit/105712228b996000b17c2106b62476733e24b8a5))
* update home page to remove icon and update description ([#1601](https://github.com/dnum-mi/referentiel-applications/issues/1601)) ([1062f48](https://github.com/dnum-mi/referentiel-applications/commit/1062f48fc0b228cf7e68a6d55b08e306de32002a))


### Bug Fixes

* :bug: update chart title to remove unnecessary text ([#1600](https://github.com/dnum-mi/referentiel-applications/issues/1600)) ([f74f6df](https://github.com/dnum-mi/referentiel-applications/commit/f74f6df6e0f0171478b6b40ca9c60707edace94f))
* :wrench: update backend config to make env label work ([#1598](https://github.com/dnum-mi/referentiel-applications/issues/1598)) ([2be2a59](https://github.com/dnum-mi/referentiel-applications/commit/2be2a5925c57f1231f416eab8e98299f2178c50f))
* remove hosting badge when no value ([#1608](https://github.com/dnum-mi/referentiel-applications/issues/1608)) ([3a2c4d4](https://github.com/dnum-mi/referentiel-applications/commit/3a2c4d49b66f002a01889c37efee032d3d22ea05))

## [1.67.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.66.0...v1.67.0) (2026-03-18)


### Features

* :sparkles: add export metadata type ([839bf6c](https://github.com/dnum-mi/referentiel-applications/commit/839bf6c822ff1b86c41f9b664c04faab60e64613))
* :sparkles: add table éco energy ([73a3e28](https://github.com/dnum-mi/referentiel-applications/commit/73a3e2885f9460ba3028b1f0cb0aa6c608af5fa8))
* :sparkles: add type main_service for links tab ([270adbe](https://github.com/dnum-mi/referentiel-applications/commit/270adbe9fec16a7d893c56f7f6c64b7f25ee782a))
* add direction metier into columns and move filter to actor filter ([#1573](https://github.com/dnum-mi/referentiel-applications/issues/1573)) ([6b36d5a](https://github.com/dnum-mi/referentiel-applications/commit/6b36d5a3f68d56656b416ceb9532cf2e293bd79a))
* add hosting active inactive mode ([#1590](https://github.com/dnum-mi/referentiel-applications/issues/1590)) ([d7e2fc8](https://github.com/dnum-mi/referentiel-applications/commit/d7e2fc860c3dbae99e814034ec5f87529bfa062e))
* add pagination on organization ([#1569](https://github.com/dnum-mi/referentiel-applications/issues/1569)) ([d66d1a6](https://github.com/dnum-mi/referentiel-applications/commit/d66d1a6c27094b4ffd11fddabc0a74a9e75a7132))
* typing improvement pagingation type in swagger ([#1576](https://github.com/dnum-mi/referentiel-applications/issues/1576)) ([11179c7](https://github.com/dnum-mi/referentiel-applications/commit/11179c703fd705d7bc7d2424ce2a4626bc00aa18))


### Bug Fixes

* :bug: add helmet ([0ddc0c7](https://github.com/dnum-mi/referentiel-applications/commit/0ddc0c7abc8163d851e13b260f5ea8db6b2428d3))
* :bug: fix technical debt value display in applications list ([#1589](https://github.com/dnum-mi/referentiel-applications/issues/1589)) ([d918318](https://github.com/dnum-mi/referentiel-applications/commit/d918318329612b15ed33b26760a662b6e3207afa))
* add search by email for report ([#1570](https://github.com/dnum-mi/referentiel-applications/issues/1570)) ([c2e1ceb](https://github.com/dnum-mi/referentiel-applications/commit/c2e1ceb7027d31a04153da967b930261376c4b55))

## [1.66.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.65.0...v1.66.0) (2026-03-12)


### Features

* :sparkles: add automatic validation reminder cron service ([4caed5d](https://github.com/dnum-mi/referentiel-applications/commit/4caed5d55e26f8073dcd67ec9d102ac42600c7cc))
* :sparkles: add label sources tab for management ([6111104](https://github.com/dnum-mi/referentiel-applications/commit/611110447041bce0cff85cc620b98000c907e6a0))
* :sparkles: add technicalDebt columns to application table ([#1539](https://github.com/dnum-mi/referentiel-applications/issues/1539)) ([11261f4](https://github.com/dnum-mi/referentiel-applications/commit/11261f4d7af43db78b47f969c24250699ec29f2e))
* add char min before making search api call ([#1558](https://github.com/dnum-mi/referentiel-applications/issues/1558)) ([9b0d4f0](https://github.com/dnum-mi/referentiel-applications/commit/9b0d4f0976dde5a2b97dea6a654b5f2f642e08b4))
* add debounce on all filter input in application filter composant and remove useless debt call api on applications page ([#1559](https://github.com/dnum-mi/referentiel-applications/issues/1559)) ([5a56ffe](https://github.com/dnum-mi/referentiel-applications/commit/5a56ffe3eb65012992a71e64922cb56029bf9a48))
* add stress seed ([#1541](https://github.com/dnum-mi/referentiel-applications/issues/1541)) ([5d6390d](https://github.com/dnum-mi/referentiel-applications/commit/5d6390dffc19c5796197122deace20467ceb9400))
* add TimePage view and update routing for time diagram ([#1525](https://github.com/dnum-mi/referentiel-applications/issues/1525)) ([1a453af](https://github.com/dnum-mi/referentiel-applications/commit/1a453afa98651fe436d91a208bd450f64ec1d21a))
* lazy loading admin panel page application ([#1556](https://github.com/dnum-mi/referentiel-applications/issues/1556)) ([47bba30](https://github.com/dnum-mi/referentiel-applications/commit/47bba30dd2b7e1a5d6c293932752f9d2b3418af1))
* use VueUse instead of custom function ([#1564](https://github.com/dnum-mi/referentiel-applications/issues/1564)) ([46a2ca8](https://github.com/dnum-mi/referentiel-applications/commit/46a2ca8d01bc7a0e5d8101945bbf33d68c23aee1))


### Bug Fixes

* :bug: fix homologation end date display and improve the preview function ([025f100](https://github.com/dnum-mi/referentiel-applications/commit/025f100635b9d5314b2166d7048f50fd4656b494))
* :bug: fix-wording-in-front ([ae43254](https://github.com/dnum-mi/referentiel-applications/commit/ae43254c5495986039b204a18ccd2716b68ad0cc))
* add clickouside for header list search ([#1553](https://github.com/dnum-mi/referentiel-applications/issues/1553)) ([99712d9](https://github.com/dnum-mi/referentiel-applications/commit/99712d9deaa80289956859b6851de07b7addd496))
* **admin:** :bug: non admin redirection with admin level ([#1554](https://github.com/dnum-mi/referentiel-applications/issues/1554)) ([7ade5cd](https://github.com/dnum-mi/referentiel-applications/commit/7ade5cd7079873de939cba646eb7e6805c1fa4e1))
* remove unnecessary transition styles from AppToaster component ([#1544](https://github.com/dnum-mi/referentiel-applications/issues/1544)) ([057872c](https://github.com/dnum-mi/referentiel-applications/commit/057872cb34cac474a75bb3fc308775576bbf3535))
* update export functionality to include missing hosting and actors fields ([#1560](https://github.com/dnum-mi/referentiel-applications/issues/1560)) ([26cf7ea](https://github.com/dnum-mi/referentiel-applications/commit/26cf7ea96c77d44fe89dcd2af12f621cfe756619))
* update quadrant labels for clarity ([#1527](https://github.com/dnum-mi/referentiel-applications/issues/1527)) ([735a0c2](https://github.com/dnum-mi/referentiel-applications/commit/735a0c206bb8338ab7853936eefeb03261334de2))

## [1.65.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.64.1...v1.65.0) (2026-03-02)


### Features

* cacher les relations metier graph en mobile ([#1520](https://github.com/dnum-mi/referentiel-applications/issues/1520)) ([0b5cbe2](https://github.com/dnum-mi/referentiel-applications/commit/0b5cbe285fc87e5ecfa8fd1b254746e0b752f64e))
* direction de metier principale add relation and fix label ([#1524](https://github.com/dnum-mi/referentiel-applications/issues/1524)) ([2982e9c](https://github.com/dnum-mi/referentiel-applications/commit/2982e9c3cf1c7406dba966ba1ccc40980558225e))


### Bug Fixes

* correct French spelling mistakes in use-dictionary.ts ([d6b37a5](https://github.com/dnum-mi/referentiel-applications/commit/d6b37a5425f40f2f284413ae36c6f11d0f92006c))

## [1.64.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.64.0...v1.64.1) (2026-02-25)


### Bug Fixes

* use relation filter is part of to neutral ([#1514](https://github.com/dnum-mi/referentiel-applications/issues/1514)) ([4f8c665](https://github.com/dnum-mi/referentiel-applications/commit/4f8c6652d4ac9a7413c6f2237cf5a235a96928d2))

## [1.64.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.63.0...v1.64.0) (2026-02-25)


### Features

* add use_sso_of relation app ([#1505](https://github.com/dnum-mi/referentiel-applications/issues/1505)) ([c99233d](https://github.com/dnum-mi/referentiel-applications/commit/c99233d641b6f5b814d439c5d3ef45762006e345))


### Bug Fixes

* :bug: fix homologation filter showing only approved applications ([3665117](https://github.com/dnum-mi/referentiel-applications/commit/366511717c50d1957f13320686b3f6afbf73ea73))
* remove response style data from debt chart ([#1511](https://github.com/dnum-mi/referentiel-applications/issues/1511)) ([e695299](https://github.com/dnum-mi/referentiel-applications/commit/e69529918051df2e47cf96a33398d3571adcf3dc))

## [1.63.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.62.0...v1.63.0) (2026-02-24)


### Features

* :sparkles: Add homologation end date column to applications table ([c598f36](https://github.com/dnum-mi/referentiel-applications/commit/c598f367155bc1fe182457c0e2276fdcf8954a4b))
* :sparkles: move reports to dedicated tab and enhance application overview ([#1504](https://github.com/dnum-mi/referentiel-applications/issues/1504)) ([08bbce5](https://github.com/dnum-mi/referentiel-applications/commit/08bbce5eff3a798cd17efb4d2f08716b4f50627b))
* add varchar size limits to various database fields ([#1474](https://github.com/dnum-mi/referentiel-applications/issues/1474)) ([5194e9a](https://github.com/dnum-mi/referentiel-applications/commit/5194e9a75987ea1cf3aeb40658bc8a94df3c2233))
* improve chart time and put building step into dedicated builder… ([#1498](https://github.com/dnum-mi/referentiel-applications/issues/1498)) ([b0277b6](https://github.com/dnum-mi/referentiel-applications/commit/b0277b6962589bb47fd13d26dad042165bbfde87))


### Bug Fixes

* add token active limit ([#1478](https://github.com/dnum-mi/referentiel-applications/issues/1478)) ([b740bd8](https://github.com/dnum-mi/referentiel-applications/commit/b740bd866bbea70ba395ccdaaa5b6e848e0b93bd))
* do not refresh app list when user use input search relation ([#1473](https://github.com/dnum-mi/referentiel-applications/issues/1473)) ([14a189b](https://github.com/dnum-mi/referentiel-applications/commit/14a189b3e99a9fba6020e29fce80767a2849a677))
* remove redondant bug title template title format ([#1486](https://github.com/dnum-mi/referentiel-applications/issues/1486)) ([509b9be](https://github.com/dnum-mi/referentiel-applications/commit/509b9be805c37875282101717661d2c97292727d))

## [1.62.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.61.0...v1.62.0) (2026-02-13)


### Features

* :sparkles: add application view tracking ([abfc11c](https://github.com/dnum-mi/referentiel-applications/commit/abfc11ce04d06ad2f3932525fab3920832b68dde))
* :sparkles: implement pagination extension for Prisma service ([9186965](https://github.com/dnum-mi/referentiel-applications/commit/918696567fc474954534159a4d5c3d617e8cdce9))
* :white_check_mark: write playwright e2e test for compliance filter ([7864f31](https://github.com/dnum-mi/referentiel-applications/commit/7864f31a347c627c24123fb8898a04d43522ef1a))
* application filter support name and short name search ([#1461](https://github.com/dnum-mi/referentiel-applications/issues/1461)) ([17e4400](https://github.com/dnum-mi/referentiel-applications/commit/17e44007a00c88d5a640b566203e98c6aff84929))
* create email notification when user update reporting status ([#1428](https://github.com/dnum-mi/referentiel-applications/issues/1428)) ([3cecfc8](https://github.com/dnum-mi/referentiel-applications/commit/3cecfc80e63b59697bf287af081a585fe730f234))
* create prisma query for relation query filtering ([#1453](https://github.com/dnum-mi/referentiel-applications/issues/1453)) ([06fd4e2](https://github.com/dnum-mi/referentiel-applications/commit/06fd4e2c2c26ad7cfbf14f8dfe6b1885c758930f))


### Bug Fixes

* :bug: replace app_url with base_url in application email links ([7b72005](https://github.com/dnum-mi/referentiel-applications/commit/7b720053b1e5ab80cda7c13b501df0fff2885efc))
* :bug: translate enums in metadata descriptions ([5457e16](https://github.com/dnum-mi/referentiel-applications/commit/5457e168fbae3e2d7f3321f3b302b82c523b6d3e))
* :bug: wrong display of email if it was empty ([59b0ce7](https://github.com/dnum-mi/referentiel-applications/commit/59b0ce78743fac64298c7ec287bce93e28117922))
* actor update email show actor type ([#1471](https://github.com/dnum-mi/referentiel-applications/issues/1471)) ([46c8c5c](https://github.com/dnum-mi/referentiel-applications/commit/46c8c5c514d427e6ec6c964d2a422fd326147b49))
* add actor organization name if user has no email ([#1465](https://github.com/dnum-mi/referentiel-applications/issues/1465)) ([323c25c](https://github.com/dnum-mi/referentiel-applications/commit/323c25c2f6064b2e1d451718349396dad72bb325))
* add adminLevel into token ([#1467](https://github.com/dnum-mi/referentiel-applications/issues/1467)) ([a0bb185](https://github.com/dnum-mi/referentiel-applications/commit/a0bb185f797abcf4bf0c066c0a7d40a74fe47615))
* remove compiler macro vue import ([8f27084](https://github.com/dnum-mi/referentiel-applications/commit/8f270847b2e3c54c43de45fad71e3db3939226ea))
* when update anomaly from application, email is now send ([#1469](https://github.com/dnum-mi/referentiel-applications/issues/1469)) ([51da421](https://github.com/dnum-mi/referentiel-applications/commit/51da4214546d9933d376e2c3c15f5a2e9b6e9983))


### Performance Improvements

* :fire: removing keycloakId and remove keycloak from tests ([a75be2d](https://github.com/dnum-mi/referentiel-applications/commit/a75be2d1802790e0fb7edfeaef7562504c06dc9b))

## [1.61.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.60.0...v1.61.0) (2026-02-02)


### Features

* :bricks: change from keycloak-js to oidc-client-ts for Passage2 compatibility ([5ade3e4](https://github.com/dnum-mi/referentiel-applications/commit/5ade3e4af45971a8e14fa669075ade67eb3ee5db))
* :sparkles: Show average IQ on app search page ([4848605](https://github.com/dnum-mi/referentiel-applications/commit/48486050179dfe5a96ab97660a73060449955242))

## [1.60.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.59.1...v1.60.0) (2026-01-26)


### Features

* :sparkles: add custom column in application list ([0f1afa6](https://github.com/dnum-mi/referentiel-applications/commit/0f1afa617f8805a6fed4d3036df34f1f4d3b624b))
* :sparkles: update technical maturity fields to use Decimal type and enhance related components ([00e8f46](https://github.com/dnum-mi/referentiel-applications/commit/00e8f46dd6a2fdcecfbdc5c8c637888aff09120e))

## [1.59.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.59.0...v1.59.1) (2026-01-21)


### Bug Fixes

* :bug: fix hosting not displayed in apps search ([06f9e4e](https://github.com/dnum-mi/referentiel-applications/commit/06f9e4e699b138d132c53eec3c8a3633e5bb0cdb))
* :bug: fix technical debt chart ([a9119a0](https://github.com/dnum-mi/referentiel-applications/commit/a9119a0f823a42901fbfe7ffa8e90c5df1d7a140))

## [1.59.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.58.1...v1.59.0) (2026-01-19)


### Features

* :sparkles: add application with "a valider" status ([1a15314](https://github.com/dnum-mi/referentiel-applications/commit/1a1531445a99017c2819040ec36e147f4a8ae6b0))
* :sparkles: add custom column in table applications ([8b004a7](https://github.com/dnum-mi/referentiel-applications/commit/8b004a7c2b527803a528be64ad131aeb475149fd))
* :sparkles: adding filter to search for missing moe, moa and hosting ([a73dffa](https://github.com/dnum-mi/referentiel-applications/commit/a73dffa5772b37c760ec11844c3acb5da7bc054d))
* add technical debt information and chart to application search ([ac061dc](https://github.com/dnum-mi/referentiel-applications/commit/ac061dc16cc145b11df9869ce2a42bc31ed2c952))

## [1.58.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.58.0...v1.58.1) (2026-01-13)


### Bug Fixes

* update validation and search filters for application status handling ([73063df](https://github.com/dnum-mi/referentiel-applications/commit/73063dff1a38373970d1184bfe8c91a22191f60b))

## [1.58.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.57.0...v1.58.0) (2026-01-09)


### Features

* :sparkles: add application status table in global export ([4da997d](https://github.com/dnum-mi/referentiel-applications/commit/4da997d21400c8acd7456055326fd35d78db63ab))
* :technologist: add seed script following prisma convention ([d1b7c35](https://github.com/dnum-mi/referentiel-applications/commit/d1b7c3565b90715ce6d480ccf89c844a754c7d4a))


### Bug Fixes

* :bug: improve application search filters and serialization handling ([c73562c](https://github.com/dnum-mi/referentiel-applications/commit/c73562c81f76476b958387a4a645d7eacdf54e55))
* :bug: update application type  from "Service cœur" to "Service socle" ([7b02b86](https://github.com/dnum-mi/referentiel-applications/commit/7b02b8644486445c1b97a08e6e130351f93f6418))

## [1.57.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.56.0...v1.57.0) (2025-12-23)


### Features

* :sparkles: add status for homologation ([e6f909b](https://github.com/dnum-mi/referentiel-applications/commit/e6f909ba66d95830c5a6c96c389011577bdb3a2f))
* :sparkles: add stepper for create application ([7e83f46](https://github.com/dnum-mi/referentiel-applications/commit/7e83f46c29714b0ed0f934c535364e5f9b064543))
* :sparkles: add type for application ([4791c1f](https://github.com/dnum-mi/referentiel-applications/commit/4791c1fca19c7df7bb26957bf88da2c635236cce))


### Bug Fixes

* **search:** :bug: add debounced autocomplete and fix multi-filter requests ([58469fc](https://github.com/dnum-mi/referentiel-applications/commit/58469fc8568505db4a60af0b48af86f313962cb3))

## [1.56.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.55.0...v1.56.0) (2025-12-15)


### Features

* :sparkles: add footer links management in configuration ([824f89b](https://github.com/dnum-mi/referentiel-applications/commit/824f89bee6fbd20c0ea775dca6a0e12093e87e0e))
* :sparkles: add Technical Debt Info management ([ae95ed9](https://github.com/dnum-mi/referentiel-applications/commit/ae95ed969cf482de77e337346ff67dbb9e88b3fb))


### Bug Fixes

* :bug: fix metadata from statuses that weren’t working well ([b99a9aa](https://github.com/dnum-mi/referentiel-applications/commit/b99a9aae737a5a42db31ce5807ef90bbac7684f2))
* :bug: fix-ui-and-deep-relation-in-graph ([9bc6ef2](https://github.com/dnum-mi/referentiel-applications/commit/9bc6ef212dceda1798e817d0183a9f863d4ac0de))

## [1.55.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.54.2...v1.55.0) (2025-12-08)


### Features

* :sparkles: add  follow app and send email ([8859c60](https://github.com/dnum-mi/referentiel-applications/commit/8859c609b5e1b75ea1fc78bc47c7c1ebc52b0a05))
* :sparkles: add "sans statut" checkbox filter to the applications search filter ([d0da566](https://github.com/dnum-mi/referentiel-applications/commit/d0da5667b0e0f8f8b76665ba55b904391f8c3183))
* :sparkles: allow applications search sharing by using url filters ([9de6060](https://github.com/dnum-mi/referentiel-applications/commit/9de60607b1c2e05ce6ab6fc76cea549249688a46))
* :sparkles: show dsfr version in browser console ([c50f5d4](https://github.com/dnum-mi/referentiel-applications/commit/c50f5d4013ebaef79b36bf3c5d10920d45976cf7))

## [1.54.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.54.1...v1.54.2) (2025-12-02)


### Bug Fixes

* :bug: fix send mail ([0593a3d](https://github.com/dnum-mi/referentiel-applications/commit/0593a3d1418461651cc022cf162e434b4472df18))

## [1.54.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.54.0...v1.54.1) (2025-12-02)


### Bug Fixes

* :bug: fix the 404 error when updating an application ([ff06fe6](https://github.com/dnum-mi/referentiel-applications/commit/ff06fe60393ed48204c6edf98e336ad548f152b1))
* :bug: update vue-dsfr to fix footer display and version at build ([fa2583f](https://github.com/dnum-mi/referentiel-applications/commit/fa2583f63ecb48dd578c908e0847343ebf8d5c46))

## [1.54.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.53.0...v1.54.0) (2025-12-01)


### Features

* :lipstick: add notice for answer user ([6b7146d](https://github.com/dnum-mi/referentiel-applications/commit/6b7146d96ecdc5eb60e3c558b55e98e195c19757))
* :sparkles: add answers question ([e317182](https://github.com/dnum-mi/referentiel-applications/commit/e317182971602119596ccbbc59b58895981386e3))
* :sparkles: send email on actor add ([1cac2c7](https://github.com/dnum-mi/referentiel-applications/commit/1cac2c7d6eb8908808e18ea96176dcef422d35a9))


### Bug Fixes

* :bug: add svg title in footer ([44126cf](https://github.com/dnum-mi/referentiel-applications/commit/44126cf7b9a7a730f22f1968fccb4c23b743bb67))
* :bug: add title in footer ([92ed0df](https://github.com/dnum-mi/referentiel-applications/commit/92ed0df6eb79073947b77a8e4db441191707ead1))
* :bug: fix mermaid composables ([d56878a](https://github.com/dnum-mi/referentiel-applications/commit/d56878a0601481fe3ebcba9d59563754b61f3bc4))

## [1.53.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.52.0...v1.53.0) (2025-11-28)


### Features

* :sparkles: add user information and tokens tabs to user profile ([bfb1892](https://github.com/dnum-mi/referentiel-applications/commit/bfb1892e00a7c6582722bebc68fee7e628ae8198))
* :sparkles: mandatory moe and moa on application creation ([62eff4c](https://github.com/dnum-mi/referentiel-applications/commit/62eff4cb85d71df8ecc76babd0a0aadfa106813b))


### Bug Fixes

* :bug: Fix tag search: handle undefined props.tags to prevent includes error ([1b4ab2b](https://github.com/dnum-mi/referentiel-applications/commit/1b4ab2bafe81e870e9f9d0b067845059a59e50c8))

## [1.52.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.51.2...v1.52.0) (2025-11-27)


### Features

* **admin:** :sparkles: add admin tags management tab ([ae2d8b1](https://github.com/dnum-mi/referentiel-applications/commit/ae2d8b13f1d27a77ac4ec73ea65d92aec7e031ee))


### Bug Fixes

* :bug: correct tag creation and editing modal conditions ([b715037](https://github.com/dnum-mi/referentiel-applications/commit/b715037d6d1671495e7af34b1c721f633f59f690))
* :bug: fix search tag query ([ba1ce61](https://github.com/dnum-mi/referentiel-applications/commit/ba1ce614d44b24480459eb578ae91abc7eab07f0))
* :bug: fix wording pdma ([48c0046](https://github.com/dnum-mi/referentiel-applications/commit/48c0046ee525c84e187c133c0404949d588d2565))
* :bug: stop running tests-unit alone on main branch ([d6f3a1d](https://github.com/dnum-mi/referentiel-applications/commit/d6f3a1db669038ffeedbc454dc3084622b87b2be))

## [1.51.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.51.1...v1.51.2) (2025-11-21)


### Bug Fixes

* :bug: refactor version display ([e82f260](https://github.com/dnum-mi/referentiel-applications/commit/e82f260a9397a95626444e9dbd0ff0635e0b48a4))

## [1.51.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.51.0...v1.51.1) (2025-11-18)


### Bug Fixes

* :bug: set initial state of sidebar to open ([326d9d4](https://github.com/dnum-mi/referentiel-applications/commit/326d9d4d44d1e455b3f2e02cbe741d51b9858d7c))

## [1.51.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.50.0...v1.51.0) (2025-11-18)


### Features

* :sparkles: add compliance filter for the applications search ([f3c0f4b](https://github.com/dnum-mi/referentiel-applications/commit/f3c0f4b63de25eafd0c2ce5c8cd7da4bc0c7ed46))
* :sparkles: add coverage report generation step to CI workflow ([856a596](https://github.com/dnum-mi/referentiel-applications/commit/856a596b48966cf26b6e3de348e15a331d5906fd))
* :sparkles: add validation exception filter and integrate it into global error handling ([9d981d0](https://github.com/dnum-mi/referentiel-applications/commit/9d981d0c5864cfee201a6e0cef5de7f9deae14ea))


### Bug Fixes

* :bug: correct environment variable assignment for IMAGE_TAG in CI workflow ([b9b6c50](https://github.com/dnum-mi/referentiel-applications/commit/b9b6c50dae871828d2f66f0ec161c9af25438042))
* :bug: fix metadata description to display tag names instead of objects ([b159c9e](https://github.com/dnum-mi/referentiel-applications/commit/b159c9eb78e877bd98a4d8d482511855606e0ef0))
* :bug: Increase graph depth limit from 10 to 100 for application relations ([2713ea5](https://github.com/dnum-mi/referentiel-applications/commit/2713ea5ffb42382bc094c69cf0b3f182bf51dd39))
* :bug: remove unused header template from ApplicationTableView component ([c8924a4](https://github.com/dnum-mi/referentiel-applications/commit/c8924a415b1a0defb30486dcd1645efc8a74498c))
* :fire: remove application status created at field ([c999647](https://github.com/dnum-mi/referentiel-applications/commit/c9996473b196375248b1bdbaf2ec6fcad92d0b8a))
* :package: update @gouvminint/vue-dsfr dependency to version ^8.10.0 ([c2f0784](https://github.com/dnum-mi/referentiel-applications/commit/c2f0784563faea3b1dc4f74288e274d9c979eb35))
* :recycle: streamline application form handling and remove unused ApplicationInfoForm component ([ff92f6f](https://github.com/dnum-mi/referentiel-applications/commit/ff92f6f5b3c67ea3764c26972734c9f98735c48e))

## [1.50.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.49.0...v1.50.0) (2025-11-06)


### Features

* :sparkles: add relation graph ([fe41f48](https://github.com/dnum-mi/referentiel-applications/commit/fe41f4809ea32a2d779862562cebff9724934968))
* :wheelchair: improve pagination display on application history tab ([f4be035](https://github.com/dnum-mi/referentiel-applications/commit/f4be0352b3d82c44a5b78fc6e528ed6f9ca8fd89))
* **accessibility:** add tooltips to interactive buttons in main components ([abf55be](https://github.com/dnum-mi/referentiel-applications/commit/abf55bef66ba0024e1a199035b82d1f96d1006c7))
* **accessibility:** add tooltips to remaining form and navigation buttons ([7f79588](https://github.com/dnum-mi/referentiel-applications/commit/7f7958838ae332cb15aba64423ab9bd2267910d9))
* **front:** :sparkles: adjust error presentation to use an alert ([a930c1d](https://github.com/dnum-mi/referentiel-applications/commit/a930c1d1c3ae700c88277a49d5b99730214d1ebd))
* implement anomaly notification pagination and update related DTOs ([ebed4ab](https://github.com/dnum-mi/referentiel-applications/commit/ebed4abd9bde1d1ed1a585df65beb2db162b8184))
* **tags:** :sparkles: add tag table and update application tag management ([742cc96](https://github.com/dnum-mi/referentiel-applications/commit/742cc96ef3cbb914bf07212985a9d8072a152b92))


### Bug Fixes

* :bug: add title in link footer ([43320be](https://github.com/dnum-mi/referentiel-applications/commit/43320be52c52bf194f218885afb06cf7290c96d5))
* :bug: fix main navigation adapt based on user authentication ([7248e31](https://github.com/dnum-mi/referentiel-applications/commit/7248e31dd12b345c08106f24bef30d3fc921e04f))
* :bug: fix voice over autocomplete ([487a8e3](https://github.com/dnum-mi/referentiel-applications/commit/487a8e31bebc5697c5392f90b2cc2d3368049ac9))
* :bug: replace the acronyms with their full names ([f28efb9](https://github.com/dnum-mi/referentiel-applications/commit/f28efb94a15c4a18ec49ec85af9ef803f71f9d5e))
* :wheelchair: add hidden label to header search field for accessibility ([7ab48fb](https://github.com/dnum-mi/referentiel-applications/commit/7ab48fb673a3b56b3134ea3adc1521cde78acab3))
* :wheelchair: replace non-dsfr tables with dsfr vue component and correct invalid html structure ([f191d7b](https://github.com/dnum-mi/referentiel-applications/commit/f191d7beb82f752864dedca2d2671aaad76d24a5))
* :wheelchair: update skip link anchors to header, main content and footer id's ([a5e9bbf](https://github.com/dnum-mi/referentiel-applications/commit/a5e9bbf79fd131f859aeac2ed91ea5a56c4eb6a2))
* **accessibility:** make aria-label consistent with title attributes ([0ff8b7b](https://github.com/dnum-mi/referentiel-applications/commit/0ff8b7b5a675cf48d2a3df905c1e2159922b17ad))

## [1.49.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.48.0...v1.49.0) (2025-10-29)


### Features

* :wheelchair: improve metadatas details accessibility in tables ([#1235](https://github.com/dnum-mi/referentiel-applications/issues/1235)) ([aaa5152](https://github.com/dnum-mi/referentiel-applications/commit/aaa51523cae460e06f75e818fce572dd168b80cb))
* update for a mobile responsive ([9235d06](https://github.com/dnum-mi/referentiel-applications/commit/9235d0676009eecd5ea1dd62940b4096523898c3))


### Bug Fixes

* :bug: correct API endpoint name for fetching organizations ([#1240](https://github.com/dnum-mi/referentiel-applications/issues/1240)) ([53cd7d8](https://github.com/dnum-mi/referentiel-applications/commit/53cd7d84a6bc8692952f747b2143ad39766ecd14))

## [1.48.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.47.0...v1.48.0) (2025-10-28)


### Features

* :sparkles: update action labels in metadata page and improve translations ([#1226](https://github.com/dnum-mi/referentiel-applications/issues/1226)) ([58642fe](https://github.com/dnum-mi/referentiel-applications/commit/58642fe9cb182be423a18f7469117a10c3d7d706))
* **front:** :wheelchair: improve keyboard nav and chart reading on quality page ([b1e3c7d](https://github.com/dnum-mi/referentiel-applications/commit/b1e3c7d21888ac87e0ba7a7565b312634ba21885))


### Bug Fixes

* :bug: correct API endpoint names in hosting and metadata stores ([#1230](https://github.com/dnum-mi/referentiel-applications/issues/1230)) ([e28e120](https://github.com/dnum-mi/referentiel-applications/commit/e28e1200433908c1bd668240e8d616d0a3d46d54))
* **front:** :bug: fix: validate required fields on application form submit ([c7b39e1](https://github.com/dnum-mi/referentiel-applications/commit/c7b39e17bd578dc3d2d02bd298b850b57711f1b0))

## [1.47.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.46.2...v1.47.0) (2025-10-24)


### Features

* :sparkles: add applications statutes history ([#1206](https://github.com/dnum-mi/referentiel-applications/issues/1206)) ([f73d532](https://github.com/dnum-mi/referentiel-applications/commit/f73d532d80bd6787868acd9dc6c15823a6723f85))
* :sparkles: add CreateGlobalAnomalyNotification capability and update related permissions ([72e0111](https://github.com/dnum-mi/referentiel-applications/commit/72e0111c2ddf2c51fac5c32f0e475045f9013064))
* :sparkles: add nonActorPermissions configuration ([a97ecab](https://github.com/dnum-mi/referentiel-applications/commit/a97ecab5e19c7e60fa17c7af25c1de537b68e2c2))
* :sparkles: add user capabilities and permissions management ([efc2c6a](https://github.com/dnum-mi/referentiel-applications/commit/efc2c6a0af4492bc1308e71c545f3f2469bb5424))
* :sparkles: add writePriorityRestart permission and update related functionality ([69d3308](https://github.com/dnum-mi/referentiel-applications/commit/69d3308742e3740ad0b139056bff59e856cb6c3a))
* **cmd:** :sparkles: implement user management CLI with create user functionality ([4f5e5fb](https://github.com/dnum-mi/referentiel-applications/commit/4f5e5fb91906506d292eadbf1c3d60e3134a91d2))
* **front:** :lipstick: add sitemap ([4389153](https://github.com/dnum-mi/referentiel-applications/commit/4389153e0a5c9a6c6cf71648e365dcd1c22fc842))
* **front:** :wheelchair: add accessibility to the buttons, canvas and add a table ([c7325c3](https://github.com/dnum-mi/referentiel-applications/commit/c7325c3422b283cd70315796e93110eb289667ad))


### Bug Fixes

* :label: fix paginated types and swagger by using child paginated classes ([#1193](https://github.com/dnum-mi/referentiel-applications/issues/1193)) ([8add699](https://github.com/dnum-mi/referentiel-applications/commit/8add699f5e2c366d0c59775d77c3b339a7b76b45))

## [1.46.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.46.1...v1.46.2) (2025-10-16)


### Bug Fixes

* :bug: update label in updateApplication ([f7af447](https://github.com/dnum-mi/referentiel-applications/commit/f7af447bebe643e4231a5d6d28c4e86db9ff68a5))
* :recycle: fix organizations usedOnly filter and add debounce ([#1195](https://github.com/dnum-mi/referentiel-applications/issues/1195)) ([038c818](https://github.com/dnum-mi/referentiel-applications/commit/038c818997e314c4e714bb174400c2cb84ac4d8d))

## [1.46.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.46.0...v1.46.1) (2025-10-15)


### Bug Fixes

* :bug: enhance validation for email field and update organization filter to use array type ([#1185](https://github.com/dnum-mi/referentiel-applications/issues/1185)) ([9fde79e](https://github.com/dnum-mi/referentiel-applications/commit/9fde79e26aecc27647eb48a63cde159c117f4f6a))
* **compliance:** add conflict response for existing compliance creation ([#1188](https://github.com/dnum-mi/referentiel-applications/issues/1188)) ([9b254a3](https://github.com/dnum-mi/referentiel-applications/commit/9b254a361053a3b135dc41942913a47630f5a521))
* **front:** :bug: delete-label-dead ([#1187](https://github.com/dnum-mi/referentiel-applications/issues/1187)) ([1b4d715](https://github.com/dnum-mi/referentiel-applications/commit/1b4d71523531c323cfeb06b3a7d26addbc41f807))
* **front:** :bug: update organization display in admin users table ([#1183](https://github.com/dnum-mi/referentiel-applications/issues/1183)) ([87baed6](https://github.com/dnum-mi/referentiel-applications/commit/87baed681c21bec39259c6150ceadc4baa393a7a))

## [1.46.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.45.1...v1.46.0) (2025-10-13)


### Features

* :wheelchair: accessibility chart app iq ([d9ee03e](https://github.com/dnum-mi/referentiel-applications/commit/d9ee03ee1f47d9a6c8f0ce1e2fc405dde4270b0e))
* **front:** :sparkles: add functional email contact in footer ([267a50d](https://github.com/dnum-mi/referentiel-applications/commit/267a50d4bf5ea50613768079aa8212744fd7a449))


### Bug Fixes

* :bug: fix application hosting edition ([#1178](https://github.com/dnum-mi/referentiel-applications/issues/1178)) ([80c5ac3](https://github.com/dnum-mi/referentiel-applications/commit/80c5ac36a867df9e20239cad870285fa4f8b5a79))
* **front:** :bug: fix hover and click area for multi-line autocomplete options ([d13d646](https://github.com/dnum-mi/referentiel-applications/commit/d13d6467727fe9feeb3fb6a8fdab4a84789a1301))

## [1.45.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.45.0...v1.45.1) (2025-10-10)


### Bug Fixes

* :bug: fix excel export limit to pageSize ([#1171](https://github.com/dnum-mi/referentiel-applications/issues/1171)) ([b060177](https://github.com/dnum-mi/referentiel-applications/commit/b060177c7344f5d22526e10f92e040084e4dd522))

## [1.45.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.44.0...v1.45.0) (2025-10-09)


### Features

* :sparkles: add usedOnly filter on organizations ([#1155](https://github.com/dnum-mi/referentiel-applications/issues/1155)) ([745e73c](https://github.com/dnum-mi/referentiel-applications/commit/745e73c9823b25c46d22d0eb6348e6efe7c46610))


### Bug Fixes

* :bug: fix application links edition ([#1157](https://github.com/dnum-mi/referentiel-applications/issues/1157)) ([c4a6bb0](https://github.com/dnum-mi/referentiel-applications/commit/c4a6bb010871bad3bdfd41dff35b30220dd9876f))
* :bug: fix metadata page sorting ([#1156](https://github.com/dnum-mi/referentiel-applications/issues/1156)) ([b0cb800](https://github.com/dnum-mi/referentiel-applications/commit/b0cb800d509f4a48918c79b2a4f61f08c531adf4))
* **front:** :bug: add tooltip for links and buttons ([a2aa4d4](https://github.com/dnum-mi/referentiel-applications/commit/a2aa4d40c0f6142b235f0eb52115a16cf97fa737))
* **front:** :bug: align button in header application list ([#1149](https://github.com/dnum-mi/referentiel-applications/issues/1149)) ([5db1dd0](https://github.com/dnum-mi/referentiel-applications/commit/5db1dd04ef4413a044872b9671d6c369bedee8c8))
* **front:** :bug: disable global signalement for level 0 ([487af59](https://github.com/dnum-mi/referentiel-applications/commit/487af59f0aebb1f537ca0691e3b9501bbeb714d2))
* **front:** :bug: implement debounced search in AccessibleAutocomplete component ([#1151](https://github.com/dnum-mi/referentiel-applications/issues/1151)) ([9faa76a](https://github.com/dnum-mi/referentiel-applications/commit/9faa76adba934b6990d82da3b6fa1648f84ae7b3))

## [1.44.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.43.0...v1.44.0) (2025-10-06)


### Features

* :sparkles: add actorEmail filter to application search ([#1144](https://github.com/dnum-mi/referentiel-applications/issues/1144)) ([0a8b8e8](https://github.com/dnum-mi/referentiel-applications/commit/0a8b8e854566397faf51c0b5408bc1145f03baaf))
* :sparkles: add description columns to Organization ([b9c2a55](https://github.com/dnum-mi/referentiel-applications/commit/b9c2a553b79a0f7299fe33e0fbeb0cb22103df05))
* :sparkles: add user organization management and refactor organization selection ([#1130](https://github.com/dnum-mi/referentiel-applications/issues/1130)) ([ea8253e](https://github.com/dnum-mi/referentiel-applications/commit/ea8253e62903ed827c8df46ae5fbb65bb794df43))
* :sparkles: rename constraints and indexes for improved consistency in database schema ([#1145](https://github.com/dnum-mi/referentiel-applications/issues/1145)) ([c4e3304](https://github.com/dnum-mi/referentiel-applications/commit/c4e330485f9d10e9fca520c96b146bdc9f5dfceb))
* **front:** :sparkles: add SkipLinks ([75d1f2d](https://github.com/dnum-mi/referentiel-applications/commit/75d1f2da654645d88a36a4bcc40688a19b8181f1))


### Bug Fixes

* :bug: fix search query params saved in the store ([#1141](https://github.com/dnum-mi/referentiel-applications/issues/1141)) ([6d042f0](https://github.com/dnum-mi/referentiel-applications/commit/6d042f069b9e3b2cc6b1fc213f401b905f2b0c2d))

## [1.43.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.42.0...v1.43.0) (2025-10-02)


### Features

* :sparkles: Rework that add edit for report as admin, add search and sort in AllReport page ([1a98413](https://github.com/dnum-mi/referentiel-applications/commit/1a9841359516ab032b4cd3e849f9a5f4e143d50b))
* add individual hosting filters for improved application search ([#1120](https://github.com/dnum-mi/referentiel-applications/issues/1120)) ([05876a1](https://github.com/dnum-mi/referentiel-applications/commit/05876a1bdeecbd970bbab7842d488988a1195a53))
* add sorting option by organization label in metadata retrieval ([#1124](https://github.com/dnum-mi/referentiel-applications/issues/1124)) ([7022196](https://github.com/dnum-mi/referentiel-applications/commit/70221962e9e46756f38f236297359b2d28e47164))
* enhance sorting functionality in metadata table with updated filters ([#1126](https://github.com/dnum-mi/referentiel-applications/issues/1126)) ([d1e0e5e](https://github.com/dnum-mi/referentiel-applications/commit/d1e0e5efeefeb0c99f939ed27f0d2c09dce66dc1))
* **front:** :wheelchair: indicate column sort state with aria-sort on table headers ([518d6a3](https://github.com/dnum-mi/referentiel-applications/commit/518d6a3c17709edaf4c22548fa2a35e8c4a8f176))


### Bug Fixes

* :bug: fix application creation when no tags filled ([#1122](https://github.com/dnum-mi/referentiel-applications/issues/1122)) ([246f6b9](https://github.com/dnum-mi/referentiel-applications/commit/246f6b916d90653bf6afcd21dd2082466520c798))
* add runtime caching and denylist for API requests in Vite configuration ([2ed7a0d](https://github.com/dnum-mi/referentiel-applications/commit/2ed7a0da39db11fe3f08dfce50bb4f76b29ea38a))
* **front:** :bug: use correct variable for label of the compliance homologation ([b7a22c6](https://github.com/dnum-mi/referentiel-applications/commit/b7a22c6f9734588643da68c30624bd03f18e1ca9))
* update searchApplications to use pageSize instead of limit ([0e648dd](https://github.com/dnum-mi/referentiel-applications/commit/0e648ddd9fa46ff100383bddeaa2e1072fe660eb))

## [1.42.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.41.0...v1.42.0) (2025-09-30)


### Features

* :zap: improve application search hosting filter with selectable fields ([6648470](https://github.com/dnum-mi/referentiel-applications/commit/664847029ef098a52540ebfc05f9aff6cb78bd52))
* :zap: use backend pagination for links ([452ef7f](https://github.com/dnum-mi/referentiel-applications/commit/452ef7f623eefed3d6621183a9296cc37cccdec5))
* **front:** add historypage for application  update ([cb12cdf](https://github.com/dnum-mi/referentiel-applications/commit/cb12cdf15a6739c3a4605f33a29adc741e1a817f))
* implement pagination and filtering for metadata retrieval ([afbf21e](https://github.com/dnum-mi/referentiel-applications/commit/afbf21e1c97a8fbff9a0cc8f52f0835008655b4c))
* include organization details in metadatas ([32c15c7](https://github.com/dnum-mi/referentiel-applications/commit/32c15c709e2ad644189142ef80a6094f107360e1))


### Bug Fixes

* **api:** :bug: fix the monthly counter for application that wasn't returning right numbers ([b972640](https://github.com/dnum-mi/referentiel-applications/commit/b972640ee00862b1530287ff9c4f52e17a984662))
* **front:** :bug: create application without priority restart ([c56b767](https://github.com/dnum-mi/referentiel-applications/commit/c56b767e10fec30e639799cd8938afc2edeb1bcf))
* **front:** :lipstick: resolve overlap with footer on profile page ([4d69a7d](https://github.com/dnum-mi/referentiel-applications/commit/4d69a7d0b4dd9d399b64d1f492561ae6d238335e))
* **front:** :recycle: add title to CCT Link and to the logo button in the footer ([7d434f4](https://github.com/dnum-mi/referentiel-applications/commit/7d434f418994504eca075f5858e763a86271ba62))
* **front:** :recycle: set html language to french for accessibility ([87fbfc4](https://github.com/dnum-mi/referentiel-applications/commit/87fbfc408e25c1b930d573ff2913745c018a16f7))

## [1.41.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.40.0...v1.41.0) (2025-09-26)


### Features

* **front:** :sparkles: add pagination in page admin ([ec86974](https://github.com/dnum-mi/referentiel-applications/commit/ec869746a65d3647c5836885bd65eddda9541e26))


### Bug Fixes

* :bug: fix applications search by organization sigle and label ([0fa457d](https://github.com/dnum-mi/referentiel-applications/commit/0fa457d59d52e4559979bf9a02efdb6f6a923471))
* **front:** :lipstick: fix issue tables fill witdh ([56f964c](https://github.com/dnum-mi/referentiel-applications/commit/56f964cdf7128a831e595825e77a9e70560c08a0))

## [1.40.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.39.0...v1.40.0) (2025-09-25)


### Features

* :sparkles: Add possibility to report an anomaly globally ([b212797](https://github.com/dnum-mi/referentiel-applications/commit/b21279758dc917974fde9a6511512ffc0fcb3fd0))
* ajouter le workflow de construction pour les versions de backend et frontend ([bc853b2](https://github.com/dnum-mi/referentiel-applications/commit/bc853b26835475a3d2ebac37d60875490bd2c28d))
* **front:** :sparkles: add global request button in application list ([07de923](https://github.com/dnum-mi/referentiel-applications/commit/07de92348034fe708edf10cb1e8745ac78c2184a))


### Bug Fixes

* :bug: fix the state and the display for the chart ofthe Iq stats ([d6db717](https://github.com/dnum-mi/referentiel-applications/commit/d6db717d75f295610abe77051afd370d66d1193f))
* :bug: fix weird count behavior in application list ([bd8e32a](https://github.com/dnum-mi/referentiel-applications/commit/bd8e32a34147976f74195f89a3fc90b077507394))
* ✅ fix playwright ci tests ([149da3d](https://github.com/dnum-mi/referentiel-applications/commit/149da3d1a24c4c5eb54919ebac43bd0a1eb07564))
* add H1 titles to all view components and browser tab titles ([d4a61d4](https://github.com/dnum-mi/referentiel-applications/commit/d4a61d4cec8ce12703b7a35a39007813ae6127b9))
* **front:** :bug: fix navigation accessibility searchbar and resultlist ([c5e7522](https://github.com/dnum-mi/referentiel-applications/commit/c5e752269fabef732fbb113e6c198a295f0c362b))

## [1.39.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.38.0...v1.39.0) (2025-09-18)


### Features

* **token:** implement token management system with CRUD operations ([ab16b66](https://github.com/dnum-mi/referentiel-applications/commit/ab16b66b65665a44fb85eee564aef55bef8d0d90))


### Bug Fixes

* update organization input handling to use model-value event and improve search functionality ([1bd9f9d](https://github.com/dnum-mi/referentiel-applications/commit/1bd9f9d978bd2a141fc4e5f25ae6710efa922dc6))

## [1.38.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.37.1...v1.38.0) (2025-09-17)


### Features

* **api:** :sparkles: add field in compliance ([e3950be](https://github.com/dnum-mi/referentiel-applications/commit/e3950befca2358239ade5f8c4190e5f5f9b21f6d))


### Bug Fixes

* streamline filter updates and improve search functionality across components ([7efa705](https://github.com/dnum-mi/referentiel-applications/commit/7efa7056523eadf28c937fec2bbb87b5c9dbad1c))
* update application creation logic and improve form submission handling ([d41251a](https://github.com/dnum-mi/referentiel-applications/commit/d41251a94c0966279ae708a6e7604e876644174b))

## [1.37.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.37.0...v1.37.1) (2025-09-15)


### Bug Fixes

* client bad api url ([941efc6](https://github.com/dnum-mi/referentiel-applications/commit/941efc601a4b4aaa973087412a4f1ce775998ee9))

## [1.37.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.36.0...v1.37.0) (2025-09-15)


### Features

* :sparkles: improve organization filter ux and fix full text search ([f3a34c6](https://github.com/dnum-mi/referentiel-applications/commit/f3a34c6b3b16990e4d5a2369ab9a6eaa5b3a849a))
* implement configuration retrieval for Keycloak initialization ([5029ee9](https://github.com/dnum-mi/referentiel-applications/commit/5029ee9a271c4af9e69ca784561c0f15ddc5e4af))


### Bug Fixes

* add route configuration to init client ([360cabf](https://github.com/dnum-mi/referentiel-applications/commit/360cabf40a030ae25f3e40479fd8780491eb7ed4))
* edit permissions check for actors based on user permissions ([e4ce7da](https://github.com/dnum-mi/referentiel-applications/commit/e4ce7da984455b850bf65fc3655119ab19851a48))

## [1.36.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.35.0...v1.36.0) (2025-09-10)


### Features

* enhance organization filtering with boolean options and debounce fetch logic ([bd00c74](https://github.com/dnum-mi/referentiel-applications/commit/bd00c74fa001b630fdaa69428f704b2b8cbfbea6))


### Bug Fixes

* :bug: fix status filter handling ([b2b421c](https://github.com/dnum-mi/referentiel-applications/commit/b2b421cbabdca49f0b4f76da86031d8dfa5b797c))
* organization dto ([c162f56](https://github.com/dnum-mi/referentiel-applications/commit/c162f5607ca79fce131c46372166ee02a72cb8a4))
* remove deprecated label client API and update label types in application model ([68df258](https://github.com/dnum-mi/referentiel-applications/commit/68df25802e72e20eda744161b21530331864fe2d))
* update application search and export logic to handle pagination and filters ([15d214e](https://github.com/dnum-mi/referentiel-applications/commit/15d214e0111e5079b3e99a38d1f2a30fec0ab116))
* updateActor function signature to destructure actor parameter ([ac7f486](https://github.com/dnum-mi/referentiel-applications/commit/ac7f4864e02e3ef855faf55cb093704b14b4ebd4))

## [1.35.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.34.1...v1.35.0) (2025-09-08)


### Features

* **front:** :lipstick: add new pdma and dmia duration hours ([c119631](https://github.com/dnum-mi/referentiel-applications/commit/c119631183b1abd5731368e543ec84a069196a13))
* refactor application export functionality to use applicationStore ([12f580e](https://github.com/dnum-mi/referentiel-applications/commit/12f580eb0b158f9aa5be622ff6b6870734c1ae75))
* **tests:** add Playwright configuration and initial test cases ([0282194](https://github.com/dnum-mi/referentiel-applications/commit/0282194d77c282cfcffaee92cbd35707e192fdab))


### Bug Fixes

* :fire: remove CSV export feature and fix xls export ([c7da1c6](https://github.com/dnum-mi/referentiel-applications/commit/c7da1c69c2b7348d793f70f5d569b43b554a7612))
* change type from number to string ([81ae1f3](https://github.com/dnum-mi/referentiel-applications/commit/81ae1f3c1f47f06f241766751c7e8eb77f1ce487))
* **compliance:** :bug: replace int rgaa score by decimal ([81ae1f3](https://github.com/dnum-mi/referentiel-applications/commit/81ae1f3c1f47f06f241766751c7e8eb77f1ce487))
* **front:** :bug: replace commas with dots as the decimal separator ([81ae1f3](https://github.com/dnum-mi/referentiel-applications/commit/81ae1f3c1f47f06f241766751c7e8eb77f1ce487))
* improve error handling in response interceptor ([8159669](https://github.com/dnum-mi/referentiel-applications/commit/815966981c133ac3b10271e4979c637b27dbecbd))
* **test:** :bug: convert rgaa_score_percentage to number for e2e tests ([81ae1f3](https://github.com/dnum-mi/referentiel-applications/commit/81ae1f3c1f47f06f241766751c7e8eb77f1ce487))

## [1.34.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.34.0...v1.34.1) (2025-08-26)


### Bug Fixes

* update entrypoint script to use temporary directory for file processing ([556a8bf](https://github.com/dnum-mi/referentiel-applications/commit/556a8bf21ed5d0b5645cf706d92fd93514c52331))

## [1.34.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.33.2...v1.34.0) (2025-08-22)


### Features

* add workflow_dispatch in tests-unit.yml ([2b2b74c](https://github.com/dnum-mi/referentiel-applications/commit/2b2b74c6226872c24c6f5dafc64ae2a6a89ac186))
* enhance anomaly notification management with permission checks ([7a7ebcd](https://github.com/dnum-mi/referentiel-applications/commit/7a7ebcdbb6642c44604565462078c2330dd569bd))
* **front:** :lipstick: add hard delete application button for admin ([#956](https://github.com/dnum-mi/referentiel-applications/issues/956)) ([77af038](https://github.com/dnum-mi/referentiel-applications/commit/77af03895b0a65e6357f5f6e0f2d229af747877b))
* implement generateId utility function for unique ID generation ([94f681e](https://github.com/dnum-mi/referentiel-applications/commit/94f681e16ad064b4438c00bae33c47a705bfb527))


### Bug Fixes

* :bug: avoid call /me if not authenticated ([53ce2fd](https://github.com/dnum-mi/referentiel-applications/commit/53ce2fd7c33378140172c529a9a25aff56257b40))
* a lot of sonarqube issues ([16d257a](https://github.com/dnum-mi/referentiel-applications/commit/16d257abb5560298b546d1face43a9e9fc359ec2))
* add backend readiness check in E2E tests and set user for production build ([b029d6c](https://github.com/dnum-mi/referentiel-applications/commit/b029d6cafdd961590578e6608db91fab1cd569a0))
* enhance API parameter descriptions and types ([6fc5a73](https://github.com/dnum-mi/referentiel-applications/commit/6fc5a7349b2e2790c4d5391d308250f3472bf6de))
* fetch user data on component mount ([f37f99b](https://github.com/dnum-mi/referentiel-applications/commit/f37f99b0e3dbd101d74eeae301c4794cabd0c3ca))
* **front:** :pencil2: change text for error page ([9b13dc6](https://github.com/dnum-mi/referentiel-applications/commit/9b13dc6aa6276d04d09e7c691280ec1c96d82c2d))
* improve Dockerfile for better package installation and cleanup ([3cbfa33](https://github.com/dnum-mi/referentiel-applications/commit/3cbfa33d858d11047d78ce6ecd0751571132c53f))
* missing auth auto refresh mechanism ([3ed9e13](https://github.com/dnum-mi/referentiel-applications/commit/3ed9e13e0ea1a6e213bb6c99e5bfd1538e833501))
* **swagger:** :bug: add swagger options with correct oauth2 redirect url ([#942](https://github.com/dnum-mi/referentiel-applications/issues/942)) ([3f8ba38](https://github.com/dnum-mi/referentiel-applications/commit/3f8ba38224e16b015fbf354b5b6e2c9bee3b9bd6))
* update async handling in findOne method and improve search parameter validation ([94f681e](https://github.com/dnum-mi/referentiel-applications/commit/94f681e16ad064b4438c00bae33c47a705bfb527))

## [1.33.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.33.1...v1.33.2) (2025-08-07)


### Bug Fixes

* :bug: remove admin guard from stats controller ([1b48f25](https://github.com/dnum-mi/referentiel-applications/commit/1b48f25d746b6f756f3b303b39d841aa56d3a54a))

## [1.33.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.33.0...v1.33.1) (2025-08-06)


### Bug Fixes

* :bug: wrong perms system ([573a492](https://github.com/dnum-mi/referentiel-applications/commit/573a492c71e21afc13c71b33d3f99bdf089c9111))

## [1.33.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.32.0...v1.33.0) (2025-08-05)


### Features

* ✨ add application permissions model and guard for permission checks ([#893](https://github.com/dnum-mi/referentiel-applications/issues/893)) ([c2a823d](https://github.com/dnum-mi/referentiel-applications/commit/c2a823dc2be2be2312f8d5afa3a2827e663c4759))
* implement admin level system for user permissions ([f31cec3](https://github.com/dnum-mi/referentiel-applications/commit/f31cec3636226e28415790db13020dae01904151))


### Bug Fixes

* :bug: correct data indexing and label order in IQ chart ([96bcc19](https://github.com/dnum-mi/referentiel-applications/commit/96bcc1946a4e0ff6d317996776a1fd6094ee8d67))
* :bug: monthly count logic ([42d82cf](https://github.com/dnum-mi/referentiel-applications/commit/42d82cfd9ef97749dac20d7bd37e0356d9caa898))
* **front:** :art: add dictionnary labels in composables ([06bb433](https://github.com/dnum-mi/referentiel-applications/commit/06bb433707c8ec484b317ddfdb7fd1143ad16eec))
* **front:** :bug: Add field compliance form ([d255f3c](https://github.com/dnum-mi/referentiel-applications/commit/d255f3c88e4dea72da3167ea8fc7cbbb6ed7f1c9))
* **front:** :bug: fix extension of the filter bar ([3cddc44](https://github.com/dnum-mi/referentiel-applications/commit/3cddc447d1d381e9320bdb625398118c3675ea6d))
* **front:** :bug: fix sidebar filters scroll ([f14c02f](https://github.com/dnum-mi/referentiel-applications/commit/f14c02f30b6e7947123d767045806f1a1e2681d2))
* **metadata:** :bug: create metadata controller with get endpoints, store and fix history tab ([#913](https://github.com/dnum-mi/referentiel-applications/issues/913)) ([1eaad7b](https://github.com/dnum-mi/referentiel-applications/commit/1eaad7ba4c7d2407c77f72290463bc11c582ba6d))

## [1.32.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.31.0...v1.32.0) (2025-07-29)


### Features

* **api:** :sparkles: add stats quality average ([fc9e603](https://github.com/dnum-mi/referentiel-applications/commit/fc9e603bdc95168c75c7a6e9b189ce9e7c20484f))


### Bug Fixes

* :lipstick: fix filter background for the searching app page ([#879](https://github.com/dnum-mi/referentiel-applications/issues/879)) ([1249500](https://github.com/dnum-mi/referentiel-applications/commit/124950091d5a15c3f88ed3dfdf5cffe82a67fef0))
* **front:** :bug: add error page 404 ([7b9a10d](https://github.com/dnum-mi/referentiel-applications/commit/7b9a10d437b2dbd5f72a0fac5709c95dcb5beda4))
* **front:** :bug: fix app search by organization ([3767617](https://github.com/dnum-mi/referentiel-applications/commit/3767617e4724b9ff118a97fa16a4e6677798ee5b))
* **front:** :bug: fix redirection to app after create app ([c9cd4c5](https://github.com/dnum-mi/referentiel-applications/commit/c9cd4c5b8ac67c24bb4448b29dd50d6668871ffa))
* **front:** :bug: remove selected status summary display ([#897](https://github.com/dnum-mi/referentiel-applications/issues/897)) ([0cf1ea6](https://github.com/dnum-mi/referentiel-applications/commit/0cf1ea64d576e031d5a37cc9663edcbed8b622ec))
* **front:** :bug: reset search with empty input ([93d4354](https://github.com/dnum-mi/referentiel-applications/commit/93d4354de69a991be233cf6c5d902db7cb642915))
* **front:** :bug: synchronize status checkbox with store using watch ([0bbb427](https://github.com/dnum-mi/referentiel-applications/commit/0bbb427f25e9b9b0eb305001c4f53b5d3b2e57c5))

## [1.31.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.30.0...v1.31.0) (2025-07-21)


### Features

* :recycle: refactor compliances management ([d7a49b2](https://github.com/dnum-mi/referentiel-applications/commit/d7a49b250354d64dd12245cee45debd417392403))

## [1.30.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.29.0...v1.30.0) (2025-07-16)


### Features

* **ci:** :sparkles: instal and initialize cypress and add cypress to the CI ([#703](https://github.com/dnum-mi/referentiel-applications/issues/703)) ([9d00a33](https://github.com/dnum-mi/referentiel-applications/commit/9d00a33ede0f7a48e358c0e3492c105cfbed3e70))


### Bug Fixes

* :bug: set default value for quality in Application model and update migration ([#848](https://github.com/dnum-mi/referentiel-applications/issues/848)) ([c2cc3af](https://github.com/dnum-mi/referentiel-applications/commit/c2cc3af178a2f75610986e853637922cfcdafb88))
* **front:** :bug: add keyboard navigation for correction ans admin tabs ([bac95f2](https://github.com/dnum-mi/referentiel-applications/commit/bac95f2075250f18e13153cb67b96075a905fce3))
* **front:** :bug: fix tabulation for tabs ([c44b0f6](https://github.com/dnum-mi/referentiel-applications/commit/c44b0f67cf5656095e33cfbb3208ad36645dd98d))
* **router:** :bug: avoid component re-render on query param change ([5ba3e88](https://github.com/dnum-mi/referentiel-applications/commit/5ba3e881912b440f0905ffab7d1a17e79d08dd04))

## [1.29.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.28.0...v1.29.0) (2025-07-09)


### Features

* **applications:** :sparkles: add filter in status ([54e35f7](https://github.com/dnum-mi/referentiel-applications/commit/54e35f7b79cf2add54884d798deab5971698630a))
* **back:** :sparkles: create quality page with global stats and application per month chart ([#821](https://github.com/dnum-mi/referentiel-applications/issues/821)) ([94c2c66](https://github.com/dnum-mi/referentiel-applications/commit/94c2c6605f21e403d1c178c2c87bfc1cd455a4ee))
* **export:** :sparkles: add detailed export view and update export functionality ([3521733](https://github.com/dnum-mi/referentiel-applications/commit/3521733cfb51d38088afd1225ae1b0a0c3878b6c))
* **front:** :lipstick: add navigation for improve ux ([12f995a](https://github.com/dnum-mi/referentiel-applications/commit/12f995acb5306b964216821d45f81ebdce71abec))
* **quality:** :sparkles: add chart of applications grouped by iq in … ([#834](https://github.com/dnum-mi/referentiel-applications/issues/834)) ([5120a9a](https://github.com/dnum-mi/referentiel-applications/commit/5120a9a87366d58c60af41b432e6782d682a555f))


### Bug Fixes

* :bug: fix 500 error when sending applicationId in links creation ([4b26f57](https://github.com/dnum-mi/referentiel-applications/commit/4b26f57ba82f80aac185ef8dc46b25d5a1e07119))
* :bug: fix modal behavior when pressing enter ([375b5af](https://github.com/dnum-mi/referentiel-applications/commit/375b5af5a247a90567b18512962bb03746245149))
* **front:** :bug: hide navigation bar when user is not authenticated ([b47c9d7](https://github.com/dnum-mi/referentiel-applications/commit/b47c9d787181c297a10bf65766e9c268761c1c43))

## [1.28.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.27.1...v1.28.0) (2025-07-02)


### Features

* **applications:** :fire: Add status in application ([14ca12e](https://github.com/dnum-mi/referentiel-applications/commit/14ca12e5c60596395d23ca11a7dcd2e6f1726ae6))


### Bug Fixes

* **back:** :bug: fix logging for patch data-quality endpoint ([90cf686](https://github.com/dnum-mi/referentiel-applications/commit/90cf68683612dffac00eaa7f2c2cb26c8997d60b))
* **back:** :bug: run quality update as a background task ([754bf30](https://github.com/dnum-mi/referentiel-applications/commit/754bf30499f7992a4bbb2071d21f55ece4f7213b))

## [1.27.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.27.0...v1.27.1) (2025-07-01)


### Bug Fixes

* **front:** set 5 and 100 defaults values and add iq tag ([#808](https://github.com/dnum-mi/referentiel-applications/issues/808)) ([b59f3a5](https://github.com/dnum-mi/referentiel-applications/commit/b59f3a525f99fdc7d5c56d9f583df5c6d595e0ea))

## [1.27.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.26.0...v1.27.0) (2025-06-26)


### Features

* :sparkles: add users search filter ([9773800](https://github.com/dnum-mi/referentiel-applications/commit/977380073db04d0ef1f215a073d553047c25a335))
* **quality:** :sparkles: add iq gte and iq lte filters ([#802](https://github.com/dnum-mi/referentiel-applications/issues/802)) ([a9612ef](https://github.com/dnum-mi/referentiel-applications/commit/a9612efef26b9c8e03a63da84f1941d9dbdf6a88))


### Bug Fixes

* :bug: fix application delete with metadatas on delete cascade ([371d0cf](https://github.com/dnum-mi/referentiel-applications/commit/371d0cf1744aeda79451630c35ec8cf50cf7c71c))
* :lock: fix permissions guard check ([a6cfff9](https://github.com/dnum-mi/referentiel-applications/commit/a6cfff99eef0baeba170e0fc3afcb00078a0f34a))

## [1.26.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.6...v1.26.0) (2025-06-25)


### Features

* :sparkles: make organization search works as the hosting filter ([3a9db7a](https://github.com/dnum-mi/referentiel-applications/commit/3a9db7a10a12a9de4eb21c4e5c81e8d3f355c261))
* **applications:** :sparkles: add email to logger data and add column lastlogin to admin dashboard ([#777](https://github.com/dnum-mi/referentiel-applications/issues/777)) ([2b38c0d](https://github.com/dnum-mi/referentiel-applications/commit/2b38c0d5a7b4887004fc936bfa3755e301f678dc))
* **quality:** ✨ create IQ tab for the application ([#787](https://github.com/dnum-mi/referentiel-applications/issues/787)) ([6062039](https://github.com/dnum-mi/referentiel-applications/commit/60620397b8b4826407597566495ebd2a2b4f3b28))

## [1.25.6](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.5...v1.25.6) (2025-06-24)


### Bug Fixes

* :bug: fix relationships application search ([b399e73](https://github.com/dnum-mi/referentiel-applications/commit/b399e73493e385ec15ea9f0bd7c9ced32f306887))
* :lipstick: update restart priority display and truncate css ([ecc7c5b](https://github.com/dnum-mi/referentiel-applications/commit/ecc7c5b3c74d274ebc95781f3071361a80c97f38))

## [1.25.5](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.4...v1.25.5) (2025-06-23)


### Bug Fixes

* :bug: update search results handling to use total count and improve response structure ([2e4044a](https://github.com/dnum-mi/referentiel-applications/commit/2e4044abc0f65c7bf8b0204c2f68a90ef4861aaa))

## [1.25.4](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.3...v1.25.4) (2025-06-23)


### Bug Fixes

* :recycle: refactor application search functionality and remove unused sorting logic ([103d5c9](https://github.com/dnum-mi/referentiel-applications/commit/103d5c9d0d2e4e5558f59bfebf0c860c4305cad9))

## [1.25.3](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.2...v1.25.3) (2025-06-20)


### Bug Fixes

* :bug: fix pagination not working in apps search ([f998ef4](https://github.com/dnum-mi/referentiel-applications/commit/f998ef4bfba17bcd5955f5829d69b677de96d827))

## [1.25.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.1...v1.25.2) (2025-06-20)


### Bug Fixes

* trigger release ([1013516](https://github.com/dnum-mi/referentiel-applications/commit/10135166e0e2c01e4b0a487d696a3d7c1df6f8ce))

## [1.25.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.25.0...v1.25.1) (2025-06-19)


### Bug Fixes

* **front:** :bug: fix comparison logic in application form ([#770](https://github.com/dnum-mi/referentiel-applications/issues/770)) ([6faf0da](https://github.com/dnum-mi/referentiel-applications/commit/6faf0da95ba3654851ebb94ecdd7ab4fcc02102c))
* **front:** :bug: Make reset filters button clear applied filters ([#710](https://github.com/dnum-mi/referentiel-applications/issues/710)) ([b8f2dae](https://github.com/dnum-mi/referentiel-applications/commit/b8f2dae4bddccf98d542efa0ea525326dd20bd54))

## [1.25.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.24.1...v1.25.0) (2025-06-17)


### Features

* :sparkles: create change history table ([#759](https://github.com/dnum-mi/referentiel-applications/issues/759)) ([825ebf2](https://github.com/dnum-mi/referentiel-applications/commit/825ebf2fe7f99e076b5eb1d222d98222979e9017))


### Bug Fixes

* **excel-export:** :bug: export all filtered apps instead of only the first 15 ([8531ace](https://github.com/dnum-mi/referentiel-applications/commit/8531aced4d28af8b5213cf65c927836f7a5c58a3))

## [1.24.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.24.0...v1.24.1) (2025-06-16)


### Bug Fixes

* :bug: fixing sorting function for application ([#760](https://github.com/dnum-mi/referentiel-applications/issues/760)) ([2572bbe](https://github.com/dnum-mi/referentiel-applications/commit/2572bbe54c59e5e88d00ee61e7a133fd64c9e486))
* **Dockerfile:** add procps package to fix hot reload issue ([6d99f27](https://github.com/dnum-mi/referentiel-applications/commit/6d99f27ab2e6858ab4389301a7b026c9e0baafaa))

## [1.24.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.23.0...v1.24.0) (2025-06-13)


### Features

* **user-management:** add user management view and permissions handling ([#762](https://github.com/dnum-mi/referentiel-applications/issues/762)) ([c195640](https://github.com/dnum-mi/referentiel-applications/commit/c195640e1d36862c773027225c170dfe488b2903))

## [1.23.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.22.0...v1.23.0) (2025-06-11)


### Features

* **compliance:** enhance compliance date handling and streamline update logic ([#756](https://github.com/dnum-mi/referentiel-applications/issues/756)) ([5668451](https://github.com/dnum-mi/referentiel-applications/commit/566845147ea386063f10391cd47ff694725318f0))
* **export:** :sparkles: add CSV export feature for application search ([#734](https://github.com/dnum-mi/referentiel-applications/issues/734)) ([f6b1ee9](https://github.com/dnum-mi/referentiel-applications/commit/f6b1ee9c3e658658a8844cf47bb0a96ee7286117))


### Bug Fixes

* :bug: add sort metadata endpoint ([#758](https://github.com/dnum-mi/referentiel-applications/issues/758)) ([691e884](https://github.com/dnum-mi/referentiel-applications/commit/691e8849212ea8976cf9be232554f2d4f20a6c99))
* **api:** :bug: make tag search case-insensitive ([#726](https://github.com/dnum-mi/referentiel-applications/issues/726)) ([ca60cda](https://github.com/dnum-mi/referentiel-applications/commit/ca60cdad5e08ce1f739372b2fa26781dea733708))

## [1.22.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.21.0...v1.22.0) (2025-05-28)


### Features

* **metadata:** :sparkles: refactor and add last update date ([#606](https://github.com/dnum-mi/referentiel-applications/issues/606)) ([1af7688](https://github.com/dnum-mi/referentiel-applications/commit/1af7688ba71f0fa51b71f8f19be2c489f9e20038))


### Bug Fixes

* **api:** :bug: delete metadata id from label dto ([#732](https://github.com/dnum-mi/referentiel-applications/issues/732)) ([8b9b688](https://github.com/dnum-mi/referentiel-applications/commit/8b9b688864b842e7e58ffe3965e68523c5a73703))

## [1.21.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.20.0...v1.21.0) (2025-05-28)


### Features

* **hosting:** enhance hosting modal with search functionality and form validation ([#696](https://github.com/dnum-mi/referentiel-applications/issues/696)) ([828e066](https://github.com/dnum-mi/referentiel-applications/commit/828e066b3b41a782d670a1c5f216ec05ec5ad313))


### Bug Fixes

* :bug: fix duplicated hosting search options ([#704](https://github.com/dnum-mi/referentiel-applications/issues/704)) ([d3b9d4b](https://github.com/dnum-mi/referentiel-applications/commit/d3b9d4b90efbbb8b0e1ddd393ea2a8ae42dbc502))
* **actor:** remove default placeholder text for email, firstname, and lastname fields ([#708](https://github.com/dnum-mi/referentiel-applications/issues/708)) ([ba14e4c](https://github.com/dnum-mi/referentiel-applications/commit/ba14e4c633256691606d3c529e2fa7d6e64cb9c6))
* **form:** :bug: use correct priority restart values (R0–R3) ([#728](https://github.com/dnum-mi/referentiel-applications/issues/728)) ([17d368b](https://github.com/dnum-mi/referentiel-applications/commit/17d368bcde7e4bfc22a00c01d5778a636b95fc24))
* **front:** :bug: disable edit/delete buttons for hosting site when user doesn't have the permission ([#712](https://github.com/dnum-mi/referentiel-applications/issues/712)) ([fe2455d](https://github.com/dnum-mi/referentiel-applications/commit/fe2455dde20c6d5c03d152ed166c3a5507333e36))

## [1.20.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.19.0...v1.20.0) (2025-05-20)


### Features

* **search:** :sparkles: use single hosting search filter to application search functionality ([#685](https://github.com/dnum-mi/referentiel-applications/issues/685)) ([432ec61](https://github.com/dnum-mi/referentiel-applications/commit/432ec6155e0123f5bb1bf3a362c49edd6b4ba5ac))


### Bug Fixes

* **front:** :bug: Fix my reports list and all reports list ([#684](https://github.com/dnum-mi/referentiel-applications/issues/684)) ([4fce899](https://github.com/dnum-mi/referentiel-applications/commit/4fce89993d2b52dd5adaec6f4f1f135a5ab358ef))
* **front:** :bug: fix the fact that email should not be required when an actor is created ([#687](https://github.com/dnum-mi/referentiel-applications/issues/687)) ([984c6d0](https://github.com/dnum-mi/referentiel-applications/commit/984c6d05437b98ed98e6631a8ce722d4ab9a0fd3))

## [1.19.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.18.0...v1.19.0) (2025-05-19)


### Features

* **front:** :sparkles: Add editor markdown for description application ([138d530](https://github.com/dnum-mi/referentiel-applications/commit/138d53097d2076361d6bf108d7cd61872719aa84))


### Bug Fixes

* :bug: fix priority restart and hosting search filters ([#680](https://github.com/dnum-mi/referentiel-applications/issues/680)) ([81bd9ac](https://github.com/dnum-mi/referentiel-applications/commit/81bd9acefbf5a9fc89402d36e52b609253455aa8))

## [1.18.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.17.1...v1.18.0) (2025-05-15)


### Features

* :sparkles: add URL handling for active tab in ApplicationOverview component ([#664](https://github.com/dnum-mi/referentiel-applications/issues/664)) ([66b1d75](https://github.com/dnum-mi/referentiel-applications/commit/66b1d75081a0393b79e505d0e7b71f07863557df))

## [1.17.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.17.0...v1.17.1) (2025-05-13)


### Bug Fixes

* :bug: update actor findAll method to filter actors by applicationId ([#666](https://github.com/dnum-mi/referentiel-applications/issues/666)) ([03c02da](https://github.com/dnum-mi/referentiel-applications/commit/03c02da1b0c01f8cb72d6d116928665f93609bc9))

## [1.17.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.16.1...v1.17.0) (2025-05-13)


### Features

* :sparkles: enhance search functionality with additional hosting filters and options ([#657](https://github.com/dnum-mi/referentiel-applications/issues/657)) ([8c44276](https://github.com/dnum-mi/referentiel-applications/commit/8c442762f8cea29c2d2c3926f0c696fa782e1122))

## [1.16.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.16.0...v1.16.1) (2025-05-06)


### Bug Fixes

* :bug: change description display from pre to paragraph ([67fa716](https://github.com/dnum-mi/referentiel-applications/commit/67fa71620a816ec713cd886a65cb035feeac2a5a))

## [1.16.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.15.0...v1.16.0) (2025-05-06)


### Features

* :sparkles: refactor hosting management with new hosting options model ([#655](https://github.com/dnum-mi/referentiel-applications/issues/655)) ([a5f5f64](https://github.com/dnum-mi/referentiel-applications/commit/a5f5f64ca2cf322b8bf38b8d363d914f640f0275))


### Bug Fixes

* **front:** :bug: delete compliace key in create application ([0fafa33](https://github.com/dnum-mi/referentiel-applications/commit/0fafa334869d6d5860b1cf9cc5083c88bcce3d03))

## [1.15.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.14.0...v1.15.0) (2025-05-02)


### Features

* :sparkles: add hosting management with new platform and provider entities ([#646](https://github.com/dnum-mi/referentiel-applications/issues/646)) ([dd445cd](https://github.com/dnum-mi/referentiel-applications/commit/dd445cde6a7ec374973d5667ebb55207def1e02d))
* :sparkles: refactor compliance and event forms for improved data handling and UI consistency ([#652](https://github.com/dnum-mi/referentiel-applications/issues/652)) ([61ea0e1](https://github.com/dnum-mi/referentiel-applications/commit/61ea0e14398c28966cdb7f257cb44432a6c9d2e5))

## [1.14.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.13.0...v1.14.0) (2025-04-25)


### Features

* :sparkles: add organization CRUD tests and faker ([b92b364](https://github.com/dnum-mi/referentiel-applications/commit/b92b364864f527761276059eeefd4f1e5dbfbd40))
* :sparkles: add user profile view and permissions display ([#621](https://github.com/dnum-mi/referentiel-applications/issues/621)) ([4a82cc9](https://github.com/dnum-mi/referentiel-applications/commit/4a82cc9177095f873d86209868e4532d9b225d63))
* :sparkles: disable buttons for edit/add/delete if user doesn't have the permission ([#631](https://github.com/dnum-mi/referentiel-applications/issues/631)) ([02f3a7f](https://github.com/dnum-mi/referentiel-applications/commit/02f3a7fa732e0d775d78bdbf5875943672e771bf))
* ✨ add unique constraint on label and description in Application model ([#633](https://github.com/dnum-mi/referentiel-applications/issues/633)) ([a57f6cf](https://github.com/dnum-mi/referentiel-applications/commit/a57f6cfee50dceddee2342bcff036eaae2fd36f2))


### Bug Fixes

* :bug: add a redirect to login page when 401 and then redirect to previous route targeted ([#632](https://github.com/dnum-mi/referentiel-applications/issues/632)) ([f291e0a](https://github.com/dnum-mi/referentiel-applications/commit/f291e0abbee5caa3a13492fa26c232304684f85a))
* :bug: correct target label for 'in_replacement_of' relation type ([#629](https://github.com/dnum-mi/referentiel-applications/issues/629)) ([5777d0e](https://github.com/dnum-mi/referentiel-applications/commit/5777d0e57c748aa89d1ae872e87bdb655fe4f18f))
* **ci:** :bug: Display version in footer frontend ([b498c4d](https://github.com/dnum-mi/referentiel-applications/commit/b498c4d62bdf95e04aedb26b246993e730b46e27))

## [1.13.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.12.1...v1.13.0) (2025-04-16)


### Features

* :lipstick: add preformatted description and sorted actor list ([#605](https://github.com/dnum-mi/referentiel-applications/issues/605)) ([efccad5](https://github.com/dnum-mi/referentiel-applications/commit/efccad5089e3b2ba3ca055a36d30cce73edaff6e))


### Bug Fixes

* **api:** :bug: fix filter query in search endpoint ([cfdc5d4](https://github.com/dnum-mi/referentiel-applications/commit/cfdc5d42dec7b1814dc45b611d7c34fcadc92948))
* **front:** :bug: fix-version-in-footer ([00bb6f8](https://github.com/dnum-mi/referentiel-applications/commit/00bb6f89e71502a4a880aeb67cf877144a463a0b))

## [1.12.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.12.0...v1.12.1) (2025-04-15)


### Bug Fixes

* **front:** :bug: fix app version env variable name ([#603](https://github.com/dnum-mi/referentiel-applications/issues/603)) ([78f2895](https://github.com/dnum-mi/referentiel-applications/commit/78f289515d9ad8e1056e86f24aa655f30da0812f))
* **front:** :bug: fix delete-tag-input-when-empty ([c594e75](https://github.com/dnum-mi/referentiel-applications/commit/c594e759ef6364c41537e70a0e7a9e07ee559e1e))

## [1.12.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.11.0...v1.12.0) (2025-04-14)


### Features

* **front:** :sparkles: enhance organization display with links in ActorTab ([2a2fb6a](https://github.com/dnum-mi/referentiel-applications/commit/2a2fb6ad2468d52e3a2c194a588193ad5adb6f3b))

## [1.11.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.10.3...v1.11.0) (2025-04-14)


### Features

* :sparkles: add permissions field to User model and implement role-based access control ([3365d26](https://github.com/dnum-mi/referentiel-applications/commit/3365d26de6d48903f072d1fbd54d0c30430a6c42))
* **api:** :sparkles: add module search filters ([179d0c0](https://github.com/dnum-mi/referentiel-applications/commit/179d0c0fed43a4ba73753e7ad38c82809fd246a4))
* **front:** :lipstick: add dropbox for actorType list ([11322e1](https://github.com/dnum-mi/referentiel-applications/commit/11322e1def712b243a5ddc90795348701c0affb6))
* **front:** :lipstick: use dsfrSelect ([6aaf50d](https://github.com/dnum-mi/referentiel-applications/commit/6aaf50dca1b764209687417424a19d8ec7caac67))

## [1.10.3](https://github.com/dnum-mi/referentiel-applications/compare/v1.10.2...v1.10.3) (2025-04-11)


### Bug Fixes

* :bug: Fix the display of the hosting column in the application table ([d5c9fa9](https://github.com/dnum-mi/referentiel-applications/commit/d5c9fa9fbbc408d06f41abb999e1e56b4870a2fd))

## [1.10.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.10.1...v1.10.2) (2025-04-11)


### Bug Fixes

* **ci:** :bug: Display version in footer ([2d0e2aa](https://github.com/dnum-mi/referentiel-applications/commit/2d0e2aa5df74f8cc651ae3571e24623238450466))
* **front:** :bug: delete matomo error ([c5872d9](https://github.com/dnum-mi/referentiel-applications/commit/c5872d9e9045504868d288c266a09d7a0a99b178))

## [1.10.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.10.0...v1.10.1) (2025-04-10)


### Bug Fixes

* **ci:** :wrench: rewrite code for tag version ([fa6ca87](https://github.com/dnum-mi/referentiel-applications/commit/fa6ca87dab7cc3a174a42af48f9c5a8afc794749))

## [1.10.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.9.2...v1.10.0) (2025-04-10)


### Features

* :sparkles: Add a new column that display Hosting data for application ([b5a7eae](https://github.com/dnum-mi/referentiel-applications/commit/b5a7eaea5c6dc490d14354460ba25932d85b68cf))

## [1.9.2](https://github.com/dnum-mi/referentiel-applications/compare/v1.9.1...v1.9.2) (2025-04-10)


### Bug Fixes

* **ci:** :bug: Fix release because version in front is down ([a07f742](https://github.com/dnum-mi/referentiel-applications/commit/a07f74233c7523e5aa0b561c799dbbda2dc5b4d8))

## [1.9.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.9.0...v1.9.1) (2025-04-10)


### Bug Fixes

* **api:** :recycle: expose Swaggerjson ([b906951](https://github.com/dnum-mi/referentiel-applications/commit/b906951eb4c417f5a3d15e231fe52fbc76efd700))

## [1.9.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.8.1...v1.9.0) (2025-04-10)


### Features

* **api:** :sparkles: add endpoint for export application in excel ([037507c](https://github.com/dnum-mi/referentiel-applications/commit/037507ce990cf7e61d87605c0347a48e66ed74ae))
* **applications:** :sparkles: allow complete CSV export including relations and arrays ([0cc8ef0](https://github.com/dnum-mi/referentiel-applications/commit/0cc8ef0e508b205d94c527260ed96ad93917f7d2))
* **database:** ✨ create actorType table and update actor tab ([#561](https://github.com/dnum-mi/referentiel-applications/issues/561)) ([7855c59](https://github.com/dnum-mi/referentiel-applications/commit/7855c59f19b2ff951be784c20f80adedd9ca41c4))


### Bug Fixes

* :bug: fix sorting function with a custom function ([fbba2a8](https://github.com/dnum-mi/referentiel-applications/commit/fbba2a8e7855fda9b9b321a9b70b7d1ebb868975))
* **front:** :bug: display version in footer ([8e5fa9c](https://github.com/dnum-mi/referentiel-applications/commit/8e5fa9cc3d3804c53c30dc591adabd0f1cf15968))

## [1.8.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.8.0...v1.8.1) (2025-04-07)


### Bug Fixes

* :bug: rewriting endpoint api path for actors ([e8c9955](https://github.com/dnum-mi/referentiel-applications/commit/e8c9955085b28e194101e39119c9801e4246dc2b))
* **front:** :bug: Improve matomo plugin for search ([81fc4ec](https://github.com/dnum-mi/referentiel-applications/commit/81fc4ecc349864baa92ca6dc4ebf08ffa23c1620))

## [1.8.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.7.1...v1.8.0) (2025-04-03)


### Features

* :sparkles: replace input into suggestions list input for organization for actor ([220bc27](https://github.com/dnum-mi/referentiel-applications/commit/220bc27535d174e36fb3936fbd4315c768d34931))

## [1.7.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.7.0...v1.7.1) (2025-04-03)


### Bug Fixes

* **front:** :pencil2: fix wording in dictionnary event ([49fa89c](https://github.com/dnum-mi/referentiel-applications/commit/49fa89c30d5be77d8e4cce0f59b8249845c51a17))

## [1.7.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.6.1...v1.7.0) (2025-04-03)


### Features

* **api:** :sparkles: add endpoint to delete application ([4dc9c42](https://github.com/dnum-mi/referentiel-applications/commit/4dc9c4234c25c1ee4df8c6d82ac844db440f2baf))
* **front:** ✨ create application front ([#532](https://github.com/dnum-mi/referentiel-applications/issues/532)) ([52ed97c](https://github.com/dnum-mi/referentiel-applications/commit/52ed97cc621b3af78418ead8f6d99ebef993935a))


### Bug Fixes

* **ci:** :bug: add tag version in footer ([5fc9514](https://github.com/dnum-mi/referentiel-applications/commit/5fc95143443c093c216557ad2aeb52b88cad180f))

## [1.6.1](https://github.com/dnum-mi/referentiel-applications/compare/v1.6.0...v1.6.1) (2025-04-02)


### Bug Fixes

* **applications:** :bug: make "label" optional in PATCH /api/v2/applications/{id} ([7654e36](https://github.com/dnum-mi/referentiel-applications/commit/7654e36fc9af37c0daca11389f8bec2b95571563))

## [1.6.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.5.0...v1.6.0) (2025-04-02)


### Features

* :lipstick: add application search table with pagination ([5b795a8](https://github.com/dnum-mi/referentiel-applications/commit/5b795a8217c61134a660fd5d921ada668cf053bc))
* :lipstick: add pagination search ([aea3366](https://github.com/dnum-mi/referentiel-applications/commit/aea3366c0b330c95772aa646abdd57ed1eaad374))
* :lipstick: remove useless undefined variable ([cb26090](https://github.com/dnum-mi/referentiel-applications/commit/cb26090f9ed095bdedf6e7de445a58dfac740db4))
* :sparkles: Add hosting api and ihm ([109fb40](https://github.com/dnum-mi/referentiel-applications/commit/109fb4081c258285a9c02a525119bd24717544aa))
* :sparkles: Add possibility to click on relation target to be redirected on the target ([30b140a](https://github.com/dnum-mi/referentiel-applications/commit/30b140a3fcc6fe4bff90edc1d321e14338104581))

## [1.5.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.4.0...v1.5.0) (2025-03-31)


### Features

* :sparkles: add audience metrics as a link type ([e185c88](https://github.com/dnum-mi/referentiel-applications/commit/e185c88f619073dee1358b9766c820e1018a22bf))
* :sparkles: Add field population cible ([6caf1a2](https://github.com/dnum-mi/referentiel-applications/commit/6caf1a2d14eb9afe68c00f03b9f6dbb435e18afc))
* :sparkles: add priority restart enum ([782bb27](https://github.com/dnum-mi/referentiel-applications/commit/782bb271945cb8782ab4bbd1cec9ba096b6bfddf))
* ✨ add alternative label ([#514](https://github.com/dnum-mi/referentiel-applications/issues/514)) ([cdbd2ae](https://github.com/dnum-mi/referentiel-applications/commit/cdbd2ae02fc2eb91d6755e998799e6088f18ca3f))


### Bug Fixes

* :bug: adding the target label in the include get relation ([8915303](https://github.com/dnum-mi/referentiel-applications/commit/8915303a45c10799503fa9249e0e738bed95084b))

## [1.4.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.3.0...v1.4.0) (2025-03-27)


### Features

* :sparkles: add links module with CRUD operations and DTOs ([#479](https://github.com/dnum-mi/referentiel-applications/issues/479)) ([0e42779](https://github.com/dnum-mi/referentiel-applications/commit/0e42779ad2750501a9022cb5ddcbe3d407d4de6d))

## [1.3.0](https://github.com/dnum-mi/referentiel-applications/compare/v1.2.0...v1.3.0) (2025-03-27)


### Features

* :sparkles: add tag validation on submit to prevent invalid entries ([949eb46](https://github.com/dnum-mi/referentiel-applications/commit/949eb46eee7eb2db903228b42cd8ab5e07953b80))
* :sparkles: fix endpoint to retrieve all organizations ([#496](https://github.com/dnum-mi/referentiel-applications/issues/496)) ([2c29554](https://github.com/dnum-mi/referentiel-applications/commit/2c295547267d511a384dead0bb93ba14489bccd1))

## [1.2.0](https://github.com/dnum-mi/referentiel-applications/compare/1.1.4...v1.2.0) (2025-03-26)


### Features

* :art: add endpoint heath ([#356](https://github.com/dnum-mi/referentiel-applications/issues/356)) ([721f126](https://github.com/dnum-mi/referentiel-applications/commit/721f126b08cf5a8766fa5efaff64d61f7a49073d))
* :art: Create a plugin matomo for vue ([#369](https://github.com/dnum-mi/referentiel-applications/issues/369)) ([06623d4](https://github.com/dnum-mi/referentiel-applications/commit/06623d4aa6b1873e823e22c3c34332ad729f7371))
* :art: improve app.vue for redirect path ([#319](https://github.com/dnum-mi/referentiel-applications/issues/319)) ([1cc5296](https://github.com/dnum-mi/referentiel-applications/commit/1cc5296f62e914b922239de9e5b20a42c38a2769))
* :bricks: adding links in the creation/modif of applications and "autre" in the Type enum ([f0004dd](https://github.com/dnum-mi/referentiel-applications/commit/f0004ddb4d2f7f047d331c316842ce28aa986195))
* :bug: Change name status in lifecycle ([#243](https://github.com/dnum-mi/referentiel-applications/issues/243)) ([b04da4b](https://github.com/dnum-mi/referentiel-applications/commit/b04da4b23a5bd76ff4740465dcfcb730c0404786))
* :bug: creation of link possible when creating an application ([4fbc93b](https://github.com/dnum-mi/referentiel-applications/commit/4fbc93b47819740ddf48210018ad8f85811f6e98))
* :card_file_box: add initial migration ([0be70f4](https://github.com/dnum-mi/referentiel-applications/commit/0be70f47af449743642aa48692c9900795cd5ab8))
* :construction_worker: add format checking job in CI ([a050255](https://github.com/dnum-mi/referentiel-applications/commit/a050255fb57f9e736b339db153be6b4cc0ae569b))
* :lipstick: add and delete compliance button ([8c9492d](https://github.com/dnum-mi/referentiel-applications/commit/8c9492d98e3b9853bc0f4212ed9603580dd0cfad))
* :lipstick: add and delete compliance button ([bdce02e](https://github.com/dnum-mi/referentiel-applications/commit/bdce02efe58220f80d1e799d064fa006cc79e405))
* :lipstick: add and delete compliance button ([e24e7ba](https://github.com/dnum-mi/referentiel-applications/commit/e24e7bad89975ea1f7ce215a73e0468e4ab07eb9))
* :lipstick: Add click for links ([#358](https://github.com/dnum-mi/referentiel-applications/issues/358)) ([0d09b30](https://github.com/dnum-mi/referentiel-applications/commit/0d09b30da58c47a70088739b74cd72c64df6fb53))
* :lipstick: Add information in profil application ([#209](https://github.com/dnum-mi/referentiel-applications/issues/209)) ([22dc48c](https://github.com/dnum-mi/referentiel-applications/commit/22dc48c0e86cd5f7972d970869836b95f65844ae))
* :lipstick: add link button ([#316](https://github.com/dnum-mi/referentiel-applications/issues/316)) ([6e69461](https://github.com/dnum-mi/referentiel-applications/commit/6e69461f43598227516f22b95afefeee5c664caa))
* :lipstick: add loader icon in the reports page ([#461](https://github.com/dnum-mi/referentiel-applications/issues/461)) ([21bb899](https://github.com/dnum-mi/referentiel-applications/commit/21bb899531f428de2b411d157f1e121955626de5))
* :lipstick: Add signalement in tab profile application ([#233](https://github.com/dnum-mi/referentiel-applications/issues/233)) ([2c8ddff](https://github.com/dnum-mi/referentiel-applications/commit/2c8ddffade7a402b44b9bcaf25ae16b158e1ec4c))
* :lipstick: adding pagination in the reporting tab ([bad44d6](https://github.com/dnum-mi/referentiel-applications/commit/bad44d6d025c6d1a5d563caaf53bbd60a9bfc63e))
* :lipstick: change status of anomaly ([13682d1](https://github.com/dnum-mi/referentiel-applications/commit/13682d14af72dab5426b201dea0be7d8e630e211))
* :lipstick: change the status of reports ([77ac554](https://github.com/dnum-mi/referentiel-applications/commit/77ac5540159216eea9ba7c3439d22a8c8aa3d8fc))
* :lipstick: comments removed ([a0f680e](https://github.com/dnum-mi/referentiel-applications/commit/a0f680e84d8e175b722622c53699bf6d1adf17ab))
* :lipstick: formatted code ([7bdff4c](https://github.com/dnum-mi/referentiel-applications/commit/7bdff4c15b41a9710c22bba128d86312a7095a7d))
* :lipstick: formatted code ([4e1d84a](https://github.com/dnum-mi/referentiel-applications/commit/4e1d84a01f34274883dbe860777025e99d9e8fb8))
* :lipstick: integrate live search results dropdown in header search bar ([#364](https://github.com/dnum-mi/referentiel-applications/issues/364)) ([e1b417a](https://github.com/dnum-mi/referentiel-applications/commit/e1b417a4f4269542e47da716dbe48afcdb170537))
* :lipstick: put compliance cards ([6a8245a](https://github.com/dnum-mi/referentiel-applications/commit/6a8245a7890b5b2463585340a2cd0e5a1442fc5e))
* :lipstick: redesign reports page ([#418](https://github.com/dnum-mi/referentiel-applications/issues/418)) ([e1ed7b1](https://github.com/dnum-mi/referentiel-applications/commit/e1ed7b1d8fbece8f0b1dc267ff253ee65f5a1f3b))
* :lipstick: remove the visible id in the code ([88d578a](https://github.com/dnum-mi/referentiel-applications/commit/88d578a78ee01b73acd6c01f3f0575e97ceb5175))
* :lipstick: view statuses in the tracking table ([#250](https://github.com/dnum-mi/referentiel-applications/issues/250)) ([89f6a8b](https://github.com/dnum-mi/referentiel-applications/commit/89f6a8b47cc705bf4961c83ece6bf85ae52a16d2))
* :lock: add krakend and keycloak oidc with authorization code flow ([0e5014b](https://github.com/dnum-mi/referentiel-applications/commit/0e5014ba36197aedac7e4e624ccf573009b6a33f))
* :lock: add oidc login to swagger ([4f5f150](https://github.com/dnum-mi/referentiel-applications/commit/4f5f150dbbcba7636342c2a51b48301c3564bb24))
* :loud_sound: Add action for all request ([5a71167](https://github.com/dnum-mi/referentiel-applications/commit/5a711676047dea2820170a51ad6ef735e6920f11))
* :loud_sound: Add action for all request ([67a1fa9](https://github.com/dnum-mi/referentiel-applications/commit/67a1fa92c87f91913238595d1b57af0e800c9876))
* :loud_sound: Add combinedInterceptor for create log ([3352b0b](https://github.com/dnum-mi/referentiel-applications/commit/3352b0b1a3d9fa3f183fd7edcea259eee19665d3))
* :loud_sound: Add combinedInterceptor for create log ([87b8100](https://github.com/dnum-mi/referentiel-applications/commit/87b8100556d2272dfa96f68fc3400fc3f432db5b))
* :loud_sound: write logs as json using pino ([36c6809](https://github.com/dnum-mi/referentiel-applications/commit/36c680994e8f7d2af85df007adf34970a47329e5))
* :memo: Add parmas in swagger for searchapplications ([#146](https://github.com/dnum-mi/referentiel-applications/issues/146)) ([8c3c891](https://github.com/dnum-mi/referentiel-applications/commit/8c3c89154f34a0d4c7801aa22731e22dd47a24a2))
* :recycle: Change mandatorylink ans delete link grist ([#169](https://github.com/dnum-mi/referentiel-applications/issues/169)) ([ae91371](https://github.com/dnum-mi/referentiel-applications/commit/ae91371ad358d59a4f000035680deb25dc0ece5c))
* :sparkles: add application ID display in InformationsGenerales component ([7ac4e45](https://github.com/dnum-mi/referentiel-applications/commit/7ac4e452bacf23b784b01f51d5c3da4041867649))
* :sparkles: add application patch feature ([eea313c](https://github.com/dnum-mi/referentiel-applications/commit/eea313c69786b05437c6aa535f28286fe8d4829d))
* :sparkles: add AUTH_VERIFY_JWT feature flag ([6ad8571](https://github.com/dnum-mi/referentiel-applications/commit/6ad85713070fb4ad3245fcefc7f9084c21ccea68))
* :sparkles: Add date in lifecycle and compliance ([#223](https://github.com/dnum-mi/referentiel-applications/issues/223)) ([244a0b7](https://github.com/dnum-mi/referentiel-applications/commit/244a0b73bf29a955fba21a72571b3f1764ca33e1))
* :sparkles: Add enum in actor table ([#301](https://github.com/dnum-mi/referentiel-applications/issues/301)) ([4af246e](https://github.com/dnum-mi/referentiel-applications/commit/4af246e4673b43947f975d9eddc981c46f7a61f1))
* :sparkles: add ESLint configuration and integrate linting script in package.json ([2d2b6fb](https://github.com/dnum-mi/referentiel-applications/commit/2d2b6fb5dd605cf8fdf35e1ade9a1671ceaaaeaf))
* :sparkles: add ExternalRessource Table ([c3ee377](https://github.com/dnum-mi/referentiel-applications/commit/c3ee37797c41bf539539cc8a43747ed479ddf36d))
* :sparkles: Add in frontend firstname, lastname and organization for actor ([a7fbefc](https://github.com/dnum-mi/referentiel-applications/commit/a7fbefc7c227822d6b8e4901da27498934d9ee7e))
* :sparkles: Add Organization model and modify Actor model with migration ([fe1bc65](https://github.com/dnum-mi/referentiel-applications/commit/fe1bc65d29c9fb3c8a19db6a1ffd07ccb379be56))
* :sparkles: add possibility to search app with link ([#368](https://github.com/dnum-mi/referentiel-applications/issues/368)) ([515bf7c](https://github.com/dnum-mi/referentiel-applications/commit/515bf7c52851481761fc21cd893e9de9f5dc8595))
* :sparkles: Add relation ihm and api ([a6d7b4a](https://github.com/dnum-mi/referentiel-applications/commit/a6d7b4aac20136499bb1b2c8bf8ff43970beba98))
* :sparkles: Add relation ihm and api ([4cac01f](https://github.com/dnum-mi/referentiel-applications/commit/4cac01ffc6c42eea95dfbb91b7c6aeae8aabfb62))
* :sparkles: Add relationship in application API ([31e0dc1](https://github.com/dnum-mi/referentiel-applications/commit/31e0dc1b2b57d81f4012152b8e96bc2e27d38f0f))
* :sparkles: Add submission report ([#181](https://github.com/dnum-mi/referentiel-applications/issues/181)) ([5ba0578](https://github.com/dnum-mi/referentiel-applications/commit/5ba0578562cb732de6969f7b418fc70e5fab8d8e))
* :sparkles: add update or delete relation in front ([45abab7](https://github.com/dnum-mi/referentiel-applications/commit/45abab76cdadce021caadc30794d71aff22b20bf))
* :sparkles: Add. module search, export, and product page ([#138](https://github.com/dnum-mi/referentiel-applications/issues/138)) ([23b10c2](https://github.com/dnum-mi/referentiel-applications/commit/23b10c25a726322d6f809bfede4336947e9c2777))
* :sparkles: backEnd route get all applications ([d949b50](https://github.com/dnum-mi/referentiel-applications/commit/d949b50f9528369d046f4e06145b10a7025aa1de))
* :sparkles: implement JWT authentication using jose library and refactor auth middleware ([dbf83e9](https://github.com/dnum-mi/referentiel-applications/commit/dbf83e97d08a0dd5545460eb4c10754dba0636ef))
* :sparkles: middleware backend ([2d7eca9](https://github.com/dnum-mi/referentiel-applications/commit/2d7eca9ba7661a8eef64e98eac33e662ec0cbe91))
* :sparkles: Possibility to search applications by tag ([0688f93](https://github.com/dnum-mi/referentiel-applications/commit/0688f93252ef04d1503e1a80bedc834b0e1a79db))
* :sparkles: refactor authentication handling and improve error messaging in application profile ([0e2ca2b](https://github.com/dnum-mi/referentiel-applications/commit/0e2ca2b5c1d112772262f51d0042222b4938082d))
* :sparkles: refactor event creation to use metadata and application connection ([ec4e49e](https://github.com/dnum-mi/referentiel-applications/commit/ec4e49e345005c6fa27115e13e685aa2efee6400))
* :sparkles: Refactor event handling and introduce Metadatas module with related migrations ([5567718](https://github.com/dnum-mi/referentiel-applications/commit/55677186dccece8627323e04ab421ed62efba864))
* :sparkles: refactor Matomo configuration for env variable support ([4bc0093](https://github.com/dnum-mi/referentiel-applications/commit/4bc009346e2b3e64da247e3fdca4474063ff2f2e))
* :sparkles: remove Lifecycle model and related references from Application and Events ([99ded0e](https://github.com/dnum-mi/referentiel-applications/commit/99ded0ec18da39b2460fb88db0c27367b24a6163))
* :sparkles: update frontend dependencies to fix security vulnerabilities ([ad2b275](https://github.com/dnum-mi/referentiel-applications/commit/ad2b275dc8f6db90bbecdc4aed3e2c83f8d62920))
* :sparkles: update InformationsGenerales component to display parent application details ([739f104](https://github.com/dnum-mi/referentiel-applications/commit/739f104f4a1af501a69bbd553783a3cdadbd519f))
* :sparkles: update Matomo environment variable references for consistency ([4c3858c](https://github.com/dnum-mi/referentiel-applications/commit/4c3858cfc6fb79ea8a81d92e6cf65c96b2f3f85b))
* :sparkles: update or remove relations ([0cad257](https://github.com/dnum-mi/referentiel-applications/commit/0cad2573b09b697a6f8be8ee15293f7ea60c899c))
* :sparkles: use krakend as api gateway in front of the nestjs api ([ba05efa](https://github.com/dnum-mi/referentiel-applications/commit/ba05efa43d7ac7048e62386325f908e9b4760145))
* :technologist: add prettier to monorepo ([0697c07](https://github.com/dnum-mi/referentiel-applications/commit/0697c071ade8683282ef50fa2e3b384762e3b308))
* :white_check_mark: add simple get tests for applications and notifications ([5afbd02](https://github.com/dnum-mi/referentiel-applications/commit/5afbd023b6fc11273368f193063a944304bb97e5))
* :wrench: add basic scope to oidc client ([#132](https://github.com/dnum-mi/referentiel-applications/issues/132)) ([beab631](https://github.com/dnum-mi/referentiel-applications/commit/beab631d480e87bc904b6b6cc3929fb839b620ae))
* ✨ add events entity ([2746e6a](https://github.com/dnum-mi/referentiel-applications/commit/2746e6a41db09605498257d926608da29eef2881))


### Bug Fixes

* :art: display se-connecter ([#157](https://github.com/dnum-mi/referentiel-applications/issues/157)) ([d51c275](https://github.com/dnum-mi/referentiel-applications/commit/d51c275940f3868d7ca249ff5bbd8729998732f0))
* :art: Fix Backend Files: Correct Prisma and DTO for Data Integration ([#140](https://github.com/dnum-mi/referentiel-applications/issues/140)) ([bc38ac6](https://github.com/dnum-mi/referentiel-applications/commit/bc38ac680fe4a9306d62a12a06293b9012cd1f54))
* :art: fix docker compose ([1530c18](https://github.com/dnum-mi/referentiel-applications/commit/1530c1857790d1f4ff0470a9279f851e347df5bc))
* :bug: add case insensitive for searching applications ([#353](https://github.com/dnum-mi/referentiel-applications/issues/353)) ([c45ee21](https://github.com/dnum-mi/referentiel-applications/commit/c45ee21a42fbee8da9c81eb1ed18761fd2520306))
* :bug: add comma in cors origin list ([96fa692](https://github.com/dnum-mi/referentiel-applications/commit/96fa692b96df971b5d06321c88c78db75c5235e4))
* :bug: add comma in cors origin list ([fda0e37](https://github.com/dnum-mi/referentiel-applications/commit/fda0e37a6b911b5850b0f57614ef01b669fd4872))
* :bug: add error logging in auth middleware for better debugging ([59ff9a0](https://github.com/dnum-mi/referentiel-applications/commit/59ff9a07fd036acb6ccfbaf5357f9fbd96f65639))
* :bug: Add optional `id` to relations and populate before setting as primary key ([442c241](https://github.com/dnum-mi/referentiel-applications/commit/442c241a681286437125c644cac32acf5bd07b2b))
* :bug: ensure app is closed only if it exists in afterEach cleanup ([b9ff8db](https://github.com/dnum-mi/referentiel-applications/commit/b9ff8db3464d3b593e0752081a38d7dd1b5181b1))
* :bug: exclude /api/v2/health-check from authentication ([#359](https://github.com/dnum-mi/referentiel-applications/issues/359)) ([a8bf74a](https://github.com/dnum-mi/referentiel-applications/commit/a8bf74a87a45c48a0d2c5d9dcf7527db5c428d5f))
* :bug: Fix contact and link footer ([#244](https://github.com/dnum-mi/referentiel-applications/issues/244)) ([025c0ab](https://github.com/dnum-mi/referentiel-applications/commit/025c0ab166e1008ac760ea4a6f951bf8162b181d))
* :bug: fix response status code when no notifications found ([847d758](https://github.com/dnum-mi/referentiel-applications/commit/847d758b1694c0485f4dd67093f36b1e1fda88eb))
* :bug: Fix wording in ci ([#234](https://github.com/dnum-mi/referentiel-applications/issues/234)) ([47fb922](https://github.com/dnum-mi/referentiel-applications/commit/47fb922a4dffe132d62b4f874fa1f42832d87436))
* :bug: Fixing externalRessource schema in patch Application schema ([#324](https://github.com/dnum-mi/referentiel-applications/issues/324)) ([4e8129b](https://github.com/dnum-mi/referentiel-applications/commit/4e8129be1bededc045f757d9c9ee4d8055e2da9c))
* :bug: remove pretty json for logger ([2305ca6](https://github.com/dnum-mi/referentiel-applications/commit/2305ca6e440baa28ecbecf2de42f0505ae938f4c))
* :bug: remove pretty json for logger ([3257349](https://github.com/dnum-mi/referentiel-applications/commit/325734949292e4bd07ce4934e8610b9f43a19a87))
* :bug: update CI workflow to use pnpm for package management and streamline test database setup ([5657809](https://github.com/dnum-mi/referentiel-applications/commit/5657809ed7e773d76be9683cb75adb439a8aab11))
* :fire: Delete file client ([#303](https://github.com/dnum-mi/referentiel-applications/issues/303)) ([45f55d2](https://github.com/dnum-mi/referentiel-applications/commit/45f55d2e2fab8584becc3f62f24bb4c32349635a))
* :green_heart: fix release please configuration ([29165a5](https://github.com/dnum-mi/referentiel-applications/commit/29165a5157cbeecc346ca9601e7abf4fbb2dbc4b))
* :lipstick: comment link connection in header ([#155](https://github.com/dnum-mi/referentiel-applications/issues/155)) ([c2a827d](https://github.com/dnum-mi/referentiel-applications/commit/c2a827d4ae99780339f12cffc30cd8fa9284565c))
* :lipstick: Display search application without connection ([#154](https://github.com/dnum-mi/referentiel-applications/issues/154)) ([83cc6e4](https://github.com/dnum-mi/referentiel-applications/commit/83cc6e4c57c27f774d60dd09658f39408813ac00))
* :pencil2: fix typos inside the footer ([1637f76](https://github.com/dnum-mi/referentiel-applications/commit/1637f76b7572983b1424c90410f72b9f2e9b95ed))
* :technologist: Delete token in log and add pretty json for dev ([#241](https://github.com/dnum-mi/referentiel-applications/issues/241)) ([1f3d8e9](https://github.com/dnum-mi/referentiel-applications/commit/1f3d8e94589cd196b4016e7ca5b54be79d082a7d))
* :wastebasket: clean router and remove navigation auth ([aa614c1](https://github.com/dnum-mi/referentiel-applications/commit/aa614c1bfec060d86e891f327db01cce23029f77))
* :wrench: fix krakend status code output ([1a557cc](https://github.com/dnum-mi/referentiel-applications/commit/1a557cceffcdc67375fb9b9c8b8e9f908b98ae96))
* :wrench: keycloak allowed origins ([1fadd79](https://github.com/dnum-mi/referentiel-applications/commit/1fadd792874f8988da3d96ebd64d88a4fc0a8288))
* :wrench: update api base url ([0518371](https://github.com/dnum-mi/referentiel-applications/commit/05183710041d4583308be3acaffabbee0a5bafaf))
