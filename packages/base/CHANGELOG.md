# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.16.4](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.3...@principia/base@0.16.4) (2021-09-13)


### Bug Fixes

* **base/array:** fluent `last` should be `rewrite` ([c3f12bf](https://github.com/0x706b/principia.ts/commit/c3f12bf7117002087b9b815170e5c3b0de7b8857))
* **base/async:** fluent definitions should rewrite to data-first variants ([2c2dc33](https://github.com/0x706b/principia.ts/commit/2c2dc33d17262144f32cba9f37b6d645e2ea5888))





## [0.16.3](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.2...@principia/base@0.16.3) (2021-09-13)

**Note:** Version bump only for package @principia/base





## [0.16.2](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.1...@principia/base@0.16.2) (2021-09-13)


### Reverts

* Revert "chore(release): publish" ([e74414e](https://github.com/0x706b/principia.ts/commit/e74414effa51392092770ecd542b55608dbb1201))





## [0.16.1](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.1...@principia/base@0.16.1) (2021-09-13)


### Reverts

* Revert "chore(release): publish" ([e74414e](https://github.com/0x706b/principia.ts/commit/e74414effa51392092770ecd542b55608dbb1201))





# [0.16.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.15.0...@principia/base@0.16.0) (2021-09-12)


### Bug Fixes

* **base/async:** add `Match` to `Async` interpreter ([25a3b89](https://github.com/0x706b/principia.ts/commit/25a3b890909545c874879c2885cbe42b66f0e3df))
* **base/fluent/io:** fix `give*` types ([b6498f8](https://github.com/0x706b/principia.ts/commit/b6498f826d5207d9713549e84b4dac4b2c37e7cf))
* **base/fluent:** export `Dictionary` fluent definitions ([57f38b4](https://github.com/0x706b/principia.ts/commit/57f38b401a6770745da902f83ee925a082512490))
* **base/io:** fix `bracketExit` based on failing test ([e1c5c18](https://github.com/0x706b/principia.ts/commit/e1c5c18fc5fc2d368f27d8d95aca955d53376e58))
* **base/io:** fix `forkAll` ([4b8e907](https://github.com/0x706b/principia.ts/commit/4b8e907027adf97b6f707209e22d124fd027c80e))
* **base/io:** fix `fromAsync` comstructor ([93197d9](https://github.com/0x706b/principia.ts/commit/93197d9993e1f8c9afab70a6e6b53691f0296e8d))
* **base/refm:** fix incorrect infinite recursive call in `AtomicIO.set` ([3945ca4](https://github.com/0x706b/principia.ts/commit/3945ca4f7da447689188599d0eb9709e0109d7b7))
* **base:** fix tests ([4d812ac](https://github.com/0x706b/principia.ts/commit/4d812ac614cc9c9001d6717a23ed7712873561f9))


### Features

* **base/array:** implement `filterIO` and `filterMapIO` ([94c3c4c](https://github.com/0x706b/principia.ts/commit/94c3c4cba996556c33fe4f8f6431aefcb3f72771))
* **base/async:** add fluent definitions for `Async` ([04f6362](https://github.com/0x706b/principia.ts/commit/04f63620f001624e5c62e40aa6be7c26f26d3bca))
* **base/async:** use generic `Cause` and `Exit` for `Async` return type ([f2b90f1](https://github.com/0x706b/principia.ts/commit/f2b90f1e9b227ef84ad555cfc79fb077b01c103c))
* **base/cause:** improve comments and add `dataFirst` annotations ([00a14e9](https://github.com/0x706b/principia.ts/commit/00a14e9d289b8a95e86093f6b8f8430160765b7c))
* **base/cause:** make `Cause` generic on `Id` ([4b54095](https://github.com/0x706b/principia.ts/commit/4b5409595ffb7554c64a2982124258f44f4104e2))
* **base/dictionary:** add `Dictionary` ([b974705](https://github.com/0x706b/principia.ts/commit/b97470535b0ef978ada3a26950acfc058f0b7818))
* **base/eval:** improve performance of `Eval` ([f252697](https://github.com/0x706b/principia.ts/commit/f2526975edf594e4a8de773cd7145d70619c2cee))
* **base/experimental/stream:** implement functions ([1d87b26](https://github.com/0x706b/principia.ts/commit/1d87b2627628ab9347b5c25775978ebeca1f6773))
* **base/fluent:** add `String` fluent definitions ([60d3ee1](https://github.com/0x706b/principia.ts/commit/60d3ee1c8190208534e77f83542d35521e16d35b))
* **base/foldable:** add `every` and `everyM` ([9267bcb](https://github.com/0x706b/principia.ts/commit/9267bcbec187e4ee895ba103e15d1dc58c230a17))
* **base/foldable:** add `exists` and `existsM` ([df63145](https://github.com/0x706b/principia.ts/commit/df631451fbe87c8ea2d7bd14292850253d5f91a5))
* **base/foldable:** add `find` and `findM` ([0324b2e](https://github.com/0x706b/principia.ts/commit/0324b2efd159678015a3bcc0f4c8ed1a8ede97ad))
* **base/foldable:** add `foldMapM` to `Foldable` ([a9a6426](https://github.com/0x706b/principia.ts/commit/a9a642697a30a976c5711cc5797da01553606535))
* **base/foldable:** add `toIterable` ([e7fc956](https://github.com/0x706b/principia.ts/commit/e7fc9562c89f8f21863c8ce01ddc49b7ef10c1a1))
* **base/hkt:** remove `N` type parameter ([adbbe7c](https://github.com/0x706b/principia.ts/commit/adbbe7cb709177b6b3cbd9cb6050fc76e719d7a1)), closes [Effect-TS/core#585](https://github.com/Effect-TS/core/issues/585) [gcanti/fp-ts#1413](https://github.com/gcanti/fp-ts/issues/1413)
* **base/io:** implement boolean combinators ([718abb4](https://github.com/0x706b/principia.ts/commit/718abb4e2e108a8481b7ea42d24f55683377c49c))
* **base/io:** inherit `FiberRef`s in `foreachUnitPar` ([91bfe9f](https://github.com/0x706b/principia.ts/commit/91bfe9fdd17335b5bf8afcd1aeeb593f7d18ac69))
* **base/iterablecollection:** add `IterableCollection` newtype ([bf08903](https://github.com/0x706b/principia.ts/commit/bf089030bb5c99c63809a6d76597e6e93d7b17b0))
* **base/kleisli:** implement `Kleisli` ([e991fd4](https://github.com/0x706b/principia.ts/commit/e991fd428589685f59a56fe67647f55f9f4eeab6))
* **base/managed:** implement `memoize` ([9daa015](https://github.com/0x706b/principia.ts/commit/9daa01552215e9f425cac90f9765a5049305348c))
* **base/newtype:** add `[@optimize](https://github.com/optimize)` annotations ([b25f114](https://github.com/0x706b/principia.ts/commit/b25f114204cf487652b8958aee644068f9876074))
* **base/queue:** complete takers after `unsafeOnQueueEmptySpace` ([8437fe0](https://github.com/0x706b/principia.ts/commit/8437fe0a0665996959b9be0438618d56b8f37d94))
* **base/semimonoidalfunctor:** remove `crossFlat` ([b4764f4](https://github.com/0x706b/principia.ts/commit/b4764f455429cc128d1ff6b97cbfba56c9f45d32))
* **base/showable:** allow `indentationLevel` to be specified in config of `showWithOptions` ([476d27a](https://github.com/0x706b/principia.ts/commit/476d27a323680ec058d1efc94da793d14b17cd0c))
* **base/struct:** move `Struct` to `HeterogeneousRecord`, add `Struct` wrapper datatype ([73cd759](https://github.com/0x706b/principia.ts/commit/73cd759804060615f28f81a27e6659208f4e0539))
* **base/these:** implement `TailRec` instance for `These` ([1afb53a](https://github.com/0x706b/principia.ts/commit/1afb53af4c5ec04ff8231da75145ace42f103848))
* **base/witherable:** add `filterA` ([5f21418](https://github.com/0x706b/principia.ts/commit/5f214187e43dadc69956eeaa0d52fa49823b2463))
* **base:** add `Defer` typeclass ([1450eab](https://github.com/0x706b/principia.ts/commit/1450eab177ba8642252313a4fc2208c7afcf401f))
* **base:** add `TailRec` typeclass, add `foldlM` and `foldrM` to `Foldable` ([96904c0](https://github.com/0x706b/principia.ts/commit/96904c0e43c6a168d0ac9c62a9b1749dfa8dd148))
* **base:** add fluent definitions to `base` ([7fefd4b](https://github.com/0x706b/principia.ts/commit/7fefd4bd19a1e6b5edcca1dbc60893afa17f0fca))
* **base:** expand typeclass instances for many datatypes ([ead485e](https://github.com/0x706b/principia.ts/commit/ead485ea7ca4fb550e561f30e3dc4d97418c3875))
* **base:** implement `chainRec` for several datatypes ([d26fcf1](https://github.com/0x706b/principia.ts/commit/d26fcf17c0ac388df5da916d39aa321f5f4451e4))
* **base:** implement `RemoteData` ([d806fc8](https://github.com/0x706b/principia.ts/commit/d806fc8f114c5516c52e88b1f04a2bd0084c249f))
* **base:** rename `Bind.ts` to `Chain.ts` ([939b90b](https://github.com/0x706b/principia.ts/commit/939b90b28753bebb09385a7ae39e4c1b965471bc))
* **compile:** add `tag` transformer ([2f1d618](https://github.com/0x706b/principia.ts/commit/2f1d6186a69804b169d7dc2eb96346d612fd3582))
* **fluent/array:** improve fluent `Array` definitions ([53f1084](https://github.com/0x706b/principia.ts/commit/53f10848563b314235d07b896c065f0d8feed638))
* reorder parameters of functions on indexed collections ([e443a86](https://github.com/0x706b/principia.ts/commit/e443a86d4f91c80a2919070f23cc28755af561d0))
* **test:** add `testAsync` ([99eb5e2](https://github.com/0x706b/principia.ts/commit/99eb5e20f87ee4aa1b75e6c6853fa76f4e51812d))


### Performance Improvements

* **base/io:** improve the performance of `IO` and its interpreter ([04ef717](https://github.com/0x706b/principia.ts/commit/04ef717d293ba83cce4d49c21e6abd0848a81c75))
* **base/safefunction:** add optimization annotations ([d466b0d](https://github.com/0x706b/principia.ts/commit/d466b0da579e4f5c8562f4b181186ee1a98625c3))





# 0.15.0 (2021-07-08)


### Features

* initial commit ([c1d1865](https://github.com/0x706b/principia.ts/commit/c1d1865d93b8c7762c4cdfa912360f467c0bae02))
