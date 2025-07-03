import { isDefined } from '../helpers/types'

export default function transformMatches(result, data) {
  const matches = result.matches
  data.matches = []

  if (!isDefined(matches)) {
    return
  }

  for (let i = 0, len = matches.length; i < len; i += 1) {
    const match = matches[i]
    if (!isDefined(match.indices) || !match.indices.length) {
      return
    }

    const { indices, value } = match

    let obj = {
      indices,
      value
    }

    if (match.key) {
      obj.key = match.key.src
    }

    if (match.idx > -1) {
      obj.refIndex = match.idx
    }

    data.matches.push(obj)
  }
}
