const {pick, isObject} = require('lodash')
const {resolve} = require('path')
const {parse} = require('querystring')

const contentTypeJson = {
  'content-type': 'application/json; charset=utf-8'
}

function responseError(res) {
  return function (err) {
    if (err instanceof Error) {
      err = pick(err, 'name', 'message', 'stack')
      const root = resolve(__dirname + '/..')
      err.stack = err.stack
        .replace(/\s+at\s+/g, '{#}at ')
        .split('{#}')
        .map(function (p) {
          return p.replace(root, '')
        })
    }
    res.writeHead(500, contentTypeJson)
    res.end(JSON.stringify({
      error: err
    }))
  }
}

function lord(req, res, next) {
  function json(code, data) {
    res.writeHeader(data ? code : 200, contentTypeJson)
    res.end(JSON.stringify(data ? data : code))
  }

  function table(name) {
    this.table(name)
      .then(function (rows) {
        const result = {}
        rows.forEach(function (row) {
          result[row.id || row.name] = row
        })
        json(result)
      })
      .catch(responseError(res))
  }

  const path = /^\/lord\/([\w_]+)/.exec(req.url)
  if ('/lord-names' === req.url) {
    json(Object.keys(this.entities))
  }
  if ('/lord/meta.reference' === req.url) {
    table.call(this, 'meta.reference')
  }
  else if (path) {
    const entity = this.entities[path[1]]
    const params = isObject(req.params) ? req.params : parse(req.url.split('?').slice(1).join('?') || '')
    if (entity) {
      let promise
      switch (req.method) {
        case 'GET':
          promise = entity.read(params)
          break
        case 'DELETE':
          promise = entity.delete(params)
          break
        default:
          json(405, {error: {message: 'Method not found'}})
          break
      }
      if (promise && 'function' === typeof promise.then) {
        promise
          .then(function (rows) {
            if (rows.length >= 0) {
              res.setHeader('Size', rows.length)
            }
            if (params.returning && 0 === rows.length) {
              res.writeHead(404)
            }
            else {
              json(rows)
            }
          })
          .catch(responseError(res))
      }
    }
    else {
      json(404, {
        name: path[1],
        error: {
          message: 'Entity not found'
        }
      })
    }
  }
  else if ('/lord' === req.url) {
    json(this.entities ? 200 : 500, this.entities
      ? {
      time: new Date(this.time).toISOString(),
      entities: this.entities
    }
      : {error: {message: 'Schema not loaded'}})
  }
  else {
    next()
  }
}

module.exports = lord

lord.responseError = responseError
