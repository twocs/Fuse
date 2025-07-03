import { isArray, isObject, isString } from '../helpers/types'
import { createSearcher } from './register'
import * as ErrorMsg from './errorMessages'
import { createKeyId } from '../tools/KeyStore'

export const LogicalOperator = {
  AND: '$and',
  OR: '$or'
}

const KeyType = {
  PATH: '$path',
  PATTERN: '$val'
}

const isExpression = (query) =>
  !!(query[LogicalOperator.AND] || query[LogicalOperator.OR])

const isPath = (query) => !!query[KeyType.PATH]

const isLeaf = (query) =>
  !isArray(query) && isObject(query) && !isExpression(query)

const convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key]
  }))
})

// When `auto` is `true`, the parse function will infer and initialize and add
// the appropriate `Searcher` instance
export function parse(query, options, { auto = true } = {}) {
  const next = (query) => {
    let keys = Object.keys(query)

    const isQueryPath = isPath(query)

    if (!isQueryPath && keys.length > 1 && !isExpression(query)) {
      return next(convertToExplicit(query))
    }

    if (isLeaf(query)) {
      const key = isQueryPath ? query[KeyType.PATH] : keys[0]

      const pattern = isQueryPath ? query[KeyType.PATTERN] : query[key]

      if (!isString(pattern)) {
        throw ErrorMsg.DOM_EXCEPTION(ErrorMsg.LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key))
      }

      const obj = {
        keyId: createKeyId(key),
        pattern
      }

      if (auto) {
        obj.searcher = createSearcher(pattern, options)
      }

      return obj
    }

    let node = {
      children: [],
      operator: keys[0]
    }

    for (let i = 1, len = keys.length; i < len; i += 1) {
      const key = keys[i]
      const value = query[key]

      if (isArray(value)) {
        for (let j = 0, lenJ = value.length; j < lenJ; j += 1) {
          const item = value[j]
          node.children.push(next(item))
        }
      }
    }

    return node
  }

  if (!isExpression(query)) {
    query = convertToExplicit(query)
  }

  return next(query)
}
