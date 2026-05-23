import { Utils } from './utils.js'
import { ApiSoediranDriver } from './api-soediran.js'
import { ApiSoehadiDriver } from './api-soehadi.js'

export class PatientLookup {
    #selectedDocs = []
    #selectedRooms = []
    #isMoreOptionsOpen = false
    #templateSelectedIndex = 0
    #apiName = ''

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
    }

    #colorSchemes = [
        { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hover: 'hover:text-blue-900' },
        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hover: 'hover:text-emerald-900' },
        { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hover: 'hover:text-amber-900' },
        { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', hover: 'hover:text-rose-900' },
        { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', hover: 'hover:text-indigo-900' },
    ]

    constructor() { }

    init(targetContainerSelector, initialDatabase = null) {
        if (this.#nodes.form) {
            console.warn('PatientLookup is already initialized.')
            return this
        }

        this.#nodes.container = typeof targetContainerSelector === 'string'
            ? document.querySelector(targetContainerSelector)
            : targetContainerSelector

        if (initialDatabase) {
            this.setDatabase(initialDatabase, false)
        }

        this.#buildFormDOM()
        this.#setupEventListeners()
        this.renderTemplates()

        return this
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

        this.#nodes.moreOptions = c('div', { attrs: { id: 'advanced-options' }, classes: 'max-h-0 opacity-0 mb-0 overflow-hidden transition-all duration-300 ease-in-out space-y-5' })

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
        this.#nodes.enableDate = c('input', { attrs: { type: 'checkbox', id: 'enable-date' }, classes: 'w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500' })
        this.#nodes.dateStart = c('input', { attrs: { type: 'date', id: 'form-date-start', disabled: 'true' }, classes: 'w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 disabled:opacity-60 transition-all' })
        this.#nodes.dateEnd = c('input', { attrs: { type: 'date', id: 'form-date-end', disabled: 'true' }, classes: 'w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 disabled:opacity-60 transition-all' })

        const dateRangeBlock = c('div', { classes: 'bg-slate-50 p-4 rounded-xl border border-slate-200/60' }, [
            c('div', { classes: 'flex items-center justify-between mb-2.5 px-1' }, [
                c('label', { classes: 'text-[10px] font-bold text-slate-500 uppercase', text: 'Admission Date Range' }),
                c('div', { classes: 'flex items-center gap-2' }, [
                    c('span', { classes: 'text-[10px] font-semibold text-slate-400 uppercase', text: 'Filter Range' }),
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

        const actionRow = c('div', { classes: 'grid grid-cols-2 gap-4' }, [
            c('button', { attrs: { type: 'reset' }, classes: 'w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-all active:scale-[0.98]', text: 'Reset' }),
            c('button', { attrs: { type: 'submit', id: 'main-fetch-btn' }, classes: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]', text: 'Fetch' }),
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

        this.#nodes.form.addEventListener('reset', () => {
            setTimeout(() => {
                this.#selectedDocs = []
                this.#selectedRooms = []
                this.#nodes.selectedTemplateLabel.textContent = 'Select a template...'
                this.#nodes.dateStart.disabled = true
                this.#nodes.dateEnd.disabled = true
                this.toggleMoreOptions(false)
                this.updateUI()
            }, 0)
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
    resetInput() {
        this.#nodes.form.reset()
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
                        c('select', { attrs: { id: 'form-status', required: 'true' }, classes: 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all' }, [
                            c('option', { attrs: { value: '0' }, text: 'Inactive' }),
                            c('option', { attrs: { value: '1', selected: 'true' }, text: 'Active' }),
                            c('option', { attrs: { value: '2' }, text: 'Discharged' }),
                        ]),
                    ]),
                    c('div', {}, [
                        c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'Limit' }),
                        c('input', { attrs: { type: 'number', id: 'form-limit', value: '25', min: '1', required: 'true' }, classes: 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all' }),
                    ]),
                ]),
            ])
            this.#nodes.dynamicInputsContainer.append(node)
        } else if (system === ApiSoehadiDriver.SYSTEM_NAME) {
            const node = c('div', { classes: 'p-4 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-3' }, [
                c('div', { classes: 'text-[10px] font-extrabold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-1', text: `${system} Metrics` }),
                c('div', {}, [
                    c('label', { classes: 'block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1', text: 'No Reg' }),
                    c('input', { attrs: { type: 'text', id: 'form-no-reg', placeholder: 'Ex: 1234567890' }, classes: 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all' }),
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
            [ApiSoediranDriver.SYSTEM_NAME]: this.#nodes.form.querySelector('#form-status') ? {
                status: this.#nodes.form.querySelector('#form-status').value,
                limit: this.#nodes.form.querySelector('#form-limit').value,
            } : null,

            [ApiSoehadiDriver.SYSTEM_NAME]: this.#nodes.form.querySelector('#form-no-reg') ? {
                noReg: this.#nodes.form.querySelector('#form-no-reg').value,
            } : null,
        }
    }
    submitForm() {
        const payload = this.previewListOfRequest()
        if (typeof window.handleFetch === 'function') {
            window.handleFetch(payload.serializedDoctors, payload.serializedRooms)
        } else {
            console.log('Payload Form Submission:', payload)
        }
    }
}
