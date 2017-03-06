/**
 * Elasticsearch Scroll Stream
 *
 * Create a ReadableStream from an elasticsearch scroll query.
 */
var LibElasticalAdaptee = require("./lib/elastical-stream"),
    LibElasticsearchAdaptee = require("./lib/elasticsearch-stream");


/**
 * ElasticsearchScrollStream
 * @param `client` - elasticsearch instance
 * @param `query_opts` - query object to be passed to elasticsearch
 *        See [Elasticsearch API reference](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/search-request-body.html)
 * @param `optional_fields` - array of optional properties to include in the results.
 *        Allowed values: '_id', '_score', '_type', '_index'
 * @param `stream_opts` - object to be passed to ReadableStream
 */
var ElasticsearchScrollStream = function(client, query_opts, optional_fields, stream_opts) {
  if (arguments.length == 1) throw new Error("ElasticsearchScrollStream: missing parameters");
  if (!client) throw new Error("ElasticsearchScrollStream: client is ", client);

  optional_fields = (!!optional_fields) ? optional_fields : []
  if (!Array.isArray(optional_fields)) throw new Error("ElasticsearchScrollStream: optional_fields must be an array", optional_fields);

  var allowed_extrafields = ['_id', '_score', '_type', '_index'];
  optional_fields.forEach(function(entry) {
    if (allowed_extrafields.indexOf(entry) == -1) {
      throw new Error("ElasticsearchScrollStream: property '" + entry + "' not allowed in optional_fields");
    }
  }); 

  stream_opts = (!!stream_opts) ? stream_opts : {};

  if (!!client.nodes) {
    return new LibElasticsearchAdaptee(client, query_opts, optional_fields, stream_opts);
  } else {
    return new LibElasticalAdaptee(client, query_opts, stream_opts);
  }
};

module.exports = ElasticsearchScrollStream;

