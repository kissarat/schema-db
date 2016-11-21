const {each} = require('lodash')
const Entity = require('./entity')

module.exports = function loadSchema() {
  const schema = {}

  return this.table('information_schema.tables')
    .select('table_name', 'table_type')
    .where('table_schema', 'public')
    .then((tables) => {
      tables.forEach((table) => {
        table = {
          name: table.table_name,
          type: 'VIEW' === table.table_type ? 'view' : 'table',
        }
        schema[table.name] = table
        this.table('information_schema.columns')
          .where({
            table_schema: 'public',
            table_name: table.name,
          })
          .then((columns) => {
            table.fields = {}
            columns.forEach((column) => {
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
                field.maxLength = column.character_maximum_length
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

      return this.raw(`SELECT typname, json_agg(enumlabel) as values FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid GROUP BY  typname`)
    })
    .then(({rows}) => {
      this.enums = {}
      rows.forEach((row) => {
        this.enums[row.typname] = row.values
      })
      return this.table('meta.attribute')
    })
    .then((rows) => {
      rows.forEach(({name, attributes}) => {
        if (schema[name]) {
          const fields = schema[name].fields
          each(attributes, (type, key) => {
            if (this.enums[type]) {
              fields[key].type = type
              fields[key].items = this.enums[type]
            }
          })
        }
        else {
          console.error(`schema[name] ${name} not defined`)
        }
      })
      return this.table('meta.reference')
    })
    .then((references) => {
      references.forEach((ref) => {
        const exists = 'object' === typeof schema[ref.from]
          && 'object' === typeof schema[ref.from].fields
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
      each(schema, (entity, name) => {
        schema[name] = new Entity(entity)
      })
      this.entities = schema
      this.time = Date.now()
      if (true === this.config.report) {
        console.log('Schema loaded', this.config)
      }
    })
}