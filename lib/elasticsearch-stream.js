/**
 * Elasticsearch Stream
 *
 * Create a ReadableStream from an elasticsearch scroll query.
 * Assumptions: client library is of type [elasticsearch](https://www.npmjs.org/package/elasticsearch)
 */
var Readable = require("stream").Readable,
    util = require("util");


/**
 * LibElasticasearchScrollStream
 *
 * @param `client` - elasticsearch instance
 * @param `query_opts` - query object to be passed to elasticsearch.
 *        It contains the query
 * @param `optional_fields` - array of optional properties to include in the results.
 *        Allowed values: '_id', '_score', '_type', '_index'
 * @param `stream_opts` - object to be passed to ReadableStream
 */
var LibElasticasearchScrollStream = function(client, query_opts, optional_fields, stream_opts) {

  this._client = client;
  this._options = query_opts;
  this._extrafields = optional_fields;
  this._options.scroll = query_opts.scroll || '10m';
  this._reading = false;
  this._counter = 0;
  this._total = 0;
  this._forceClose = false;
  Readable.call(this, stream_opts);
};

util.inherits(LibElasticasearchScrollStream, Readable);


LibElasticasearchScrollStream.prototype._read = function() {
  if (this._reading) {
    return false;
  }

  this._reading = true;
  var self = this;
  this._client.search(this._options, function getMoreUntilDone(err, response) {
    if (err) {
      return self.emit("error", err);
    }

    var objectMode = self._readableState.objectMode;
    response.hits.hits.forEach(function(hit) {
      var ref_results = {};
      if(hit.fields) {
        ref_results = hit.fields;
      } else {
        ref_results = hit._source;
      }

      // populate extra fields
      self._extrafields.forEach(function(entry) {
        ref_results[entry] = hit[entry];
      });

      self.push(objectMode ? ref_results : JSON.stringify(ref_results));
      self._counter++;
    });

    if ((response.hits.total !== self._counter) && (!self._forceClose)) {
      self._client.scroll({
        scroll: self._options.scroll,
        scroll_id: response._scroll_id
      }, getMoreUntilDone);
    } else {
      return setImmediate(function() {
        self._reading = false;
        self._counter = 0;
        self._total = response.hits.total;
        self._forceClose = false;
        self.push(null);
      });
    }

  });
};

LibElasticasearchScrollStream.prototype.close = function() {
  return this._forceClose = true;
};

module.exports = LibElasticasearchScrollStream;

