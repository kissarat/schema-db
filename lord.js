function lord(req, res, next) {
  function json(code, data) {
    res.writeHeader(data ? code : 200, {
      'content-type': 'application/json'
    })
    res.end(JSON.stringify(data ? data : code))
  }
  const path = /\/lord\/([\w_]+)/.exec(req.url)
  if (path) {
    const entity = this.entities[path[1]]
    if (entity) {
      switch (req.method) {
        default:

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
