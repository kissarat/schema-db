function split(string) {
  return 'string' === typeof string
    ? string.split(/[ .,]+/g).filter(s => s.trim())
    : string
}

function returning(params, q) {
  if (params.returning) {
    params.returning = split(params.returning)
    q.returning(params.returning)
  }
  return q
}

function wrapResult(q, action) {
  const sql = q.toString()
  console.log(sql)
  return q.then(r => ({
    success: r.length > 0,
    action: /^(\w+)/.exec(sql)[1].toUpperCase(),
    returning: r
  }))
}

const start = Date.now() / 1000 - process.hrtime()[0]

function timeId() {
  let now = process.hrtime()
  now[1] -= Math.round(Math.random() * 50 * 1000 * 1000)
  return ((start + now[0]) * 1000 * 1000 * 1000 + now[1]).toString()
}

module.exports = {split, wrapResult, returning, timeId}
