const {isObject, isEmpty} = require('lodash')
const {parse} = require('querystring')
const salo = require('salo')

const contentTypeJson = {'content-type': 'application/json; charset=utf-8'}

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
      .catch(salo.http(res))
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
    const params = isObject(req.query)
      ? req.query
      : parse(req.url.split('?').slice(1).join('?') || '')
    if (entity) {
      let promise
      switch (req.method) {
        case 'GET':
          promise = entity.read(params)
          break
        case 'POST':
          const emptyCondition = isEmpty(params)
          if (emptyCondition || isEmpty(req.body)) {
            const error = {
              message: emptyCondition
                ? 'Condition required'
                : 'Request body is empty'
            }
            return res
              .status(400)
              .json({statusCode: 404, error})
          }
          promise = entity.update(params, req.body)
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
          .catch(salo.http(res))
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
