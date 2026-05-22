const api = typeof browser !== 'undefined' ? browser : chrome

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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
    getBrowser() {
        const ua = navigator.userAgent
        if (ua.match(/edg/i)) return 'Edge'
        if (ua.match(/opr\//i) || ua.match(/opera/i)) return 'Opera'
        if (ua.match(/chrome|chromium|crios/i)) return 'Chrome'
        if (ua.match(/firefox|fxios/i)) return 'Firefox'
        if (ua.match(/safari/i)) return 'Safari'
        return 'Unknown'
    },
    DOM: {
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
        selectOptionByValue(selectEl, targetValue) {
            const targetOption = Array.from(selectEl.options).find(option => option.value === String(targetValue))
            if (targetOption) {
                targetOption.selected = true
                selectEl.dispatchEvent(new Event('change', { bubbles: true }))
                return true
            }
            return false
        },
        selectOptionByDatasetIndex(selectEl, targetDatasetIndex) {
            const targetOption = Array.from(selectEl.options).find(option => String(option.dataset.index) === String(targetDatasetIndex))
            if (targetOption) {
                targetOption.selected = true
                selectEl.dispatchEvent(new Event('change', { bubbles: true }))
                return true
            }
            return false
        },
    },
}

export const Vault = {
    app: null,
    db: null,
    instanceName: '',
    lastLoadedData: {},
    init(instanceName, encodedConfig) {
        try {
            const config = JSON.parse(atob(encodedConfig))
            const existingApp = firebase.apps.find(app => app.name === instanceName)
            if (existingApp) {
                this.app = existingApp
            } else {
                this.app = firebase.initializeApp(config, instanceName)
            }
            this.db = this.app.database()
            this.db.INTERNAL.forceWebSockets(true)
            this.instanceName = instanceName
        } catch (err) {
            console.error('Vault failed to initialize:', err)
        }
    },
    loadAll() {
        return new Promise((resolve, reject) => {
            api.storage.local.get(null, (items) => {
                if (api.runtime.lastError) {
                    reject(api.runtime.lastError)
                } else {
                    this.lastLoadedData = items || {}
                    resolve(this.lastLoadedData)
                }
            })
        })
    },
    save(key, data) {
        return new Promise((resolve, reject) => {
            api.storage.local.set({ [key]: data }, () => {
                if (api.runtime.lastError) {
                    reject(api.runtime.lastError)
                } else {
                    this.lastLoadedData[key] = data
                    resolve()
                }
            })
        })
    },
    load(key) {
        return new Promise((resolve, reject) => {
            api.storage.local.get(key, (result) => {
                if (api.runtime.lastError) {
                    reject(api.runtime.lastError)
                } else {
                    this.lastLoadedData[key] = result[key]
                    resolve(result[key])
                }
            })
        })
    },
    exists(key) {
        return new Promise((resolve, reject) => {
            api.storage.local.get(key, (result) => {
                if (api.runtime.lastError) {
                    reject(api.runtime.lastError)
                } else {
                    resolve(result.hasOwnProperty(key))
                }
            })
        })
    },
    remove(key) {
        return new Promise((resolve, reject) => {
            api.storage.local.remove(key, () => {
                if (api.runtime.lastError) {
                    reject(api.runtime.lastError)
                } else {
                    delete this.lastLoadedData[key]
                    resolve()
                }
            })
        })
    },
    clear() {
        return new Promise((resolve, reject) => {
            api.storage.local.clear(() => {
                if (api.runtime.lastError) {
                    reject(api.runtime.lastError)
                } else {
                    this.lastLoadedData = {}
                    resolve()
                }
            })
        })
    },
    async upload(path, data) {
        if (!this.db) throw new Error('Vault not initialized.')
        return this.db.ref(`${this.instanceName}/${path}`).set(data)
    },
    async download(path) {
        if (!this.db) throw new Error('Vault not initialized.')
        const snapshot = await this.db.ref(`${this.instanceName}/${path}`).once('value')
        return snapshot.val()
    },
    async has(path) {
        if (!this.db) return false
        const snapshot = await this.db.ref(`${this.instanceName}/${path}`).once('value')
        return snapshot.exists()
    },
    async discard(path) {
        if (!this.db) throw new Error('Vault not initialized.')
        return this.db.ref(`${this.instanceName}/${path}`).set(null)
    },
    async destroy() {
        if (this.app) {
            await this.app.delete()
            this.app = null
            this.db = null
            this.instanceName = ''
        }
    },
}

export class VaultDriver {
    constructor(key, defaultData = {}) {
        this.key = key
        this.data = defaultData
    }
    async update(newData) {
        this.data = { ...this.data, ...newData }
        await this.save()
    }
    async save() {
        try {
            await Vault.save(this.key, this.data)
        } catch (err) {
            console.error(`Failed to save ${this.key}:`, err)
        }
    }
    async load() {
        try {
            const savedData = await Vault.load(this.key)
            if (savedData) {
                this.data = { ...this.data, ...savedData }
            }
        } catch (err) {
            console.error(`Failed to load ${this.key}:`, err)
        }
    }
}
