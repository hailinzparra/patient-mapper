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
    ID() {
        return crypto.randomUUID()
    },
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
    debounce(func, delay) {
        let timer
        return function (...args) {
            clearTimeout(timer)
            timer = setTimeout(() => func.apply(this, args), delay)
        }
    },
    randomRange(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1))
    },
    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
    formatCountdown(timeLeftMs) {
        const safeMs = Math.max(0, timeLeftMs)
        const totalSeconds = Math.floor(safeMs / 1000)
        const totalMinutes = Math.floor(totalSeconds / 60)
        const totalHours = Math.floor(totalMinutes / 60)
        const displaySeconds = String(totalSeconds % 60).padStart(2, '0')
        const displayMinutes = String(totalMinutes % 60).padStart(2, '0')
        const displayHours = String(totalHours)
        return `${displayHours}:${displayMinutes}:${displaySeconds}`
    },
    formatCompactCountdown(timeLeftMs) {
        const safeMs = Math.max(0, timeLeftMs)
        const totalMinutes = Math.floor(safeMs / (1000 * 60))
        const totalHours = Math.floor(totalMinutes / 60)
        const days = Math.floor(totalHours / 24)
        const hours = totalHours % 24
        const minutes = totalMinutes % 60
        const parts = []
        if (days > 0) parts.push(`${days}d`)
        if (hours > 0 || days > 0) parts.push(`${hours}h`)
        parts.push(`${minutes}m`)
        return parts.join(' ')
    },
    formatDateVariants(dateInput) {
        if (!dateInput) {
            return { short: '--', long: '--', time: '--', longtime: '--' }
        }
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
        if (isNaN(date.getTime())) {
            return { short: '--', long: '--', time: '--', longtime: '--' }
        }
        const long = date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
        const short = long.replace(/\s\d{4}$/, '')
        const time = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        const longtime = (long && time) ? `${long} ${time}` : '--'
        return { short, long, time, longtime }
    },
    formatFullTimestamp(ms) {
        if (!ms) return '--'
        const d = typeof ms === 'number' ? new Date(ms) : new Date(ms)
        if (isNaN(d.getTime())) return '--'
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
            hour12: false,
        }).format(d).replace(',', '')
    },
    toLocalISOString(date = new Date()) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error('Invalid Date object provided')
        }
        const offsetMs = date.getTimezoneOffset() * 60 * 1000
        const localTime = new Date(date.getTime() - offsetMs)
        return localTime.toISOString().slice(0, -1)
    },
    getValidValue(val, fallback) {
        if (val === null || val === undefined) return fallback
        const cleanStr = String(val).trim()
        const lowerStr = cleanStr.toLowerCase()
        if (
            lowerStr === '' ||
            lowerStr === 'null' ||
            lowerStr === 'undefined' ||
            lowerStr === '-' ||
            lowerStr === '??'
        ) {
            return fallback
        }
        return typeof val === 'number' ? val : cleanStr
    },
    buildUrl(domain, basePath, detailPath, queryString = '') {
        const sanitizedPath = `${basePath}/${detailPath}`.replace(/\/{2,}/g, '/')
        const urlObj = new URL(sanitizedPath, domain)
        const params = new URLSearchParams(queryString)
        if (queryString) {
            params.forEach((value, key) => urlObj.searchParams.append(key, value))
        }
        return urlObj.toString()
    },
    formatNameWithTitle(rawName) {
        if (!rawName || typeof rawName !== 'string' || !rawName.trim().length) return null

        const [namePart, titlePart] = rawName.split(',')
        let name = namePart.trim()

        const startsWithLowercaseDr = /^dr(?:\.|\b)/.test(name)
        if (startsWithLowercaseDr) {
            name = name.replace(/^dr(?:\.|\b)\s*/, '')
        }

        let formattedName = name
            .toLowerCase()
            .replace(/(?:^|[\s\-\'])\S/g, (match) => match.toUpperCase())

        if (startsWithLowercaseDr) {
            formattedName = `dr. ${formattedName}`
        }

        if (titlePart) {
            return `${formattedName}, ${titlePart.trim()}`
        }
        return formattedName
    },
    decodeHtmlEntities(str) {
        if (!str) return ''
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
    },
    DOM: {
        GEAR_SVG: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767a1.123 1.123 0 0 0-.417 1.03c.004.074.006.148.006.222 0 .074-.002.148-.006.222a1.123 1.123 0 0 0 .417 1.03l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.075.124a2.08 2.08 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.644-.87a2.08 2.08 0 0 1-.22-.127a1.125 1.125 0 0 0-1.074-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.43l1.002-.767a1.123 1.123 0 0 0 .417-1.03c-.004-.074-.006-.148-.006-.222c0-.074.002-.148.006-.222a1.123 1.123 0 0 0-.417-1.03l-1.002-.767a1.125 1.125 0 0 1-.26-1.43l1.296-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124c.072-.044.146-.086.22-.128c.332-.183.582-.495.644-.869l.214-1.28z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
        </svg>`,
        CLOSE_SVG: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        createElement(tag, { classes = '', attrs = {}, text = '', html = '' } = {}, children = []) {
            const svgTags = ['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use', 'defs']
            const isSvg = svgTags.includes(tag.toLowerCase())
            const element = isSvg
                ? document.createElementNS('http://www.w3.org/2000/svg', tag)
                : document.createElement(tag)
            if (classes.length) {
                element.setAttribute('class', classes)
            }
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
    UI: {
        toast: {
            type: {
                default: 'default',
                success: 'success',
                error: 'error',
                warning: 'warning',
                info: 'info',
            },
            _configs: {
                default: {
                    classes: 'bg-zinc-50/90 border-zinc-200 text-zinc-800',
                    icon: '',
                },
                success: {
                    classes: 'bg-emerald-50/90 border-emerald-200 text-emerald-800',
                    icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
                },
                error: {
                    classes: 'bg-red-50/90 border-red-200 text-red-800',
                    icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
                },
                warning: {
                    classes: 'bg-amber-50/90 border-amber-200 text-amber-800',
                    icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
                },
                info: {
                    classes: 'bg-blue-50/90 border-blue-200 text-blue-800',
                    icon: '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>',
                },
            },
            pop(message, type = 'default') {
                let container = document.getElementById('extension-toast-container')
                if (!container) {
                    container = document.createElement('div')
                    container.id = 'extension-toast-container'
                    container.className = 'fixed bottom-5 left-5 z-[9999] flex flex-col gap-2 pointer-events-none'
                    document.body.appendChild(container)
                }

                const config = this._configs[type] || this._configs.default
                const toast = document.createElement('div')

                toast.setAttribute('role', 'alert')
                toast.setAttribute('aria-live', 'polite')
                toast.className = `px-3 py-1.5 rounded-lg shadow-lg border text-[11px] font-medium flex items-center gap-2 transition-all duration-300 ease-out backdrop-blur-sm ${config.classes}`

                toast.style.transform = 'translateX(-100%)'
                toast.style.opacity = '0'

                const iconHtml = config.icon ? config.icon : ''
                toast.innerHTML = `${iconHtml}<span class="leading-tight">${message}</span>`

                container.appendChild(toast)

                setTimeout(() => {
                    toast.style.transform = 'translateX(0)'
                    toast.style.opacity = '1'
                }, 50)

                setTimeout(() => {
                    toast.className.replace('duration-300', 'duration-500')
                    toast.style.opacity = '0'
                    toast.addEventListener('transitionend', () => {
                        toast.remove()
                        if (container.children.length === 0) container.remove()
                    }, { once: true })
                }, 3000)
            },
        },
    },
    async executeNativeClipboardCopy(textToCopy, feedbackEl, copiedText = 'Copied!', errorText = 'Error') {
        if (!textToCopy) return
        try {
            await navigator.clipboard.writeText(textToCopy)
            if (feedbackEl && feedbackEl.tagName === 'BUTTON') {
                if (feedbackEl._copyTimeout) {
                    clearTimeout(feedbackEl._copyTimeout)
                } else {
                    feedbackEl._originalText = feedbackEl.innerText
                }
                feedbackEl.innerText = copiedText
                feedbackEl._copyTimeout = setTimeout(() => {
                    feedbackEl.innerText = feedbackEl._originalText
                    delete feedbackEl._originalText
                    delete feedbackEl._copyTimeout
                }, 1000)
            }
        } catch (err) {
            // this.swalFatalError(
            //     err,
            //     'Copy Failed',
            //     'The application encountered a fatal copy error:',
            // )
            if (feedbackEl && feedbackEl.tagName === 'BUTTON') {
                if (feedbackEl._copyTimeout) {
                    clearTimeout(feedbackEl._copyTimeout)
                } else {
                    feedbackEl._originalText = feedbackEl.innerText
                }
                feedbackEl.innerText = errorText
                feedbackEl._copyTimeout = setTimeout(() => {
                    feedbackEl.innerText = feedbackEl._originalText
                    delete feedbackEl._originalText
                    delete feedbackEl._copyTimeout
                }, 1000)
            }
        }
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

export class Tab {
    constructor(id, name, children, onCloseCallback, isPermanent = false) {
        this.id = id
        this.name = name
        this.children = children
        this.onCloseCallback = onCloseCallback
        this.isPermanent = isPermanent
        this.tabHeaderEl = null
        this.tabContentEl = null
    }
    renderHeader() {
        const button = document.createElement('button')
        button.id = `tab-${this.id}`
        button.dataset.tabId = this.id
        button.className = 'px-4 h-full text-[11px] font-bold uppercase tracking-wider border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-all shrink-0 focus:outline-none'

        const titleSpan = document.createElement('span')
        titleSpan.className = 'tab-title-text'
        titleSpan.textContent = this.name
        button.append(titleSpan)

        if (!this.isPermanent) {
            const closeBtn = document.createElement('span')
            closeBtn.className = 'tab-close-icon ml-1 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center p-0.5 rounded'
            closeBtn.innerHTML = Utils.DOM.CLOSE_SVG
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                if (this.onCloseCallback) this.onCloseCallback(this.id)
            })
            button.append(closeBtn)
        }

        this.tabHeaderEl = button
        return button
    }
    renderContent() {
        const contentDiv = document.createElement('div')
        contentDiv.className = 'tab-content-panel'
        contentDiv.dataset.tabId = this.id

        contentDiv.className = 'p-6 space-y-6 mb-10 hidden'
        if (this.children.length) contentDiv.append(...this.children.filter(Boolean))

        this.tabContentEl = contentDiv
        return contentDiv
    }
    activate() {
        if (this.tabHeaderEl) {
            this.tabHeaderEl.classList.remove('border-transparent', 'text-slate-400', 'hover:text-slate-600')
            this.tabHeaderEl.classList.add('border-blue-600', 'text-blue-600')
        }
        if (this.tabContentEl) {
            this.tabContentEl.classList.remove('hidden')
        }
    }
    deactivate() {
        if (this.tabHeaderEl) {
            this.tabHeaderEl.classList.remove('border-blue-600', 'text-blue-600')
            this.tabHeaderEl.classList.add('border-transparent', 'text-slate-400', 'hover:text-slate-600')
        }
        if (this.tabContentEl) {
            this.tabContentEl.classList.add('hidden')
        }
    }
    destroy() {
        this.tabHeaderEl?.remove()
        this.tabContentEl?.remove()
    }
}

export class TabManager {
    constructor(containerId) {
        this.container = document.createElement('div')

        if (typeof containerId === 'string') {
            this.container = document.getElementById(containerId)
            if (!this.container) {
                throw new Error(`Container #${containerId} not found.`)
            }
        }

        this.tabs = new Map()
        this.activeTabId = null

        this.container.classList.add('hidden')
        this.container.innerHTML = `<div class="tab-manager-wrapper flex flex-col h-full w-full">
            <div class="tab-headers-container bg-white border-b border-slate-200 flex items-center px-4 gap-1 h-10 flex-shrink-0 overflow-x-auto scrollbar-none"></div>
            <div class="tab-contents-container flex-1 overflow-y-auto"></div></div>`

        this.wrapperEl = this.container.querySelector('.tab-manager-wrapper')
        this.headersContainer = this.container.querySelector('.tab-headers-container')
        this.contentsContainer = this.container.querySelector('.tab-contents-container')
    }
    getTab(id) {
        return this.tabs.get(id)
    }
    getTabHeaderEl(id) {
        const tab = this.getTab(id)
        return tab ? tab.tabHeaderEl : null
    }
    getTabContentEl(id) {
        const tab = this.getTab(id)
        return tab ? tab.tabContentEl : null
    }
    addTab(id, name, children, isPermanent = false) {
        if (this.tabs.has(id)) {
            this.switchTab(id)
            return
        }

        const newTab = new Tab(id, name, children, (tabId) => this.removeTab(tabId), isPermanent)
        this.tabs.set(id, newTab)

        const headerEl = newTab.renderHeader()
        const contentEl = newTab.renderContent()

        headerEl.addEventListener('click', () => this.switchTab(id))

        this.headersContainer.appendChild(headerEl)
        this.contentsContainer.appendChild(contentEl)

        this.switchTab(id)
    }
    switchTab(id) {
        if (!this.tabs.has(id)) return
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            this.tabs.get(this.activeTabId).deactivate()
        }
        this.activeTabId = id
        this.tabs.get(id).activate()
    }
    removeTab(id) {
        const tabToDestroy = this.tabs.get(id)

        if (!tabToDestroy) return
        if (tabToDestroy.isPermanent) return

        tabToDestroy.destroy()
        this.tabs.delete(id)

        if (this.activeTabId === id) {
            const remainingIds = Array.from(this.tabs.keys())
            if (remainingIds.length > 0) {
                this.switchTab(remainingIds[remainingIds.length - 1])
            } else {
                this.activeTabId = null
            }
        }
    }
    open(id = '') {
        this.container.classList.remove('hidden')
        if (id) {
            this.switchTab(id)
        } else if (this.activeTabId) {
            this.switchTab(this.activeTabId)
        }
    }
    close() {
        this.container.classList.add('hidden')
    }
}
