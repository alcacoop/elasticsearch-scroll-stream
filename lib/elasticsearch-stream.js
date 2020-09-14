const { Readable } = require('stream')

/**
 * LibElasticsearchScrollStream
 *
 * @param `client` - elasticsearch instance
 * @param `query_opts` - query object to be passed to elasticsearch.
 *        It contains the query
 * @param `optional_fields` - array of optional properties to include in the results.
 *        Allowed values: '_id', '_score', '_type', '_index', '_parent', '_routing'
 * @param `stream_opts` - object to be passed to ReadableStream
 */
class LibElasticsearchScrollStream extends Readable {
  constructor(client, query_opts, optional_fields, stream_opts) {
    super(stream_opts)

    this._client = client
    this._options = query_opts
    this._extrafields = optional_fields
    this._options.scroll = query_opts.scroll || '10m'
    this._reading = false
    this._counter = 0
    this._total = 0
    this._forceClose = false

    this.getMoreUntilDone = this.getMoreUntilDone.bind(this)
  }

  getMoreUntilDone(err, response) {
    if (err) {
      return this.emit('error', err)
    }
    let body = !!response.body ? response.body : response

    // Set the total matching documents
    // For Elasticsearch greater then 7.x hits.total is an object:
    //    {
    //       value: 20,
    //       relation: "eq"
    //    }
    this._total = typeof body.hits.total === 'object' ? body.hits.total.value : body.hits.total

    body.hits.hits.forEach(hit => {
      let ref_results = hit.fields ? hit.fields : hit._source || {}

      // populate extra fields
      this._extrafields.forEach(entry => {
        ref_results[entry] = hit[entry]
      })

      this.push(this._readableState.objectMode ? ref_results : JSON.stringify(ref_results))
      this._counter++
    })

    if (this._total !== this._counter && !this._forceClose) {
      this._client.scroll({ scroll: this._options.scroll, scroll_id: body._scroll_id }, this.getMoreUntilDone)
    } else {
      // clearScroll for the current _scroll_id
      this._client.clearScroll({ scrollId: [body._scroll_id] }, (err, res) => {
        // end correctly
        return setImmediate(() => {
          this._reading = false
          this._counter = 0
          this._forceClose = false
          this.push(null)
        })
      })
    }
  }

  _read() {
    if (this._reading) {
      return false
    }

    this._reading = true
    this._client.search(this._options, this.getMoreUntilDone)
  }

  close() {
    return (this._forceClose = true)
  }
}

module.exports = LibElasticsearchScrollStream
