(async () => {
    try {
        const api = typeof browser !== 'undefined' ? browser : chrome

        let contentEngine = null
        const startEngine = () => {
            const currentUrl = window.location.href
            const isSoehadi = currentUrl.includes('apirssoehadi.sragenkab.go.id')
            if (isSoehadi) {
                contentEngine = new SoehadiContentEngine()
            } else {
                contentEngine = new SoediranContentEngine()
            }
            contentEngine.init()
        }

        class ContentEngine {
            constructor(driverConfigs = []) {
                this.activeSettings = {}
                this.drivers = {}
                this.observer = null
                this.primaryKey = null
                driverConfigs.forEach(({ key, defaults, isPrimary }) => {
                    const driver = new VaultDriver(key, defaults)
                    this.drivers[key] = driver
                    if (isPrimary) {
                        this.primaryKey = key
                    }
                })
            }
            async init() {
                try {
                    await this.loadSettings()
                    this.applyExtensionFunctions()
                    this.setupObservers()
                    this.bindEvents()
                } catch (err) {
                    console.error('Failed to initialize ContentEngine:', err)
                }
            }
            async loadSettings() {
                const loadPromises = Object.values(this.drivers).map(driver => driver.load())
                await Promise.all(loadPromises)
                if (this.primaryKey && this.drivers[this.primaryKey]) {
                    this.activeSettings = this.drivers[this.primaryKey].data
                }
            }
            setupObservers() {
                let debounceTimer
                this.observer = new MutationObserver((mutationsList) => {
                    const contentChanged = mutationsList.some(m => m.type === 'childList' || m.type === 'characterData')
                    if (!contentChanged) return
                    clearTimeout(debounceTimer)
                    debounceTimer = setTimeout(() => {
                        window.requestAnimationFrame(() => {
                            this.updateOnDebounce()
                        })
                    }, 250)
                })
                this.observer.observe(document.body, { childList: true, subtree: true, characterData: true })
            }
            bindEvents() {
                api.storage.onChanged.addListener((changes, areaName) => {
                    if (areaName !== 'local') return
                    Object.keys(this.drivers).forEach(key => {
                        if (changes[key]) {
                            this.drivers[key].data = changes[key].newValue || {}
                            if (key === this.primaryKey) {
                                this.activeSettings = this.drivers[key].data
                                this.applyExtensionFunctions()
                            }
                        }
                    })
                })
            }
            updateOnDebounce() {
                this.applyExtensionFunctions()
            }
            applyExtensionFunctions() { }
        }

        class SoediranContentEngine extends ContentEngine {
            constructor() {
                const unminifiedPriceDatabase = Object.entries(__EXTENSION_DATABASE_MIN.PRICES).reduce((acc, [itemKey, itemData]) => {
                    acc[itemKey] = {
                        id: itemData.i,
                        price: itemData.p,
                        capital: itemData.c,
                    }
                    return acc
                }, {})

                super([
                    {
                        key: 'settings',
                        defaults: {
                            devMode: false,
                            allowCopy: true,
                            showPrice: true,
                        },
                        isPrimary: true,
                    },
                    {
                        key: 'prices',
                        defaults: unminifiedPriceDatabase,
                        isPrimary: false,
                    },
                ])
            }
            async init() {
                await super.init()
                const allowSelectionOverride = (e) => {
                    if (e.type === 'selectstart') {
                        e.stopPropagation()
                        return true
                    }
                }
                document.addEventListener('selectstart', allowSelectionOverride, true)
                console.log('Soediran engine initialized successfully.')
            }
            updateOnDebounce() {
                this.extractProductPricingData()
                super.updateOnDebounce()
            }
            applyExtensionFunctions() {
                const allowCopy = this.activeSettings.allowCopy === true
                const showPrice = this.activeSettings.showPrice === true

                const unselectableElements = document.querySelectorAll('.x-unselectable')
                unselectableElements.forEach(el => {
                    if (allowCopy) {
                        el.style.setProperty('user-select', 'text', 'important')
                        el.style.setProperty('-webkit-user-select', 'text', 'important')
                        if (!el.matches('button, a, .x-btn')) {
                            el.style.setProperty('cursor', 'text', 'important')
                        }
                    } else {
                        el.style.removeProperty('user-select')
                        el.style.removeProperty('-webkit-user-select')
                        el.style.removeProperty('cursor')
                    }
                })

                if (showPrice) {
                    this.injectTablePriceBadges()
                } else {
                    document.querySelectorAll('.ext-price-badge-group').forEach(el => el.remove())
                    document.querySelectorAll('.ext-grand-summary-card').forEach(el => el.remove())
                }
            }
            extractProductPricingData() {
                const activePickers = document.querySelectorAll('ul[id^="barang-combo-"][id$="-picker-listEl"]')
                let hasNewData = false
                activePickers.forEach(picker => {
                    const productCards = picker.querySelectorAll('.x-boundlist-item')
                    productCards.forEach(card => {
                        const innerDivs = card.querySelectorAll('div')
                        if (innerDivs.length < 5) return
                        const rawItemName = innerDivs[0].textContent.trim()
                        const match = rawItemName.match(/^\[\s*(\d+)\s*\]\s*-\s*(.+)$/)
                        if (match) {
                            const itemId = match[1]
                            const cleanName = match[2].trim()
                            let rawPriceNum = 0
                            innerDivs.forEach(div => {
                                const text = div.textContent
                                if (text.includes('Harga:')) {
                                    const matchedPrice = text.replace(/[^0-9.]/g, '')
                                    rawPriceNum = parseFloat(matchedPrice) || 0
                                }
                            })
                            if (cleanName && rawPriceNum > 0) {
                                const pricesRegistry = this.drivers['prices'].data
                                if (!pricesRegistry[cleanName] || pricesRegistry[cleanName].price !== rawPriceNum) {
                                    pricesRegistry[cleanName] = {
                                        ...pricesRegistry[cleanName] ?? {},
                                        price: rawPriceNum,
                                        id: itemId,
                                    }
                                    hasNewData = true
                                }
                            }
                        }
                    })
                })
                if (hasNewData) {
                    this.drivers['prices'].save()
                }
            }
            injectTablePriceBadges() {
                const panels = document.querySelectorAll('.x-panel-bodyWrap')
                if (!panels.length) {
                    document.querySelectorAll('.ext-grand-summary-card').forEach(el => el.remove())
                    return
                }

                const pricesRegistry = this.drivers['prices'].data

                panels.forEach(panel => {
                    const rows = panel.querySelectorAll('div[id^="tableview-"] table.x-grid-item tr.x-grid-row')
                    const localHeaderContainer = panel.querySelector('.x-grid-header-ct')
                    const activeTableScroller = panel.querySelector('div[id^="tableview-"]')

                    if (!rows.length || !localHeaderContainer || !activeTableScroller) {
                        panel.querySelectorAll('.ext-grand-summary-card').forEach(el => el.remove())
                        return
                    }

                    let grandPriceSum = 0
                    let grandTotalSum = 0
                    let validBadgesRendered = 0
                    let nameColumnId = null
                    let qtyColumnId = null

                    const localHeaders = localHeaderContainer.querySelectorAll('.x-column-header')
                    localHeaders.forEach(header => {
                        const textEl = header.querySelector('.x-column-header-text-inner')
                        if (!textEl) return
                        const text = textEl.textContent.trim()
                        const componentId = header.getAttribute('data-componentid')
                        if (text === 'Nama Obat') {
                            nameColumnId = componentId
                        } else if (text === 'Jumlah') {
                            qtyColumnId = componentId
                        }
                    })

                    const nameSelector = nameColumnId ? `td[data-columnid="${nameColumnId}"]` : 'td:nth-child(5)'
                    const qtySelector = qtyColumnId ? `td[data-columnid="${qtyColumnId}"]` : 'td:nth-child(7)'

                    rows.forEach(row => {
                        const nameCellInner = row.querySelector(`${nameSelector} .x-grid-cell-inner`)
                        if (!nameCellInner) return

                        const childNodes = Array.from(nameCellInner.childNodes)
                        let drugName = ''
                        for (let node of childNodes) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                drugName += node.textContent
                            } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('ext-price-badge-group')) {
                                drugName += node.textContent
                            }
                        }
                        drugName = drugName.trim()

                        const qtyCellInner = row.querySelector(`${qtySelector} .x-grid-cell-inner`)
                        let quantity = 0
                        if (qtyCellInner) {
                            quantity = parseFloat(qtyCellInner.textContent.trim())
                            if (isNaN(quantity)) quantity = 0
                        }

                        const cachedItem = pricesRegistry[drugName]
                        if (!cachedItem || cachedItem.price === undefined) {
                            const existingGroup = nameCellInner.querySelector('.ext-price-badge-group')
                            if (existingGroup) existingGroup.remove()
                            return
                        }

                        const unitPrice = cachedItem.price
                        const lineTotal = unitPrice * quantity

                        grandPriceSum += unitPrice
                        grandTotalSum += lineTotal
                        validBadgesRendered++

                        const existingGroup = nameCellInner.querySelector('.ext-price-badge-group')
                        const expectedDataAttr = `${unitPrice}-${lineTotal}`

                        if (existingGroup && existingGroup.dataset.priceState === expectedDataAttr) {
                            return
                        }

                        if (existingGroup) existingGroup.remove()

                        const badgeGroup = document.createElement('div')
                        badgeGroup.className = 'ext-price-badge-group'
                        badgeGroup.dataset.priceState = expectedDataAttr
                        badgeGroup.style.cssText = `display: flex !important; flex-wrap: wrap !important; gap: 6px !important; row-gap: 4px !important; margin-top: 4px !important; font-size: 11px !important; font-weight: bold !important; pointer-events: none !important;`

                        const unitBadge = document.createElement('span')
                        unitBadge.style.cssText = `background-color: #e8f5e9 !important; color: #2e7d32 !important; padding: 1px 6px !important; border-radius: 4px !important; white-space: nowrap !important;`
                        unitBadge.innerHTML = `Rp ${unitPrice.toLocaleString('id-ID')}`

                        const totalBadge = document.createElement('span')
                        totalBadge.style.cssText = `background-color: #e3f2fd !important; color: #1565c0 !important; padding: 1px 6px !important; border-radius: 4px !important; white-space: nowrap !important;`
                        totalBadge.innerHTML = `TOTAL: Rp ${lineTotal.toLocaleString('id-ID')}`

                        badgeGroup.appendChild(unitBadge)
                        badgeGroup.appendChild(totalBadge)
                        nameCellInner.appendChild(badgeGroup)
                    })

                    const expectedSummaryState = `${grandPriceSum}-${grandTotalSum}-${validBadgesRendered}`
                    const existingSummary = activeTableScroller.querySelector('.ext-grand-summary-card')

                    if (validBadgesRendered === 0) {
                        if (existingSummary) existingSummary.remove()
                        return
                    }

                    if (existingSummary && existingSummary.dataset.summaryState === expectedSummaryState) {
                        return
                    }

                    if (existingSummary) existingSummary.remove()

                    const summaryCard = document.createElement('div')
                    summaryCard.className = 'ext-grand-summary-card'
                    summaryCard.dataset.summaryState = expectedSummaryState
                    summaryCard.style.cssText = `display: block !important; position: sticky !important; bottom: 0 !important; left: 0 !important; z-index: 99999 !important; width: 96% !important; margin: 15px auto 5px auto !important; background: #ffffff !important; border: 2px dashed #b5bfc7 !important; border-radius: 6px !important; padding: 10px 14px !important; box-sizing: border-box !important; box-shadow: 0 -4px 12px rgba(0,0,0,0.08) !important;`

                    summaryCard.innerHTML = `<div style="display: flex !important; justify-content: space-between !important; align-items: center !important;">
    <div style="font-size: 12px !important; font-weight: bold !important; color: #37474f !important; text-transform: uppercase !important; tracking-wider: 0.5px !important;">
        Estimasi Harga Obat
    </div>
    <div style="display: flex !important; gap: 10px !important; font-size: 12px !important; font-weight: bold !important;">
        <div style="background-color: #e8f5e9 !important; color: #2e7d32 !important; padding: 4px 10px !important; border-radius: 4px !important; border: 1px solid #c8e6c9 !important;">
            SUM PRICE: Rp ${grandPriceSum.toLocaleString('id-ID')}
        </div>
        <div style="background-color: #e3f2fd !important; color: #1565c0 !important; padding: 4px 10px !important; border-radius: 4px !important; border: 1px solid #bbdefb !important;">
            GRAND TOTAL: Rp ${grandTotalSum.toLocaleString('id-ID')}
        </div>
    </div>
</div>`

                    activeTableScroller.appendChild(summaryCard)
                })
            }
        }

        class SoehadiContentEngine extends ContentEngine {
            constructor() {
                super([
                    {
                        key: 'settings',
                        defaults: { devMode: true, allowCopy: false },
                        isPrimary: true
                    }
                ])
            }
            async init() {
                await super.init()
                console.log('Soehadi engine initialized successfully.')
            }
        }

        class VaultDriver {
            constructor(key, defaultData = {}) {
                this.key = key
                this.data = defaultData
            }
            async update(newData) {
                this.data = { ...this.data, ...newData }
                await this.save()
            }
            async save() {
                return new Promise((resolve, reject) => {
                    api.storage.local.set({ [this.key]: this.data }, () => {
                        if (api.runtime.lastError) {
                            console.error(`Failed to save ${this.key}:`, api.runtime.lastError)
                            reject(api.runtime.lastError)
                        } else {
                            resolve()
                        }
                    })
                })
            }
            async load() {
                return new Promise((resolve, reject) => {
                    api.storage.local.get(this.key, (result) => {
                        if (api.runtime.lastError) {
                            console.error(`Failed to load ${this.key}:`, api.runtime.lastError)
                            reject(api.runtime.lastError)
                        } else {
                            if (result && result[this.key]) {
                                this.data = { ...this.data, ...result[this.key] }
                            }
                            resolve(this.data)
                        }
                    })
                })
            }
        }

        startEngine()
    } catch (err) {
        console.error('Extension error:', err)
    }
})()
