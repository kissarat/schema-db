function split(params, name) {
  return 'string' === typeof params[name] ? params[name].split(/[ .,]+/g).filter(s => s.trim()) : params[name]
}

function returning(params, q) {
  if (params.returning) {
    params.returning = split(params, 'returning')
    q.returning(params.returning)
  }
  return q
}

const start = Date.now() / 1000 - process.hrtime()[0]

function timeId() {
  let now = process.hrtime()
  now[1] -= Math.round(Math.random() * 50 * 1000 * 1000)
  return ((start + now[0]) * 1000 * 1000 * 1000 + now[1]).toString()
}

module.exports = {split, returning, timeId}
