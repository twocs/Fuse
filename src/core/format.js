import Config from './config'
import { transformMatches, transformScore } from '../transform'
import { DOM_EXCEPTION } from './errorMessages'

export default function format(
  results,
  docs,
  {
    includeMatches = Config.includeMatches,
    includeScore = Config.includeScore,
    signal = { aborted: false }
  } = {}
) {
  const transformers = []

  if (includeMatches) transformers.push(transformMatches)
  if (includeScore) transformers.push(transformScore)

  return results.map((result) => {
    const { idx } = result

    const data = {
      item: docs[idx],
      refIndex: idx
    }

    if (transformers.length) {
      for (let i = 0, len = transformers.length; i < len; i += 1) {
        if (signal.aborted) {
          throw DOM_EXCEPTION('FuseIndex.format aborted')
        }

        const transformer = transformers[i]
        transformer(result, data)
      }
    }

    return data
  })
}
