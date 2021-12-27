# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.21.0](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.20.0...@principia/compile@0.21.0) (2021-12-27)


### Features

* **compile:** allow recursive expressions inside optimized gen ([64b8456](https://github.com/0x706b/principia.ts/commit/64b8456b947ec2c47d4e0f707c7b44aad44c0a1e))





# [0.20.0](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.19.2...@principia/compile@0.20.0) (2021-12-15)


### Bug Fixes

* **channel:** re-port `ChannelExecutor` (via ZIO) ([03440a9](https://github.com/0x706b/principia.ts/commit/03440a9b0fd0f7984738893ea18710593cf30239))


### Features

* **compile:** add `gen` optimization for simple cases ([bf7d405](https://github.com/0x706b/principia.ts/commit/bf7d405dc97c1f8bfb7d3ec76cac113d598fea5a))
* **observable:** add `ReaderObservable` ([6507f16](https://github.com/0x706b/principia.ts/commit/6507f165e61530d79589e5e1f2f8712126ac0f60))
* **typelevel:** add `typelevel` package ([ebf39fc](https://github.com/0x706b/principia.ts/commit/ebf39fc0fe9decdd06dbbf33add0e532cdeccb2d))


### Performance Improvements

* **channel:** decrease `crossSecond` closures; remove bound functions from `Chunk` ([aa4c2c9](https://github.com/0x706b/principia.ts/commit/aa4c2c98a74b84854cb159804a16bd58dacb5fdb))





## [0.19.2](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.19.1...@principia/compile@0.19.2) (2021-10-10)


### Bug Fixes

* **compile:** add a no-op condition for `dataFirstConstraint` tag ([19337b9](https://github.com/0x706b/principia.ts/commit/19337b956db3e13e831fe7e6eebfe63814dc7e8e))





## [0.19.1](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.19.0...@principia/compile@0.19.1) (2021-10-07)


### Bug Fixes

* **compile:** check for dataFirstTag ([fd52dbb](https://github.com/0x706b/principia.ts/commit/fd52dbba2f89c0ea2211312f32b5b4d82f0a0074))





# [0.19.0](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.18.0...@principia/compile@0.19.0) (2021-09-26)


### Features

* **base/io:** add static definitions for fluent `IO` ([6fc18bb](https://github.com/0x706b/principia.ts/commit/6fc18bb0090cdb94f3b351e10171e30136bbdb90))
* **compile:** add `rewriteStatic` support ([5a17715](https://github.com/0x706b/principia.ts/commit/5a177153444974818bf39d4e10d3067e8598440e))





# [0.18.0](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.17.3...@principia/compile@0.18.0) (2021-09-19)

**Note:** Version bump only for package @principia/compile





## [0.17.3](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.17.2...@principia/compile@0.17.3) (2021-09-19)

**Note:** Version bump only for package @principia/compile





## [0.17.2](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.17.1...@principia/compile@0.17.2) (2021-09-17)

**Note:** Version bump only for package @principia/compile





## [0.17.1](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.17.0...@principia/compile@0.17.1) (2021-09-17)

**Note:** Version bump only for package @principia/compile





# [0.17.0](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.16.2...@principia/compile@0.17.0) (2021-09-13)


### Features

* **compile:** separate internal utils ([138450c](https://github.com/0x706b/principia.ts/commit/138450cd24edde829e03ca38a6a1cf9b9c51cdae))





## [0.16.2](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.16.1...@principia/compile@0.16.2) (2021-09-13)


### Reverts

* Revert "chore(release): publish" ([e74414e](https://github.com/0x706b/principia.ts/commit/e74414effa51392092770ecd542b55608dbb1201))





## [0.16.1](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.16.1...@principia/compile@0.16.1) (2021-09-13)


### Reverts

* Revert "chore(release): publish" ([e74414e](https://github.com/0x706b/principia.ts/commit/e74414effa51392092770ecd542b55608dbb1201))





# [0.16.0](https://github.com/0x706b/principia.ts/compare/@principia/compile@0.15.0...@principia/compile@0.16.0) (2021-09-12)


### Features

* **compile:** add `tag` transformer ([2f1d618](https://github.com/0x706b/principia.ts/commit/2f1d6186a69804b169d7dc2eb96346d612fd3582))
* **compile:** handle `tag` transformer edge cases ([b409db9](https://github.com/0x706b/principia.ts/commit/b409db9670c30dc1bd29de1d768338ff9bf50ba4))
* **fluent/array:** improve fluent `Array` definitions ([53f1084](https://github.com/0x706b/principia.ts/commit/53f10848563b314235d07b896c065f0d8feed638))





# 0.15.0 (2021-07-08)


### Features

* initial commit ([c1d1865](https://github.com/0x706b/principia.ts/commit/c1d1865d93b8c7762c4cdfa912360f467c0bae02))
