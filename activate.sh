#!/usr/bin/env bash

export ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export CONFIG_FILE="$ROOT/config.js"
if [ ! -f $CONFIG_FILE ]; then
    echo -e  "module.exports = {port: 54321, client: 'pg', report: true, connection: {database: 'evart', username: 'evart', password: 'evart'}}\n\nif (!module.parent) {console.log(JSON.stringify(module.exports))}" > $CONFIG_FILE
fi

export KNEX=`node $ROOT/config.js`
export PS1="\W-\t\\$ \[$(tput sgr0)\]"

alias elka="node $ROOT"

bash
