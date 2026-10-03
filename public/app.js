// Client-side polish: JSON highlighting, copy button, confirm dialogs.
// Built with textContent only; nothing from the server goes through innerHTML.

(function () {
    'use strict'

    // Re-render a <pre> of JSON as coloured spans
    function highlight(pre) {
        let value
        try {
            value = JSON.parse(pre.textContent)
        } catch {
            return
        }
        const frag = document.createDocumentFragment()

        function span(cls, text) {
            const s = document.createElement('span')
            s.className = cls
            s.textContent = text
            frag.appendChild(s)
        }
        function text(t) {
            frag.appendChild(document.createTextNode(t))
        }
        function walk(v, indent) {
            const pad = '  '.repeat(indent)
            if (v === null) return span('j-null', 'null')
            if (Array.isArray(v)) {
                if (v.length === 0) return text('[]')
                text('[\n')
                v.forEach((item, i) => {
                    text(pad + '  ')
                    walk(item, indent + 1)
                    text(i < v.length - 1 ? ',\n' : '\n')
                })
                return text(pad + ']')
            }
            if (typeof v === 'object') {
                const keys = Object.keys(v)
                if (keys.length === 0) return text('{}')
                text('{\n')
                keys.forEach((k, i) => {
                    text(pad + '  ')
                    span('j-key', JSON.stringify(k))
                    text(': ')
                    walk(v[k], indent + 1)
                    text(i < keys.length - 1 ? ',\n' : '\n')
                })
                return text(pad + '}')
            }
            if (typeof v === 'string') return span('j-str', JSON.stringify(v))
            if (typeof v === 'number') return span('j-num', String(v))
            if (typeof v === 'boolean') return span('j-bool', String(v))
        }

        walk(value, 0)
        pre.textContent = ''
        pre.appendChild(frag)
    }

    document.querySelectorAll('pre.json').forEach(highlight)

    document.querySelectorAll('[data-copy-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.copyTarget)
            if (!target || !navigator.clipboard) return
            navigator.clipboard.writeText(target.textContent).then(() => {
                const label = btn.textContent
                btn.textContent = 'Copied'
                setTimeout(() => { btn.textContent = label }, 1500)
            })
        })
    })

    document.querySelectorAll('form[data-confirm]').forEach(form => {
        form.addEventListener('submit', e => {
            if (!window.confirm(form.dataset.confirm)) e.preventDefault()
        })
    })
})()
