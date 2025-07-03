import search from './search'
import createPatternAlphabet from './createPatternAlphabet'
import { MAX_BITS } from './constants'
import Config from '../../core/config'
import { stripDiacritics } from '../../helpers/diacritics'

export default class BitapSearch {
  constructor(
    pattern,
    {
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
      includeMatches = Config.includeMatches,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      isCaseSensitive = Config.isCaseSensitive,
      ignoreDiacritics = Config.ignoreDiacritics,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    this.options = {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    }

    pattern = isCaseSensitive ? pattern : pattern.toLowerCase()
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;

    this.chunks = []

    if (!this.pattern.length) {
      return
    }

    const addChunk = (pattern, startIndex) => {
      this.chunks.push({
        pattern,
        alphabet: createPatternAlphabet(pattern),
        startIndex
      })
    }

    const len = this.pattern.length

    if (len > MAX_BITS) {
      let i = 0
      const remainder = len % MAX_BITS
      const end = len - remainder

      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i)
        i += MAX_BITS
      }

      if (remainder) {
        const startIndex = len - MAX_BITS
        addChunk(this.pattern.substr(startIndex), startIndex)
      }
    } else {
      addChunk(this.pattern, 0)
    }
  }

  searchIn(text) {
    const { isCaseSensitive, ignoreDiacritics, includeMatches } = this.options

    text = isCaseSensitive ? text : text.toLowerCase()
    text = ignoreDiacritics ? stripDiacritics(text) : text

    // Exact match
    if (this.pattern === text) {
      let result = {
        isMatch: true,
        score: 0
      }

      if (includeMatches) {
        result.indices = [[0, text.length - 1]]
      }

      return result
    }

    // Otherwise, use Bitap algorithm
    const {
      location,
      distance,
      threshold,
      findAllMatches,
      minMatchCharLength,
      ignoreLocation
    } = this.options

    let allIndices = []
    let totalScore = 0
    let hasMatches = false

    for (let i = 0, len = this.chunks.length; i < len; i += 1) {
      const { pattern, alphabet, startIndex } = this.chunks[i]

      const { isMatch, score, indices } = search(text, pattern, alphabet, {
        location: location + startIndex,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        includeMatches,
        ignoreLocation
      })

      if (isMatch) {
        hasMatches = true
      }

      totalScore += score

      if (isMatch && indices) {
        allIndices = [...allIndices, ...indices]
      }
    }

    let result = {
      isMatch: hasMatches,
      score: hasMatches ? totalScore / this.chunks.length : 1
    }

    if (hasMatches && includeMatches) {
      result.indices = allIndices
    }

    return result
  }
}
