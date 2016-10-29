const {each, isObject, omit} = require('lodash')

const config = 'string' === typeof process.env.KNEX
  ? JSON.parse(process.env.KNEX)
  : process.env.KNEX

if (!config) {
  console.error('Set KNEX json env variable')
  process.exit(1)
}

module.exports = exports = require('knex')(config)

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

  create(params = {}, data) {
    const q = exports.table(this.name)
    if (data) {
      return this._returning(params, exports.table(this.name))
        .insert(omit(data, 'returning'))
    }
    else {
      return q.insert(params)
    }
  }

  find(params = {}) {
    return exports
      .table(this.name)
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
    const q = exports
      .table(this.name)
      .where(omit(params, 'search', 'select', 'order', 'limit'));
    if (params.search && 'function' === typeof params.search.trim && params.search.trim()) {
      q.where(function () {
        each(fields, ({type}, name) => {
          if ('string' === type) {
            this.orWhere(name, 'ilike', `%${params.search}%`)
          }
        })
      })
    }
    if (isFinite(params.limit)) {
      q.limit(+params.limit)
    }
    if (params.select) {
      params.select = this._split(params, 'select')
      q.select(params.select)
    }
    else {
      q.select()
    }
    console.log(q.toString())
    return q
  }

  update(params, changes) {
    const q = this._returning(params,
      exports
        .table(this.name)
        .where(omit(params, 'returning'))
    )
      .update(changes)
    console.log(q.toString())
    return q
  }

  delete(params) {
    return this._returning(params,
      exports
        .table(this.name)
        .where(omit(params, 'returning'))
    )
      .del()
  }

  _split(params, name) {
    return 'string' === typeof params[name] ? params[name].split(/[ .,]+/g).filter(s => s.trim()) : params[name]
  }

  _returning(params, q) {
    if (params.returning) {
      params.returning = this._split(params, 'returning')
      q.returning(params.returning)
    }
    return q
  }
}

const start = Date.now() / 1000 - process.hrtime()[0]

exports.timeId = function timeId() {
  let now = process.hrtime()
  now[1] -= Math.round(Math.random() * 50 * 1000 * 1000)
  return ((start + now[0]) * 1000 * 1000 * 1000 + now[1]).toString()
}

exports.log = function log(entity, action, data, user, ip) {
  return exports.table('log').insert({
    id: exports.timeId(),
    entity, action, data, user, ip
  })
}

exports.Entity = Entity

exports.loadSchema = function () {
  const schema = {}

  return exports.table('information_schema.tables')
    .select('table_name', 'table_type')
    .where('table_schema', 'public')
    .then(function (tables) {
      tables.forEach(function (table) {
        table = {
          name: table.table_name,
          type: 'VIEW' === table.table_type ? 'view' : 'table',
        }
        schema[table.name] = table
        exports.table('information_schema.columns')
          .where({
            table_schema: 'public',
            table_name: table.name,
          })
          .then(function (columns) {
            table.fields = {}
            columns.forEach(function (column) {
              const field = {
                name: column.column_name,
                number: column.ordinal_position,
                type: column.data_type,
                required: 'NO' === column.is_nullable,
                generated: 'NEVER' !== column.is_generated || !!column.column_default,
                editable: 'YES' === column.is_updatable
              }
              if (column.numeric_precision) {
                field.precision = column.numeric_precision
              }
              if (column.character_maximum_length) {
                field.maxlength = column.character_maximum_length
              }
              if (['smallint', 'int', 'bigint'].indexOf(column.data_type)) {
                field.type = 'integer'
              }
              if (0 === column.data_type.indexOf('character') || 'text' === column.data_type) {
                field.type = 'string'
              }
              if ('json' === column.data_type) {
                field.type = 'object'
              }
              table.fields[field.name] = field
            })
          })
      })
    })
    .then(function () {
      return exports.table('meta.reference')
        .select()
    })
    .then(function (references) {
      references.forEach(function (ref) {
        const exists = 'object' === typeof schema[ref.from]
          && 'object' === typeof schema[ref.from].fields[ref.from_field]
        if (exists) {
          schema[ref.from].fields[ref.from_field].reference = {
            name: ref.name,
            table: ref.to,
            field: ref.to_field,
            rules: {
              update: ref.update_rule,
              delete: ref.delete_rule
            }
          }
        }
        else {
          console.error('Unknown reference', ref)
        }
        if (schema[ref.to]) {
          if (!schema[ref.to].references) {
            schema[ref.to].references = {}
          }
          schema[ref.to].references[ref.name] = {
            name: ref.name,
            table: ref.from,
            field: ref.from_field
          }
        }
      })
      each(schema, function (entity, name) {
        schema[name] = new Entity(entity)
      })
      exports.entities = schema
      exports.time = Date.now()
      if (true === config.report) {
        console.log('Schema loaded', config)
      }
    })
}

const lordModule = require('./lord')

exports.lord = function lord() {
  lordModule.apply(exports, arguments)
}

exports.responseError = lordModule.responseError

if (!module.parent) {
  const http = require('http')
  const server = http.createServer(function (req, res) {
    exports.lord(req, res, function () {
      res.writeHead(400, {
        'content-type': 'application/json; charset=utf-8'
      })
      res.end(JSON.stringify({error: {message: 'Bad Request'}}))
    })
  })
  exports.loadSchema().then(function () {
    server.listen(54321, '0.0.0.0')
  })
}
