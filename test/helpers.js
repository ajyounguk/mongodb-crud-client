const { createApp } = require('../app')
const { createResultStore } = require('../lib/results')
const { NotFoundError } = require('../lib/errors')

const ID = '64b7f0c2a1b2c3d4e5f60718'
const ID2 = '64b7f0c2a1b2c3d4e5f60719'

// In-memory stand-in for lib/people.js. Set fake.fail = { method: error }
// to make a method reject.
function fakePeople(seed = []) {
    const rows = new Map(seed.map(p => [String(p._id), { ...p }]))
    const fake = {
        fail: {},
        calls: [],
        rows
    }
    const wrap = (name, fn) => async (...args) => {
        fake.calls.push([name, ...args])
        if (fake.fail[name]) throw fake.fail[name]
        return fn(...args)
    }
    Object.assign(fake, {
        create: wrap('create', body => {
            const p = { _id: ID2, ...body }
            rows.set(ID2, p)
            return p
        }),
        get: wrap('get', id => {
            const p = rows.get(id)
            if (!p) throw new NotFoundError(`person ${id} not found`)
            return p
        }),
        list: wrap('list', ({ after, limit } = {}) => ({
            items: [...rows.values()],
            total: rows.size,
            limit: Number(limit) || 10,
            next: after ? null : (rows.size ? ID : null)
        })),
        update: wrap('update', (id, body) => {
            const before = rows.get(id)
            const after = { ...before, ...body }
            delete after.mongoid
            rows.set(id, after)
            return { before, after }
        }),
        remove: wrap('remove', id => {
            const p = rows.get(id)
            rows.delete(id)
            return p
        }),
        seed: wrap('seed', () => ({ inserted: 9, items: [] })),
        purge: wrap('purge', () => ({ deleted: rows.size }))
    })
    return fake
}

function makeApp({ people = fakePeople(), db, dbState = () => 'connected' } = {}) {
    const results = createResultStore()
    const app = createApp({
        people,
        db: db || { kind: 'local', label: '127.0.0.1:27017', db: 'crud-demo', hosts: ['127.0.0.1'] },
        dbState,
        results
    })
    return { app, people, results }
}

module.exports = { fakePeople, makeApp, ID, ID2 }
