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
                    console.error(`Error in event '${name}':`, err)
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

export const Vault = {
    app: null,
    db: null,
    instanceName: '',
    init(instanceName, encodedConfig) {
        try {
            const existingApp = firebase.apps.find(app => app.name === instanceName)
            if (existingApp) this.app = existingApp
            else this.app = firebase.initializeApp(JSON.parse(atob(encodedConfig)), instanceName)
            this.db = this.app.database()
            this.db.INTERNAL.forceWebSockets(true)
            this.instanceName = instanceName
        }
        catch (error) {
            console.error('Failed to initialize:', error)
        }
    },
    async save(path, data) {
        if (!this.db) throw new Error('Vault not initialized.')
        try {
            return this.db.ref(`${this.instanceName}/${path}`).set(data)
        }
        catch (error) {
            console.error('Failed to save:', error)
            return null
        }
    },
    async load(path) {
        if (!this.db) throw new Error('Vault not initialized.')
        try {
            const snapshot = await this.db.ref(`${this.instanceName}/${path}`).once('value')
            return snapshot.val()
        }
        catch (error) {
            console.error('Failed to load:', error)
            return null
        }
    },
    async exists(path) {
        if (!this.db) return false
        try {
            const snapshot = await this.db.ref(`${this.instanceName}/${path}`).once('value')
            return snapshot.exists()
        }
        catch {
            return false
        }
    },
    async remove(path) {
        if (!this.db) throw new Error('Vault not initialized.')
        try {
            return this.db.ref(`${this.instanceName}/${path}`).set(null)
        }
        catch (error) {
            console.error('Failed to remove:', error)
            return null
        }
    },
    async destroy() {
        try {
            if (this.app) {
                await this.app.delete()
                this.app = null
                this.db = null
                this.instanceName = ''
            }
            return true
        }
        catch (error) {
            console.error('Failed to destroy:', error)
            return false
        }
    },
}
