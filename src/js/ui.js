import { Utils, VaultDriver, Tab, TabManager } from './utils.js'
import { Patient, PatientList, ClinicalNote } from './clinical.js'
import { ApiSoediranDriver } from './api-soediran.js'
import { ApiSoehadiDriver } from './api-soehadi.js'
import { hospitalContext } from './context.js'

export class PatientLookup {
    #selectedDocs = []
    #selectedRooms = []
    #isMoreOptionsOpen = false
    #templateSelectedIndex = 0
    #apiName = ''
    #driver = null
    #onSubmitCallback = null

    #db = {
        doctorDatabase: [],
        roomDatabase: [],
        templates: [],
    }

    #nodes = {
        container: null,
        form: null,
        mrn: null,
        name: null,
        wardType: null,
        toggleBtn: null,
        chevronIcon: null,
        moreOptions: null,
        apiIndicator: null,
        templateDropdownBtn: null,
        templateMenu: null,
        templateSearch: null,
        templateList: null,
        selectedTemplateLabel: null,
        docTagContainer: null,
        docInput: null,
        docAutocomplete: null,
        roomTagContainer: null,
        roomInput: null,
        roomAutocomplete: null,
        enableDate: null,
        dateStart: null,
        dateEnd: null,
        dynamicInputsContainer: null,
        resetBtn: null,
    }

    #colorSchemes = [
        { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hover: 'hover:text-blue-900' },
        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hover: 'hover:text-emerald-900' },
        { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hover: 'hover:text-amber-900' },
        { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', hover: 'hover:text-rose-900' },
        { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', hover: 'hover:text-indigo-900' },
    ]

    constructor() { }

    init(targetContainerSelector, initialDatabase = null, driver = null, onSubmitCallback = null) {
        if (this.#nodes.form) return this

        this.#nodes.container = typeof targetContainerSelector === 'string'
            ? document.querySelector(targetContainerSelector)
            : targetContainerSelector

        if (driver) this.setDriver(driver)
        if (onSubmitCallback) this.onSubmit(onSubmitCallback)
        if (initialDatabase) this.setDatabase(initialDatabase, false)

        this.#buildFormDOM()
        this.#setupEventListeners()
        this.renderTemplates()

        return this
    }
    onSubmit(callback) {
        if (typeof callback === 'function') {
            this.#onSubmitCallback = callback
        }
    }
    setDriver(driver) {
        this.#driver = driver
        if (driver) this.setApiName(driver.NAME)
    }
    setApiName(name) {
        this.#apiName = name || ''
        if (this.#nodes.apiIndicator) {
            this.#nodes.apiIndicator.textContent = this.#apiName
                ? `Connected to ${this.#apiName} API.`
                : 'Not connected to any API.'
        }
    }
    setDatabase(databaseObj, triggerUiRefresh = true) {
        this.#db = {
            doctorDatabase: databaseObj?.doctorDatabase || [],
            roomDatabase: databaseObj?.roomDatabase || [],
            templates: databaseObj?.templates || [],
        }
        if (triggerUiRefresh) {
            this.clearSpecificInputs(true)
            this.renderTemplates()
        }
    }
    #buildFormDOM() {
        const c = Utils.DOM.createElement

        this.#nodes.form = c('form', { attrs: { id: 'fetch-form', autocomplete: 'off' }, classes: 'space-y-5' })
        this.#nodes.mrn = c('input', { attrs: { type: 'text', id: 'form-mrn', placeholder: 'Ex: 123456' }, classes: 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm' })
        this.#nodes.name = c('input', { attrs: { type: 'text', id: 'form-name', placeholder: 'Ex: John Doe' }, classes: 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm' })

        const primaryGrid = c('div', { classes: 'grid grid-cols-1 sm:grid-cols-12 gap-4' }, [
            c('div', { classes: 'sm:col-span-4' }, [
                c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'MRN' }),
                this.#nodes.mrn,
            ]),
            c('div', { classes: 'sm:col-span-8' }, [
                c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Patient Name' }),
                this.#nodes.name,
            ])
        ])

        this.#nodes.wardType = c('select', { attrs: { id: 'form-ward-type' }, classes: 'w-full h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm' }, [
            c('option', { attrs: { value: '' }, text: 'All Ward Types' }),
        ])

        const wardContainer = c('div', { attrs: { id: 'ward-container' } }, [
            c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Ward Type' }),
            this.#nodes.wardType,
        ])

        this.#nodes.chevronIcon = c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3 transition-transform duration-300 transform' }, [
            c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '3', d: 'M19 9l-7 7-7-7' } }),
        ])

        this.#nodes.toggleBtn = c('button', { attrs: { type: 'button', id: 'toggle-advanced-btn' }, classes: 'w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-lg text-[11px] font-bold text-blue-600 uppercase tracking-wider transition-all group' }, [
            c('span', { text: 'More Options' }),
            this.#nodes.chevronIcon,
        ])

        this.#nodes.moreOptions = c('div', { attrs: { id: 'advanced-options' }, classes: 'max-h-0 opacity-0 mb-0 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out space-y-5' })

        this.#nodes.selectedTemplateLabel = c('span', { attrs: { id: 'selected-template-label' }, text: 'Select a template...' })
        this.#nodes.templateSearch = c('input', { attrs: { type: 'text', id: 'template-search', placeholder: 'Search templates...' }, classes: 'w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-md outline-none focus:border-blue-500' })
        this.#nodes.templateList = c('div', { attrs: { id: 'template-list' }, classes: 'max-h-48 overflow-y-auto py-1 custom-scroll' })
        this.#nodes.templateMenu = c('div', { attrs: { id: 'template-menu' }, classes: 'hidden absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden' }, [
            c('div', { classes: 'p-2 border-b border-slate-100 bg-slate-50' }, [this.#nodes.templateSearch]),
            this.#nodes.templateList,
        ])
        this.#nodes.templateDropdownBtn = c('button', { attrs: { type: 'button', id: 'template-dropdown-btn' }, classes: 'w-full flex items-center justify-between py-2 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all' }, [
            this.#nodes.selectedTemplateLabel,
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3 text-slate-400' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 9l-7 7-7-7' } }),
            ]),
        ])

        const templateSection = c('div', { classes: 'relative space-y-2' }, [
            c('label', { classes: 'block text-[10px] font-bold text-slate-400 uppercase ml-1', text: 'Quick Templates' }),
            c('div', { classes: 'relative' }, [this.#nodes.templateDropdownBtn, this.#nodes.templateMenu]),
        ])

        // Doctors inputs
        this.#nodes.docInput = c('input', { attrs: { type: 'text', id: 'doc-input-field', autocomplete: 'off', placeholder: `Search doctor or ';' for batch` }, classes: 'flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-slate-400' })
        this.#nodes.docTagContainer = c('div', { attrs: { id: 'doc-tag-container' }, classes: 'flex flex-wrap gap-1.5 min-h-[42px] p-2 bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-text shadow-sm focus-within:bg-white focus-within:border-blue-500' }, [this.#nodes.docInput])
        this.#nodes.docAutocomplete = c('div', { attrs: { id: 'doc-autocomplete' }, classes: 'hidden absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto custom-scroll' })

        const doctorSection = c('div', { classes: 'relative' }, [
            c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Doctor (DPJP)' }),
            this.#nodes.docTagContainer, this.#nodes.docAutocomplete,
        ])

        // Rooms inputs
        this.#nodes.roomInput = c('input', { attrs: { type: 'text', id: 'room-input-field', autocomplete: 'off', placeholder: `Search room or ';' for batch` }, classes: 'flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-slate-400' })
        this.#nodes.roomTagContainer = c('div', { attrs: { id: 'room-tag-container' }, classes: 'flex flex-wrap gap-1.5 min-h-[42px] p-2 bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-text shadow-sm focus-within:bg-white focus-within:border-blue-500' }, [this.#nodes.roomInput])
        this.#nodes.roomAutocomplete = c('div', { attrs: { id: 'room-autocomplete' }, classes: 'hidden absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto custom-scroll' })

        const roomSection = c('div', { classes: 'relative' }, [
            c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Room (RUANGAN)' }),
            this.#nodes.roomTagContainer, this.#nodes.roomAutocomplete,
        ])

        // Admission Date picker elements
        this.#nodes.enableDate = c('input', { attrs: { type: 'checkbox' }, classes: 'w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500' })
        this.#nodes.dateStart = c('input', { attrs: { type: 'datetime-local', disabled: 'true', step: '1' }, classes: 'w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 disabled:opacity-60 transition-all' })
        this.#nodes.dateEnd = c('input', { attrs: { type: 'datetime-local', disabled: 'true', step: '1' }, classes: 'w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 disabled:opacity-60 transition-all' })

        const dateRangeBlock = c('div', { classes: 'bg-slate-50 p-4 rounded-xl border border-slate-200/60' }, [
            c('div', { classes: 'flex items-center justify-between mb-2.5 px-1' }, [
                c('label', { classes: 'text-[10px] font-bold text-slate-500 uppercase', text: 'Admission Date Range' }),
                c('div', { classes: 'flex items-center gap-2' }, [
                    c('span', { classes: 'text-[10px] font-semibold text-slate-400 uppercase', text: 'Enable' }),
                    this.#nodes.enableDate,
                ]),
            ]),
            c('div', { classes: 'grid grid-cols-2 gap-3' }, [
                c('div', {}, [c('span', { classes: 'block text-[9px] font-semibold text-slate-400 uppercase mb-1 ml-1', text: 'Start Date' }), this.#nodes.dateStart]),
                c('div', {}, [c('span', { classes: 'block text-[9px] font-semibold text-slate-400 uppercase mb-1 ml-1', text: 'End Date' }), this.#nodes.dateEnd]),
            ])
        ])

        this.#nodes.dynamicInputsContainer = c('div', { attrs: { id: 'dynamic-specific-inputs-container' }, classes: 'space-y-4' })

        this.#nodes.moreOptions.append(templateSection, doctorSection, roomSection, dateRangeBlock, this.#nodes.dynamicInputsContainer)

        this.#nodes.resetBtn = c('button', { attrs: { type: 'reset' }, classes: 'w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-all active:scale-[0.98]', text: 'Reset' })

        const actionRow = c('div', { classes: 'grid grid-cols-2 gap-4' }, [
            this.#nodes.resetBtn,
            c('button', { attrs: { type: 'submit', id: 'main-fetch-btn' }, classes: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]', text: 'Search' }),
        ])

        this.#nodes.apiIndicator = c('p', { classes: 'text-xs text-slate-400 font-medium mt-1.5' })
        this.setApiName(this.#apiName)

        const cardFrame = c('div', { classes: 'bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-xl mx-auto' }, [
            c('div', { classes: 'mb-5 text-center' }, [
                c('h2', { classes: 'text-lg font-bold text-slate-800 leading-none', text: 'Patient Lookup' }),
                this.#nodes.apiIndicator,
            ]),
            this.#nodes.form,
        ])

        this.#nodes.form.append(primaryGrid, wardContainer, this.#nodes.toggleBtn, this.#nodes.moreOptions, actionRow)

        if (this.#nodes.container) {
            cardFrame.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_forwards]')
            this.#nodes.container.append(cardFrame)
        }
    }
    #setupEventListeners() {
        this.#nodes.toggleBtn.addEventListener('click', () => this.toggleMoreOptions())

        this.#nodes.enableDate.addEventListener('change', (e) => {
            const isChecked = e.target.checked
            this.#nodes.dateStart.disabled = !isChecked
            this.#nodes.dateEnd.disabled = !isChecked
        })

        window.addEventListener('click', () => {
            this.#nodes.docAutocomplete.classList.add('hidden')
            this.#nodes.roomAutocomplete.classList.add('hidden')
            this.#nodes.templateMenu.classList.add('hidden')
        })

        this.#nodes.templateDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.#nodes.templateMenu.classList.toggle('hidden')
            if (!this.#nodes.templateMenu.classList.contains('hidden')) {
                const val = this.#nodes.templateSearch.value.toLowerCase()
                this.renderTemplates(val)
                this.#nodes.templateSearch.focus()
            }
        })

        this.#nodes.templateSearch.addEventListener('click', (e) => e.stopPropagation())
        this.#nodes.templateSearch.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase()
            this.renderTemplates(val)
            this.#templateSelectedIndex = 0
            this.#updateTemplateVisualFocus()
        })

        this.#nodes.templateSearch.addEventListener('keydown', (e) => {
            const items = this.#nodes.templateList.querySelectorAll('button')
            if (items.length === 0) return

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                this.#templateSelectedIndex = Math.min(this.#templateSelectedIndex + 1, items.length - 1)
                this.#updateTemplateVisualFocus()
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                this.#templateSelectedIndex = Math.max(this.#templateSelectedIndex - 1, 0)
                this.#updateTemplateVisualFocus()
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (items[this.#templateSelectedIndex]) {
                    items[this.#templateSelectedIndex].click()
                }
            }
        });

        [this.#nodes.docTagContainer, this.#nodes.roomTagContainer].forEach((container) => {
            container.addEventListener('click', () => container.querySelector('input').focus())
        })

        this.#bindAutocompleteEngine(this.#nodes.docInput, this.#nodes.docAutocomplete, 'doc')
        this.#bindAutocompleteEngine(this.#nodes.roomInput, this.#nodes.roomAutocomplete, 'room')

        this.#nodes.form.addEventListener('submit', (e) => {
            e.preventDefault()
            this.submitForm()
        })
        this.#nodes.resetBtn.addEventListener('click', (e) => {
            e.preventDefault()
            this.resetInput()
        })
    }
    #bindAutocompleteEngine(input, listNode, type) {
        let selectedIndex = 0
        let matches = []

        const getMatches = () => {
            const val = input.value.trim().toLowerCase()
            if (!val) return []

            let filtered = []
            if (val.includes(';')) {
                filtered.push({ id: ';', name: 'NEW BATCH', type: 'batch' })
            }

            const activeList = type === 'doc' ? this.#selectedDocs : this.#selectedRooms
            const db = type === 'doc' ? this.#db.doctorDatabase : this.#db.roomDatabase

            const lastBatchIndex = activeList.map(i => i.type).lastIndexOf('batch')
            const itemsInCurrentBatch = activeList.slice(lastBatchIndex + 1).map(i => i.id)

            const dbMatches = db.filter(item =>
                (item.name.toLowerCase().includes(val) || item.id.toLowerCase().includes(val)) &&
                !itemsInCurrentBatch.includes(item.id)
            ).map(item => ({ ...item, type: 'item' }))

            return [...filtered, ...dbMatches]
        }

        const renderAutocompleteList = () => {
            const c = Utils.DOM.createElement
            listNode.innerHTML = ''

            matches.forEach((item, idx) => {
                const isSelected = idx === selectedIndex
                const highlightClass = isSelected ? 'bg-blue-50 text-blue-800' : 'text-slate-700'

                const divNode = c('div', {
                    classes: `px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors ${highlightClass}`
                })

                if (item.type === 'batch') {
                    divNode.append(c('span', {}, [c('span', { classes: 'font-black text-slate-800 tracking-widest', text: 'NEXT BATCH (;)' })]))
                } else {
                    divNode.append(c('span', {}, [
                        c('span', { classes: 'font-bold text-blue-600', text: item.id }),
                        c('span', { text: ` - ${item.name}` }),
                    ]))
                }

                if (isSelected) {
                    divNode.append(c('span', { classes: 'text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter', text: 'Enter to Pick' }))
                }

                divNode.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.#pickItem(item, type, input, listNode)
                })

                listNode.append(divNode)
            })
        }

        input.addEventListener('input', () => {
            matches = getMatches()
            selectedIndex = 0
            if (matches.length === 0) {
                listNode.classList.add('hidden')
                return
            }
            renderAutocompleteList()
            listNode.classList.remove('hidden')
        })

        input.addEventListener('keydown', (e) => {
            const activeList = type === 'doc' ? this.#selectedDocs : this.#selectedRooms

            if (matches.length > 0 && !listNode.classList.contains('hidden')) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    selectedIndex = (selectedIndex + 1) % matches.length
                    renderAutocompleteList()
                    return
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    selectedIndex = (selectedIndex - 1 + matches.length) % matches.length
                    renderAutocompleteList()
                    return
                }
            }

            if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                e.preventDefault()
                const val = input.value.trim()

                if (e.key === ';' || val.includes(';')) {
                    this.#pickItem({ type: 'batch' }, type, input, listNode)
                } else {
                    if (matches.length > 0 && !listNode.classList.contains('hidden')) {
                        this.#pickItem(matches[selectedIndex], type, input, listNode)
                    } else if (val) {
                        const cleanVal = val.replace(',', '')
                        this.#pickItem({ id: cleanVal, type: 'item' }, type, input, listNode)
                    }
                }
            }

            if (e.key === 'Backspace' && !input.value) {
                e.preventDefault()
                activeList.pop()
                this.updateUI(input)
            }
        })
    }
    #pickItem(item, type, inputElement, listNode) {
        const targetArray = type === 'doc' ? this.#selectedDocs : this.#selectedRooms
        if (item.type === 'batch') {
            targetArray.push({ type: 'batch' })
        } else {
            targetArray.push({ id: item.id, type: 'item' })
        }
        if (inputElement) inputElement.value = ''
        if (listNode) listNode.classList.add('hidden')
        this.updateUI(inputElement)
    }
    updateUI(targetFocusInput = null) {
        this.#renderTags(this.#nodes.docTagContainer, this.#selectedDocs, this.#db.doctorDatabase, 'doc')
        this.#renderTags(this.#nodes.roomTagContainer, this.#selectedRooms, this.#db.roomDatabase, 'room')

        if (targetFocusInput) {
            targetFocusInput.focus()
        }
    }
    #renderTags(container, selectedItems, database, type) {
        const c = Utils.DOM.createElement
        const inputElement = container.querySelector('input')

        Array.from(container.childNodes).forEach(node => {
            if (node !== inputElement) node.remove()
        })

        let currentBatchNumber = 1

        selectedItems.forEach((itemObj, index) => {
            let tagNode

            if (itemObj.type === 'batch') {
                tagNode = c('div', { classes: 'flex items-center gap-1 px-2 py-1 bg-slate-800 text-white rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm' }, [
                    c('span', { text: 'BATCH' }),
                    c('button', { attrs: { type: 'button', 'data-index': index }, classes: 'hover:text-red-300 ml-1' }, [
                        c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3' }, [
                            c('path', { attrs: { d: 'M6 18L18 6M6 6l12 12', 'stroke-width': '3' } }),
                        ]),
                    ]),
                ])
                currentBatchNumber++
            } else {
                const data = database.find(d => d.id === itemObj.id) || { id: itemObj.id, name: itemObj.id }
                const scheme = this.#colorSchemes[(currentBatchNumber - 1) % this.#colorSchemes.length]

                tagNode = c('div', { classes: `flex items-center gap-1.5 px-2 py-1 border rounded-md text-[11px] font-bold shadow-sm transition-colors ${scheme.bg} ${scheme.text} ${scheme.border}` }, [
                    c('span', { text: data.name }),
                    c('button', { attrs: { type: 'button', 'data-index': index }, classes: `${scheme.hover} transition-colors` }, [
                        c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3' }, [
                            c('path', { attrs: { d: 'M6 18L18 6M6 6l12 12', 'stroke-width': '2.5' } }),
                        ]),
                    ]),
                ])
            }

            tagNode.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation()
                if (type === 'doc') {
                    this.#selectedDocs.splice(index, 1)
                    this.updateUI(this.#nodes.docInput)
                } else {
                    this.#selectedRooms.splice(index, 1)
                    this.updateUI(this.#nodes.roomInput)
                }
            })

            container.insertBefore(tagNode, inputElement)
        })
    }
    renderTemplates(filterTerm = '') {
        const c = Utils.DOM.createElement
        this.#nodes.templateList.innerHTML = ''

        const filtered = this.#db.templates.filter(t => t.name.toLowerCase().includes(filterTerm))

        if (filtered.length === 0) {
            this.#nodes.templateList.append(c('div', { classes: 'px-4 py-2 text-[11px] text-slate-400 italic', text: 'No templates found.' }))
            return
        }

        filtered.forEach((template, idx) => {
            const isSelected = idx === this.#templateSelectedIndex
            let btnClass = 'w-full text-left px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors'
            if (isSelected) btnClass += ' bg-blue-50 text-blue-600'

            const btn = c('button', { attrs: { type: 'button' }, classes: btnClass, text: template.name })

            btn.addEventListener('click', () => {
                this.resetInput(false)

                this.#selectedDocs = template.docs.map(id => id === ';' ? { type: 'batch' } : { id, type: 'item' })
                this.#selectedRooms = template.rooms.map(id => id === ';' ? { type: 'batch' } : { id, type: 'item' })

                if (template.wardType !== undefined) {
                    this.#nodes.wardType.value = template.wardType
                }

                this.#nodes.selectedTemplateLabel.textContent = template.name
                this.#nodes.templateMenu.classList.add('hidden')
                this.updateUI()
            })

            btn.addEventListener('mouseenter', () => {
                const currentItems = Array.from(this.#nodes.templateList.querySelectorAll('button'))
                this.#templateSelectedIndex = currentItems.indexOf(btn)
                this.#updateTemplateVisualFocus()
            })

            this.#nodes.templateList.append(btn)
        })
    }
    #updateTemplateVisualFocus() {
        const items = this.#nodes.templateList.querySelectorAll('button')
        items.forEach((item, index) => {
            if (index === this.#templateSelectedIndex) {
                item.classList.add('bg-blue-50', 'text-blue-600')
                item.scrollIntoView({ block: 'nearest' })
            } else {
                item.classList.remove('bg-blue-50', 'text-blue-600')
            }
        })
    }
    getSerializedData(itemArray) {
        if (itemArray.length === 0) return ''
        let result = ''
        let isFirstInBatch = true

        itemArray.forEach((item) => {
            if (item.type === 'batch') {
                result += '; '
                isFirstInBatch = true
            } else {
                if (!isFirstInBatch) result += ', '
                result += item.id
                isFirstInBatch = false
            }
        })
        return result
    }
    toggleMoreOptions(forceState = null) {
        this.#isMoreOptionsOpen = forceState !== null ? forceState : !this.#isMoreOptionsOpen

        if (this.#isMoreOptionsOpen) {
            this.#nodes.moreOptions.classList.remove('max-h-0', 'opacity-0', 'mb-0')
            this.#nodes.moreOptions.classList.add('max-h-[1000px]', 'opacity-100')
            this.#nodes.chevronIcon.classList.add('rotate-180')
        } else {
            this.#nodes.moreOptions.classList.remove('max-h-[1000px]', 'opacity-100')
            this.#nodes.moreOptions.classList.add('max-h-0', 'opacity-0', 'mb-0')
            this.#nodes.chevronIcon.classList.remove('rotate-180')
        }
    }
    resetInput(isFullReset = true) {
        this.#nodes.form.reset()
        if (isFullReset) {
            setTimeout(() => {
                this.#selectedDocs = []
                this.#selectedRooms = []
                this.#nodes.selectedTemplateLabel.textContent = 'Select a template...'
                this.#nodes.dateStart.disabled = true
                this.#nodes.dateEnd.disabled = true
                this.toggleMoreOptions(false)
                this.updateUI()
            }, 0)
        }
    }
    clearSpecificInputs(clearTagsOnly = false) {
        this.#selectedDocs = []
        this.#selectedRooms = []
        this.#nodes.selectedTemplateLabel.textContent = 'Select a template...'
        this.updateUI()

        if (!clearTagsOnly) {
            this.#nodes.dynamicInputsContainer.innerHTML = ''
        }
    }
    addSpecificInputs(specificSystemName) {
        const c = Utils.DOM.createElement
        this.#nodes.dynamicInputsContainer.innerHTML = ''

        if (!specificSystemName) return
        const system = specificSystemName

        if (system === ApiSoediranDriver.SYSTEM_NAME) {
            const node = c('div', { classes: 'p-4 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-3' }, [
                c('div', { classes: 'text-[10px] font-extrabold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-1', text: `${system} Metrics` }),
                c('div', { classes: 'grid grid-cols-2 gap-4' }, [
                    c('div', {}, [
                        c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Status' }),
                        c('select', { attrs: { id: 'lookup-form-status', required: 'true' }, classes: 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all' }, [
                            c('option', { attrs: { value: '0' }, text: 'Inactive' }),
                            c('option', { attrs: { value: '1', selected: 'true' }, text: 'Active' }),
                            c('option', { attrs: { value: '2' }, text: 'Discharged' }),
                        ]),
                    ]),
                    c('div', {}, [
                        c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Limit' }),
                        c('input', { attrs: { type: 'number', id: 'lookup-form-limit', value: '25', min: '1', required: 'true' }, classes: 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all' }),
                    ]),
                ]),
            ])
            this.#nodes.dynamicInputsContainer.append(node)
        } else if (system === ApiSoehadiDriver.SYSTEM_NAME) {
            const node = c('div', { classes: 'p-4 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-3' }, [
                c('div', { classes: 'text-[10px] font-extrabold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-1', text: `${system} Metrics` }),
                c('div', {}, [
                    c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'No Reg' }),
                    c('input', { attrs: { type: 'text', id: 'lookup-form-no-reg', placeholder: 'Ex: 1234567890' }, classes: 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all' }),
                ]),
            ])
            this.#nodes.dynamicInputsContainer.append(node)
        }
    }
    updateInputs(optionsArray) {
        const c = Utils.DOM.createElement
        if (!this.#nodes.wardType || !Array.isArray(optionsArray)) return

        this.#nodes.wardType.innerHTML = ''
        optionsArray.forEach(opt => {
            const elementNode = c('option', { attrs: { value: opt.value } })
            elementNode.textContent = opt.text
            this.#nodes.wardType.append(elementNode)
        })
    }
    previewListOfRequest() {
        const soediranInputs = {
            inputStatus: this.#nodes.form.querySelector('#lookup-form-status'),
            inputLimit: this.#nodes.form.querySelector('#lookup-form-limit'),
        }
        const soehadiInputs = {
            inputNoReg: this.#nodes.form.querySelector('#lookup-form-no-reg'),
        }
        return {
            mrn: this.#nodes.mrn.value || null,
            name: this.#nodes.name.value || null,
            wardType: this.#nodes.wardType.value || null,
            serializedDoctors: this.getSerializedData(this.#selectedDocs),
            serializedRooms: this.getSerializedData(this.#selectedRooms),
            dateFilterEnabled: this.#nodes.enableDate.checked,
            dateRange: {
                start: this.#nodes.dateStart.value || null,
                end: this.#nodes.dateEnd.value || null,
            },
            [ApiSoediranDriver.SYSTEM_NAME]: soediranInputs.inputStatus ? {
                status: soediranInputs.inputStatus.value,
                limit: soediranInputs.inputLimit.value,
            } : null,
            [ApiSoehadiDriver.SYSTEM_NAME]: soehadiInputs.inputNoReg ? {
                noReg: soehadiInputs.inputNoReg.value,
            } : null,
        }
    }
    submitForm() {
        if (!this.#driver) {
            console.error('Form submit halted: No active API driver assigned.')
            return
        }

        const payload = this.previewListOfRequest()
        const docGroups = this.#parseInputToGroups(payload.serializedDoctors)
        const roomGroups = this.#parseInputToGroups(payload.serializedRooms)

        if (this.#onSubmitCallback) {
            this.#onSubmitCallback(payload, docGroups, roomGroups, this.#driver)
        }
    }
    #parseInputToGroups(input) {
        if (!input || input.trim() === '') return [[null]]
        return input.split(';').map(group => {
            const items = group.split(',').map(item => item.trim()).filter(i => i !== '')
            return items.length > 0 ? items : [null]
        })
    }
}

export class MyPatientsRenderer {
    static FILTERS = {
        ROLE_ALL: 'ALL',
        ROLE_MINE: 'MINE',
        ROLE_DOCTORS: 'DOCTORS',
    }

    static DAYS = {
        TODAY: 'TODAY',
        YESTERDAY: 'YESTERDAY',
    }

    static VIEWS = {
        FULL: 'FULL',
        COMPACT: 'COMPACT',
    }

    G
    parentNode = document.createElement('div')
    patientList = new PatientList({})
    #settingsStore = null
    #patientsStore = null
    #tabManager = new TabManager()

    #activeHospitalId = 0
    #notesFilterRole = MyPatientsRenderer.FILTERS.ROLE_MINE
    #notesFilterDay = MyPatientsRenderer.DAYS.TODAY
    #viewMode = MyPatientsRenderer.VIEWS.FULL

    patientUiMeta = []
    #patientRoomMap = new Map()
    #patientDocMap = new Map()
    emptyRooms = {}

    #nodes = {
        container: null,

        header: null,
        headerTitle: null,
        headerCounter: null,
        btnPreviewOptions: null,

        settings: null,

        listContainer: null,
        assignedRoomsContainer: null,
        emptyRoomsContainer: null,
    }

    async init(G, parentNode, patientList, settingsStore, patientsStore, tabManager) {
        if (!(patientList instanceof PatientList) || !(parentNode instanceof HTMLElement)) {
            console.warn('Initialization failed: Invalid patientList or parentNode.')
            return
        }

        this.G = G
        this.parentNode = parentNode
        this.patientList = patientList
        this.#settingsStore = settingsStore
        this.#patientsStore = patientsStore
        this.#tabManager = tabManager

        this.reloadSettingsData()

        const assignedRoomKeys = new Set()
        this.patientUiMeta = []

        for (const p of this.patientList.patients) {
            const roomKey = `${p.hid}_${p.roomId}`
            const roomName = hospitalContext.getRoomName(p.hid, p.roomId)
            const docName = hospitalContext.getDoctorName(p.hid, p.docId)

            this.patientUiMeta.push({
                id: p.id,
                roomName: roomName,
                docName: docName,
            })

            if (p.roomId && hospitalContext.roomLookup.has(roomKey)) {
                assignedRoomKeys.add(roomKey)
            }
        }

        this.#patientRoomMap = new Map(this.patientUiMeta.map(m => [m.id, m.roomName]))
        this.#patientDocMap = new Map(this.patientUiMeta.map(m => [m.id, m.docName]))

        this.emptyRooms = []
        for (const [key, record] of hospitalContext.roomLookup.entries()) {
            if (record.hid === this.#activeHospitalId && !assignedRoomKeys.has(key)) {
                this.emptyRooms.push(record)
            }
        }
        this.emptyRooms.sort((a, b) => a.room.name.localeCompare(b.room.name))
    }
    async saveSettingsData(newData = {}) {
        const store = this.#settingsStore
        if (!(store instanceof VaultDriver)) return
        await store.update(newData)
    }
    async savePatientsData() {
        const store = this.#patientsStore
        if (!(store instanceof VaultDriver)) return
        await store.update({ lists: this.G.store.patients.data.lists })
    }
    getSettingsData() {
        const store = this.#settingsStore
        if (!(store instanceof VaultDriver)) return {}
        return store.data
    }
    reloadSettingsData() {
        const data = this.getSettingsData()
        this.#activeHospitalId = data.activeHospitalId || this.#activeHospitalId || 0
        this.#notesFilterRole = data.noteDefaultRole || this.#notesFilterRole || MyPatientsRenderer.FILTERS.ROLE_MINE
        this.#notesFilterDay = data.noteDefaultDay || this.#notesFilterDay || MyPatientsRenderer.DAYS.TODAY
        this.#viewMode = data.myPatientsViewMode || this.#viewMode || MyPatientsRenderer.VIEWS.FULL
    }
    async buildAndRender() {
        const c = Utils.DOM.createElement

        this.buildHeaderDOM()
        this.buildSettingsDOM()
        this.buildListContainerDOM()

        this.#nodes.header.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_forwards]')
        this.#nodes.settings.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_100ms_forwards]')
        this.#nodes.listContainer.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_200ms_forwards]')

        this.#nodes.container = c('div', { classes: 'space-y-3' }, [
            this.#nodes.header,
            this.#nodes.settings,
            this.#nodes.listContainer,
        ])

        this.parentNode.innerHTML = ''
        this.parentNode.append(this.#nodes.container)
    }
    buildHeaderDOM() {
        const c = Utils.DOM.createElement
        const titleText = `${this.patientList.name}`
        const totalRecords = this.patientList.patients.length || 0
        const recordCounterText = `${totalRecords} record${totalRecords === 1 ? '' : 's'}`

        this.#nodes.headerTitle = c('div', {
            classes: 'my-patients-title text-[13px] font-bold tracking-wide break-all line-clamp-3 text-left flex-1 min-w-0',
            attrs: { 'data-list-id': this.patientList.id },
            text: titleText,
        })
        this.#nodes.headerCounter = c('div', {
            classes: 'my-patients-counter text-blue-700 font-black px-2 py-0.5 text-[13px] uppercase tracking-tight whitespace-nowrap flex-shrink-0',
            text: recordCounterText,
        })
        this.#nodes.btnPreviewOptions = c('button', {
            classes: 'p-1.5 text-slate-600 bg-slate-50 hover:text-slate-800 hover:bg-slate-100 rounded-lg active:scale-95 transition-all flex items-center justify-center flex-shrink-0 border border-slate-200 ml-1',
        }, [
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-5 h-5' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M4 6h16M4 12h16m-7 6h7' } }),
            ]),
        ])
        this.#nodes.header = c('div', {
            classes: 'flex items-center justify-between p-3 bg-white text-slate-800 rounded-xl border border-slate-200 overflow-hidden shadow-sm'
        }, [
            this.#nodes.headerTitle,
            this.#nodes.headerCounter,
            // this.#nodes.btnPreviewOptions,
        ])

        this.#nodes.btnPreviewOptions.addEventListener('click', () => {
            if (!this.G || !this.G.swal) return
            this.openPDFConfigDrawer()
        })
    }
    buildSettingsDOM() {
        let isSettingsOpen = false
        const c = Utils.DOM.createElement

        const getTabClass = (isActive, colorClass = 'text-blue-600') => isActive
            ? `toggle-view flex-1 px-2 py-1 text-[10px] font-bold rounded bg-white ${colorClass} shadow-sm transition-all text-center`
            : 'toggle-view flex-1 px-2 py-1 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700 text-center'

        const chevronIcon = c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3 text-slate-400 transition-transform duration-300 transform' }, [
            c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '3', d: 'M19 9l-7 7-7-7' } }),
        ])

        const settingsHeader = c('div', { classes: 'flex items-center justify-between p-1 cursor-pointer select-none transition-all duration-200 group text-slate-700 hover:text-blue-600' }, [
            c('h4', { classes: 'text-[11px] font-bold uppercase tracking-wider', text: 'Settings' }),
            chevronIcon,
        ])

        const settingsBody = c('div', { classes: 'max-h-0 opacity-0 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out' })

        this.#nodes.settings = c('div', { classes: 'p-2 bg-white rounded-xl border border-slate-200' }, [
            settingsHeader,
            settingsBody,
        ])

        const toggleSettingsSection = (forceState = null) => {
            isSettingsOpen = forceState !== null ? forceState : !isSettingsOpen

            if (isSettingsOpen) {
                settingsBody.classList.remove('max-h-0', 'opacity-0')
                settingsBody.classList.add('max-h-[1000px]', 'opacity-100')
                chevronIcon.classList.add('rotate-180')
            } else {
                settingsBody.classList.remove('max-h-[1000px]', 'opacity-100')
                settingsBody.classList.add('max-h-0', 'opacity-0')
                chevronIcon.classList.remove('rotate-180')
            }
        }

        settingsHeader.addEventListener('click', () => {
            toggleSettingsSection()
        })

        // ==========================================
        // BATCH OPERATIONS SECTION
        // ==========================================
        const batchOperationsLabel = c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mt-2 mb-1.5 ml-1', text: 'Batch Operations (WIP)' })

        const btnBatchRefresh = c('button', { classes: 'flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors group' }, [
            c('span', { classes: 'flex flex-col items-start leading-tight' }, [
                c('span', { text: 'Batch Refresh' }),
                c('span', { classes: 'text-[8px] font-medium text-slate-400', text: 'Refresh multiple records' }),
            ]),
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-4 h-4' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' } }),
            ]),
        ])

        const btnBatchNotes = c('button', { classes: 'flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors' }, [
            c('span', { classes: 'flex flex-col items-start leading-tight' }, [
                c('span', { text: 'Batch Open Notes' }),
                c('span', { classes: 'text-[8px] font-medium text-slate-400', text: "Open multiple records' notes" }),
            ]),
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-4 h-4' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' } }),
            ]),
        ])

        const btnBatchOpen = c('button', { classes: 'flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors' }, [
            c('span', { classes: 'flex flex-col items-start leading-tight' }, [
                c('span', { text: 'Batch Open Tabs' }),
                c('span', { classes: 'text-[8px] font-medium text-slate-400', text: 'Open multiple records in tabs' }),
            ]),
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-4 h-4' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' } }),
            ]),
        ])

        const btnBatchRemove = c('button', { classes: 'flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors' }, [
            c('span', { classes: 'flex flex-col items-start leading-tight' }, [
                c('span', { text: 'Batch Remove' }),
                c('span', { classes: 'text-[8px] font-medium text-slate-400 group-hover:text-red-300', text: 'Remove multiple records' }),
            ]),
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-4 h-4' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' } }),
            ]),
        ])

        const batchButtonsGrid = c('div', { classes: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4' }, [
            btnBatchRefresh,
            btnBatchNotes,
            btnBatchOpen,
            btnBatchRemove,
        ])

        const batchOperationsWrapper = c('div', { classes: 'relative' }, [
            batchOperationsLabel,
            batchButtonsGrid,
        ])

        // ==========================================
        // GLOBAL SETTINGS SECTION
        // ==========================================
        const globalSettingsLabel = c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Global Settings' })

        const btnRoleAll = c('button', { classes: getTabClass(this.#notesFilterRole === MyPatientsRenderer.FILTERS.ROLE_ALL, 'text-slate-600'), attrs: { 'data-role': MyPatientsRenderer.FILTERS.ROLE_ALL }, text: 'ALL' })
        const btnRoleMine = c('button', { classes: getTabClass(this.#notesFilterRole === MyPatientsRenderer.FILTERS.ROLE_MINE), attrs: { 'data-role': MyPatientsRenderer.FILTERS.ROLE_MINE }, text: 'MINE' })
        const btnRoleDocs = c('button', { classes: getTabClass(this.#notesFilterRole === MyPatientsRenderer.FILTERS.ROLE_DOCTORS), attrs: { 'data-role': MyPatientsRenderer.FILTERS.ROLE_DOCTORS }, text: 'DOCTORS' })

        const roleFilterGroup = c('div', { classes: 'flex-1' }, [
            c('div', { classes: 'text-[9px] font-semibold text-slate-400 mb-1 ml-1' }, [c('span', { text: 'Default Role Filter on Notes' })]),
            c('div', { classes: 'flex gap-1 bg-slate-100 p-1 rounded-md' }, [btnRoleAll, btnRoleMine, btnRoleDocs])
        ])

        const btnDayToday = c('button', { classes: getTabClass(this.#notesFilterDay === MyPatientsRenderer.DAYS.TODAY), attrs: { 'data-day': MyPatientsRenderer.DAYS.TODAY }, text: '★ TODAY' })
        const btnDayYest = c('button', { classes: getTabClass(this.#notesFilterDay === MyPatientsRenderer.DAYS.YESTERDAY, 'text-slate-600'), attrs: { 'data-day': MyPatientsRenderer.DAYS.YESTERDAY }, text: 'YESTERDAY' })

        const dayFilterGroup = c('div', { classes: 'flex-1' }, [
            c('div', { classes: 'text-[9px] font-semibold text-slate-400 mb-1 ml-1' }, [c('span', { text: 'Default Day Filter on Notes' })]),
            c('div', { classes: 'flex gap-1 bg-slate-100 p-1 rounded-md' }, [btnDayToday, btnDayYest])
        ])

        const filtersGridContainer = c('div', { classes: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4' }, [
            roleFilterGroup,
            dayFilterGroup,
        ])

        const globalSettingsWrapper = c('div', { classes: 'relative' }, [
            globalSettingsLabel,
            filtersGridContainer,
        ])

        // settingsBody.append(batchOperationsWrapper)
        settingsBody.append(globalSettingsWrapper)

        // ==========================================
        // EVENT LISTENERS
        // ==========================================
        btnBatchRefresh.addEventListener('click', () => {
        })

        btnBatchNotes.addEventListener('click', () => {
        })

        btnBatchOpen.addEventListener('click', () => {
        })

        btnBatchRemove.addEventListener('click', () => {
        })

        roleFilterGroup.querySelectorAll('button[data-role]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedRole = e.currentTarget.getAttribute('data-role')
                if (selectedRole !== this.#notesFilterRole) {
                    this.#notesFilterRole = selectedRole
                    btnRoleAll.className = getTabClass(this.#notesFilterRole === MyPatientsRenderer.FILTERS.ROLE_ALL, 'text-slate-600')
                    btnRoleMine.className = getTabClass(this.#notesFilterRole === MyPatientsRenderer.FILTERS.ROLE_MINE)
                    btnRoleDocs.className = getTabClass(this.#notesFilterRole === MyPatientsRenderer.FILTERS.ROLE_DOCTORS)
                    this.saveSettingsData({ noteDefaultRole: selectedRole })
                }
            })
        })

        dayFilterGroup.querySelectorAll('button[data-day]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedDay = e.currentTarget.getAttribute('data-day')
                if (selectedDay !== this.#notesFilterDay) {
                    this.#notesFilterDay = selectedDay
                    btnDayToday.className = getTabClass(this.#notesFilterDay === MyPatientsRenderer.DAYS.TODAY)
                    btnDayYest.className = getTabClass(this.#notesFilterDay === MyPatientsRenderer.DAYS.YESTERDAY, 'text-slate-600')
                    this.saveSettingsData({ noteDefaultDay: selectedDay })
                }
            })
        })
    }
    buildListContainerDOM() {
        const c = Utils.DOM.createElement
        const currentViewMode = this.#viewMode

        const totalPatients = this.patientList.patients.length || 0

        if (!this.#nodes.listContainer) {
            this.#nodes.listContainer = c('div', { classes: 'rounded-xl' })
        }

        this.#nodes.listContainer.innerHTML = ''

        const renderersMap = this.G.store.temp.activeNotesSlideOutRenderers
        if (renderersMap) {
            renderersMap.forEach(renderer => renderer.destroy?.())
            renderersMap.clear()
        }

        // ==========================================
        // NO PATIENTS
        // ==========================================
        if (totalPatients === 0) {
            const noDataRow = c('div', {
                classes: 'px-3 py-4 text-xs font-medium text-slate-400 text-center bg-slate-50 border border-dashed border-slate-200 rounded',
                text: 'No patient records.',
            })
            this.#nodes.listContainer.append(noDataRow)
            return
        }

        // ==========================================
        // HEADER LAYOUT
        // ==========================================
        const btnCopyNotes = c('button', {
            classes: 'flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black p-2 rounded shadow-sm transition-colors uppercase tracking-widest',
            text: 'Copy All Notes',
        })

        const btnCopyRecords = c('button', {
            classes: 'flex-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black p-2 rounded shadow-sm transition-colors uppercase tracking-widest',
            text: 'Copy All Records',
        })

        const getTabClass = (isActive, colorClass = 'text-blue-600') => isActive
            ? `toggle-view flex-1 px-3 py-1 text-[10px] font-bold rounded bg-white ${colorClass} shadow-sm`
            : 'toggle-view flex-1 px-3 py-1 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700'

        const viewControls = c('div', { classes: 'flex items-center justify-end bg-white border border-slate-200 p-2 rounded-lg shadow-sm' }, [
            c('div', { classes: 'flex-1 flex gap-1 bg-slate-100 p-1 rounded-md' }, [
                c('button', { classes: getTabClass(currentViewMode === MyPatientsRenderer.VIEWS.FULL), attrs: { 'data-view-mode': MyPatientsRenderer.VIEWS.FULL }, text: 'FULL' }),
                c('button', { classes: getTabClass(currentViewMode === MyPatientsRenderer.VIEWS.COMPACT, 'text-slate-600'), attrs: { 'data-view-mode': MyPatientsRenderer.VIEWS.COMPACT }, text: 'COMPACT' })
            ]),
        ])

        const helperStrip = c('div', { classes: 'px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-md text-center italic' }, [
            c('span', { html: `*To copy a note: <strong>Open it</strong> and use filters to ensure it appears as the <strong>first item</strong>. Leave notes closed to exclude them.` }),
        ])

        const headerLayoutWrapper = c('div', { classes: 'p-4 bg-white space-y-2 mb-4 rounded-lg shadow-sm overflow-hidden' }, [
            c('div', { classes: 'flex gap-2' }, [btnCopyNotes, btnCopyRecords]),
            viewControls,
            // helperStrip,
        ])

        // ==========================================
        // DATA LAYOUT
        // ==========================================
        const assignedRoomsBody = c('div', { classes: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-100 transition-opacity duration-300 ease-in-out overflow-y-auto mt-2' })
        const emptyRoomsBody = c('div', { classes: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-100 transition-opacity duration-300 ease-in-out overflow-y-auto mt-2' })

        const instantiatedRoomCards = {}

        const patientLookup = new Map(this.patientList.patients.map(p => [p.id, p]))

        for (const roomId of this.patientList.roomOrder) {
            const patientIds = this.patientList.patientOrderMap[roomId] || []
            if (patientIds.length === 0) continue

            const firstPatientId = patientIds[0]
            const roomName = this.#patientRoomMap.get(firstPatientId)
            if (!roomName) continue

            const recordCount = patientIds.length
            const roomCard = this.createRoomCard(roomId, roomName, recordCount)
            instantiatedRoomCards[roomId] = roomCard
            assignedRoomsBody.append(roomCard)

            for (const patientId of patientIds) {
                const p = patientLookup.get(patientId)
                if (!p) continue
                const docName = this.#patientDocMap.get(p.id)
                const patientCard = this.createPatientCard(p, docName, roomName)
                roomCard.patientSlotsContainer.append(patientCard)
            }
        }

        if (this.emptyRooms && this.emptyRooms.length > 0) {
            for (const emptyRoom of this.emptyRooms) {
                const emptyRoomCard = this.createRoomCard(emptyRoom.room.id, emptyRoom.room.name, 0)
                emptyRoomCard.patientSlotsContainer.append(
                    c('p', { classes: 'text-[10px] italic text-slate-400 text-center', text: 'No patients assigned' }),
                )
                emptyRoomsBody.append(emptyRoomCard)
            }
        }

        const totalAssignedRooms = Object.keys(instantiatedRoomCards).length
        const totalAssignedPatients = this.patientList.patients.length

        const totalEmptyRooms = this.emptyRooms ? this.emptyRooms.length : 0
        const totalEmptyPatients = 0

        this.#nodes.assignedRoomsContainer = this.createCollapsibleSection(
            'Assigned Rooms',
            totalAssignedRooms,
            totalAssignedPatients,
            'emerald',
            assignedRoomsBody,
        )

        this.#nodes.emptyRoomsContainer = this.createCollapsibleSection(
            'Unassigned Rooms',
            totalEmptyRooms,
            totalEmptyPatients,
            'slate',
            emptyRoomsBody,
            true,
        )

        this.#nodes.emptyRoomsContainer.classList.remove('mb-4')

        this.#nodes.assignedRoomsContainer.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_forwards]')
        this.#nodes.emptyRoomsContainer.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_100ms_forwards]')

        const dataLayoutWrapper = c('div', { classes: 'space-y-4' }, [
            this.#nodes.assignedRoomsContainer,
            this.#nodes.emptyRoomsContainer,
        ])

        this.#nodes.listContainer.append(headerLayoutWrapper)
        this.#nodes.listContainer.append(dataLayoutWrapper)

        // ==========================================
        // EVENT LISTENERS
        // ==========================================
        btnCopyNotes.addEventListener('click', async (e) => {
            const allNotesPayload = this.generateCopyAllNotesText()
            await Utils.executeNativeClipboardCopy(allNotesPayload, e.currentTarget)
        })

        btnCopyRecords.addEventListener('click', async (e) => {
            const allRecordsPayload = this.generateCopyAllRecordsText()
            await Utils.executeNativeClipboardCopy(allRecordsPayload, e.currentTarget)
        })

        viewControls.querySelectorAll('button[data-view-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedMode = e.target.getAttribute('data-view-mode')
                if (selectedMode !== currentViewMode) {
                    this.#viewMode = selectedMode
                    this.saveSettingsData({ myPatientsViewMode: selectedMode })
                    this.buildListContainerDOM()
                }
            })
        })
    }
    createCollapsibleSection(titleText, roomCount, recordCount, theme, bodyContentNode, isClosed = false) {
        const c = Utils.DOM.createElement
        let isOpen = true

        const badgeColorClass = theme === 'emerald' ? 'bg-emerald-500' : 'bg-slate-400'
        const textColorClass = theme === 'emerald' ? 'text-emerald-600' : 'text-slate-500'
        const recordSubtitle = `${recordCount} record${recordCount === 1 ? '' : 's'}`

        const chevronIcon = c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3 text-slate-400 transition-transform duration-300 rotate-180' }, [
            c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '3', d: 'M19 9l-7 7-7-7' } }),
        ])

        const titleRow = c('div', { classes: 'flex items-center gap-1.5' }, [
            c('span', { classes: `w-2 h-2 rounded-full flex-shrink-0 ${badgeColorClass}` }),
            c('h4', {
                classes: `text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 group-hover:text-blue-600 ${textColorClass}`,
                text: `${titleText} (${roomCount})`,
            }),
        ])

        const textStack = c('div', { classes: 'flex flex-col gap-0.5' }, [
            titleRow,
            c('span', {
                classes: 'room-header-counter text-[10px] text-slate-400 font-normal uppercase group-hover:text-blue-500 transition-colors pl-3.5',
                text: recordSubtitle,
            }),
        ])

        const btnCollapseAll = c('button', { classes: 'p-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 active:scale-90 transition-all shadow-sm' }, [
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-4 h-4' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M7 11l5-5m0 0l5 5m-5-5v12m-8-2l8 8 8-8' } }),
            ]),
        ])

        const btnExpandAll = c('button', { classes: 'p-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 active:scale-90 transition-all shadow-sm' }, [
            c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-4 h-4' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M19 13l-7 7-7-7m14-8l-7 7-7-7' } }),
            ]),
        ])

        const actionButtonsGroup = c('div', { classes: 'flex items-center gap-1 ml-auto mr-2 opacity-100 transition-opacity' }, [
            btnCollapseAll,
            btnExpandAll,
        ])

        const header = c('div', { classes: 'flex items-center justify-between p-1 cursor-pointer select-none transition-all duration-200 group text-slate-700' }, [
            textStack,
            actionButtonsGroup,
            chevronIcon,
        ])

        const container = c('div', { classes: 'rooms-container mb-4' }, [
            header,
            bodyContentNode,
        ])

        header.addEventListener('click', () => {
            isOpen = !isOpen
            if (isOpen) {
                bodyContentNode.classList.remove('max-h-0', 'opacity-0')
                bodyContentNode.classList.add('opacity-100', 'mt-2')
                actionButtonsGroup.classList.replace('opacity-0', 'opacity-100')
                chevronIcon.classList.add('rotate-180')
            } else {
                bodyContentNode.classList.remove('opacity-100', 'mt-2')
                bodyContentNode.classList.add('max-h-0', 'opacity-0')
                actionButtonsGroup.classList.replace('opacity-100', 'opacity-0')
                chevronIcon.classList.remove('rotate-180')
            }
        })

        btnCollapseAll.addEventListener('click', (e) => {
            const isDisabled = actionButtonsGroup.classList.contains('opacity-0')
            if (isDisabled) return
            e.stopPropagation()
            this.toggleAllRooms(container, true)
        })

        btnExpandAll.addEventListener('click', (e) => {
            const isDisabled = actionButtonsGroup.classList.contains('opacity-0')
            if (isDisabled) return
            e.stopPropagation()
            this.toggleAllRooms(container, false)
        })

        if (isClosed) header.click()

        return container
    }
    toggleAllRooms(scopeElement, shouldCollapse) {
        const roomGroups = scopeElement.querySelectorAll('.room-group')
        roomGroups.forEach(group => {
            const toggleBtn = group.querySelector('.toggle-room')
            const patientList = group.querySelector('.patient-list')
            if (toggleBtn && patientList) {
                const isCurrentlyCollapsed = patientList.classList.contains('hidden')
                // const isEmpty = patientList.querySelectorAll('.js-patient-item')?.length === 0
                // 1. If we want to collapse and it's currently open -> toggle
                // 2. If we want to expand, it's currently closed, and NOT empty -> toggle
                if ((shouldCollapse && !isCurrentlyCollapsed) ||
                    (!shouldCollapse && isCurrentlyCollapsed/*  && !isEmpty */)) {
                    toggleBtn.click()
                }
            }
        })
    }
    createRoomCard(roomId, roomName, recordCount = 0) {
        const c = Utils.DOM.createElement

        const btnUp = c('button', { classes: 'move-room-up p-0.5 hover:bg-slate-200 rounded text-slate-400' }, [
            c('svg', { attrs: { class: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' } }, [
                c('path', { attrs: { d: 'M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z' } }),
            ]),
        ])
        const btnDown = c('button', { classes: 'move-room-down p-0.5 hover:bg-slate-200 rounded text-slate-400' }, [
            c('svg', { attrs: { class: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' } }, [
                c('path', { attrs: { d: 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' } }),
            ]),
        ])

        const svgMenuIcon = c('svg', { attrs: { class: 'w-4 h-4 text-slate-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
            c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M4 6h16M4 12h16m-7 6h7' } }),
        ])
        const svgCopyIcon = c('svg', { attrs: { class: 'w-4 h-4 text-slate-700 transition-colors', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
            c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3' } }),
        ])
        const svgToggleIcon = c('svg', { attrs: { class: 'w-4 h-4 text-slate-400 transition-transform', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
            c('path', { attrs: { d: 'M19 9l-7 7-7-7', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } }),
        ])

        const btnCopy = c('button', {
            classes: 'btn-copy-room w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors',
        }, [
            c('span', { text: 'Copy Room Data' }),
            svgCopyIcon,
        ])

        const btnRemoveAll = c('button', {
            classes: 'btn-remove-all w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors',
        }, [
            c('span', { text: 'Remove All Records' }),
            c('svg', { attrs: { class: 'w-4 h-4 group-hover:scale-110 transition-transform', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' } }),
            ]),
        ])

        const dropdownMenu = c('div', {
            classes: 'dropdown-menu dropdown-content absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden',
        }, [
            c('div', { classes: 'p-2 border-t border-slate-100' }, [
                btnCopy,
                btnRemoveAll,
            ]),
        ])

        const btnMenu = c('button', { classes: 'menu-toggle p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all', }, [
            svgMenuIcon,
        ])

        const contextMenuContainer = c('div', { classes: 'relative' }, [
            btnMenu,
            dropdownMenu,
        ])

        const btnToggle = c('button', { classes: 'toggle-room p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all' }, [
            svgToggleIcon,
        ])

        const patientSlots = c('div', { classes: 'patient-list p-2 space-y-2' })

        const cardWrapper = c('div', {
            classes: 'room-group bg-white rounded-xl border border-slate-200 shadow-sm mb-2 self-start w-full',
            attrs: { 'data-room-id': roomId },
        }, [
            // Header
            c('div', { classes: 'room-header flex items-center justify-between p-3 bg-slate-50/50 border-b border-slate-100' }, [
                c('div', { classes: 'flex items-center gap-3' }, [
                    c('div', { classes: 'flex flex-col gap-0.5' }, [btnUp, btnDown]), // Reorder block
                    c('div', {}, [
                        c('h4', { classes: 'text-[11px] font-black text-slate-700 uppercase leading-none mb-1', text: roomName }),
                        c('span', {
                            classes: 'room-count text-[9px] font-bold text-blue-500 uppercase tracking-tight',
                            text: recordCount === 1 ? '1 Record' : `${recordCount} Records`
                        })
                    ])
                ]),
                c('div', { classes: 'flex items-center gap-1' }, [
                    contextMenuContainer,
                    btnToggle,
                ]),
            ]),
            // Body
            patientSlots,
        ])

        cardWrapper.patientSlotsContainer = patientSlots

        if (recordCount > 0) {
            btnUp.onclick = () => this.handleRoomMove(roomId, 'up')
            btnDown.onclick = () => this.handleRoomMove(roomId, 'down')
            btnCopy.onclick = () => {
                this.handleCopyRoomData(roomId, roomName, recordCount, svgCopyIcon)
                dropdownMenu.classList.remove('show')
            }
            btnRemoveAll.onclick = () => {
                this.promptDeleteEntireRoom(roomId, roomName)
                dropdownMenu.classList.remove('show')
            }
        }
        btnToggle.onclick = () => {
            patientSlots.classList.toggle('hidden')
            const isHidden = patientSlots.classList.contains('hidden')
            svgToggleIcon.style.transform = isHidden ? 'rotate(-90deg)' : 'rotate(0deg)'
        }
        if (recordCount === 0) {
            btnToggle.click()
            contextMenuContainer.classList.add('hidden')
        }

        return cardWrapper
    }
    createPatientCard(patientInstance, docName, roomName) {
        const c = Utils.DOM.createElement
        const p = patientInstance instanceof Patient ? patientInstance : new Patient(patientInstance)
        const ui = p.getUIDisplayData() || {}
        const apiSettings = hospitalContext.getHospitalById(p.hid).driver.SETTINGS
        const canOpenDetails = apiSettings.patients.canOpenDetails

        const createBaseButtons = () => {
            const btnOpenDetails = c('button', { classes: 'patient-open-details-btn p-2 bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white rounded-lg transition-all' }, [
                c('svg', { attrs: { class: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                    c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' } }),
                ]),
            ])
            btnOpenDetails.addEventListener('click', () => this.openPatientWorkspaceTab(p))
            if (!canOpenDetails) btnOpenDetails.classList.add('hidden')

            const btnDelete = c('button', { classes: 'patient-delete-btn p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all' }, [
                c('svg', { attrs: { class: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                    c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' } }),
                ]),
            ])
            btnDelete.addEventListener('click', () => this.promptDeletePatient(p.id, roomName))

            return { btnOpenDetails, btnDelete }
        }

        let genderColorClass = 'text-slate-400'
        if (p.gender === Patient.MALE) genderColorClass = 'text-blue-500'
        if (p.gender === Patient.FEMALE) genderColorClass = 'text-rose-500'

        // ==========================================
        // BRANCH A: COMPACT VIEW
        // ==========================================
        if (this.#viewMode === MyPatientsRenderer.VIEWS.COMPACT) {
            const { btnOpenDetails, btnDelete } = createBaseButtons()

            const losBadgeClasses = ui.los.isFresh
                ? 'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border bg-amber-50 text-amber-700 border-amber-200 tracking-tighter mr-1'
                : 'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border bg-slate-100 text-slate-500 border-slate-200 tracking-tighter mr-1'

            const dataContainer = c('div', { classes: 'text-xs font-medium text-slate-700 leading-relaxed patient-data truncate flex-1 pr-2' }, [
                ui.los.text !== '??' ? c('span', { classes: losBadgeClasses, text: ui.los.text }) : null,
                c('span', { classes: 'font-bold text-slate-400', text: ui.bedName }),
                c('span', { text: '/' }),
                c('span', { classes: `font-bold ${genderColorClass}`, text: ui.gender }),
                c('span', { text: '/' }),
                c('span', { classes: 'font-bold text-slate-900', text: ui.name }),
                c('span', { text: '/' }),
                c('span', { classes: 'text-slate-500', text: ui.mrn }),
                c('span', { text: '/' }),
                c('span', { classes: 'text-slate-500', text: ui.age }),
            ])

            const compactActions = c('div', {
                classes: 'actions flex items-center gap-1'
            }, [
                btnOpenDetails,
                btnDelete,
            ])

            return c('div', {
                classes: 'js-patient-item compact-row flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 border-b border-slate-100/60 group transition-colors',
                attrs: { 'data-id': p.id },
            }, [
                dataContainer,
                compactActions,
            ])
        }

        // ==========================================
        // BRANCH B: FULL VIEW
        // ==========================================
        const { btnOpenDetails, btnDelete } = createBaseButtons()
        const btnNotes = c('button', { classes: 'patient-notes-btn p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all' }, [
            c('svg', { attrs: { class: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' } }),
            ]),
        ])

        const bedBlockColorClasses = ui.los.isFresh
            ? 'bg-amber-50 border-amber-200'
            : 'bg-slate-100 border-slate-200'
        const bedBlock = c('div', { classes: `bed-info flex flex-col items-center justify-center min-w-[55px] px-1 py-2 rounded-lg border ${bedBlockColorClasses} transition-colors duration-500` }, [
            c('span', { classes: 'text-[8px] font-black text-slate-400 uppercase leading-none mb-1', text: 'Bed' }),
            c('span', { classes: 'text-[11px] font-black text-blue-700 max-w-[50px] truncate', text: ui.bedName }),
            c('div', { classes: 'mt-1.5 pt-1 border-t border-black/5 w-full flex justify-center' }, [
                c('span', {
                    classes: `los-text text-[9px] font-bold ${ui.los.isFresh ? 'text-amber-700' : 'text-slate-500'} leading-none`,
                    text: ui.los.text,
                }),
            ]),
        ])

        const infoBlock = c('div', { classes: 'flex-1 min-w-0' }, [
            c('h5', {
                classes: 'text-[11px] font-black text-slate-800 truncate uppercase leading-tight',
                html: `<span class=${genderColorClass}>${ui.gender}</span><span class="text-slate-400"> | </span>${ui.name}`,
            }),
            c('p', { classes: 'text-[9px] text-slate-500 font-mono mb-1 truncate', text: `${ui.mrn} • ${ui.age} • ${ui.recId}` }),
            c('p', { classes: 'text-[9px] font-medium text-slate-500 truncate italic', text: ui.dx }),
            c('p', { classes: 'text-[9px] font-bold text-blue-500 truncate', text: docName }),
        ])

        const btnPatientUp = c('button', { classes: 'move-p-up p-1 text-slate-300 hover:text-blue-500 transition-colors' }, [
            c('svg', { attrs: { class: 'w-2.5 h-2.5', fill: 'currentColor', viewBox: '0 0 20 20' } }, [
                c('path', { attrs: { d: 'M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z' } }),
            ]),
        ])
        const btnPatientDown = c('button', { classes: 'move-p-down p-1 text-slate-300 hover:text-blue-500 transition-colors' }, [
            c('svg', { attrs: { class: 'w-2.5 h-2.5', fill: 'currentColor', viewBox: '0 0 20 20' } }, [
                c('path', { attrs: { d: 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' } }),
            ]),
        ])

        const actionBlock = c('div', { classes: 'flex items-center gap-1' }, [
            btnOpenDetails,
            btnNotes,
            btnDelete,
            c('div', { classes: 'flex flex-col gap-0.5 ml-1' }, [
                btnPatientUp,
                btnPatientDown,
            ]),
        ])

        const btnRefreshPatient = c('button', {
            classes: 'btn-refresh-patient p-1 text-slate-400 bg-white border-slate-200 hover:text-blue-600 hover:bg-blue-50 active:scale-90 border rounded-full transition-all shadow-sm group'
        }, [
            c('svg', { attrs: { class: 'w-2.5 h-2.5 transition-transform duration-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' } }),
            ]),
        ])
        const btnCopyPatient = c('button', {
            classes: 'btn-copy-patient p-1 text-slate-400 bg-white border-slate-200 hover:text-blue-600 hover:bg-blue-50 active:scale-90 border rounded-full transition-all shadow-sm group'
        }, [
            // c('svg', { attrs: { class: 'w-2.5 h-2.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
            //     c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3' } }),
            // ]),
            c('svg', { attrs: { class: 'w-2.5 h-2.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                // Background/Underneath sheet
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M8 7v1a3 3 0 01-3 3H4a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8' } }),
                // Foreground/Top sheet
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M16 7a2 2 0 012 2v7a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h7z' } }),
            ]),
        ])

        const statusClasses = ui.status === Patient.STATUS.ACTIVE
            ? ['bg-emerald-50 border-emerald-100', 'bg-emerald-500 animate-pulse', 'text-emerald-600']
            : ['bg-slate-50 border-slate-200', 'bg-slate-400', 'text-slate-600']
        const metadataBlock = c('div', { classes: 'flex items-center justify-between mt-1' }, [
            // Left side: Statuses tags container
            c('div', { classes: 'flex items-center gap-2 overflow-x-auto no-scrollbar' }, [
                c('div', { classes: `flex items-center border px-2 py-0.5 rounded-full js-status-pill ${statusClasses[0]}` }, [
                    c('div', { classes: `w-1.5 h-1.5 rounded-full mr-1.5 js-status-dot ${statusClasses[1]}` }),
                    c('span', { classes: `text-[8px] font-black tracking-tight js-status-label ${statusClasses[2]}`, text: ui.status }),
                ]),
                c('div', { classes: 'flex items-center bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full' }, [
                    c('span', { classes: 'text-[8px] font-black text-blue-400 mr-1 tracking-tighter', text: 'In:' }),
                    c('span', { classes: 'text-[8px] font-bold text-blue-700 whitespace-nowrap js-adm-date', text: ui.admText.short }),
                ]),
                c('div', { classes: 'flex items-center bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full' }, [
                    c('span', { classes: 'text-[8px] font-black text-slate-400 mr-1 tracking-tighter', text: 'Out:' }),
                    c('span', { classes: 'text-[8px] font-bold text-slate-600 whitespace-nowrap js-dis-date', text: ui.disText.short }),
                ]),
            ]),
            // Right side: Action buttons wrapper
            c('div', { classes: 'flex items-center gap-1 flex-shrink-0' }, [
                btnRefreshPatient,
                btnCopyPatient,
            ]),
        ])

        const syncBlock = c('div', { classes: 'mt-1 pt-1.5 border-t border-slate-50 flex items-center justify-between' }, [
            c('div', { classes: 'flex items-center gap-1.5 text-slate-400' }, [
                c('svg', { attrs: { class: 'w-2 h-2 opacity-60', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                    c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2.5', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' } }),
                ]),
                c('div', { classes: 'flex items-baseline gap-1' }, [
                    c('span', { classes: 'text-[6.5px] font-bold uppercase tracking-wider', text: 'Last Sync' }),
                    c('span', { classes: 'text-[8px] font-mono font-medium leading-none js-last-sync', text: ui.lastUp }),
                ]),
            ]),
            c('span', { classes: 'flex h-1.5 w-1.5 rounded-full bg-slate-200' }),
        ])

        // hidden for WIP
        const notesCreateButton = c('button', { classes: 'notes-create-btn p-1 me-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all hidden' }, [
            c('svg', { classes: 'w-3.5 h-3.5', attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' } }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '3', d: 'M12 4v16m8-8H4' } }),
            ]),
        ])
        const notesCloseButton = c('button', { classes: 'notes-close-inner text-slate-400 hover:text-red-500 text-[12px] font-black px-1', text: '✕' })
        const notesContainer = c('div', { classes: 'patient-notes-container bg-slate-50 border border-slate-200 border-t-0 -mt-2 rounded-b-xl shadow-sm overflow-hidden transition-all duration-300 ease-in-out max-h-[1000px] opacity-100 starting:max-h-0 starting:opacity-0 hidden' }, [
            c('div', { classes: 'notes-header px-3 py-1.5 border-b border-slate-200 flex justify-between items-center bg-white/50' }, [
                c('div', { classes: 'flex flex-1 items-center gap-2' }, [
                    c('div', { classes: 'role-filter-group flex bg-slate-200 p-0.5 rounded-md text-[8px] font-bold' }, [
                        c('button', { classes: this.notesGetTabClass(false), attrs: { 'data-role': MyPatientsRenderer.FILTERS.ROLE_ALL }, text: 'ALL' }),
                        c('button', { classes: this.notesGetTabClass(false), attrs: { 'data-role': MyPatientsRenderer.FILTERS.ROLE_MINE }, text: 'MINE' }),
                        c('button', { classes: this.notesGetTabClass(false), attrs: { 'data-role': MyPatientsRenderer.FILTERS.ROLE_DOCTORS }, text: 'DOCTORS' }),
                    ]),
                ]),
                notesCreateButton,
                notesCloseButton,
            ]),
            c('div', { classes: 'notes-pagination-track flex gap-1 px-3 py-1.5 bg-slate-100/50 border-b border-slate-200 overflow-x-auto min-h-[36px]' }),
            c('div', { classes: 'notes-body p-3 min-h-[400px] max-h-[400px] overflow-y-auto transition-opacity duration-300 ease-in-out' }),
        ])

        if (!apiSettings.patients.canRefresh) btnRefreshPatient.classList.add('hidden')

        btnRefreshPatient.addEventListener('click', () => { })
        btnCopyPatient.addEventListener('click', () => this.handleCopyPatientData(p, btnCopyPatient))
        btnNotes.addEventListener('click', () => this.toggleNotesSlideOut(p, notesContainer, btnNotes))
        notesCloseButton.addEventListener('click', () => this.toggleNotesSlideOut(p, notesContainer, btnNotes, false))
        btnPatientUp.addEventListener('click', () => this.handlePatientMove(p.id, p.roomId, 'up'))
        btnPatientDown.addEventListener('click', () => this.handlePatientMove(p.id, p.roomId, 'down'))

        return c('div', {
            classes: 'js-patient-item patient-wrapper flex flex-col gap-2 w-full',
            attrs: { 'data-id': p.id },
        }, [
            c('div', { classes: 'patient-card p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition-all overflow-hidden' }, [
                c('div', { classes: 'flex items-center gap-3' }, [bedBlock, infoBlock, actionBlock]),
                metadataBlock,
                syncBlock,
            ]),
            notesContainer,
        ])
    }
    openPatientWorkspaceTab(p) {
        if (!(p instanceof Patient) || !(this.#tabManager instanceof TabManager)) return

        const tabId = `pat-details-${p.id}`
        const tabName = `${p.name}`
        const c = Utils.DOM.createElement

        this.#tabManager.addTab(tabId, tabName, [], false)
        this.#tabManager.open(tabId)

        const titleText = this.#tabManager.getTabHeaderEl(tabId)?.querySelector('.tab-title-text') || null
        if (titleText) {
            titleText.classList.add('text-[9px]', 'w-[70px]', 'line-clamp-2', 'leading-tight')
        }
    }
    async promptDeletePatient(patientId, roomName) {
        const p = this.patientList.getPatient(patientId)
        if (!p) return

        const ui = p.getUIDisplayData() || {}

        if (this.G) {
            const roomNameText = roomName ? `${roomName}/` : ''
            const confirmDelete = await this.G.swal.fire({
                icon: 'warning',
                title: 'Remove record?',
                html: `This will <strong>remove "${roomNameText}<span class="text-red-600">${ui.name} (${ui.mrn})</span>"</strong> from this list.`,
                showDenyButton: true,
                showCancelButton: true,
                showConfirmButton: false,
                denyButtonText: 'Yes, remove it',
                cancelButtonText: 'Cancel',
            })
            if (confirmDelete.isDenied) {
                this.executeInPlacePatientDeletion(p)
                this.G.ui.swalSuccessShort('Removed successfully!')
            }
        }
        else {
            const confirmMessage = `Are you sure you want to remove record "${ui.name || 'Unknown'}" (${ui.mrn || '-'}) from this list?`
            if (window.confirm(confirmMessage)) {
                this.executeInPlacePatientDeletion(p)
            }
        }
    }
    executeInPlacePatientDeletion(patientInstance) {
        const patientId = patientInstance.id
        const roomId = patientInstance.roomId

        const patientWrapper = document.querySelector(`.js-patient-item[data-id="${patientId}"]`)
        const roomCard = document.querySelector(`[data-room-id="${roomId}"]`)

        this.patientList.removePatient(patientId)
        this.savePatientsData()

        if (patientWrapper) {
            patientWrapper.remove()
        }

        if (roomCard) {
            const remainingPatientIds = this.patientList.patientOrderMap[roomId] || []
            const currentCount = remainingPatientIds.length

            const countLabel = roomCard.querySelector('.room-count')
            if (countLabel) {
                countLabel.textContent = currentCount === 1 ? '1 Record' : `${currentCount} Records`
            }

            if (currentCount === 0) {
                const slotsContainer = roomCard.patientSlotsContainer
                if (slotsContainer) {
                    slotsContainer.innerHTML = ''
                    const c = Utils.DOM.createElement
                    slotsContainer.append(
                        c('p', { classes: 'text-[10px] italic text-slate-400 text-center py-2', text: 'No patients assigned' })
                    )
                }
                const upBtn = roomCard.querySelector('.move-room-up')
                const downBtn = roomCard.querySelector('.move-room-down')
                if (upBtn) upBtn.remove()
                if (downBtn) downBtn.remove()
            }
        }

        const newTotalPatients = this.patientList.patients.length || 0
        const recordCounterText = `${newTotalPatients} record${newTotalPatients === 1 ? '' : 's'}`
        if (this.#nodes.assignedRoomsContainer) {
            const totalPatientsBadge = this.#nodes.assignedRoomsContainer.querySelector('.room-header-counter')
            if (totalPatientsBadge) {
                totalPatientsBadge.textContent = recordCounterText
            }
        }
        if (this.#nodes.headerCounter) {
            this.#nodes.headerCounter.textContent = recordCounterText
        }

        if (this.patientList.patients.length === 0) {
            this.buildListContainerDOM()
        }
    }
    async promptDeleteEntireRoom(roomId, roomName) {
        const patientIds = this.patientList.patientOrderMap[roomId] || []
        const totalCount = patientIds.length
        if (totalCount === 0) return

        const totalCountText = `${totalCount} record${totalCount === 1 ? '' : 's'}`
        if (this.G) {
            const roomNameText = roomName ? `${roomName}/` : ''
            const confirmDelete = await this.G.swal.fire({
                icon: 'warning',
                title: 'Remove all records?',
                html: `This will <strong>remove "<span class="text-red-600">${roomNameText}all ${totalCountText}</span>"</strong> from this list.`,
                showDenyButton: true,
                showCancelButton: true,
                showConfirmButton: false,
                denyButtonText: 'Yes, remove all',
                cancelButtonText: 'Cancel',
            })
            if (confirmDelete.isDenied) {
                this.executeBulkRoomDeletion(roomId)
                this.G.ui.swalSuccessShort('Removed all successfully!')
            }
        } else {
            const confirmMessage = `Are you sure you want to remove all ${totalCountText} from "${roomName}"?`
            if (window.confirm(confirmMessage)) {
                this.executeBulkRoomDeletion(roomId)
            }
        }
    }
    executeBulkRoomDeletion(roomId) {
        const patientIds = [...(this.patientList.patientOrderMap[roomId] || [])]
        if (patientIds.length === 0) return

        patientIds.forEach(patientId => {
            this.patientList.removePatient(patientId)
        })
        this.savePatientsData()

        const roomCard = document.querySelector(`[data-room-id="${roomId}"]`)
        if (roomCard) {
            const countLabel = roomCard.querySelector('.room-count')
            if (countLabel) {
                countLabel.textContent = '0 Records'
            }
            const slotsContainer = roomCard.patientSlotsContainer
            if (slotsContainer) {
                slotsContainer.innerHTML = ''
                const c = Utils.DOM.createElement
                slotsContainer.append(
                    c('p', { classes: 'text-[10px] italic text-slate-400 text-center py-2', text: 'No patients assigned' })
                )
            }
            const upBtn = roomCard.querySelector('.move-room-up')
            const downBtn = roomCard.querySelector('.move-room-down')
            const menuBtn = roomCard.querySelector('.menu-toggle')
            if (upBtn) upBtn.remove()
            if (downBtn) downBtn.remove()
            if (menuBtn) menuBtn.remove()
        }

        const newTotalPatients = this.patientList.patients.length || 0
        const recordCounterText = `${newTotalPatients} record${newTotalPatients === 1 ? '' : 's'}`
        if (this.#nodes.assignedRoomsContainer) {
            const totalPatientsBadge = this.#nodes.assignedRoomsContainer.querySelector('.room-header-counter')
            if (totalPatientsBadge) {
                totalPatientsBadge.textContent = recordCounterText
            }
        }
        if (this.#nodes.headerCounter) {
            this.#nodes.headerCounter.textContent = recordCounterText
        }

        if (this.patientList.patients.length === 0) {
            this.buildListContainerDOM()
        }
    }
    handleRoomMove(roomId, direction) {
        const orderArray = this.patientList.roomOrder
        const currentIndex = orderArray.indexOf(roomId)
        if (currentIndex === -1) return

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= orderArray.length) return

        const currentEl = document.querySelector(`[data-room-id="${roomId}"]`)
        if (!currentEl) return

        const siblingEl = direction === 'up'
            ? currentEl.previousElementSibling
            : currentEl.nextElementSibling

        if (siblingEl) {
            if (direction === 'up') {
                siblingEl.before(currentEl)
            } else {
                siblingEl.after(currentEl)
            }
        }

        this.patientList.reorderRooms(currentIndex, targetIndex)
        this.savePatientsData()
    }
    handlePatientMove(patientId, roomId, direction) {
        if (!roomId) return

        const orderArray = this.patientList.patientOrderMap[roomId] || []
        const currentIndex = orderArray.indexOf(patientId)
        if (currentIndex === -1) return

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= orderArray.length) return

        const roomEl = document.querySelector(`[data-room-id="${roomId}"]`)
        if (!roomEl) return

        const currentEl = roomEl.querySelector(`.patient-wrapper[data-id="${patientId}"]`)
        if (!currentEl) return

        const siblingEl = direction === 'up'
            ? currentEl.previousElementSibling
            : currentEl.nextElementSibling

        if (siblingEl && siblingEl.matches('.patient-wrapper')) {
            if (direction === 'up') {
                siblingEl.before(currentEl)
            } else {
                siblingEl.after(currentEl)
            }
        }

        this.patientList.reorderPatientsInRoom(roomId, currentIndex, targetIndex)
        this.savePatientsData()
    }
    handleCopyRoomData(roomId, roomName, recordCount, feedbackEl) {
        const patientIds = this.patientList.patientOrderMap[roomId] || []
        let textOutput = `*${roomName} (${recordCount})*\n\n`

        const patientBlocks = []

        for (const patientId of patientIds) {
            const p = this.patientList.getPatient(patientId)
            if (!p) continue

            const ui = p.getUIDisplayData() || {}
            const docName = this.#patientDocMap.get(p.id)

            const renderer = this.G.store.temp.activeNotesSlideOutRenderers.get(p.id)
            const latestNote = renderer?.getLatestActiveNote()
            const formattedText = ClinicalNote.formatToText(latestNote, '[No active notes]')

            const block = [
                `${p.toClipboardString()}`,
                `Physician in charge: ${docName}`,
                `Admission date: ${ui.admText.longtime}`,
                `Discharge date: ${ui.disText.longtime}`,
                `\n${formattedText}`,
            ].join('\n')

            patientBlocks.push(block)
        }

        textOutput += patientBlocks.join('\n\n\n')

        const toast = Utils.UI.toast

        const originalColor = 'text-slate-700'
        const successColor = 'text-green-500'
        const errorColor = 'text-red-500'

        if (feedbackEl) {
            if (feedbackEl._copyTimeout) {
                clearTimeout(feedbackEl._copyTimeout)
            } else {
                feedbackEl._currentColorState = successColor
            }
        }

        navigator.clipboard.writeText(textOutput.trim())
            .then(() => {
                toast.pop(`Copied! (${roomName})`, toast.type.success)
                if (feedbackEl) {
                    const classToRemove = feedbackEl._currentColorState === errorColor ? errorColor : originalColor
                    feedbackEl.classList.replace(classToRemove, successColor)
                    feedbackEl._currentColorState = successColor
                    feedbackEl._copyTimeout = setTimeout(() => {
                        feedbackEl.classList.replace(successColor, originalColor)
                        delete feedbackEl._copyTimeout
                        delete feedbackEl._currentColorState
                    }, 1000)
                }
            })
            .catch(err => {
                toast.pop(`Copy failed (${roomName})`, toast.type.error)
                if (feedbackEl) {
                    const classToRemove = feedbackEl._currentColorState === successColor ? successColor : originalColor
                    feedbackEl.classList.replace(classToRemove, errorColor)
                    feedbackEl._currentColorState = errorColor
                    feedbackEl._copyTimeout = setTimeout(() => {
                        feedbackEl.classList.replace(errorColor, originalColor)
                        delete feedbackEl._copyTimeout
                        delete feedbackEl._currentColorState
                    }, 1000)
                }
            })
    }
    /**
     * 
     * @param {Patient} p 
     */
    handleCopyPatientData(p, feedbackEl) {
        if (!p) return

        const ui = p.getUIDisplayData() || {}
        const docName = this.#patientDocMap.get(p.id)

        // const renderer = this.G.store.temp.activeNotesSlideOutRenderers.get(p.id)
        // const latestNote = renderer?.getLatestActiveNote()
        // const formattedText = ClinicalNote.formatToText(latestNote, '[No active notes]')

        const textOutput = [
            `${p.toClipboardString()}`,
            `Physician in charge: ${docName}`,
            `Admission date: ${ui.admText.longtime}`,
            `Discharge date: ${ui.disText.longtime}`,
            // `\n${formattedText}`,
        ].join('\n')

        const toast = Utils.UI.toast

        const originalColor = 'text-slate-400'
        const successColor = 'text-green-500'
        const errorColor = 'text-red-500'

        if (feedbackEl) {
            if (feedbackEl._copyTimeout) {
                clearTimeout(feedbackEl._copyTimeout)
            } else {
                feedbackEl._currentColorState = successColor
            }
        }

        navigator.clipboard.writeText(textOutput.trim())
            .then(() => {
                toast.pop(`Copied! (${ui.name})`, toast.type.success)
                if (feedbackEl) {
                    const classToRemove = feedbackEl._currentColorState === errorColor ? errorColor : originalColor
                    feedbackEl.classList.replace(classToRemove, successColor)
                    feedbackEl._currentColorState = successColor
                    feedbackEl._copyTimeout = setTimeout(() => {
                        feedbackEl.classList.replace(successColor, originalColor)
                        delete feedbackEl._copyTimeout
                        delete feedbackEl._currentColorState
                    }, 1000)
                }
            })
            .catch(err => {
                toast.pop(`Copy failed (${ui.name})`, toast.type.error)
                if (feedbackEl) {
                    const classToRemove = feedbackEl._currentColorState === successColor ? successColor : originalColor
                    feedbackEl.classList.replace(classToRemove, errorColor)
                    feedbackEl._currentColorState = errorColor
                    feedbackEl._copyTimeout = setTimeout(() => {
                        feedbackEl.classList.replace(errorColor, originalColor)
                        delete feedbackEl._copyTimeout
                        delete feedbackEl._currentColorState
                    }, 1000)
                }
            })
    }
    generateCopyAllNotesText() {
        const listTitle = this.patientList.name || 'Patient List'
        let textOutput = `${listTitle} (${this.patientList.patients.length || 0})\n\n\n`

        const patientLookup = new Map(this.patientList.patients.map(p => [p.id, p]))
        const roomBlocks = []

        for (const roomId of this.patientList.roomOrder) {
            const patientIds = this.patientList.patientOrderMap[roomId] || []
            if (patientIds.length === 0) continue

            const firstPatientId = patientIds[0]
            const roomName = this.#patientRoomMap.get(firstPatientId)
            if (!roomName) continue

            const recordCount = patientIds.length
            let roomText = `*${roomName} (${recordCount})*\n\n`
            const patientBlocks = []

            for (const patientId of patientIds) {
                const p = patientLookup.get(patientId)
                if (!p) continue

                const ui = p.getUIDisplayData() || {}
                const docName = this.#patientDocMap.get(p.id)

                const renderer = this.G.store.temp.activeNotesSlideOutRenderers.get(p.id)
                const latestNote = renderer?.getLatestActiveNote()
                const formattedText = ClinicalNote.formatToText(latestNote, '[No active notes]')

                const block = [
                    `${p.toClipboardString()}`,
                    `Physician in charge: ${docName}`,
                    `Admission date: ${ui.admText.longtime}`,
                    `Discharge date: ${ui.disText.longtime}`,
                    `\n${formattedText}`,
                ].join('\n')

                patientBlocks.push(block)
            }

            roomText += patientBlocks.join('\n\n\n')
            roomBlocks.push(roomText)
        }

        textOutput += roomBlocks.join('\n\n\n')
        return textOutput.trim()
    }
    generateCopyAllRecordsText() {
        const listTitle = this.patientList.name || 'Patient List'
        let textOutput = `${listTitle} (${this.patientList.patients.length || 0})\n\n\n`

        const patientLookup = new Map(this.patientList.patients.map(p => [p.id, p]))
        const roomBlocks = []

        for (const roomId of this.patientList.roomOrder) {
            const patientIds = this.patientList.patientOrderMap[roomId] || []
            if (patientIds.length === 0) continue

            const firstPatientId = patientIds[0]
            const roomName = this.#patientRoomMap.get(firstPatientId)
            if (!roomName) continue

            const recordCount = patientIds.length
            let roomBlockText = `*${roomName} (${recordCount})*\n\n`

            const doctorGroupMap = new Map()

            for (const patientId of patientIds) {
                const p = patientLookup.get(patientId)
                if (!p) continue

                const docName = this.#patientDocMap.get(p.id) || 'No Doctor Assigned'

                if (!doctorGroupMap.has(docName)) {
                    doctorGroupMap.set(docName, [])
                }
                doctorGroupMap.get(docName).push(p)
            }

            const doctorSegments = []
            for (const [docName, patients] of doctorGroupMap.entries()) {
                const lines = [`${docName} (${patients.length})`]
                for (const p of patients) {
                    lines.push(`- ${p.toClipboardString()}`)
                }
                doctorSegments.push(lines.join('\n'))
            }

            roomBlockText += doctorSegments.join('\n\n')
            roomBlocks.push(roomBlockText)
        }

        textOutput += roomBlocks.join('\n\n\n')
        return textOutput.trim()
    }
    notesGetTabClass(isActive, colorClass = 'text-blue-600') {
        return isActive
            ? `is-active px-2 py-0.5 font-bold rounded bg-white ${colorClass} shadow-sm text-center`
            : 'px-2 py-0.5 font-bold rounded text-slate-500 hover:text-slate-700 text-center'
    }
    async toggleNotesSlideOut(p, notesContainer, btnNotes, forceState = null) {
        const c = Utils.DOM.createElement
        const ui = p.getUIDisplayData()
        const isOpen = forceState !== null ? forceState : !!notesContainer.classList.contains('hidden')
        const createBtn = notesContainer.querySelector('.notes-create-btn')
        const closeBtn = notesContainer.querySelector('.notes-close-inner')
        const filterGroup = notesContainer.querySelector('.role-filter-group')
        const filterButtons = notesContainer.querySelectorAll('.role-filter-group > button[data-role]')
        const paginationTrack = notesContainer.querySelector('.notes-pagination-track')
        const notesBody = notesContainer.querySelector('.notes-body')

        notesBody.innerHTML = ''
        paginationTrack.innerHTML = ''
        filterGroup.classList.add('opacity-50')
        createBtn.classList.remove('hover:bg-emerald-600', 'hover:text-white')
        createBtn.classList.add('opacity-50')
        createBtn.disabled = true
        closeBtn.classList.remove('hover:text-red-500')
        closeBtn.classList.add('opacity-50')
        closeBtn.disabled = true

        if (!isOpen) {
            filterButtons.forEach(b => {
                b.onclick = null
                b.className = this.notesGetTabClass(false)
            })
            notesContainer.classList.add('hidden')
            btnNotes.classList.add('hover:bg-blue-600', 'hover:text-white')
            btnNotes.classList.remove('opacity-50')
            btnNotes.disabled = false
            return
        }

        notesContainer.classList.remove('hidden')
        btnNotes.classList.remove('hover:bg-blue-600', 'hover:text-white')
        btnNotes.classList.add('opacity-50')
        btnNotes.disabled = true

        const loadingDiv = c('div', { classes: 'flex flex-col items-center justify-center p-2 space-y-3 text-slate-500' }, [
            c('svg', { classes: 'animate-spin h-4 w-4 text-blue-600', attrs: { viewBox: '0 0 24 24', fill: 'none' } }, [
                c('circle', { classes: 'opacity-25', attrs: { cx: '12', cy: '12', r: '10', stroke: 'currentColor', 'stroke-width': '4' } }),
                c('path', { classes: 'opacity-75', attrs: { fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' } }),
            ]),
            c('span', { classes: 'text-[11px] font-semibold animate-pulse', text: `Loading notes (${ui.name})...` }),
        ])

        notesBody.classList.add('flex', 'flex-col', 'justify-center')
        notesBody.appendChild(loadingDiv)

        await Utils.sleep(500)

        try {
            if (hospitalContext.activeConfig.id !== p.hid) {
                const currentHospitalText = hospitalContext.activeConfig.name
                const targetHospitalText = hospitalContext.getHospitalById(p.hid)?.name || 'the correct hospital'
                throw new Error(
                    `Hospital mismatch: You must select ${targetHospitalText} (current: ${currentHospitalText}) to view this record's notes.`
                    // `Hospital mismatch: You must select ${targetHospitalText} (current: ${currentHospitalText}) to view or edit this record's notes.` HIDDEN FOR WIP ('or edit')
                )
            }

            const clinicalNotesClient = hospitalContext.activeDriver.clinicalNotesContext(
                hospitalContext.activeDomain,
                hospitalContext.session.data,
            )
            const rawNotes = await clinicalNotesClient.fetch(p.mrn, p.recId)

            if (NotesSlideOutRenderer.isForceCancelled(p.id, notesContainer)) {
                // The container was replaced or removed while fetching
                // We exit here, no instantiate
                return
            }

            const renderer = new NotesSlideOutRenderer(notesContainer, rawNotes, p, btnNotes)
            const renderersMap = this.G.store.temp.activeNotesSlideOutRenderers
            if (renderersMap.has(p.id)) {
                const oldRenderer = renderersMap.get(p.id)
                oldRenderer.destroy?.()
            }
            renderersMap.set(p.id, renderer)

            // clear loading
            notesBody.innerHTML = ''
            notesBody.classList.remove('flex', 'flex-col', 'justify-center')

            // reload settings just to be safe
            this.reloadSettingsData()
            const defaultFilterRole = this.#notesFilterRole
            const defaultFilterDay = this.#notesFilterDay

            // start first render
            renderer.init(defaultFilterRole, defaultFilterDay)

            // render filter role elements
            filterGroup.classList.remove('opacity-50')
            filterButtons.forEach((btn, btnIndex) => {
                btn.className = this.notesGetTabClass(btn.dataset.role === defaultFilterRole, btn.dataset.role === MyPatientsRenderer.FILTERS.ROLE_ALL ? 'text-slate-600' : 'text-blue-600')
                btn.onclick = () => {
                    if (filterGroup.classList.contains('opacity-50')) return
                    let currentIndex = -1
                    filterButtons.forEach((b, i) => {
                        if (b.classList.contains('is-active')) currentIndex = i
                        const fallbackColor = b.dataset.role === MyPatientsRenderer.FILTERS.ROLE_ALL ? 'text-slate-600' : 'text-blue-600'
                        b.className = this.notesGetTabClass(i === btnIndex, fallbackColor)
                    })
                    if (btnIndex !== currentIndex) {
                        currentIndex = btnIndex
                        // re-render on filter role change
                        renderer.changeFilter(btn.dataset.role)
                    }
                }
            })
            createBtn.classList.add('hover:bg-emerald-600', 'hover:text-white')
            createBtn.classList.remove('opacity-50')
            createBtn.disabled = false
        }
        catch (err) {
            console.error(err)
            notesBody.innerHTML = ''
            const errorDiv = c('div', { classes: 'flex flex-col items-center justify-center p-2 text-center rounded-lg space-y-1 overflow-hidden' }, [
                c('svg', { classes: 'h-4 w-4 text-red-500', attrs: { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2' } }, [
                    c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' } }),
                ]),
                c('span', { classes: 'text-[11px] font-semibold text-red-800', text: `Failed to load notes (${ui.name})` }),
                c('span', { classes: 'text-[8px] text-red-600', text: err.message || 'An unexpected error occurred while communicating with the hospital network.' }),
            ])
            notesBody.classList.add('flex', 'flex-col', 'justify-center')
            notesBody.appendChild(errorDiv)
        }

        btnNotes.classList.add('hover:bg-blue-600', 'hover:text-white')
        btnNotes.classList.remove('opacity-50')
        btnNotes.disabled = false
        closeBtn.classList.add('hover:text-red-500')
        closeBtn.classList.remove('opacity-50')
        closeBtn.disabled = false
    }
    openPDFConfigDrawer() {
        const activeListName = this.patientList?.name
        const c = Utils.DOM.createElement

        const historySelect = c('select', {
            classes: 'p-2 border border-slate-200 rounded-lg text-xs bg-white w-full',
            html: `
            <option value="yes">Yes, include full records</option>
            <option value="no">No, overview only</option>
        `
        })

        const layoutSelect = c('select', {
            classes: 'p-2 border border-slate-200 rounded-lg text-xs bg-white w-full',
            html: `
            <option value="compact">Compact Grid</option>
            <option value="detailed">Expanded Rows</option>
        `
        })

        const drawerContainer = c('div', { classes: 'text-left space-y-6' }, [

            // --- SECTION 1: SOURCE PANEL ---
            c('div', { classes: 'bg-slate-50 border border-slate-200/60 rounded-xl p-3.5' }, [
                c('span', { classes: 'block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1', text: 'Source' }),
                c('h4', {
                    classes: 'text-xs font-semibold text-slate-700 leading-relaxed line-clamp-2',
                    text: activeListName,
                })
            ]),

            // --- SECTION 2: SETTINGS MATRIX ---
            // c('div', { classes: 'space-y-4' }, [
            //     c('span', { classes: 'block text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1', text: 'Settings' }),
            //     c('div', { classes: 'flex flex-col gap-1' }, [
            //         c('label', { classes: 'text-[10px] font-bold text-slate-500 uppercase', text: 'Include Patient History' }),
            //         historySelect
            //     ]),
            //     c('div', { classes: 'flex flex-col gap-1' }, [
            //         c('label', { classes: 'text-[10px] font-bold text-slate-500 uppercase', text: 'Layout Style' }),
            //         layoutSelect
            //     ])
            // ])
        ])

        try {
            this.G.swal.fire({
                title: 'Export (WIP)',
                html: drawerContainer,
                position: 'top-end',
                grow: 'column',
                showConfirmButton: true,
                showCancelButton: true,
                confirmButtonText: 'Generate PDF',
                cancelButtonText: 'Cancel',
                customClass: {
                    ...this.G.baseSwalClasses,
                    container: 'swal-drawer-scope',
                    popup: `swal-sidebar-drawer ${this.G.baseSwalClasses.popup}`,
                    htmlContainer: 'p-6 pr-12 overflow-y-auto max-h-[calc(100vh-160px)] text-left m-0'
                },
                showClass: { popup: 'swal-drawer-show' },
                hideClass: { popup: 'swal-drawer-hide' },
                preConfirm: () => {
                    const configValues = {
                        includeHistory: historySelect.value,
                        layoutStyle: layoutSelect.value
                    }
                    // this.executePDFGeneration(configValues)
                    return false // Keep drawer open
                }
            })
        } catch (err) {
            console.error('Failed opening configuration drawer:', err)
        }
    }
    executePDFGeneration(configs) {
        console.log('Compiling datasets with configurations:', configs)

        const newTab = window.open('about:blank', '_blank');
        if (!newTab) {
            alert('Pop-up blocker detected! Please allow pop-ups to preview document.');
            return
        }

        newTab.document.write(`
            <html>
            <head>
                <title>Generating PDF Preview...</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-900 text-slate-100 h-screen flex flex-col items-center justify-center font-sans">
                <div class="flex flex-col items-center gap-3">
                    <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p class="text-sm font-bold tracking-wide">Assembling patient records matrix...</p>
                </div>
            </body>
            </html>
        `)

        try {
            const activeRecords = this.patientList?.patients || []
            // Mock Generation Sequence (Swap this with html2pdf / jsPDF compilation sequence)
            setTimeout(() => {
                newTab.document.open()
                newTab.document.write(`
                <html>
                <head>
                    <title>Patient List Preview</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-gray-100 p-8 text-gray-800">
                    <div class="max-w-4xl mx-auto bg-white p-6 shadow rounded-xl">
                        <h1 class="text-xl font-bold border-b pb-4">Export Summary</h1>
                        <p class="mt-2 text-sm">Compiled target length: <strong>${activeRecords.length} patients</strong></p>
                        <p class="text-xs text-gray-400">Applied Filter Matrix: ${JSON.stringify(configs)}</p>
                        <button onclick="window.print()" class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold">Print/Save via Browser</button>
                    </div>
                </body>
                </html>
            `)
                newTab.document.close()
            }, 1200)
        } catch (err) {
            console.error('Compilation failed:', err)
            newTab.close() // Clean up tab resource leakage on absolute fault
        }
    }
}

class NotesSlideOutRenderer {
    /**
     * @param {HTMLDivElement} container
     * @param {ClinicalNote[]} notes
     * @param {Patient} p
     * @param {HTMLButtonElement} btnNotes
     */
    constructor(container, notes, p, btnNotes) {
        this.p = p
        this.ui = this.p.getUIDisplayData()
        this.notes = notes
        this.container = container
        this.body = this.container.querySelector('.notes-body')
        this.createBtn = this.container.querySelector('.notes-create-btn')
        this.closeBtn = this.container.querySelector('.notes-close-inner')
        this.filterRoleGroup = this.container.querySelector('.role-filter-group')
        this.filterRoleButtons = this.container.querySelectorAll('.role-filter-group > button[data-role]')
        this.paginationTrack = this.container.querySelector('.notes-pagination-track')
        this.toggleBtn = btnNotes

        this.filterRole = MyPatientsRenderer.FILTERS.ROLE_MINE
        this.notesByDate = this.groupNotesByDate(this.notes)
        this.activeDate = null
        this.availableDates = []
        this.todayStr = ''
        this.latestActiveNote = null
    }
    init(defaultFilterRole, defaultFilterDay) {
        this.filterRole = defaultFilterRole
        this.availableDates = Object.keys(this.notesByDate).sort((a, b) => b.localeCompare(a))
        this.todayStr = this.formatDate(Date.now())

        const yesterdayStr = this.formatDate(Date.now() - 24 * 60 * 60 * 1000)
        const isYesterday = defaultFilterDay === MyPatientsRenderer.DAYS.YESTERDAY
        const targetDate = isYesterday ? yesterdayStr : this.todayStr

        if (this.availableDates.includes(targetDate)) {
            this.activeDate = targetDate
        } else {
            this.activeDate = this.availableDates.length > 0 ? this.availableDates[0] : this.todayStr
        }

        this.renderPaginationTrack(this.availableDates)
        this.render()
    }
    /**
     * Groups notes into an object mapping [YYYY-MM-DD]: ClinicalNote[]
     * @param {ClinicalNote[]} notes 
     * @returns {Object.<string, ClinicalNote[]>}
     */
    groupNotesByDate(notes) {
        const grouped = notes.reduce((acc, note) => {
            const dateStr = this.formatDate(note.timestamp)
            if (!acc[dateStr]) {
                acc[dateStr] = []
            }
            acc[dateStr].push(note)
            return acc
        }, {})
        for (const dateStr in grouped) {
            grouped[dateStr].sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp)
            })
        }
        return grouped
    }
    /**
     * Dynamically renders tabs for all dates containing notes
     * @param {string[]} availableDates
     */
    renderPaginationTrack(availableDates) {
        const c = Utils.DOM.createElement
        const datesToRender = availableDates.length > 0 ? availableDates : [this.activeDate]

        this.paginationTrack.innerHTML = ''

        datesToRender.forEach(dateStr => {
            const isActive = dateStr === this.activeDate
            const isToday = dateStr === this.todayStr
            const notes = this.notesByDate[dateStr] || []
            const text = `${isToday ? '★ ' : ''}${dateStr} (${this.getRoleFilteredNotes(notes)?.length || 0}/${notes.length || 0})`
            let classes = 'pagination-btn shrink-0 px-2 py-1 rounded text-[8px] font-bold transition-all '
            if (isActive) {
                classes += 'bg-blue-600 text-white'
            } else if (isToday) {
                classes += 'bg-amber-50 border-amber-300 text-amber-700'
            } else {
                classes += 'bg-white border-slate-200 text-slate-500'
            }

            const btn = c('button', {
                classes,
                text,
            })

            btn.addEventListener('click', () => {
                if (this.activeDate !== dateStr) {
                    this.activeDate = dateStr
                    this.renderPaginationTrack(availableDates)
                    this.render()
                }
            })

            this.paginationTrack.appendChild(btn)
        })
    }
    static CONTENT_LABEL_CLASS = 'text-blue-500 block text-[9px] uppercase tracking-widest mb-1'
    static NOTE_TYPE_CLASSES = Object.freeze({
        [ClinicalNote.TYPES.SOAP]: 'bg-blue-50 text-blue-700',
        [ClinicalNote.TYPES.SBAR]: 'bg-amber-50 text-amber-700',
        [ClinicalNote.TYPES.ADIME]: 'bg-indigo-50 text-indigo-700',
    })
    static DEFAULT_TYPE_CLASS = 'bg-blue-50 text-blue-700'
    static getCreatorStyles(type) {
        const TYPES = ClinicalNote.CREATOR_TYPES
        // const defaultDupClass = 'text-white bg-emerald-500/40 hover:bg-emerald-500/60 border-emerald-500/50'
        switch (type) {
            case TYPES.DOCTOR:
                return {
                    badgeColor: 'bg-blue-600',
                    // dupClass: defaultDupClass,
                    // dupClass: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600',
                }
            case TYPES.NURSE:
                return {
                    badgeColor: 'bg-emerald-600',
                    // dupClass: defaultDupClass,
                }
            case TYPES.PHARMACIST:
                return {
                    badgeColor: 'bg-zinc-600',
                    // dupClass: defaultDupClass,
                }
            case TYPES.MIDWIFE:
                return {
                    badgeColor: 'bg-teal-600',
                    // dupClass: defaultDupClass,
                }
            case TYPES.NUTRITIONIST:
                return {
                    badgeColor: 'bg-purple-600',
                    // dupClass: defaultDupClass,
                }
            case TYPES.UNKNOWN:
            default:
                return {
                    badgeColor: 'bg-slate-600',
                    // dupClass: defaultDupClass,
                }
        }
    }
    render() {
        if (!this.container) return
        const c = Utils.DOM.createElement
        const apiSettings = hospitalContext.getHospitalById(this.p.hid).driver.SETTINGS

        const notesForDate = this.notesByDate[this.activeDate] || []
        const filteredNotes = this.getRoleFilteredNotes(notesForDate)

        this.latestActiveNote = filteredNotes.length > 0 ? filteredNotes[0] : null

        this.body.innerHTML = ''

        if (filteredNotes.length === 0) {
            const isToday = this.activeDate === this.todayStr
            const displayRole = this.filterRole
            const displayDate = `${isToday ? '★ ' : ''}${this.activeDate}`
            const emptyDiv = c('div', { classes: 'flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200 overflow-hidden h-[376px]' }, [
                c('span', {
                    classes: 'text-[11px] font-semibold text-slate-700 block mb-1',
                    text: `No clinical notes found (${this.ui.name})`,
                }),
                c('div', { classes: 'flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium' }, [
                    c('span', { text: 'Filters applied:' }),
                    c('span', {
                        classes: 'bg-slate-200/70 text-[8px] text-slate-700 px-1.5 py-0.5 rounded',
                        text: displayRole,
                    }),
                    c('span', { text: '•' }),
                    c('span', {
                        classes: 'bg-slate-200/70 text-[8px] text-slate-700 px-1.5 py-0.5 rounded',
                        text: displayDate,
                    }),
                ]),
            ])
            this.body.appendChild(emptyDiv)
            return
        }

        const actBtnClasses = 'text-[9px] font-bold px-2 py-0.5 rounded border transition-all tracking-wide'
        filteredNotes.forEach(note => {
            const { badgeColor } = NotesSlideOutRenderer.getCreatorStyles(note.creator.type)
            const typeColorClass = NotesSlideOutRenderer.NOTE_TYPE_CLASSES[note.type] || NotesSlideOutRenderer.DEFAULT_TYPE_CLASS

            const canEdit = this.isCreator(note.creator.id)
            const { datePart, timePart } = this.getTimestampParts(note.timestamp)

            // --- BUTTONS & TOGGLE WRAPPER ---
            const actionContainer = c('div', { classes: 'flex gap-1 items-center' })

            const btnDup = c('button', {
                classes: `text-white bg-emerald-500/40 hover:bg-emerald-500/60 border-emerald-500/50 ${actBtnClasses} note-duplicate-btn`, text: 'Dup'
            })
            const btnCopy = c('button', {
                classes: `text-white bg-white/20 hover:bg-white/40 border-white/30 ${actBtnClasses} note-copy-btn`, text: 'Copy'
            })
            const btnEdit = c('button', {
                classes: `text-white bg-amber-500/40 hover:bg-amber-500/60 border-amber-500/50 ${actBtnClasses} note-edit-btn`, text: 'Edit'
            })
            const btnDelete = c('button', {
                classes: `text-white bg-red-500/40 hover:bg-red-500/60 border-red-500/50 ${actBtnClasses} note-delete-btn`, text: 'Del'
            })
            const btnSave = c('button', {
                classes: `text-white bg-amber-500/40 hover:bg-amber-500/60 border-amber-500/50 ${actBtnClasses} note-save-btn`, text: 'Save'
            })
            const btnCancel = c('button', {
                classes: `text-white bg-slate-500/40 hover:bg-slate-500/60 border-slate-500/50 ${actBtnClasses} note-cancel-btn`, text: 'Cancel'
            })

            if (!apiSettings.notes.canCreate) btnDup.classList.add('hidden')
            if (!apiSettings.notes.canUpdate) btnEdit.classList.add('hidden')
            if (!apiSettings.notes.canDelete) btnDelete.classList.add('hidden')

            const showNormalActions = () => {
                actionContainer.replaceChildren(btnDup, btnCopy, ...(canEdit ? [btnEdit, btnDelete] : []))
            }
            const showEditingActions = () => {
                actionContainer.replaceChildren(btnSave, btnCancel)
            }

            btnDup.addEventListener('click', () => this.handleDuplicate(note))
            btnCopy.addEventListener('click', async (e) => {
                const textOutput = ClinicalNote.formatToText(note)
                await Utils.executeNativeClipboardCopy(textOutput, e.currentTarget)
            })

            if (canEdit) {
                btnDelete.addEventListener('click', () => this.handleDelete(note))
                btnEdit.addEventListener('click', () => {
                    showEditingActions()
                    this.handleStartEditing(note)
                })
                btnCancel.addEventListener('click', () => {
                    showNormalActions()
                    this.handleCancelEditing(note)
                })
                btnSave.addEventListener('click', async () => {
                    btnSave.disabled = true
                    btnCancel.disabled = true
                    btnSave.classList.add('opacity-50', 'cursor-not-allowed')
                    try {
                        await this.handleSave(note)
                        showNormalActions()
                    }
                    catch (err) {
                        console.error(err)
                    }
                    finally {
                        btnSave.disabled = false
                        btnCancel.disabled = false
                        btnSave.classList.remove('opacity-50', 'cursor-not-allowed')
                    }
                })
            }
            showNormalActions()

            // --- VERIFICATION STATUS NODE WORKFLOW ---
            let verificationSection
            const v = note.verification

            if (v && v.isVerified) {
                const { datePart: vDate, timePart: vTime } = this.getTimestampParts(v.timestamp)
                verificationSection = c('div', { classes: 'flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded px-2.5 py-1 text-[9px]' }, [
                    c('span', { classes: 'text-emerald-800 font-medium flex items-center gap-1' }, [
                        // Minimal checkmark icon indicator
                        c('span', { classes: 'inline-block w-1.5 h-1.5 rounded-full bg-emerald-500' }),
                        document.createTextNode(`Verified by ${v.verificatorName}`)
                    ]),
                    c('span', { classes: 'font-mono text-emerald-600/80', text: `${vDate} ${vTime}` })
                ])
            } else {
                verificationSection = c('div', { classes: 'bg-amber-50 border border-amber-100 text-amber-800 rounded px-2.5 py-1 text-[9px] font-medium flex items-center gap-1' }, [
                    c('span', { classes: 'inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse' }),
                    document.createTextNode('Not verified yet')
                ])
            }

            // --- CONTENT PROCESSOR ---
            const currentConfig = ClinicalNote.NOTE_TYPE_CONFIGS[note.type] || ClinicalNote.NOTE_TYPE_CONFIGS[ClinicalNote.TYPES.SOAP]
            const contentRows = currentConfig.map(field => {
                const rawContent = note.content[field.key] || '-'
                const decodedContent = Utils.decodeHtmlEntities(rawContent)
                const textSegments = decodedContent.split(/(?:<br\s*\/?>|\n)/i)

                const formattedChildren = []
                textSegments.forEach((segment, index) => {
                    formattedChildren.push(document.createTextNode(segment))
                    if (index < textSegments.length - 1) formattedChildren.push(c('br'))
                })

                return c('div', {}, [
                    c('b', { classes: NotesSlideOutRenderer.CONTENT_LABEL_CLASS, text: field.label }),
                    c('div', {
                        classes: field.valClass,
                        attrs: { style: 'white-space: pre-wrap;' },
                    }, formattedChildren),
                ])
            })

            // --- STRUCTURAL LAYOUT BUILD ---
            const noteCard = c('div', { classes: 'note-card bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col mb-4' }, [
                // UNIFIED STICKY HEADER (Contains: Creator Info, Role Badge, ID & Controls)
                c('div', { classes: `px-4 py-2 flex justify-between items-center ${badgeColor} sticky -top-3 z-10 rounded-t-lg shadow-sm overflow-hidden` }, [
                    c('div', { classes: 'flex flex-col gap-1.5' }, [
                        c('h4', { classes: 'text-white text-[11px] font-black tracking-wide leading-none line-clamp-1', text: note.creator.name }),
                        c('div', { classes: 'flex items-center gap-1 opacity-90' }, [
                            // Note type tag (SOAP, SBAR, ADIME)
                            c('span', {
                                classes: `${typeColorClass} text-[8px] font-bold uppercase tracking-wider px-1.5 rounded`,
                                text: note.type,
                            }),
                            // Creator type tag (NURSE, DOCTOR, ...)
                            c('span', {
                                classes: 'text-white bg-white/20 text-[8px] font-bold uppercase tracking-wider px-1.5 rounded',
                                text: note.creator.type,
                            }),
                            // creation timestamp
                            c('span', { classes: 'val-time text-[8.5px] text-white/80 font-mono font-bold leading-none', attrs: { 'data-date': datePart }, text: timePart }),
                        ]),
                    ]),
                    actionContainer,
                ]),
                // CARD BODY
                c('div', { classes: 'p-4 space-y-3.5' }, [
                    // Metadata Line (Now shows Room, Note Type, and Timestamp)
                    c('div', { classes: 'flex justify-between items-center border-b border-slate-100 pb-1.5 overflow-hidden' }, [
                        // Left Side: Room Name
                        c('div', { classes: 'flex items-center gap-1.5' }, [
                            // Divider Pipe
                            // c('span', { classes: 'text-slate-300 text-[10px]', text: '|' }),
                            // Room Name Tag
                            c('span', {
                                classes: 'text-slate-500 text-[9px] font-bold rounded tracking-tight',
                                text: note.roomName,
                            }),
                        ]),
                        c('span', {
                            classes: 'text-[8px] text-slate-500 font-mono font-bold truncate ml-1',
                            text: `ID: ${note.id}`,
                        }),
                    ]),
                    // Injected Verification status block directly under header details
                    verificationSection,
                    // Display Container fields
                    c('div', { classes: 'soap-display-area space-y-3 text-[11px] leading-relaxed text-slate-700' }, contentRows)
                ])
            ])

            this.body.append(noteCard)
        })
    }
    /**
     * @param {ClinicalNote} note 
     */
    handleDuplicate(note) {
    }
    /**
     * @param {ClinicalNote} note 
     */
    handleStartEditing(note) {
    }
    /**
     * @param {ClinicalNote} note 
     */
    handleCancelEditing(note) {
    }
    /**
     * @param {ClinicalNote} note 
     */
    handleDelete(note) {
    }
    /**
     * @param {ClinicalNote} note 
     */
    async handleSave(note) {
        const confirmed = await confirm('save?')
        if (!confirmed) {
            throw new Error('User cancelled modal')
        }
        // await apiupdatenote(note.id, note.content) blabla
        // await refreshnotesdata() blabla
    }
    destroy() {
        if (this.filterRoleButtons) {
            this.filterRoleButtons.forEach(btn => {
                btn.onclick = null
            })
        }
        if (this.createBtn) this.createBtn.onclick = null
        if (this.closeBtn) this.closeBtn.onclick = null
        this.container = null
        this.body = null
        this.createBtn = null
        this.closeBtn = null
        this.filterRoleGroup = null
        this.filterRoleButtons = null
        this.paginationTrack = null
        this.toggleBtn = null
    }
    changeFilter(newFilterRole) {
        if (this.filterRole !== newFilterRole) {
            this.filterRole = newFilterRole
            this.renderPaginationTrack(this.availableDates)
            this.render()
        }
    }
    disableInputs() {
        this.filterRoleGroup.classList.add('opacity-50')
        this.createBtn.classList.remove('hover:bg-emerald-600', 'hover:text-white')
        this.createBtn.classList.add('opacity-50')
        this.createBtn.disabled = true
        this.closeBtn.classList.remove('hover:text-red-500')
        this.closeBtn.classList.add('opacity-50')
        this.closeBtn.disabled = true
        this.toggleBtn.classList.remove('hover:bg-blue-600', 'hover:text-white')
        this.toggleBtn.classList.add('opacity-50')
        this.toggleBtn.disabled = true
    }
    enableInputs() {
        this.filterRoleGroup.classList.remove('opacity-50')
        this.createBtn.classList.add('hover:bg-emerald-600', 'hover:text-white')
        this.createBtn.classList.remove('opacity-50')
        this.createBtn.disabled = false
        this.closeBtn.classList.add('hover:text-red-500')
        this.closeBtn.classList.remove('opacity-50')
        this.closeBtn.disabled = false
        this.toggleBtn.classList.add('hover:bg-blue-600', 'hover:text-white')
        this.toggleBtn.classList.remove('opacity-50')
        this.toggleBtn.disabled = false
    }
    /**
     * Returns the most recent clinical note after active date and role filters are applied.
     * @returns {ClinicalNote|null} The latest active ClinicalNote instance or null if none match filters.
     */
    getLatestActiveNote() {
        return this.latestActiveNote
    }
    getUserId() {
        return hospitalContext.session.data.userData.staffId
    }
    isCreator(creatorId) {
        const currentUserId = this.getUserId()
        if (!creatorId || !currentUserId) return false
        return String(creatorId).trim() === String(currentUserId).trim()
    }
    /**
     * Filters a targeted list of notes based on active role
     * @param {ClinicalNote[]} notesToFilter 
     */
    getRoleFilteredNotes(notesToFilter) {
        switch (this.filterRole) {
            case MyPatientsRenderer.FILTERS.ROLE_MINE:
                return notesToFilter.filter(n => this.isCreator(n.creator.id))
            case MyPatientsRenderer.FILTERS.ROLE_DOCTORS:
                return notesToFilter.filter(n => n.creator.type === ClinicalNote.CREATOR_TYPES.DOCTOR)
            default:
                return notesToFilter
        }
    }
    formatDate(timestamp) {
        if (!timestamp) return 'Unknown Date'
        return Utils.toLocalISOString(new Date(timestamp)).split('T')[0] // YYYY-MM-DD
    }
    /**
     * @param {string|number|Date} timestamp 
     * @returns {{datePart: string, timePart: string}}
     */
    getTimestampParts(timestamp) {
        if (!timestamp) return { datePart: '', timePart: '' }
        const dateObj = new Date(timestamp)
        if (isNaN(dateObj.getTime())) return { datePart: '', timePart: '' }
        const t = Utils.toLocalISOString(dateObj)
        const [rawDate, rawTime] = t.split('T')
        const datePart = rawDate
        const timePart = rawTime.slice(0, 8)
        return { datePart, timePart }
    }
    static isForceCancelled(patientId, originalContainer) {
        const freshNotesContainer = document.querySelector(`.js-patient-item[data-id="${patientId}"] .patient-notes-container`)
        return originalContainer !== freshNotesContainer
    }
}
