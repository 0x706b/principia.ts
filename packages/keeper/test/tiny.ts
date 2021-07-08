import * as I from '@principia/base/IO'
import * as Q from '@principia/base/Queue'

const q = Q.boundedQueue<string>(10)

I.bind_(q, (q) => Q.offer_(q, 'x'))
