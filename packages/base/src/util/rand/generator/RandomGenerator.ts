export default interface RandomGenerator {
  next(): number
  jump?(): RandomGenerator
  min(): number //inclusive
  max(): number //inclusive
}

function generateN(rng: RandomGenerator, num: number): number[] {
  const out: number[] = []
  for (let idx = 0; idx != num; ++idx) {
    const nextOut = rng.next()
    out.push(nextOut)
  }
  return out
}

function skipN(rng: RandomGenerator, num: number): void {
  generateN(rng, num)
}

export { generateN, RandomGenerator, skipN }
