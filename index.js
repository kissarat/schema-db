const {extend} = require('lodash')
const {timeId} = require('./utils')
const Entity = require('./entity')
const knex = require('knex')
const loadSchema = require('./load-schema')
const lord = require('./lord')

function setup(config) {
  extend(this, knex(config))
  this.config = config
  Entity.table = this.table
  return loadSchema.call(this)
    .then(() => extend(module.exports, this))
}

function log(entity, action, data, user, ip) {
  const id = timeId()
  return this.table('log').insert({id, entity, action, data, user, ip})
}

const db = {
  setup,
  Entity,
  log,
  timeId
}

db.lord = function(req, res, next) {
  lord.call(db, req, res, next)
}

module.exports = db
