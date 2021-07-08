export function Mash() {
  let n = 0xefc8249d

  const mash = function (data: string) {
    for (let i = 0; i < data.length; i++) {
      n    += data.charCodeAt(i)
      let h = 0.02519603282416938 * n
      n     = h >>> 0
      h    -= n
      h    *= n
      n     = h >>> 0
      h    -= n
      n    += h * 0x100000000 // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10 // 2^-32
  }

  return mash
}