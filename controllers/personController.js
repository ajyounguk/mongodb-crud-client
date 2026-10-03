// CRUD routes. Every handler catches its own errors and always responds,
// so a database failure can't leave a request hanging.

const express = require('express')
const { runAction: run } = require('../lib/run')

const VIEWS = ['create', 'list', 'update', 'delete', 'admin']

module.exports = function personController({ people, results }) {
    const router = express.Router()

    // id (optional) re-loads that person into the form on the GET
    function postRedirectGet(res, view, result, id) {
        const resultId = results.put(result)
        const idParam = id ? `&id=${encodeURIComponent(id)}` : ''
        res.redirect(303, `/?view=${view}${idParam}&result=${resultId}`)
    }

    // Main page. ?view picks the panel, ?result shows a stored POST result,
    // ?id pre-fills the update/delete forms from the database.
    router.get('/', async (req, res) => {
        const view = VIEWS.includes(req.query.view) ? req.query.view : 'create'
        if (view === 'list') return res.redirect(303, '/person')

        let result = typeof req.query.result === 'string' ? results.take(req.query.result) : null
        let person = null
        if ((view === 'update' || view === 'delete') && typeof req.query.id === 'string') {
            const lookup = await run('read', 200, () => people.get(req.query.id))
            if (lookup.ok) person = lookup.data
            else result = result || lookup
        }
        res.render('index', { view, result, person, list: null })
    })

    // Read: paginated list
    router.get('/person', async (req, res) => {
        const after = typeof req.query.after === 'string' && req.query.after ? req.query.after : undefined
        const result = await run('list', 200, () => people.list({ after, limit: req.query.limit }))
        res.status(result.status).render('index', {
            view: 'list',
            result,
            person: null,
            list: result.ok ? result.data : null
        })
    })

    router.post('/person', async (req, res) => {
        postRedirectGet(res, 'create', await run('create', 201, () => people.create(req.body)))
    })

    router.post('/person/update', async (req, res) => {
        const body = req.body || {}
        const result = await run('update', 200, () => people.update(body.mongoid, body))
        postRedirectGet(res, 'update', result, result.ok ? String(result.data.after._id) : null)
    })

    router.post('/person/delete', async (req, res) => {
        const body = req.body || {}
        postRedirectGet(res, 'delete', await run('delete', 200, () => people.remove(body.mongoid)))
    })

    return router
}
