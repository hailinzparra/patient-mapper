(async () => {
    try {
        const api = typeof browser !== 'undefined' ? browser : chrome

        const currentUrl = window.location.href
        const isHospital2 = currentUrl.includes('apirssoehadi.sragenkab.go.id')

        if (isHospital2) {
            console.log('Extension loaded on Hospital 2. Custom manipulation deactivated.')
            return
        }

        class VaultDriver {
            constructor(key, defaultData = {}) {
                this.key = key
                this.data = defaultData
            }
            load() {
                return new Promise((resolve) => {
                    api.storage.local.get(this.key, (result) => {
                        if (result && result[this.key]) {
                            this.data = { ...this.data, ...result[this.key] }
                        }
                        resolve(this.data)
                    })
                })
            }
        }

        let activeSettings = {}
        let itemPriceRegistry = {}

        const applyExtensionFunctions = () => {
            const allowCopy = activeSettings.allowCopy === true
            const showPrice = activeSettings.showPrice === true

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
                injectTablePriceBadges()
            } else {
                document.querySelectorAll('.ext-price-badge-group').forEach(el => el.remove())
                document.querySelectorAll('.ext-grand-summary-card').forEach(el => el.remove())
            }
        }

        const extractProductPricingData = () => {
            const activePickers = document.querySelectorAll('ul[id^="barang-combo-"][id$="-picker-listEl"]')
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
                            itemPriceRegistry[cleanName] = {
                                price: rawPriceNum,
                                id: itemId
                            }
                        }
                    }
                })
            })
        }

        const injectTablePriceBadges = () => {
            const rows = document.querySelectorAll('div[id^="tableview-"] table.x-grid-item tr.x-grid-row')
            if (!rows.length) {
                document.querySelectorAll('.ext-grand-summary-card').forEach(el => el.remove())
                return
            }

            let grandPriceSum = 0
            let grandTotalSum = 0
            let lastRowTableElement = null
            let validBadgesRendered = 0

            rows.forEach(row => {
                const nameCellInner = row.querySelector('td:nth-child(5) .x-grid-cell-inner')
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

                const qtyCellInner = row.querySelector('td:nth-child(7) .x-grid-cell-inner')
                let quantity = 0
                if (qtyCellInner) {
                    quantity = parseFloat(qtyCellInner.textContent.trim())
                    if (isNaN(quantity)) quantity = 0
                }

                const cachedItem = itemPriceRegistry[drugName]
                if (!cachedItem || cachedItem.price === undefined) {
                    const existingGroup = nameCellInner.querySelector('.ext-price-badge-group')
                    if (existingGroup) existingGroup.remove()
                    return
                }

                const parentTable = row.closest('table.x-grid-item')
                if (parentTable) {
                    lastRowTableElement = parentTable
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
                badgeGroup.style.cssText = `display: flex !important; gap: 6px !important; margin-top: 4px !important; font-size: 11px !important; font-weight: bold !important; pointer-events: none !important;`

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

            if (validBadgesRendered === 0 || !lastRowTableElement) {
                document.querySelectorAll('.ext-grand-summary-card').forEach(el => el.remove())
                return
            }

            const activeTableScroller = lastRowTableElement.closest('div[id^="tableview-"]')
            if (!activeTableScroller) return

            const expectedSummaryState = `${grandPriceSum}-${grandTotalSum}-${validBadgesRendered}`
            const existingSummary = activeTableScroller.querySelector('.ext-grand-summary-card')

            document.querySelectorAll('.ext-grand-summary-card').forEach(el => {
                if (el !== existingSummary) el.remove()
            })

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
                    Price Summary (Extension)
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
        }

        const allowSelectionOverride = (e) => {
            if (e.type === 'selectstart' || e.type === 'mousedown') {
                e.stopPropagation()
                return true
            }
        }

        document.addEventListener('selectstart', allowSelectionOverride, true)
        document.addEventListener('mousedown', allowSelectionOverride, true)

        const initEngine = async () => {
            const settingsDriver = new VaultDriver('settings', {
                devMode: false,
                allowCopy: true,
                showPrice: true,
            })

            await settingsDriver.load()
            activeSettings = settingsDriver.data

            applyExtensionFunctions()

            let debounceTimer
            const observer = new MutationObserver((mutationsList) => {
                let contentChanged = mutationsList.some(m => m.type === 'childList' || m.type === 'characterData')
                if (!contentChanged) return

                clearTimeout(debounceTimer)
                debounceTimer = setTimeout(() => {
                    window.requestAnimationFrame(() => {
                        applyExtensionFunctions()
                        extractProductPricingData()
                    })
                }, 250)
            })

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
            })

            api.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && changes.extensionSettings) {
                    activeSettings = changes.extensionSettings.newValue || {}
                    applyExtensionFunctions()
                }
            })
        }

        await initEngine()
    } catch (err) {
        console.error('Patient Mapper engine error:', err)
    }
})()
