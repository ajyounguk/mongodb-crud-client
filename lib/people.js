// Data access for the people collection. The app only talks to MongoDB
// through this object, so tests can inject a fake.

const mongoose = require('mongoose')
const DefaultPerson = require('../models/personModel')
const { NotFoundError, BadRequestError } = require('./errors')

const FIELDS = ['firstname', 'surname', 'telephone']
const MAX_PAGE = 100

const SEED_PEOPLE = [
    { firstname: 'Alex', surname: 'Example', telephone: '07700 900001' },
    { firstname: 'Maria', surname: 'Lucia', telephone: '07700 900002' },
    { firstname: 'Jon', surname: 'Osmond', telephone: '07700 900003' },
    { firstname: 'Lucy', surname: 'Carter', telephone: '07700 900004' },
    { firstname: 'Daniel', surname: 'Jones', telephone: '07700 900005' },
    { firstname: 'Rachel', surname: 'Fuligula', telephone: '07700 900006' },
    { firstname: 'Tony', surname: 'Strider', telephone: '07700 900007' },
    { firstname: 'Marcus', surname: 'Smith', telephone: '07700 900008' },
    { firstname: 'Penelope', surname: 'Baker', telephone: '07700 900009' }
]

// Only copy known fields, as strings: request bodies never reach a query
// as objects, which rules out operator injection such as {"$gt": ""}.
function pickFields(body = {}) {
    const out = {}
    for (const f of FIELDS) {
        if (body[f] !== undefined) out[f] = String(body[f])
    }
    return out
}

function checkId(id) {
    if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id)) {
        throw new BadRequestError(`'${String(id).slice(0, 64)}' is not a valid MongoDB ObjectId`)
    }
    return id
}

function plain(doc) {
    return doc && (typeof doc.toObject === 'function' ? doc.toObject() : doc)
}

function createPeopleRepo(Person = DefaultPerson) {
    return {
        async create(body) {
            return plain(await Person.create(pickFields(body)))
        },

        async get(id) {
            const person = await Person.findById(checkId(id)).lean()
            if (!person) throw new NotFoundError(`person ${id} not found`)
            return person
        },

        // Keyset pagination on _id: stable while documents are added or removed.
        async list({ after, limit = 10 } = {}) {
            const size = Math.min(Math.max(parseInt(limit, 10) || 10, 1), MAX_PAGE)
            // trusted(): sanitizeFilter is on, and this $gt is ours, built from a validated id
            const filter = after ? { _id: mongoose.trusted({ $gt: new mongoose.Types.ObjectId(checkId(after)) }) } : {}
            const rows = await Person.find(filter).sort({ _id: 1 }).limit(size + 1).lean()
            const items = rows.slice(0, size)
            const total = await Person.estimatedDocumentCount()
            return {
                items,
                total,
                limit: size,
                next: rows.length > size ? String(items[items.length - 1]._id) : null
            }
        },

        async update(id, body) {
            const changes = pickFields(body)
            const before = await Person.findById(checkId(id)).lean()
            if (!before) throw new NotFoundError(`person ${id} not found`)
            const after = await Person.findByIdAndUpdate(id, changes, {
                returnDocument: 'after',
                runValidators: true
            }).lean()
            if (!after) throw new NotFoundError(`person ${id} not found`)
            return { before, after }
        },

        async remove(id) {
            const person = await Person.findByIdAndDelete(checkId(id)).lean()
            if (!person) throw new NotFoundError(`person ${id} not found`)
            return person
        },

        async seed() {
            const created = await Person.insertMany(SEED_PEOPLE)
            return { inserted: created.length, items: created.map(plain) }
        },

        async purge() {
            const { deletedCount } = await Person.deleteMany({})
            return { deleted: deletedCount }
        }
    }
}

module.exports = { createPeopleRepo, pickFields, SEED_PEOPLE, MAX_PAGE }
