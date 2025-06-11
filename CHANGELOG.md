# Changelog

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
