import Config from './config'
import { DOM_EXCEPTION } from './errorMessages'

// Practical scoring function
export default function computeScore(
  results,
  { ignoreFieldNorm = Config.ignoreFieldNorm, signal = {aborted: false} } = {}
) {
  for (let i = 0, len = results.length; i < len; i += 1) {
    if (signal.aborted) {
      throw DOM_EXCEPTION('FuseIndex.computeScore aborted')
    }

    const result = results[i]
    let totalScore = 1

    for (let j = 0, lenJ = result.matches.length; j < lenJ; j ++) {
      if (signal.aborted) {
        throw DOM_EXCEPTION('FuseIndex.computeScore aborted')
      }

      const { key, norm, score } = result.matches[j]
      const weight = key ? key.weight : null

      totalScore *= Math.pow(
        score === 0 && weight ? Number.EPSILON : score,
        (weight || 1) * (ignoreFieldNorm ? 1 : norm)
      )
    }

    result.score = totalScore
  }
}
