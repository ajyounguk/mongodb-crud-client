const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { loadConfig, describeUri, redact, DEFAULT_URI } = require('../lib/config')

describe('loadConfig', () => {
    let dir
    before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crud-config-')) })
    after(() => fs.rmSync(dir, { recursive: true, force: true }))

    const write = obj => fs.writeFileSync(path.join(dir, 'mongo-config.json'), typeof obj === 'string' ? obj : JSON.stringify(obj))
    const clear = () => fs.rmSync(path.join(dir, 'mongo-config.json'), { force: true })

    it('defaults to local MongoDB when there is no env var or file', () => {
        clear()
        assert.deepEqual(loadConfig({ env: {}, configDir: dir }), { uri: DEFAULT_URI, source: 'default' })
    })

    it('reads mongourl from config/mongo-config.json', () => {
        write({ mongourl: 'mongodb://u:p@127.0.0.1:27017/data' })
        assert.deepEqual(loadConfig({ env: {}, configDir: dir }), {
            uri: 'mongodb://u:p@127.0.0.1:27017/data',
            source: 'config/mongo-config.json'
        })
    })

    it('accepts "uri" as the key too', () => {
        write({ uri: 'mongodb://127.0.0.1/other' })
        assert.equal(loadConfig({ env: {}, configDir: dir }).uri, 'mongodb://127.0.0.1/other')
    })

    it('prefers MONGODB_URI over the file', () => {
        write({ mongourl: 'mongodb://127.0.0.1/file' })
        const cfg = loadConfig({ env: { MONGODB_URI: 'mongodb://127.0.0.1/env' }, configDir: dir })
        assert.deepEqual(cfg, { uri: 'mongodb://127.0.0.1/env', source: 'env:MONGODB_URI' })
    })

    it('loads the shipped sample (its _help block is ignored)', () => {
        fs.copyFileSync(path.join(__dirname, '..', 'config', 'mongo-config-sample.json'), path.join(dir, 'mongo-config.json'))
        const { uri } = loadConfig({ env: {}, configDir: dir })
        assert.equal(uri, 'mongodb://data_dev:CHANGE_ME@127.0.0.1:27017/data?authSource=data')
        assert.equal(describeUri(uri).db, 'data')
    })

    it('fails clearly on invalid JSON or a missing key', () => {
        write('{ nope')
        assert.throws(() => loadConfig({ env: {}, configDir: dir }), /not valid JSON/)
        write({ other: 1 })
        assert.throws(() => loadConfig({ env: {}, configDir: dir }), /no "mongourl"/)
    })
})

describe('describeUri', () => {
    it('classifies loopback hosts as local', () => {
        assert.deepEqual(describeUri('mongodb://user:secret@127.0.0.1:27017/data?authSource=admin'), {
            kind: 'local', hosts: ['127.0.0.1'], db: 'data', label: '127.0.0.1:27017'
        })
        assert.equal(describeUri('mongodb://localhost').kind, 'local')
        assert.equal(describeUri('mongodb://localhost').db, 'test')
    })

    it('classifies Atlas by scheme or hostname', () => {
        assert.equal(describeUri('mongodb+srv://u:p@cluster0.abcde.mongodb.net/app').kind, 'atlas')
        assert.equal(describeUri('mongodb://a.mongodb.net:27017,b.mongodb.net:27017/app').kind, 'atlas')
    })

    it('classifies anything else as custom', () => {
        const d = describeUri('mongodb://db1.example.com:27017,127.0.0.1:27017/app')
        assert.equal(d.kind, 'custom')
        assert.deepEqual(d.hosts, ['db1.example.com', '127.0.0.1'])
    })

    it('never includes credentials in the label', () => {
        assert.doesNotMatch(JSON.stringify(describeUri('mongodb://admin:hunter2@db.example.com/x')), /hunter2|admin/)
    })

    it('handles garbage', () => {
        assert.equal(describeUri('http://nope').label, 'unrecognised URI')
        assert.equal(describeUri(undefined).kind, 'custom')
    })
})

describe('redact', () => {
    it('masks user:password in URIs', () => {
        assert.equal(redact('see mongodb+srv://a:b@h.example.com/x and mongodb://c@d/'), 'see mongodb+srv://***@h.example.com/x and mongodb://***@d/')
        assert.equal(redact('no uri here'), 'no uri here')
    })
})
