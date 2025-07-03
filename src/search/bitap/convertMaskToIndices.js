import Config from '../../core/config'

export default function convertMaskToIndices(
  matchMask = [],
  minMatchCharLength = Config.minMatchCharLength
) {
  let indices = []
  let start = -1
  let end = -1
  let i = 0

  for (let len = matchMask.length; i < len; i += 1) {
    let match = matchMask[i]
    if (match && start === -1) {
      start = i
    } else if (!match && start !== -1) {
      end = i - 1
      if (end - start + 1 >= minMatchCharLength) {
        indices.push([start, end])
      }
      start = -1
    }
  }

  // (i-1 - start) + 1 => i - start
  if (matchMask[i - 1] && i - start >= minMatchCharLength) {
    indices.push([start, i - 1])
  }

  return indices
}
