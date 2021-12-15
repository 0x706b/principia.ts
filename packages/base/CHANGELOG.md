# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.28.4](https://github.com/0x706b/principia.ts/compare/@principia/base@0.28.3...@principia/base@0.28.4) (2021-12-15)


### Bug Fixes

* **fluent:** re-fix `IO#toLayer` ([3818c52](https://github.com/0x706b/principia.ts/commit/3818c52507ed1eb6f6fcbde4ab929b158c8579f1))





## [0.28.3](https://github.com/0x706b/principia.ts/compare/@principia/base@0.28.1...@principia/base@0.28.3) (2021-12-15)


### Bug Fixes

* **fluent:** fix `IO#toLayer` fluent definition ([fc92790](https://github.com/0x706b/principia.ts/commit/fc927905960ff5c0205624a8a16fc6fd356c7e55))





## [0.28.2](https://github.com/0x706b/principia.ts/compare/@principia/base@0.28.1...@principia/base@0.28.2) (2021-12-15)


### Bug Fixes

* **fluent:** fix `IO#toLayer` fluent definition ([fc92790](https://github.com/0x706b/principia.ts/commit/fc927905960ff5c0205624a8a16fc6fd356c7e55))





## [0.28.1](https://github.com/0x706b/principia.ts/compare/@principia/base@0.28.0...@principia/base@0.28.1) (2021-12-15)


### Bug Fixes

* **fluent:** fix fluent rewrite locations ([d14ed5a](https://github.com/0x706b/principia.ts/commit/d14ed5ab499f2ecb45714adb343440f1ada44d5d))





# [0.28.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.27.0...@principia/base@0.28.0) (2021-12-15)


### Bug Fixes

* **channel:** finalizer ordering (via ZIO) ([f123df6](https://github.com/0x706b/principia.ts/commit/f123df6ccf44b3e1352851f0902aa083f4f3db8e))
* **channel:** prevent fibers from being interrupted prematurely in `mergeWith` (via ZIO) ([bd9ae2e](https://github.com/0x706b/principia.ts/commit/bd9ae2eb2a501863326aa97be87f89e4aed9bfd0))
* **channel:** re-port `ChannelExecutor` (via ZIO) ([03440a9](https://github.com/0x706b/principia.ts/commit/03440a9b0fd0f7984738893ea18710593cf30239))
* **channel:** undefined `this` in `ChannelExecutor` ([6a9ba4e](https://github.com/0x706b/principia.ts/commit/6a9ba4ef3ffe6270a8847aa23c468aeff47d5d91))
* **channel:** use correct `optimize` tag for `concreteContinuation` ([1872fb0](https://github.com/0x706b/principia.ts/commit/1872fb086decd949fd33c5a58221e718469796df))
* **fiber:** ensure no duplicate causes ([4fc061f](https://github.com/0x706b/principia.ts/commit/4fc061fca939f20ffbdcf01bd075725e21569967))
* **fiber:** stop unwinding stack after encountering finalizer ([a452e78](https://github.com/0x706b/principia.ts/commit/a452e78667c0eaeb9ec43a9736b5aca176985d0c))
* **fluent:** fix fluent definitions ([32aaec8](https://github.com/0x706b/principia.ts/commit/32aaec81e093153cc7108ca98ad7b63baa0ec6b1))
* **io:** revert `never` change ([15c9f7b](https://github.com/0x706b/principia.ts/commit/15c9f7b5b71780aac109991475654b441ed96575))
* **stream:** eagerly emit elements in `Stream#schedule` (via ZIO) ([4a8cadf](https://github.com/0x706b/principia.ts/commit/4a8cadffba712b3bf3cced0357637beab499a4e8))


### Features

* **base:** add `Datum` and `DatumEither` ([3174e92](https://github.com/0x706b/principia.ts/commit/3174e927ba508bf5cd67f7ca4ca0bf6b1747319e))
* **base:** add `DatumThese` ([d4ea272](https://github.com/0x706b/principia.ts/commit/d4ea272835e5ca91faa648faea276bc0ff9c558e))
* **base:** add `Function0` ([1851e15](https://github.com/0x706b/principia.ts/commit/1851e15ec05dbfb4c0e4cd6329800be7d2f0757c))
* **compile:** add `gen` optimization for simple cases ([bf7d405](https://github.com/0x706b/principia.ts/commit/bf7d405dc97c1f8bfb7d3ec76cac113d598fea5a))
* **hkt:** add more performant HKT encoding ([920b12c](https://github.com/0x706b/principia.ts/commit/920b12cd7f52d4b9b3417d544e2818f707b62214))
* **layer:** add `bracket` ([0ab79f0](https://github.com/0x706b/principia.ts/commit/0ab79f0dabc349fcaf51e4060d08b59dcb1aee37))
* **observable:** add `ReaderObservable` ([6507f16](https://github.com/0x706b/principia.ts/commit/6507f165e61530d79589e5e1f2f8712126ac0f60))
* **sink:** add `crossWithPar` (via ZIO) ([c5fb356](https://github.com/0x706b/principia.ts/commit/c5fb35667dfb634a94fee70f595443b8cb187b88))
* **stream:** add `scanReduce` ([2ac8b9e](https://github.com/0x706b/principia.ts/commit/2ac8b9e24c69e7de7f12dee096dcf647cd08c328))
* **stream:** add `tapSink` (via ZIO) ([f073734](https://github.com/0x706b/principia.ts/commit/f073734cf594efd0b600833892ddb8830e88dc4d))
* **stream:** add `zipWithLatest` ([8f30e37](https://github.com/0x706b/principia.ts/commit/8f30e379ae58cc6f93feb141cac38fbbec854328))
* **stream:** add some more combinators ([1f47f43](https://github.com/0x706b/principia.ts/commit/1f47f438f97bc4c1fd4e9c4a3437c59bdc401162))
* **these:** add separated instance functions ([56e2cef](https://github.com/0x706b/principia.ts/commit/56e2cefe44ea311470197eeb2a05e8cdf6f4b14e))
* **typelevel:** add `typelevel` package ([ebf39fc](https://github.com/0x706b/principia.ts/commit/ebf39fc0fe9decdd06dbbf33add0e532cdeccb2d))
* **z:** add `halt` and `haltLazy` ([87f96d6](https://github.com/0x706b/principia.ts/commit/87f96d64af78e7983e6030232d2f53cb9cf1f9d4))
* **z:** use `Cause` for `Z` failure data structure ([525b68d](https://github.com/0x706b/principia.ts/commit/525b68df9bac094576579096053a377a1f0a6387))


### Performance Improvements

* **channel:** decrease `crossSecond` closures; remove bound functions from `Chunk` ([aa4c2c9](https://github.com/0x706b/principia.ts/commit/aa4c2c98a74b84854cb159804a16bd58dacb5fdb))
* **channel:** get rid of `flipCauseEither` (via ZIO) ([0b27792](https://github.com/0x706b/principia.ts/commit/0b27792e9a7ca40d9034aecf1f1e805396ff3dae))
* **stream:** improve `fromIterable` perf ([6930316](https://github.com/0x706b/principia.ts/commit/6930316311b949ac365a0aed53d639dba39c2d71))





# [0.27.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.26.0...@principia/base@0.27.0) (2021-11-06)


### Features

* **base/chunk:** fast Chunk updates (via ZIO) ([54fd286](https://github.com/0x706b/principia.ts/commit/54fd28621f64df7054218bd4722d9b60fc834b18))
* **base:** add Pool (via ZIO) ([25c2a84](https://github.com/0x706b/principia.ts/commit/25c2a847f6fde40178be1e9647b19d4a9605cde6))
* **base:** deprecate old `Stream` implementation ([3f50c02](https://github.com/0x706b/principia.ts/commit/3f50c021fab4a0e4a11c0128cfb56b753da3ab1a))
* **base:** fork `ts-pattern` ([7e62173](https://github.com/0x706b/principia.ts/commit/7e6217340df5739d41b68d929be2f1b298813c57))
* **channel:** do not read ahead in `mergeWith` (via ZIO) ([f5ffa5c](https://github.com/0x706b/principia.ts/commit/f5ffa5c63622067b0a9ce778e8d3734bc2eadace))
* **io:** add higher kinded variants for some combinators ([42ac4d9](https://github.com/0x706b/principia.ts/commit/42ac4d9f6bfd61e0fc0bed34b1bbb9401ab7a2d3))
* **io:** add some `chain*K` combinators ([dd52a15](https://github.com/0x706b/principia.ts/commit/dd52a15561ef1b6203469fe5ed7c604c267077a5))
* **pool:** support max pool size and dependencies, improve shutdown robustness ([8596895](https://github.com/0x706b/principia.ts/commit/8596895b46dde1db8f6147416ac8c78715f55f85))


### Performance Improvements

* **base/Maybe:** constant `Nothing` instance ([65f9ebe](https://github.com/0x706b/principia.ts/commit/65f9ebe4741712c020a0632425de0cc2d1f0aa08))
* **eval:** optimize memoization ([38e1e66](https://github.com/0x706b/principia.ts/commit/38e1e661c1aab32ead83aaa2dbf3034c5314e87c))





# [0.26.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.25.2...@principia/base@0.26.0) (2021-10-10)


### Bug Fixes

* **base:** case mismatch in git ([8264846](https://github.com/0x706b/principia.ts/commit/826484631cf6abde66502dc6c1f3410a24042361))
* **compile:** add a no-op condition for `dataFirstConstraint` tag ([19337b9](https://github.com/0x706b/principia.ts/commit/19337b956db3e13e831fe7e6eebfe63814dc7e8e))


### Features

* **repo:** add CI workflow ([b915130](https://github.com/0x706b/principia.ts/commit/b9151308d2cc41f89364731ef5b3c03d574e567e))





## [0.25.2](https://github.com/0x706b/principia.ts/compare/@principia/base@0.25.1...@principia/base@0.25.2) (2021-10-09)


### Bug Fixes

* `Function.if` parameter order ([2689827](https://github.com/0x706b/principia.ts/commit/2689827e45e3cb1a15d7fe16e6553c756a0c53fe))





## [0.25.1](https://github.com/0x706b/principia.ts/compare/@principia/base@0.25.0...@principia/base@0.25.1) (2021-10-09)


### Bug Fixes

* **test/assertion:** `Iterable.findFirst` no longer exists ([4557703](https://github.com/0x706b/principia.ts/commit/45577031d470df43abb922081e805458e1f97544))





# [0.25.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.24.0...@principia/base@0.25.0) (2021-10-09)


### Features

* **base/these:** add `dataFirst` annotations ([77e1fdd](https://github.com/0x706b/principia.ts/commit/77e1fdda4d4d4e7a2542bde78655589597441d50))





# [0.24.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.23.1...@principia/base@0.24.0) (2021-10-09)


### Features

* **base/array:** add more `dataFirst` annotations ([eeb556f](https://github.com/0x706b/principia.ts/commit/eeb556ffc222f3f04ec6b50008439838824e1a0a))
* **base/async:** add `dataFirst` annotations ([5769dc7](https://github.com/0x706b/principia.ts/commit/5769dc776a0a814a4722e6f717555ccc006db381))
* **base/asynciterable:** add `dataFirst` annotations ([918ae28](https://github.com/0x706b/principia.ts/commit/918ae28eb94e6e7e507b8a62647e2cc9b9cd2c0f))
* **base/boolean:** add `dataFirst` annotations ([1b213c8](https://github.com/0x706b/principia.ts/commit/1b213c818d889de3f15206ee7993e60dddb74c63))
* **base/boolean:** add `match` ([84a9edd](https://github.com/0x706b/principia.ts/commit/84a9eddd64cc0706c6548d77e62a9cdf17afd2fb))
* **base/cause:** add `dataFirst` annotations ([df5a8df](https://github.com/0x706b/principia.ts/commit/df5a8dfe83d50457bf1c6dde4724c8766aa8757f))
* **base/chunk:** add `dataFirst` annotations ([ab1f0f3](https://github.com/0x706b/principia.ts/commit/ab1f0f3cb6a59b28d9b8329e5e12fc9a822185b2))
* **base/const:** add `dataFirst` annotations ([ff5da5b](https://github.com/0x706b/principia.ts/commit/ff5da5b8d205ab2b5355b9a4c1c2a465a6f8a65a))
* **base/either:** add `dataFirst` annotations ([6257c28](https://github.com/0x706b/principia.ts/commit/6257c282ae0a1c5fe0106286fa34b91de051305d))
* **base/eq:** add `dataFirst` annotations ([abaf38c](https://github.com/0x706b/principia.ts/commit/abaf38c141950380e1cff1edbf49876da9f7425f))
* **base/eval:** add `dataFirst` annotations ([c6b1df9](https://github.com/0x706b/principia.ts/commit/c6b1df9c1bde370efc722c7ba7937550361ebed5))
* **base/exit:** add `dataFirst` annotations ([5b8b24e](https://github.com/0x706b/principia.ts/commit/5b8b24ef2605c2e969e9c324ab4d23d22f1dcae7))
* **base/fluent:** add `if` to `Object` fluent definitions ([f5f412c](https://github.com/0x706b/principia.ts/commit/f5f412ceef5a5510f0cf90923789a71f82963592))
* **base/freelist:** add `dataFirst` annotations ([867b5d3](https://github.com/0x706b/principia.ts/commit/867b5d3f30eb42272f8c6112fb4f299ad343036e))
* **base/freesemigroup:** add `dataFirst` annotations ([e65f08a](https://github.com/0x706b/principia.ts/commit/e65f08a735bd5477fa181f76dd894a47070defd1))
* **base/freesemiring:** add `dataFirst` annotations ([f32fc90](https://github.com/0x706b/principia.ts/commit/f32fc9004ca0cbcb0ab090357f203408d060eb22))
* **base/function:** add `dataFirst` annotations ([e8d6191](https://github.com/0x706b/principia.ts/commit/e8d619113174b19b68144ece6fc501d037a9db56))
* **base/hashmap:** add `dataFirst` annotations ([456dfd9](https://github.com/0x706b/principia.ts/commit/456dfd98d8de9b466f88df877e908f9b3db3d102))
* **base/hashset:** add `dataFirst` annotations ([e4e1ef8](https://github.com/0x706b/principia.ts/commit/e4e1ef8e7e58e39471b606947774670ef0817b38))
* **base/heterogeneousrecord:** add `dataFirst` annotations ([3b57486](https://github.com/0x706b/principia.ts/commit/3b57486f42278914adf2f1ad9ccc318f67571680))
* **base/identity:** add `dataFirst` annotations ([2e82751](https://github.com/0x706b/principia.ts/commit/2e82751b03462fabbdc5a174a52c61e6ca97b5cb))
* **base/iterator:** add dataFirst annotations ([dd45bd8](https://github.com/0x706b/principia.ts/commit/dd45bd8acf7dba18e2ad11d68c52611b5997de49))
* **base/list:** add dataFirst annotations ([80eddd6](https://github.com/0x706b/principia.ts/commit/80eddd6470ec873bfd81f1f7c46e1301e8d54475))
* **base/map:** add `dataFirst` annotations ([af72247](https://github.com/0x706b/principia.ts/commit/af72247a8099526fed6244bb59b6e96e0a8aabbe))
* **base/maybe:** add `dataFirst` annotations ([9ecdd98](https://github.com/0x706b/principia.ts/commit/9ecdd98eeb220502e21da645564c93d176ea99f0))
* **base/orderedmap:** add `dataFirst` annotations ([1d29ae0](https://github.com/0x706b/principia.ts/commit/1d29ae02366044ea661da56d33fc1baf1d2c10f1))
* **base/orderedset:** add `dataFirst` annotations ([a63666e](https://github.com/0x706b/principia.ts/commit/a63666e75c621cb7462996ce2e8c51fb6e8b73f6))
* **base/predicate:** add `dataFirst` annotations ([b201c13](https://github.com/0x706b/principia.ts/commit/b201c13f9ecfb33c71d42623ec101460bec66f15))
* **base/reader:** add `dataFirst` annotations ([c317910](https://github.com/0x706b/principia.ts/commit/c317910f632bca61843bf8c764045e0371de7cbb))
* **base/record:** add `dataFirst` annotations ([6a9bc91](https://github.com/0x706b/principia.ts/commit/6a9bc9153122e1cfaec4d98915e28d63dffba509))
* **base/refinement:** add `dataFirst` annotations ([f37c190](https://github.com/0x706b/principia.ts/commit/f37c190e248d9a0b82fbe5f07a2a7b048c7bf256))
* **base/remotedata:** add `dataFirst` annotations ([4e94e4d](https://github.com/0x706b/principia.ts/commit/4e94e4d6ec884ad2bd6a1fa76fad92807b99a67a))
* **base/rosetree:** add `dataFirst` annotations ([375afd8](https://github.com/0x706b/principia.ts/commit/375afd83d901df7f83706e38184f0778153c28cf))
* **base/safefunction:** add `dataFirst` annotations ([ad402af](https://github.com/0x706b/principia.ts/commit/ad402af4c4117d2690e780a2918302807047e841))
* **base/set:** add `dataFirst` annotations ([5a01fc1](https://github.com/0x706b/principia.ts/commit/5a01fc1459b60e65f8054f4e3e64a789591caaf6))
* **base/state:** add `dataFirst` annotations ([4da4270](https://github.com/0x706b/principia.ts/commit/4da4270318cabb06fea6cf976b5d49feba4276e7))
* **base/store:** add `dataFirst` annotations ([0780a96](https://github.com/0x706b/principia.ts/commit/0780a96ba3e430169cd9b7411221d9487dc7f454))
* **base/struct:** add `dataFirst` annotations ([a15e1e4](https://github.com/0x706b/principia.ts/commit/a15e1e4e729d9bcfd34b7a47aec7bb61252eed16))
* **base/sync:** add `dataFirst` annotations ([981a19e](https://github.com/0x706b/principia.ts/commit/981a19e5dc69c15930c30ce3f51c7f053c9f9f1d))
* **base/writer:** add `dataFirst` annotations ([9193c19](https://github.com/0x706b/principia.ts/commit/9193c19a9b83ca82876ffa9e6425206a47f9782a))
* **base/z:** add `dataFirst` annotations ([adf74ec](https://github.com/0x706b/principia.ts/commit/adf74ec1be022c02b369def4a7c01b85c0651231))
* **base/zreader:** add `dataFirst` annotations ([6a23edd](https://github.com/0x706b/principia.ts/commit/6a23edd7a8946a5851350b49a32b6d5c2b038e20))
* **base/zstate:** add `dataFirst` annotations ([ce6d6d5](https://github.com/0x706b/principia.ts/commit/ce6d6d5262310e4f976668de13869a0c9b7f78b5))
* **base:** add *mapA dataFirst annotations ([0bd083e](https://github.com/0x706b/principia.ts/commit/0bd083ef5d68e02caa9015a55fc720d9cdc620bf))





## [0.23.1](https://github.com/0x706b/principia.ts/compare/@principia/base@0.23.0...@principia/base@0.23.1) (2021-10-07)

**Note:** Version bump only for package @principia/base





# [0.23.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.22.3...@principia/base@0.23.0) (2021-10-07)


### Features

* **base/these:** add fluent definitions for `These` ([429dd1c](https://github.com/0x706b/principia.ts/commit/429dd1ca023b228553855168dd94a07187b1cb56))





## [0.22.3](https://github.com/0x706b/principia.ts/compare/@principia/base@0.22.2...@principia/base@0.22.3) (2021-10-06)


### Bug Fixes

* **base/managed:** invalid import ([60681d4](https://github.com/0x706b/principia.ts/commit/60681d4851127702a5ef15a0ab293b6a66a6173f))





## [0.22.2](https://github.com/0x706b/principia.ts/compare/@principia/base@0.22.1...@principia/base@0.22.2) (2021-10-06)


### Bug Fixes

* **base/fluent:** fix fluent types on aliases ([a6c50c1](https://github.com/0x706b/principia.ts/commit/a6c50c1f6a77baf6388ed20e32e7648035fee5f4))





## [0.22.1](https://github.com/0x706b/principia.ts/compare/@principia/base@0.22.0...@principia/base@0.22.1) (2021-10-06)


### Bug Fixes

* **base/fluent:** export global unions correctly ([d75ea6c](https://github.com/0x706b/principia.ts/commit/d75ea6c1527f39e0a7e058e21671a6daa8dd5be8))





# [0.22.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.21.0...@principia/base@0.22.0) (2021-10-06)


### Bug Fixes

* **base/experimental/channel:** fix `Exit` value propagation for `Channels` (from ZIO) ([9c72af8](https://github.com/0x706b/principia.ts/commit/9c72af8586d9c53260bdc61c78a1d93a7a87ddef))
* **base/managed:** fix `chain` finalizers ([63b6d6c](https://github.com/0x706b/principia.ts/commit/63b6d6cd82712334a45112b0002871d2b78d1c31))
* **base/support:** fix `MutableQueue.pollUpTo` ([56534e2](https://github.com/0x706b/principia.ts/commit/56534e2c1726bb4ba2ae788af075c5fc2f91fc4f))


### Features

* **base/managed:** add `onExit` and `onExitFirst` ([627a1fe](https://github.com/0x706b/principia.ts/commit/627a1fe370593b5dd5c8f8c9cab41c7a876e27fc))
* **base/maybe:** rename `Option` -> `Maybe` ([5ab6f0e](https://github.com/0x706b/principia.ts/commit/5ab6f0ee8b8ba03bc839dead064498d018667ebb))
* **node:** use experimental `Stream` in `node` package ([ade264d](https://github.com/0x706b/principia.ts/commit/ade264d3a13df7855a977535121c8f29cb2ab3b5))





# [0.21.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.20.0...@principia/base@0.21.0) (2021-10-04)


### Features

* **base/array:** add `index` to `findMap` ([8f1f325](https://github.com/0x706b/principia.ts/commit/8f1f3254f13a730c9eb79737ecfea3686cf063c2))





# [0.20.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.19.0...@principia/base@0.20.0) (2021-10-03)


### Bug Fixes

* **base/async:** fix `Async` fluent definitions ([20bf414](https://github.com/0x706b/principia.ts/commit/20bf41409d23a76a1204c3045951915c54bc5c04))


### Features

* **base/io:** use `queueMicrotask` in `Scheduler` ([6c100d9](https://github.com/0x706b/principia.ts/commit/6c100d98f55a2e6be03ebad752cc2b49a84f10d9))





# [0.19.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.18.0...@principia/base@0.19.0) (2021-09-26)


### Features

* **base/io:** add `Scheduler` ([0b37bea](https://github.com/0x706b/principia.ts/commit/0b37beaa41cc37e8d6d7b33af754521a232d273d))





# [0.18.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.17.1...@principia/base@0.18.0) (2021-09-26)


### Bug Fixes

* **base/io:** fix some interruption inconsistency ([0259162](https://github.com/0x706b/principia.ts/commit/025916259ae1c2c687e5ccc564e6db57a337d75e))


### Features

* **base/array:** add fluent static definitions for `Array` ([3b07601](https://github.com/0x706b/principia.ts/commit/3b07601c2d4436a21d2ac44ebc947663a27ba94e))
* **base/async:** add fluent static definitions for `Async` ([df08bd7](https://github.com/0x706b/principia.ts/commit/df08bd7465d6d0c5611104a26ab8a108ee7251fe))
* **base/cause:** add fluent static definitions for `Cause` ([296a0b1](https://github.com/0x706b/principia.ts/commit/296a0b13a72147e3883a0f07ae23a4ccf7e172e4))
* **base/chunk:** add fluent static definitions for `Chunk` ([1b09573](https://github.com/0x706b/principia.ts/commit/1b09573b41e4fcd6f1054850d07e9c7a1bd41cfa))
* **base/either:** add fluent static definitions for `Either` ([95bcfed](https://github.com/0x706b/principia.ts/commit/95bcfed32e96b38a9d9e0b9f7799200c9de250f3))
* **base/eval:** add fluent static definitions for `Eval` ([f0ee24e](https://github.com/0x706b/principia.ts/commit/f0ee24e78061ae6222f682b952075265b357ef0a))
* **base/fiberref:** add `FiberRef` fluent static definitions ([f1e2c4e](https://github.com/0x706b/principia.ts/commit/f1e2c4e3e8672ab3b4f702244237f0b8ca229b2e))
* **base/fluent:** add `HashMap` and `HashSet` fluent static definitions ([b2bcd80](https://github.com/0x706b/principia.ts/commit/b2bcd804f4b443bdcb1d340d45851f841ebde1ca))
* **base/fluent:** add fluent static definitions for `Iterable`, `Dictionary`, and `Struct` ([4e9529a](https://github.com/0x706b/principia.ts/commit/4e9529a8269127661bf489f922c27ccc9c6dedca))
* **base/future:** rename `Promise` -> `Future` and implement fluent static definitions ([177954e](https://github.com/0x706b/principia.ts/commit/177954e0690bbaca511aa71b38f7c6ea303b160c))
* **base/io:** add `from` overloads to static fluent definitions ([df11b6c](https://github.com/0x706b/principia.ts/commit/df11b6c85dd40660d0525ca5990af2f3f9859937))
* **base/io:** add instances to static fluent definitions ([0144f73](https://github.com/0x706b/principia.ts/commit/0144f734f37d3b9a1d4983564c4ee997bed90b83))
* **base/io:** add static definitions for fluent `IO` ([6fc18bb](https://github.com/0x706b/principia.ts/commit/6fc18bb0090cdb94f3b351e10171e30136bbdb90))
* **base/layer:** add `Layer` fluent static definitions ([d45b147](https://github.com/0x706b/principia.ts/commit/d45b147c451d68a48f88948350439e9d00e37609))
* **base/managed:** add `Managed` fluent static definitions ([48cbc1c](https://github.com/0x706b/principia.ts/commit/48cbc1cd88ea890f95e9bb99d22f76127327f8d3))
* **base/option:** add fluent static definitions for `Option` ([6a36474](https://github.com/0x706b/principia.ts/commit/6a36474d8a07f649094e3a957bee848f7fcaa5ad))
* **base/queue:** add fluent static definitions for `Queue` ([f15f56b](https://github.com/0x706b/principia.ts/commit/f15f56b2f70c19bd84e7f780b71810219e93d046))
* **base/ref:** add fluent static definitions for `Ref` ([d6c72f5](https://github.com/0x706b/principia.ts/commit/d6c72f597085ba18c2a8f089823fbc9ed3e79bdd))
* **base/schedule:** add `Schedule` fluent static definitions ([a7a06d1](https://github.com/0x706b/principia.ts/commit/a7a06d1e73cceaa19cc5804038a54adf0835b59e))
* **base/sink:** add `Sink` fluent static definitions ([5404947](https://github.com/0x706b/principia.ts/commit/54049476d4d8b6adb5bda3f3e4b73c815b48d494))
* **base/stream:** add `Stream` fluent static definitions ([7696736](https://github.com/0x706b/principia.ts/commit/7696736cc5b4d6ad066402672cf07c00ff6151fe))
* **base/z:** add `Z` fluent static definitions ([6345e4a](https://github.com/0x706b/principia.ts/commit/6345e4a39d7b8b67bce9e2edea452ed08b21c1c6))
* **base:** add support for custom `Hash` and `Eq` to `MutableHashMap` ([185be27](https://github.com/0x706b/principia.ts/commit/185be27bdb57b1a3d0949cf56b6c194587dbd400))





## [0.17.1](https://github.com/0x706b/principia.ts/compare/@principia/base@0.17.0...@principia/base@0.17.1) (2021-09-19)

**Note:** Version bump only for package @principia/base





# [0.17.0](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.7...@principia/base@0.17.0) (2021-09-19)

**Note:** Version bump only for package @principia/base





## [0.16.7](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.6...@principia/base@0.16.7) (2021-09-19)

**Note:** Version bump only for package @principia/base





## [0.16.6](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.5...@principia/base@0.16.6) (2021-09-17)

**Note:** Version bump only for package @principia/base





## [0.16.5](https://github.com/0x706b/principia.ts/compare/@principia/base@0.16.4...@principia/base@0.16.5) (2021-09-17)

**Note:** Version bump only for package @principia/base





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
