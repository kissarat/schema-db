const config = 'string' === typeof process.env.KNEX
  ? JSON.parse(process.env.KNEX)
  : process.env.KNEX

if (!config) {
    console.error('Set KNEX json env variable')
    process.exit(1)
}

module.exports = exports = require('knex')(config)

exports.Entity = class Entity {
  constructor(options) {
    Object.assign(this, options)
  }

  create(data) {
    return exports
      .table(this.name)
      .insert(data, 'id')
  }

  read(params) {
    return exports
      .table(this.name)
      .where(params)
      .select()
  }

  update(params, changes) {
    return exports
      .table(this.name)
      .where(params)
      .update(changes)
  }

  delete(params) {
    return exports
      .table(this.name)
      .where(params)
      .del()
  }
}

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
              if (0 === column.data_type.indexOf('character') && 'text' === column.data_type) {
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
    .then(() => exports.table('meta.reference'))
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
      exports.entities = schema
      exports.time = Date.now()
      if (true === config.report) {
        console.log('Schema loaded', config)
      }
    })
}

exports.lord = function lord() {
  require('./lord').apply(exports, arguments)
}
