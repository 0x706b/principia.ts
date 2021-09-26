# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.18.1](https://github.com/0x706b/principia.ts/compare/@principia/test@0.18.0...@principia/test@0.18.1) (2021-09-26)

**Note:** Version bump only for package @principia/test





# [0.18.0](https://github.com/0x706b/principia.ts/compare/@principia/test@0.17.1...@principia/test@0.18.0) (2021-09-26)


### Features

* **base/future:** rename `Promise` -> `Future` and implement fluent static definitions ([177954e](https://github.com/0x706b/principia.ts/commit/177954e0690bbaca511aa71b38f7c6ea303b160c))





## [0.17.1](https://github.com/0x706b/principia.ts/compare/@principia/test@0.17.0...@principia/test@0.17.1) (2021-09-19)

**Note:** Version bump only for package @principia/test





# [0.17.0](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.7...@principia/test@0.17.0) (2021-09-19)

**Note:** Version bump only for package @principia/test





## [0.16.7](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.6...@principia/test@0.16.7) (2021-09-19)

**Note:** Version bump only for package @principia/test





## [0.16.6](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.5...@principia/test@0.16.6) (2021-09-17)

**Note:** Version bump only for package @principia/test





## [0.16.5](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.4...@principia/test@0.16.5) (2021-09-17)

**Note:** Version bump only for package @principia/test





## [0.16.4](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.3...@principia/test@0.16.4) (2021-09-13)

**Note:** Version bump only for package @principia/test





## [0.16.3](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.2...@principia/test@0.16.3) (2021-09-13)

**Note:** Version bump only for package @principia/test





## [0.16.2](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.1...@principia/test@0.16.2) (2021-09-13)


### Reverts

* Revert "chore(release): publish" ([e74414e](https://github.com/0x706b/principia.ts/commit/e74414effa51392092770ecd542b55608dbb1201))





## [0.16.1](https://github.com/0x706b/principia.ts/compare/@principia/test@0.16.1...@principia/test@0.16.1) (2021-09-13)


### Reverts

* Revert "chore(release): publish" ([e74414e](https://github.com/0x706b/principia.ts/commit/e74414effa51392092770ecd542b55608dbb1201))





# [0.16.0](https://github.com/0x706b/principia.ts/compare/@principia/test@0.15.0...@principia/test@0.16.0) (2021-09-12)


### Bug Fixes

* **base/async:** add `Match` to `Async` interpreter ([25a3b89](https://github.com/0x706b/principia.ts/commit/25a3b890909545c874879c2885cbe42b66f0e3df))
* **test/failuremessage:** add `tabSize` to `showValue` offset ([5f0b2bf](https://github.com/0x706b/principia.ts/commit/5f0b2bfdaba6b88527112898278f1b513294c42a))
* **test/testclock:** use structural equality for `TestClock.suspended` and `TestClock.awaitSuspended` ([39d904c](https://github.com/0x706b/principia.ts/commit/39d904c1d0d893d5a424b3f6d7cd9061b5fb1049))


### Features

* **base/cause:** make `Cause` generic on `Id` ([4b54095](https://github.com/0x706b/principia.ts/commit/4b5409595ffb7554c64a2982124258f44f4104e2))
* **base/hkt:** remove `N` type parameter ([adbbe7c](https://github.com/0x706b/principia.ts/commit/adbbe7cb709177b6b3cbd9cb6050fc76e719d7a1)), closes [Effect-TS/core#585](https://github.com/Effect-TS/core/issues/585) [gcanti/fp-ts#1413](https://github.com/gcanti/fp-ts/issues/1413)
* **base/struct:** move `Struct` to `HeterogeneousRecord`, add `Struct` wrapper datatype ([73cd759](https://github.com/0x706b/principia.ts/commit/73cd759804060615f28f81a27e6659208f4e0539))
* **compile:** add `tag` transformer ([2f1d618](https://github.com/0x706b/principia.ts/commit/2f1d6186a69804b169d7dc2eb96346d612fd3582))
* reorder parameters of functions on indexed collections ([e443a86](https://github.com/0x706b/principia.ts/commit/e443a86d4f91c80a2919070f23cc28755af561d0))
* **test/assertionvalue:** allow `offset` to be passed to `showValue` for better formatting ([d0798cd](https://github.com/0x706b/principia.ts/commit/d0798cd3c175be7db9e8aece9ceaa699d9190096))
* **test:** add `testAsync` ([99eb5e2](https://github.com/0x706b/principia.ts/commit/99eb5e20f87ee4aa1b75e6c6853fa76f4e51812d))
* **test:** add fluent definitions for `Gen` ([d342f08](https://github.com/0x706b/principia.ts/commit/d342f08f60f3c2bf26729250d7f8de448156b6c3))


### Performance Improvements

* **base/io:** improve the performance of `IO` and its interpreter ([04ef717](https://github.com/0x706b/principia.ts/commit/04ef717d293ba83cce4d49c21e6abd0848a81c75))





# 0.15.0 (2021-07-08)


### Features

* initial commit ([c1d1865](https://github.com/0x706b/principia.ts/commit/c1d1865d93b8c7762c4cdfa912360f467c0bae02))
