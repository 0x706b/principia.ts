import * as N from './number'
import * as O from './Ord'
import * as P from './prelude'

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Eq: P.Eq<Date> = P.Eq((x, y) => x.valueOf() === y.valueOf())

export const EqDate: P.Eq<Date> = P.Eq((x, y) => x.getDate() === y.getDate())

export const EqMonth: P.Eq<Date> = P.Eq((x, y) => x.getMonth() === y.getMonth())

export const EqYear: P.Eq<Date> = P.Eq((x, y) => x.getFullYear() === y.getFullYear())

export const Ord: P.Ord<Date> = O.contramap_(N.Ord, (date) => date.valueOf())

export const Show: P.Show<Date> = P.Show((d) => d.toISOString())
