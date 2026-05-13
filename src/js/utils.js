class EventEmitter {
    #listeners = new Map()
    on(name, callback) {
        if (!this.#listeners.has(name)) {
            this.#listeners.set(name, new Set())
        }
        this.#listeners.get(name).add(callback)
        return () => this.off(name, callback)
    }
    off(name, callback) {
        const listeners = this.#listeners.get(name)
        if (listeners) {
            listeners.delete(callback)
            if (listeners.size === 0) this.#listeners.delete(name)
        }
    }
    emit(name, data = {}) {
        const listeners = this.#listeners.get(name)
        if (listeners) {
            [...listeners].forEach(callback => {
                try {
                    callback(data)
                } catch (err) {
                    console.error(`Error in event "${name}":`, err)
                }
            })
        }
    }
    clear(name = null) {
        if (name) this.#listeners.delete(name)
        else this.#listeners.clear()
    }
}

export const Events = new EventEmitter()

export const Utils = {
    getBrowser() {
        const ua = navigator.userAgent
        if (ua.match(/edg/i)) return 'Edge'
        if (ua.match(/opr\//i) || ua.match(/opera/i)) return 'Opera'
        if (ua.match(/chrome|chromium|crios/i)) return 'Chrome'
        if (ua.match(/firefox|fxios/i)) return 'Firefox'
        if (ua.match(/safari/i)) return 'Safari'
        return 'Unknown'
    },
    createElement(tag, { classes = '', attrs = {}, text = '', html = '' } = {}, children = []) {
        const element = document.createElement(tag)
        if (classes.length) element.className = classes
        for (const [key, val] of Object.entries(attrs)) {
            element.setAttribute(key, val)
        }
        if (html) element.innerHTML = html
        else if (text) element.textContent = text
        if (children.length) element.append(...children.filter(Boolean))
        return element
    },
}
