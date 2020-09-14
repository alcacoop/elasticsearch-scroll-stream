/**
 * Setup and teardown for these tests are external to this source file
 * (i.e.: indexed documents are loaded into elasticsearch via bash script)
 */
const { expect } = require('chai')

const { Client } = require('@elastic/elasticsearch')

const ElasticsearchScrollStream = require('../index.js')

describe('elasticsearch_scroll_stream', function () {
  it("Should stream correctly when '_source' property is specified", function (done) {
    this.timeout(10000)
    let counter = 0
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(elasticsearch_client, {
      index: 'elasticsearch-test-scroll-stream',
      type: 'test-type',
      scroll: '10s',
      size: '50',
      _source: ['name'],
      body: {
        query: {
          bool: {
            must: [
              {
                query_string: {
                  default_field: '_all',
                  query: 'name:third*',
                },
              },
            ],
          },
        },
      },
    })

    es_stream.on('data', function (data) {
      expect(es_stream._total).to.equal(20)
      current_doc = JSON.parse(data.toString())
      expect(current_doc.name).to.equal('third chunk name')
      counter++
    })

    es_stream.on('end', function () {
      expect(counter).to.equal(20)
      done()
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })

  it('Should explicitly clear the active search context when the scroll finishes', function (done) {
    this.timeout(10000)
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(elasticsearch_client, {
      index: 'elasticsearch-test-scroll-stream',
      type: 'test-type',
      scroll: '10s',
      size: '50',
      _source: ['name'],
      body: {
        query: {
          bool: {
            must: [
              {
                query_string: {
                  default_field: '_all',
                  query: 'name:third*',
                },
              },
            ],
          },
        },
      },
    })

    es_stream.on('data', function (data) {
      current_doc = JSON.parse(data.toString())
      expect(current_doc.name).to.equal('third chunk name')
    })

    es_stream.on('end', function () {
      elasticsearch_client.indices.stats(
        {
          index: '_all',
          metric: 'search',
        },
        function (err, res) {
          expect(res.body._all.total.search.open_contexts).to.equal(0)
          done()
        }
      )
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })

  it('Should stream correctly when no fields are specified (full _source)', function (done) {
    this.timeout(10000)
    let counter = 0
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(elasticsearch_client, {
      index: 'elasticsearch-test-scroll-stream',
      type: 'test-type',
      scroll: '10s',
      size: '50',
      body: {
        query: {
          bool: {
            must: [
              {
                query_string: {
                  default_field: '_all',
                  query: 'name:third*',
                },
              },
            ],
          },
        },
      },
    })

    es_stream.on('data', function (data) {
      current_doc = JSON.parse(data.toString())
      expect(current_doc.name).to.equal('third chunk name')
      counter++
    })

    es_stream.on('end', function () {
      expect(counter).to.equal(20)
      done()
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })

  it("Should stream correctly when '_source' property is specified and optional_fields required", function (done) {
    this.timeout(10000)
    let counter = 0
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(
      elasticsearch_client,
      {
        index: 'elasticsearch-test-scroll-stream',
        type: 'test-type',
        scroll: '10s',
        size: '50',
        _source: ['name'],
        body: {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    default_field: '_all',
                    query: 'name:third*',
                  },
                },
              ],
            },
          },
        },
      },
      ['_id', '_score']
    )

    es_stream.on('data', function (data) {
      current_doc = JSON.parse(data.toString())
      expect(current_doc.name).to.equal('third chunk name')
      expect(current_doc).to.have.property('_id')
      expect(current_doc).to.have.property('_score')
      counter++
    })

    es_stream.on('end', function () {
      expect(counter).to.equal(20)
      done()
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })

  it("Should stream correctly when '_source' property is false", function (done) {
    this.timeout(10000)
    let counter = 0
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(
      elasticsearch_client,
      {
        index: 'elasticsearch-test-scroll-stream',
        type: 'test-type',
        scroll: '10s',
        size: '50',
        _source: false,
        body: {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    default_field: '_all',
                    query: 'name:third*',
                  },
                },
              ],
            },
          },
        },
      },
      ['_id']
    )

    es_stream.on('data', function (data) {
      expect(es_stream._total).to.equal(20)
      current_doc = JSON.parse(data.toString())
      expect(current_doc).to.have.property('_id')
      counter++
    })

    es_stream.on('end', function () {
      expect(counter).to.equal(20)
      done()
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })

  it('Should throw error when optional_fields is not an array', function (done) {
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    expect(() => {
      new ElasticsearchScrollStream(
        elasticsearch_client,
        {
          index: 'elasticsearch-test-scroll-stream',
          type: 'test-type',
          scroll: '10s',
          size: '50',
          _source: ['name'],
          body: {
            query: {
              bool: {
                must: [
                  {
                    query_string: {
                      default_field: '_all',
                      query: 'name:third*',
                    },
                  },
                ],
              },
            },
          },
        },
        '_id'
      )
    }).to.throw(/optional_fields must be an array/)
    done()
  })

  it('Should throw error when optional_fields does not contain an allowed value', function (done) {
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    expect(() => {
      new ElasticsearchScrollStream(
        elasticsearch_client,
        {
          index: 'elasticsearch-test-scroll-stream',
          type: 'test-type',
          scroll: '10s',
          size: '50',
          _source: ['name'],
          body: {
            query: {
              bool: {
                must: [
                  {
                    query_string: {
                      default_field: '_all',
                      query: 'name:third*',
                    },
                  },
                ],
              },
            },
          },
        },
        ['invalid_value']
      )
    }).to.throw(/not allowed in optional_fields/)
    done()
  })

  it("Should correctly close the stream when #close() method is called (using 'return' in 'data' handler)", function (done) {
    this.timeout(10000)
    let pageSize = '5'
    let stopCounterIndex = parseInt(pageSize) + 1
    let counter = 0
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(
      elasticsearch_client,
      {
        index: 'elasticsearch-test-scroll-stream',
        type: 'test-type',
        scroll: '10s',
        size: pageSize,
        _source: ['name'],
        body: {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    default_field: '_all',
                    query: 'name:third*',
                  },
                },
              ],
            },
          },
        },
      },
      ['_id', '_score']
    )

    es_stream.on('data', function (data) {
      current_doc = JSON.parse(data.toString())
      if (counter == stopCounterIndex) {
        es_stream.close()
        return
      }
      counter++
    })

    es_stream.on('end', function () {
      expect(counter).to.equal(stopCounterIndex)
      done()
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })

  it("Should correctly close the stream when #close() method is called (without 'return' into 'data' handler)", function (done) {
    this.timeout(10000)
    let pageSize = '5'
    let stopCounterIndex = parseInt(pageSize) + 1
    let counter = 0
    let current_doc
    let elasticsearch_client = new Client({ node: 'http://localhost:9200' })

    let es_stream = new ElasticsearchScrollStream(
      elasticsearch_client,
      {
        index: 'elasticsearch-test-scroll-stream',
        type: 'test-type',
        scroll: '10s',
        size: pageSize,
        _source: ['name'],
        body: {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    default_field: '_all',
                    query: 'name:third*',
                  },
                },
              ],
            },
          },
        },
      },
      ['_id', '_score']
    )

    es_stream.on('data', function (data) {
      current_doc = JSON.parse(data.toString())
      if (counter == stopCounterIndex) {
        es_stream.close()
      }
      counter++
    })

    es_stream.on('end', function () {
      expect(counter).to.equal(parseInt(pageSize) * 2)
      done()
    })

    es_stream.on('error', function (err) {
      done(err)
    })
  })
})
