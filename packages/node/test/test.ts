import { pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as S from '@principia/base/Stream'

import * as fs from '../src/fs'
import * as zlib from '../src/zlib'

const stream1    = fs.createReadStream('./test/text.txt')
const transform1 = zlib.gzip()

const stream2    = fs.createReadStream('./test/text3.txt')
const transform2 = zlib.gunzip()

pipe(
  stream1,
  transform1,
  S.run(fs.createWriteSink('./test/text3.txt')),
  I.crossSecond(pipe(stream2, transform2, S.run(fs.createWriteSink('./test/text4.txt')))),
  I.run((ex) => console.log(ex))
)
