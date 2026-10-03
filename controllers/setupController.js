// Seed and purge the people collection. These used to be GETs; they change
// data, so they are POSTs now (and covered by the same-origin check).

const express = require('express')
const { runAction } = require('../lib/run')

module.exports = function setupController({ people, results }) {
    const router = express.Router()

    async function handle(res, action, okStatus, fn) {
        const id = results.put(await runAction(action, okStatus, fn))
        res.redirect(303, `/?view=admin&result=${id}`)
    }

    router.post('/person/setup', (req, res) => handle(res, 'seed', 201, () => people.seed()))
    router.post('/person/purge', (req, res) => handle(res, 'purge', 200, () => people.purge()))

    return router
}
