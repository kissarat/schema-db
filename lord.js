const {pick} = require('lodash')

function lord(req, res, next) {
  function json(code, data) {
    res.writeHeader(data ? code : 200, {
      'content-type': 'application/json'
    })
    res.end(JSON.stringify(data ? data : code))
  }

  function table(name) {
    this.table(name)
      .then(function (rows) {
        const result = {}
        rows.forEach(function (row) {
          result[row.id || row.name] = row
        })
        res.end(JSON.stringify(result))
      })
      .catch(function (err) {
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
        res.end(JSON.stringify({
          error: err
        }))
      })
  }

  const path = /\/lord\/([\w_]+)/.exec(req.url)
  if ('/lord-names' === req.url) {
    res.end(JSON.stringify(Object.keys(this.entities)))
  }
  if ('/lord/meta.reference' === req.url) {
    table.call(this, 'meta.reference')
  }
  else if (path) {
    const entity = this.entities[path[1]]
    if (entity) {
      switch (req.method) {
        case 'GET':
          table.call(this, entity.name)
          break;
        default:
          json(405, {error: {message: 'Method not found'}})
          break;
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
