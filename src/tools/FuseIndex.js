import { isArray, isDefined, isString, isBlank } from '../helpers/types'
import Config from '../core/config'
import normGenerator from './norm'
import { createKey } from './KeyStore'
import { DOM_EXCEPTION } from '../core/errorMessages'

export default class FuseIndex {
  constructor({
    getFn = Config.getFn,
    fieldNormWeight = Config.fieldNormWeight,
    signal = Config.abortController.signal,
  } = {}) {
    this.norm = normGenerator(fieldNormWeight, 3)
    this.getFn = getFn
    this.isCreated = false
    this.signal = signal

    this.setIndexRecords()
  }
  setSources(docs = []) {
    this.docs = docs
  }
  setIndexRecords(records = []) {
    this.records = records
  }
  setKeys(keys = []) {
    this.keys = keys
    this._keysMap = {}
    for (let idx = 0, len = keys.length; idx < len; idx++) {
      if (this.signal?.aborted) {
        throw DOM_EXCEPTION('FuseIndex.setKeys aborted')
      }
      this._keysMap[keys[idx].id] = idx
    }
  }
  create() {
    if (this.isCreated || !this.docs.length) {
      return
    }

    this.isCreated = true

    // List is Array<String>
    if (isString(this.docs[0])) {
      for (let docIndex = 0, len = this.docs.length; docIndex < len; docIndex++) {
        if (this.signal?.aborted) {
          throw DOM_EXCEPTION('FuseIndex.create aborted')
        }
        const doc = this.docs[docIndex]
        this._addString(doc, docIndex)
      }
    } else {
      // List is Array<Object>
      for (let docIndex = 0, len = this.docs.length; docIndex < len; docIndex++) {
        if (this.signal?.aborted) {
          throw DOM_EXCEPTION('FuseIndex.create aborted')
        }
        const doc = this.docs[docIndex]
        this._addObject(doc, docIndex)
      }
    }

    this.norm.clear()
  }
  // Adds a doc to the end of the index
  add(doc) {
    const idx = this.size()

    if (isString(doc)) {
      this._addString(doc, idx)
    } else {
      this._addObject(doc, idx)
    }
  }
  // Removes the doc at the specified index of the index
  removeAt(idx) {
    this.records.splice(idx, 1)

    // Change ref index of every subsequent doc
    for (let i = idx, len = this.size(); i < len; i += 1) {
      if (this.signal?.aborted) {
          throw DOM_EXCEPTION('FuseIndex.removeAt aborted')
      }
      this.records[i].i -= 1
    }
  }
  getValueForItemAtKeyId(item, keyId) {
    return item[this._keysMap[keyId]]
  }
  size() {
    return this.records.length
  }
  _addString(doc, docIndex) {
    if (!isDefined(doc) || isBlank(doc)) {
      return
    }

    let record = {
      v: doc,
      i: docIndex,
      n: this.norm.get(doc)
    }

    this.records.push(record)
  }
  _addObject(doc, docIndex) {
    let record = { i: docIndex, $: {} }

    // Iterate over every key (i.e, path), and fetch the value at that key
    for (let keyIndex = 0, len = this.keys.length; keyIndex < len; keyIndex++) {
      if (this.signal?.aborted) {
        throw DOM_EXCEPTION('FuseIndex._addObject aborted')
      }
      
      const key = this.keys[keyIndex]
      let value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path)

      if (!isDefined(value)) {
        return
      }

      if (isArray(value)) {
        let subRecords = []
        const stack = [{ nestedArrIndex: -1, value }]

        while (stack.length) {
          const { nestedArrIndex, value } = stack.pop()

          if (!isDefined(value)) {
            continue
          }

          if (isString(value) && !isBlank(value)) {
            let subRecord = {
              v: value,
              i: nestedArrIndex,
              n: this.norm.get(value)
            }

            subRecords.push(subRecord)
          } else if (isArray(value)) {
            for (let k = 0, lenK = value.length; k < lenK; k++) {
              if (this.signal?.aborted) {
                throw DOM_EXCEPTION('FuseIndex._addObject aborted')
              }
              const item = value[k]
              stack.push({
                nestedArrIndex: k,
                value: item
              })
            }
          } else {
            // If we're here, the `path` is either incorrect, or pointing to a non-string.
            // console.error(new Error(`Path "${key}" points to a non-string value. Received: ${value}`))
          }
        }
        record.$[keyIndex] = subRecords
      } else if (isString(value) && !isBlank(value)) {
        let subRecord = {
          v: value,
          n: this.norm.get(value)
        }

        record.$[keyIndex] = subRecord
      }
    }

    this.records.push(record)
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records
    }
  }
}

export function createIndex(
  keys,
  docs,
  { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {},
  abortController,
) {
  const myIndex = new FuseIndex({ getFn, fieldNormWeight, abortController })
  myIndex.setKeys(keys.map(createKey))
  myIndex.setSources(docs)
  myIndex.create()
  return myIndex
}

export function parseIndex(
  data,
  { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight, abortController = Config.abortController } = {},
) {
  const { keys, records } = data
  const myIndex = new FuseIndex({ getFn, fieldNormWeight, abortController })
  myIndex.setKeys(keys)
  myIndex.setIndexRecords(records)
  return myIndex
}
