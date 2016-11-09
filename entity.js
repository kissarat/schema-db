const {each, isObject, omit} = require('lodash')
const {split, returning, wrapResult} = require('./utils')

class Entity {
  constructor(options) {
    if (isObject(options)) {
      Object.assign(this, options)
    }
    // if (this.report) {
    //   const self = this
    //   ['create', 'read', 'update', 'delete'].forEach(function (name) {
    //     const original = self[name]
    //     self[name] = function () {
    //       const q = original.apply(self, arguments)
    //       console.log(q.toSQL())
    //       return q
    //     }
    //   })
    // }
  }

  table() {
    return Entity.table(this.name)
  }

  create(params) {
    const q = returning(params, this.table())
      .insert(omit(params, 'returning'))
    return wrapResult(q)
  }

  find(params = {}) {
    return this
      .table()
      .where(params)
      .select()
  }

  findOne(params = {}) {
    return this
      .find(params)
      .then(row => row[0])
  }

  read(params = {}) {
    const fields = this.fields
    each(fields, function ({type}, name) {
      const value = params[name]
      if (isFinite(value) && ('integer' === type || 'float' === type)) {
        params[name] = +value
      }
    })
    const where = omit(params, 'search', 'select', 'order', 'limit')
    const q = this
      .table()
      .where(where);
    if (params.search && 'function' === typeof params.search.trim && params.search.trim()) {
      q.where(function () {
        each(fields, ({type}, name) => {
          if ('string' === type) {
            this.orWhere(name, 'ilike', `%${params.search}%`)
          }
        })
      })
    }
    if (params.order) {
      split(params.order).forEach(function (c) {
        if ('-' === c[0]) {
          q.orderBy(c.slice(1), 'desc')
        }
        else {
          q.orderBy(c, 'desc')
        }
      })
    }
    if (isFinite(params.limit)) {
      q.limit(+params.limit)
    }
    if (params.select) {
      params.select = split(params.select)
      q.column(params.select)
    }
    else {
      q.select()
    }
    return q
  }

  update(params, changes) {
    const q = returning(params,
      this
        .table()
        .where(omit(params, 'returning'))
    )
      .update(changes)
    return wrapResult(q)
  }

  delete(params) {
    const q = returning(params,
      this
        .table()
        .where(omit(params, 'returning'))
    )
      .del()
    return wrapResult(q)
  }
}

module.exports = Entity
