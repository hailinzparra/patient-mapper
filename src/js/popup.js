import { Events, Utils, Vault, VaultDriver, Tab, TabManager } from './utils.js'
import { Patient, PatientList } from './clinical.js'
import { PatientLookup, MyPatientsRenderer } from './ui.js'
import { SOEDIRAN_DATABASE, ApiSoediranDriver } from './api-soediran.js'
import { SOEHADI_DATABASE, ApiSoehadiDriver } from './api-soehadi.js'

const api = typeof browser !== 'undefined' ? browser : chrome

const G = {
    swal: null,
    targetWidth: 360,
    mainContainer: null,
    preInit() {
        this.hospitalManager.init()
        Vault.init('patient-mapper', [
            'eyJhcGlLZXkiOiJBSXphU3lEODMzdGtLSEk3S1hXRFdKNTlSWVJ6TXY0aGN5TGQ5cmsiLCJhdXRoRG9tYWluIjoibHVtaWZpbGxldC5maXJlYmFzZW',
            'FwcC5jb20iLCJkYXRhYmFzZVVSTCI6Imh0dHBzOi8vbHVtaWZpbGxldC1kZWZhdWx0LXJ0ZGIuYXNpYS1zb3V0aGVhc3QxLmZpcmViYXNlZGF0YWJh',
            'c2UuYXBwIiwicHJvamVjdElkIjoibHVtaWZpbGxldCIsInN0b3JhZ2VCdWNrZXQiOiJsdW1pZmlsbGV0LmZpcmViYXNlc3RvcmFnZS5hcHAiLCJtZX',
            'NzYWdpbmdTZW5kZXJJZCI6Ijg3NDAxNjY5OTgzMyIsImFwcElkIjoiMTo4NzQwMTY2OTk4MzM6d2ViOmQ0M2E2MTk1Y2M3NjNmOGQzMzcyNjgifQ==',
        ].join(''))
        this.mainContainer = document.getElementById('main-container')
        this.mainContainer.style.minWidth = `${this.targetWidth}px`
        this.swal = Swal.mixin({
            target: this.mainContainer,
            cancelButtonText: 'Close',
            showCloseButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-xl bg-white p-6 shadow-xl border border-gray-100',
                actions: 'flex flex-wrap items-center justify-end w-full mt-6 gap-2 pt-4',
                denyButton: 'inline-flex justify-center rounded-md bg-red-600 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-red-500 transition ease-in-out duration-150 order-1 sm:mr-auto cursor-pointer',
                confirmButton: 'inline-flex justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition ease-in-out duration-150 order-2 cursor-pointer',
                cancelButton: 'inline-flex justify-center rounded-md bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition ease-in-out duration-150 order-3 cursor-pointer',
            },
        })
    },
    async init() {
        await this.store.settings.load()
        if (this.store.settings.data.devMode) {
            Beacon.init()
        }
        await this.nav.init()
        await this.sidebar.init()
        await this.ui.init()
    },
    store: {
        temp: {
            activeTargetTabId: null,
        },
        session: new VaultDriver('session'),
        patients: new VaultDriver('patients', {
            lists: [],
        }),
        settings: new VaultDriver('settings', {
            devMode: false,
            activeHospitalId: 0,
            activeDomainIndex: 0,
            isSidebarCollapsed: false,
            isAccordionOpen: true,
            noteDefaultRole: MyPatientsRenderer.FILTERS.ROLE_MINE,
            noteDefaultDay: MyPatientsRenderer.DAYS.TODAY,
            myPatientsViewMode: MyPatientsRenderer.VIEWS.FULL,
        }),
        getPatientListById(listId) {
            const lists = this.patients.data.lists || []
            return lists.find(l => l.id === listId) || null
        },
    },
    nav: {
        tabs: {
            allPatients: new TabManager(),
            myPatients: new TabManager(),
        },
        init() {
            this.tabs.allPatients = new TabManager('all-patients-container')
            this.tabs.myPatients = new TabManager('my-patients-container')
            this.tabs.allPatients.addTab('all-home', 'All Patients', [], true)
            this.tabs.myPatients.addTab('my-home', 'My Patients', [], true)
            G.content.myPatients.home.reset()
        },
    },
    sidebar: {
        lastSelectedListId: null,
        // Structural elements
        container: null,
        brandText: null,
        toggleBtn: null,
        toggleIcon: null,
        // User profile elements
        userAvatar: null,
        userName: null,
        statusIndicator: null,
        statusText: null,
        authBtn: null,
        authBtnIcon: null,
        authBtnLoadingIcon: null,
        authBtnText: null,
        // Configuration fields
        targetHospitalSelect: null,
        targetDomainSelect: null,
        // Navigation items
        allPatientsBtn: null,
        myPatientsBtn: null,
        calculatorBtn: null,
        templatesBtn: null,
        devModeBtn: null,
        checkReleasesBtn: null,
        // Collapsible list / Accordion components
        myPatientsCollapsedBadge: null,
        myPatientsBadge: null,
        myPatientsAccordionBtn: null,
        myPatientsAccordionArrow: null,
        myPatientsAccordionContent: null,
        myPatientsAddBtn: null,
        myPatientsListsContainer: null,
        // Tools / More Accordion components
        toolsBtn: null,
        toolsAccordionBtn: null,
        toolsAccordionArrow: null,
        toolsAccordionContent: null,
        async init() {
            this.container = document.getElementById('sidebar')
            this.brandText = document.getElementById('sidebar-brand-text')
            this.toggleBtn = document.getElementById('sidebar-toggle-btn')
            this.toggleIcon = document.getElementById('sidebar-toggle-icon')
            this.userAvatar = document.getElementById('sidebar-user-avatar')
            this.userName = document.getElementById('sidebar-user-name')
            this.statusIndicator = document.getElementById('sidebar-status-indicator')
            this.statusText = document.getElementById('sidebar-status-text')
            this.authBtn = document.getElementById('sidebar-auth-btn')
            this.authBtnIcon = document.getElementById('sidebar-auth-btn-icon')
            this.authBtnLoadingIcon = document.getElementById('sidebar-auth-btn-loading-icon')
            this.authBtnText = document.getElementById('sidebar-auth-btn-text')
            this.targetHospitalSelect = document.getElementById('target-hospital-select')
            this.targetDomainSelect = document.getElementById('target-domain-select')
            this.allPatientsBtn = document.getElementById('sidebar-all-patients')
            this.myPatientsBtn = document.getElementById('sidebar-my-patients')
            this.calculatorBtn = document.getElementById('sidebar-calculator')
            this.templatesBtn = document.getElementById('sidebar-templates')
            this.devModeBtn = document.getElementById('sidebar-dev-mode')
            this.checkReleasesBtn = document.getElementById('sidebar-check-releases')
            this.myPatientsCollapsedBadge = document.getElementById('sidebar-my-patients-collapsed-badge')
            this.myPatientsBadge = document.getElementById('sidebar-my-patients-badge')
            this.myPatientsAccordionBtn = document.getElementById('sidebar-my-patients-accordion-btn')
            this.myPatientsAccordionArrow = document.getElementById('sidebar-my-patients-accordion-arrow')
            this.myPatientsAccordionContent = document.getElementById('sidebar-my-patients-accordion-content')
            this.myPatientsAddBtn = document.getElementById('sidebar-my-patients-add-btn')
            this.myPatientsListsContainer = document.getElementById('sidebar-my-patients-lists-container')
            this.toolsBtn = document.getElementById('sidebar-tools')
            this.toolsAccordionBtn = document.getElementById('sidebar-tools-accordion-btn')
            this.toolsAccordionArrow = document.getElementById('sidebar-tools-accordion-arrow')
            this.toolsAccordionContent = document.getElementById('sidebar-tools-accordion-content')

            await G.store.patients.load()

            const loadedLists = G.store.patients.data.lists || []
            G.store.patients.data.lists = loadedLists.map(listData => PatientList.fromJSON(listData))
            this.updateMyPatientsBadge()
            this.myPatientsListsContainer.innerHTML = ''
            G.store.patients.data.lists.forEach(patientList => {
                const listButton = this.createListRow(patientList)
                this.myPatientsListsContainer.append(listButton)
            })

            if (G.store.patients.data.lists.length > 0) {
                const firstListId = G.store.patients.data.lists[0].id
                this.lastSelectedListId = firstListId
            }

            this.toggleBtn.addEventListener('click', () => {
                G.store.settings.update({ isSidebarCollapsed: !G.store.settings.data.isSidebarCollapsed })
                this.updateOnToggle()
            })

            this.myPatientsAccordionBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                if (G.store.settings.data.isSidebarCollapsed) return
                G.store.settings.update({ isAccordionOpen: !G.store.settings.data.isAccordionOpen })
                this.updateOnToggleAccordion()
            })

            this.toolsBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                if (G.store.settings.data.isSidebarCollapsed) {
                    this.toggleBtn.click()
                    return
                }
                this.toggleToolsAccordion()
            })

            this.toolsAccordionBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                if (G.store.settings.data.isSidebarCollapsed) {
                    this.toggleBtn.click()
                    return
                }
                this.toggleToolsAccordion()
            })

            this.targetHospitalSelect.innerHTML = Object.keys(G.HOSPITAL)
                .map(key => `<option value="${key}">${G.HOSPITAL[key].NAME}</option>`)
                .join('')
            this.targetHospitalSelect.addEventListener('change', async () => {
                await G.store.settings.update({
                    activeHospitalId: G.getActiveHospital().ID,
                    activeDomainIndex: 0,
                })
                Events.emit('hospital_change')
                await this.updateDomainDropdown()
            })
            this.targetDomainSelect.addEventListener('change', async () => {
                let selectedIndex = 0
                this.targetDomainSelect.querySelectorAll('option').forEach(option => {
                    if (option.value === G.getActiveDomain()) {
                        selectedIndex = Number(option.dataset.index)
                    }
                })
                await G.store.settings.update({
                    activeDomainIndex: selectedIndex,
                })
                await this.runLiveEnvSync()
            })

            this.authBtn.addEventListener('click', () => {
                const home = G.getActiveHospital().PATHS.HOME
                const domain = G.getActiveDomain()
                api.tabs.create({
                    url: `${domain}${home}`,
                    active: true,
                })
            })

            this.myPatientsAddBtn.addEventListener('click', async () => {
                const nextListName = this.generateNextListName(G.store.patients.data.lists)
                const newList = new PatientList({ name: nextListName })

                const newLists = G.store.patients.data.lists || []
                newLists.push(newList)

                await G.store.patients.update({
                    lists: newLists,
                })

                const newListButton = this.createListRow(newList)
                this.myPatientsListsContainer.append(newListButton)
                this.updateMyPatientsBadge()
                this.selectListById(newList.id)
            })

            this.allPatientsBtn.addEventListener('click', () => {
                G.nav.tabs.myPatients.close()
                G.nav.tabs.allPatients.open()
                this.updateSidebarUI('all')
            })

            this.myPatientsBtn.addEventListener('click', () => {
                G.nav.tabs.allPatients.close()
                G.nav.tabs.myPatients.open()
                G.nav.tabs.myPatients.switchTab('my-home')

                if (this.lastSelectedListId) {
                    G.content.myPatients.home.render(this.lastSelectedListId)
                    this.updateSidebarUI('my', this.lastSelectedListId)
                } else {
                    G.content.myPatients.home.reset()
                    this.updateSidebarUI('my')
                }
            })

            this.calculatorBtn.addEventListener('click', () => {
                G.swal.fire({
                    title: 'MDCalc Calculator',
                    html: `
                        <iframe
                            src="https://www.mdcalc.com/"
                            width="100%"
                            height="500px"
                            style="border: none; border-radius: 4px;">
                        </iframe>
                    `,
                    draggable: true,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    focusConfirm: false,
                })
            })

            this.templatesBtn.addEventListener('click', () => {
                G.swal.fire({
                    title: 'Templates',
                    html: `Work in progress`,
                })
            })

            this.devModeBtn.addEventListener('click', async () => {
                const isDevModeActive = G.store.settings.data.devMode
                const nextState = isDevModeActive ? 'off' : 'on'
                const confirmText = `Turn ${nextState} developer mode?`
                const dialogResult = await G.swal.fire({
                    title: confirmText,
                    html: `<div id="dev-mode-beacon-container" class="max-h-96 text-start"></div>`,
                    showCancelButton: true,
                    confirmButtonText: `Turn ${nextState}`,
                    didOpen() {
                        const targetEl = document.getElementById('dev-mode-beacon-container')
                        if (!targetEl) return
                        if (isDevModeActive) {
                            Beacon.render(targetEl)
                        }
                        else {
                            targetEl.className = 'max-h-96 bg-[#1e1e1e] text-gray-400 font-mono text-xs py-5 px-2.5 text-center rounded'
                            targetEl.innerHTML = '<div>Turning on developer mode will display session logs here.</div>'
                        }
                    },
                })
                if (dialogResult.isConfirmed) {
                    G.store.settings.update({ devMode: !isDevModeActive })
                    G.ui.swalSuccessShort(`Developer mode turned ${nextState}`)
                    const updatedDevMode = G.store.settings.data.devMode
                    if (updatedDevMode && !Beacon.isActive) {
                        Beacon.init()
                    }
                }
            })

            this.checkReleasesBtn.addEventListener('click', () => {
                window.open('https://github.com/hailinzparra/patient-mapper/releases', '_blank', 'noopener,noreferrer')
            })

            this.myPatientsListsContainer.addEventListener('click', (e) => {
                const subListBtn = e.target.closest('.sidebar-sub-list-btn')
                if (!subListBtn) return

                const parentRow = subListBtn.closest('[data-list-id]')
                const clickedListId = parentRow.getAttribute('data-list-id')

                this.selectListById(clickedListId)
            })

            // call once to match loaded settings
            this.updateOnToggle()

            const activeDomainIndexOnLoad = G.store.settings.data.activeDomainIndex
            Utils.DOM.selectOptionByValue(this.targetHospitalSelect, G.getHospitalKeyById(G.store.settings.data.activeHospitalId))
            await Utils.sleep(100)
            Utils.DOM.selectOptionByDatasetIndex(this.targetDomainSelect, activeDomainIndexOnLoad)

            this.allPatientsBtn.click()

            Events.on('visible', () => this.runLiveEnvSync())
            Events.on('target_tab_closed', () => this.runLiveEnvSync())
        },
        selectListById(listId) {
            if (!listId) return

            this.lastSelectedListId = listId

            G.content.myPatients.home.render(listId)

            G.nav.tabs.allPatients.close()
            G.nav.tabs.myPatients.open()
            G.nav.tabs.myPatients.switchTab('my-home')

            this.updateSidebarUI('my', listId)
        },
        updateSidebarUI(activeMainId, activeSubListId = null) {
            this.allPatientsBtn.className = 'nav-item w-full flex items-center px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ' +
                (activeMainId === 'all' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')

            this.myPatientsBtn.className = 'nav-item flex-1 flex items-center px-3 py-2 text-xs font-semibold transition-all cursor-pointer min-w-0 ' +
                (activeMainId === 'my' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900')

            this.myPatientsBtn.closest('.group').className = 'w-full flex items-center justify-between rounded-lg transition-all group ' +
                (activeMainId === 'my' ? 'bg-blue-50/60' : 'hover:bg-slate-50')

            document.querySelectorAll('.sidebar-sub-list-btn').forEach(btn => {
                const parentRow = btn.closest('[data-list-id]')
                const listId = parentRow.getAttribute('data-list-id')
                const gearBtn = parentRow.querySelector('.gear-btn')
                if (listId === activeSubListId) {
                    btn.classList.remove('font-medium', 'text-slate-500', 'group-hover:text-slate-800')
                    btn.classList.add('font-semibold', 'text-blue-600')
                    parentRow.classList.add('bg-blue-50/40')
                    gearBtn.classList.remove('hidden')
                } else {
                    btn.classList.remove('font-semibold', 'text-blue-600')
                    btn.classList.add('font-medium', 'text-slate-500', 'group-hover:text-slate-800')
                    parentRow.classList.remove('bg-blue-50/40')
                    gearBtn.classList.add('hidden')
                }
            })
        },
        updateOnToggle() {
            const isSidebarCollapsed = G.store.settings.data.isSidebarCollapsed
            const isAccordionOpen = G.store.settings.data.isAccordionOpen

            const sidebarTexts = document.querySelectorAll('.sidebar-text')
            const navTexts = document.querySelectorAll('.nav-text')

            if (isSidebarCollapsed) {
                this.container.classList.replace('w-56', 'w-16')
                this.toggleIcon.classList.add('rotate-180')
                this.brandText.classList.add('opacity-0', 'hidden')
                this.myPatientsAccordionContent.classList.remove('max-h-[1000px]')
                this.myPatientsAccordionContent.classList.add('max-h-0')

                sidebarTexts.forEach(el => el.classList.add('opacity-0', 'hidden'))
                navTexts.forEach(el => el.classList.add('opacity-0', 'hidden'))

                this.myPatientsBadge.classList.add('hidden')
                this.myPatientsCollapsedBadge.classList.remove('hidden')
            } else {
                this.container.classList.replace('w-16', 'w-56')
                this.toggleIcon.classList.remove('rotate-180')
                this.brandText.classList.remove('opacity-0', 'hidden')

                sidebarTexts.forEach(el => el.classList.remove('opacity-0', 'hidden'))
                navTexts.forEach(el => el.classList.remove('opacity-0', 'hidden'))
                if (isAccordionOpen) {
                    this.myPatientsAccordionContent.classList.remove('max-h-0')
                    this.myPatientsAccordionContent.classList.add('max-h-[1000px]')
                }

                this.myPatientsCollapsedBadge.classList.add('hidden')
                this.myPatientsBadge.classList.remove('hidden')
            }

            this.updateOnToggleAccordion()
        },
        updateOnToggleAccordion() {
            const isAccordionOpen = G.store.settings.data.isAccordionOpen
            const isCollapsed = G.store.settings.data.isSidebarCollapsed
            if (!isCollapsed) {
                if (isAccordionOpen) {
                    this.myPatientsAccordionContent.classList.remove('max-h-0')
                    this.myPatientsAccordionContent.classList.add('max-h-[1000px]')
                } else {
                    this.myPatientsAccordionContent.classList.remove('max-h-[1000px]')
                    this.myPatientsAccordionContent.classList.add('max-h-0')
                }
            }
            if (isAccordionOpen) {
                this.myPatientsAccordionArrow.classList.remove('-rotate-90')
                this.myPatientsAccordionArrow.classList.add('rotate-0')
            } else {
                this.myPatientsAccordionArrow.classList.remove('rotate-0')
                this.myPatientsAccordionArrow.classList.add('-rotate-90')
            }
        },
        toggleToolsAccordion() {
            const content = this.toolsAccordionContent
            const arrow = this.toolsAccordionArrow
            const isClosed = content.classList.contains('max-h-0')
            if (isClosed) {
                content.classList.remove('max-h-0')
                content.classList.add('max-h-[1000px]')
                arrow.classList.remove('-rotate-90')
                arrow.classList.add('rotate-0')
            } else {
                content.classList.remove('max-h-[1000px]')
                content.classList.add('max-h-0')
                arrow.classList.remove('rotate-0')
                arrow.classList.add('-rotate-90')
            }
        },
        async updateDomainDropdown() {
            const selectedHospitalKey = this.targetHospitalSelect.value
            let index = 0
            this.targetDomainSelect.innerHTML = G.HOSPITAL[selectedHospitalKey].DOMAINS.map(domain =>
                `<option value="${domain}" data-index="${index++}">${domain}</option>`
            ).join('')
            await this.runLiveEnvSync()
        },
        async runLiveEnvSync() {
            this.disableInputs()
            await Utils.sleep(500)
            try {
                const activeDriver = G.getActiveDriver()
                const activeDomain = this.targetDomainSelect.value

                if (!activeDriver) throw new Error('No API driver implementation found.')

                const session = await activeDriver.getSession(activeDomain, api, G.store)
                await G.store.session.update({ ...session })

                const userData = await activeDriver.syncUserData(activeDomain, G.store.session.data)

                this.updateSyncUI(true, true, userData)
            } catch (error) {
                console.warn('Pipeline sync failure:', error)
                if (error.message.includes('tab not found')) {
                    this.updateSyncUI(false, false)
                } else {
                    this.updateSyncUI(true, false)
                }
            }
            this.enableInputs()
        },
        updateSyncUI(tabExists, isLoggedIn, userData = null) {
            if (!tabExists) {
                this.userAvatar.innerText = '-'
                this.userAvatar.className = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 transition text-xs'
                this.userName.innerHTML = '<span class="truncate text-xs font-semibold text-slate-400">No Tab Opened</span>'
                this.statusIndicator.className = 'h-1.5 w-1.5 rounded-full bg-slate-400'
                this.statusText.innerText = 'Offline'
                this.authBtnText.innerText = 'Open Target Site'
                return
            }

            if (!isLoggedIn) {
                this.userAvatar.innerText = '?'
                this.userAvatar.className = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700 transition text-xs border border-amber-200'
                this.userName.innerHTML = '<span class="truncate text-xs font-semibold text-slate-500">Logged Out</span>'
                this.statusIndicator.className = 'h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse'
                this.statusText.innerText = 'Tab Active'
                this.authBtnText.innerText = 'Login'
                return
            }

            if (!userData) return

            this.userAvatar.innerText = userData.displayName ? userData.displayName.charAt(0).toUpperCase() : 'D'
            this.userAvatar.className = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white transition text-xs shadow-sm'

            this.userName.innerHTML = `<div class="flex flex-col min-w-0"><span class="truncate text-xs font-bold text-slate-800">${userData.displayName}</span><div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] text-slate-400 truncate max-w-[65px]">@${userData.username}</span>
            <span class="px-1 py-0 bg-slate-100 text-slate-400 text-[7px] font-black rounded border border-slate-200 tracking-tighter truncate">ID:${userData.userId}</span></div></div>`

            this.statusIndicator.className = 'h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse'
            this.statusText.innerText = 'Online'
            this.authBtnText.innerText = 'Logout'
        },
        disableInputs() {
            this.authBtnText.innerText = 'Detecting...'
            this.authBtnIcon.classList.add('hidden')
            this.authBtnLoadingIcon.classList.remove('hidden')
            this.targetHospitalSelect.disabled = true
            this.targetDomainSelect.disabled = true
            this.authBtn.disabled = true
        },
        enableInputs() {
            this.authBtnLoadingIcon.classList.add('hidden')
            this.authBtnIcon.classList.remove('hidden')
            this.targetHospitalSelect.disabled = false
            this.targetDomainSelect.disabled = false
            this.authBtn.disabled = false
        },
        createListRow(patientList) {
            const rowWrapper = document.createElement('div')
            rowWrapper.className = 'group flex w-full items-center justify-between rounded-md hover:bg-slate-50 transition'
            rowWrapper.dataset.listId = patientList.id

            const listBtn = document.createElement('button')
            listBtn.className = 'sidebar-sub-list-btn flex-1 text-left text-xs font-medium text-slate-500 px-3 py-2 group-hover:text-slate-800 cursor-pointer truncate transition-all'
            listBtn.innerText = patientList.name

            const configBtn = document.createElement('button')
            configBtn.className = 'gear-btn p-1 me-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600 cursor-pointer transition hidden'
            configBtn.innerHTML = Utils.DOM.GEAR_SVG

            configBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                const newestPatientList = G.store.getPatientListById(rowWrapper.dataset.listId)
                if (newestPatientList) {
                    patientList = newestPatientList
                }
                this.openListDataModal(patientList, listBtn, rowWrapper)
            })

            rowWrapper.append(listBtn)
            rowWrapper.append(configBtn)

            return rowWrapper
        },
        async openListDataModal(patientList, listBtn, rowWrapper) {
            const count = patientList.patients.length
            const lastUpText = PatientList.getLastUpdatedText(patientList)
            const cls = ['flex justify-between items-center', 'font-semibold text-slate-500 shrink-0', 'block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-left',
                'flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-md text-xs font-bold bg-white hover:bg-slate-50 active:bg-slate-100 shadow-sm transition cursor-pointer',
                'class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
            ]
            const result = await G.swal.fire({
                title: `<div class="truncate">List Data</div>`,
                html: `<div class="border border-slate-200 rounded-md p-4 bg-slate-50 text-xs text-slate-600 space-y-2 mb-3">
                <div class="${cls[0]}"><span class="${cls[1]}">List Name:</span><span class="font-medium text-slate-800">${patientList.name}</span></div>
                <div class="${cls[0]}"><span class="${cls[1]}">Total Records:</span>
                <span class="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full text-[11px] border border-blue-100">${count} record${count === 1 ? '' : 's'}</span></div>
                <div class="${cls[0]}"><span class="${cls[1]}">Last Updated:</span><span class="text-slate-700">${lastUpText}</span></div></div>
                <div class="w-full mb-3"><label for="swal-input-name" class="${cls[2]}">Rename List</label>
                <input id="swal-input-name" type="text"
                    class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 placeholder-slate-400 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" 
                    value="${patientList.name}" placeholder="Enter new name..."
                ></div>
                <div class="w-full mb-3"><div class="${cls[2]} mb-2">Device Backup</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" id="swal-btn-save-data" class="${cls[3]} text-slate-700">
                <svg ${cls[4]} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Save to Device</button>
                <button type="button" id="swal-btn-load-data" class="${cls[3]} text-slate-700">
                <svg ${cls[4]} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Load from Device</button></div></div>
                <div class="w-full"><div class="${cls[2]} mb-2">Cloud Sync</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" id="swal-btn-cloud-save-data" class="${cls[3]} text-blue-600">
                <svg ${cls[4]} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                Save to Cloud</button>
                <button type="button" id="swal-btn-cloud-load-data" class="${cls[3]} text-blue-600">
                <svg ${cls[4]} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                Load from Cloud</button></div></div>`,
                showDenyButton: true,
                showCancelButton: true,
                denyButtonText: 'Delete List',
                confirmButtonText: 'Save Changes',
                didOpen: () => {
                    const originalName = patientList.name
                    const renameInput = document.getElementById('swal-input-name')
                    const saveToDeviceBtn = document.getElementById('swal-btn-save-data')
                    const loadFromDeviceBtn = document.getElementById('swal-btn-load-data')
                    const saveToCloudBtn = document.getElementById('swal-btn-cloud-save-data')
                    const loadFromCloudBtn = document.getElementById('swal-btn-cloud-load-data')
                    const confirmButton = G.swal.getConfirmButton()
                    if (renameInput) {
                        if (confirmButton) {
                            confirmButton.disabled = true
                        }
                        renameInput.addEventListener('input', (e) => {
                            const currentVal = e.target.value.trim()
                            if (currentVal === originalName.trim() || !currentVal) {
                                confirmButton.disabled = true
                            } else {
                                confirmButton.disabled = false
                            }
                        })
                        renameInput.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                if (confirmButton && !confirmButton.disabled) {
                                    G.swal.clickConfirm()
                                }
                            }
                        })
                    }
                    saveToDeviceBtn.onclick = () => {
                        G.swal.close()
                        this.triggerSave(patientList)
                    }
                    loadFromDeviceBtn.onclick = () => {
                        G.swal.close()
                        this.triggerLoad(patientList, listBtn, rowWrapper)
                    }
                    saveToCloudBtn.onclick = () => {
                        G.swal.close()
                        this.triggerCloudSave(patientList)
                    }
                    loadFromCloudBtn.onclick = () => {
                        G.swal.close()
                        this.triggerCloudLoad(patientList, listBtn, rowWrapper)
                    }
                },
                preConfirm() {
                    const inputVal = document.getElementById('swal-input-name').value
                    if (!inputVal.trim()) {
                        G.swal.showValidationMessage('The list name cannot be empty.')
                        const validationMsg = G.swal.getValidationMessage()
                        if (validationMsg) {
                            validationMsg.className = 'mt-2 text-xs font-medium text-red-600 bg-red-50 p-2 border border-red-100 text-center'
                            validationMsg.style = ''
                        }
                        return false
                    }
                    return { action: 'rename', value: inputVal.trim() }
                }
            })
            if (result.isConfirmed && result.value?.action === 'rename') {
                await this.renamePatientList(patientList.id, result.value.value, listBtn)
                G.ui.swalSuccessShort('Saved successfully!')
            } else if (result.isDenied) {
                const count = patientList.patients.length
                const confirmDelete = await G.swal.fire({
                    icon: 'warning',
                    title: 'Are you sure?',
                    html: `This will <strong>permanently delete "<span class="text-red-600">${patientList.name}</span>"</strong> and all <strong class="text-red-600">${count}</strong> record${count === 1 ? '' : 's'} inside it.`,
                    showDenyButton: true,
                    showCancelButton: true,
                    showConfirmButton: false,
                    denyButtonText: 'Yes, delete it',
                    cancelButtonText: 'Cancel',
                })
                if (confirmDelete.isDenied) {
                    await this.removePatientList(patientList.id, rowWrapper)
                    G.ui.swalSuccessShort('Deleted successfully!')
                    if (G.store.patients.data.lists.length > 0) {
                        const firstListId = G.store.patients.data.lists[0].id
                        this.lastSelectedListId = firstListId
                    }
                    else {
                        this.lastSelectedListId = null
                    }
                    this.myPatientsBtn.click()
                }
            }
        },
        async triggerSave(patientList) {
            G.swal.fire({
                title: 'Saving to device...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCloseButton: false,
                showConfirmButton: false,
                didOpen: () => {
                    G.swal.showLoading()
                }
            })

            await Utils.sleep(500)

            try {
                await PatientList.saveToDevice(patientList)
                G.ui.swalSuccessShort('Backup saved to device!')
            } catch (error) {
                console.error(error)
                G.swal.fire({
                    icon: 'error',
                    title: 'Error saving data',
                    text: 'Something went wrong while generating your backup file.',
                })
            }
        },
        async triggerLoad(patientList, listBtn, rowWrapper) {
            const originalListId = patientList.id

            G.swal.fire({
                title: 'Loading from device...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCloseButton: false,
                showConfirmButton: false,
                didOpen: () => {
                    G.swal.showLoading()
                }
            })

            await Utils.sleep(200)

            try {
                const loadedInstance = await PatientList.loadFromDevice()

                const lists = G.store.patients.data.lists || []
                const index = lists.findIndex(l => l.id === patientList.id)
                if (index === -1) throw new Error('No list to replace.')

                lists[index] = loadedInstance
                await G.store.patients.update({ lists })

                if (listBtn) {
                    listBtn.innerText = loadedInstance.name
                }
                if (rowWrapper) {
                    rowWrapper.dataset.listId = loadedInstance.id
                }
                this.lastSelectedListId = loadedInstance.id
                this.myPatientsBtn.click()

                G.ui.swalSuccessShort('Data loaded successfully!')
            } catch (error) {
                console.error(error)
                if (error.message === 'File selection cancelled') {
                    G.swal.close()
                    return
                }
                G.swal.fire({
                    icon: 'error',
                    title: 'Error loading data',
                    text: 'The file selected was corrupted or is not an authentic backup.',
                })
            }
        },
        async triggerCloudSave(patientList) {
            G.swal.fire({
                title: 'Saving to cloud...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCloseButton: false,
                showConfirmButton: false,
                didOpen: () => {
                    G.swal.showLoading()
                }
            })

            await Utils.sleep(500)

            try {
                await PatientList.saveToCloud(patientList)
                G.ui.swalSuccessShort('Backup saved to cloud!')
            } catch (error) {
                console.error(error)
                G.swal.fire({
                    icon: 'error',
                    title: 'Error saving to cloud',
                    text: error.message || 'Something went wrong while pushing data to the cloud.'
                })
            }
        },
        async triggerCloudLoad(patientList, listBtn, rowWrapper) {
            G.swal.fire({
                title: 'Checking cloud backups...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCloseButton: false,
                showConfirmButton: false,
                didOpen: () => {
                    G.swal.showLoading()
                }
            })

            await Utils.sleep(200)

            try {
                const previewMap = await Vault.download('previewlist') || {}

                const now = Date.now()
                const oneDayMs = 24 * 60 * 60 * 1000
                const validOptionsHtml = []
                const targetedDeletions = []

                const keys = Object.keys(previewMap).sort((a, b) => b - a)

                if (keys.length === 0) {
                    G.swal.fire({
                        icon: 'info',
                        title: 'No backups found',
                        text: 'There are no active cloud backups available for retrieval.'
                    })
                    return
                }

                const twoDaysMs = 2 * 24 * 60 * 60 * 1000
                let lastRenderedDate = ''
                keys.forEach(timestampKey => {
                    const uploadTime = parseInt(timestampKey, 10)
                    const expirationTime = uploadTime + oneDayMs
                    const timeLeftMs = expirationTime - now
                    const isExpired = timeLeftMs <= 0

                    const meta = previewMap[timestampKey]

                    const uploadDateObj = new Date(uploadTime)
                    const dateHeaderStr = uploadDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

                    const isPastTwoDays = (now - uploadTime) >= twoDaysMs
                    if (isPastTwoDays) {
                        targetedDeletions.push(Vault.discard(`previewlist/${timestampKey}`))
                        targetedDeletions.push(Vault.discard(`getlist/${meta.id}`))
                        return
                    }

                    if (dateHeaderStr !== lastRenderedDate) {
                        lastRenderedDate = dateHeaderStr
                        validOptionsHtml.push(`
                            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-3 pb-1 text-left border-b border-slate-100 mb-1 first:pt-1">
                                ${dateHeaderStr}
                            </div>
                        `)
                    }

                    const dateLabel = uploadDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    const recordCount = Number(meta.count) || 0
                    const recordsHtml = `<span class="text-blue-700">${recordCount} record${recordCount === 1 ? '' : 's'}</span>`

                    if (isExpired) {
                        validOptionsHtml.push(`
                            <div class="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-100/70 rounded-md text-slate-400 select-none opacity-60 overflow-x-hidden">
                                <div class="text-left">
                                    <div class="font-bold text-[10px] max-w-[150px] truncate line-through">${meta.name}</div>
                                    <div class="text-[8px] text-slate-400">${dateLabel} | ${recordsHtml}</div>
                                </div>
                                <span class="text-[8px] font-bold tracking-wide px-2 py-0.5 rounded bg-red-50 text-red-400 border border-red-100">Expired</span>
                            </div>
                        `)
                    } else {
                        const countdownString = Utils.formatCompactCountdown(timeLeftMs)
                        validOptionsHtml.push(`
                            <label class="flex items-center justify-between p-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-md shadow-sm cursor-pointer transition active:scale-[0.99] overflow-x-hidden">
                                <div class="text-left flex items-center gap-3">
                                    <input type="radio" name="swal-cloud-select" value="${meta.id}" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                                    <div>
                                        <div class="font-bold text-[10px] text-slate-700 max-w-[150px] line-clamp-2">${meta.name}</div>
                                        <div class="text-[8px] text-slate-400">${dateLabel} | ${recordsHtml}</div>
                                    </div>
                                </div>
                                <span class="text-[8px] font-bold tracking-wide px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap shrink-0">
                                    Expires in ${countdownString}
                                </span>
                            </label>
                        `)
                    }
                })

                if (targetedDeletions.length > 0) {
                    Promise.all(targetedDeletions).catch(err => console.error('Deletion routine failed:', err))
                }

                const selectResult = await G.swal.fire({
                    title: 'Select Cloud Backup',
                    html: `<div class="space-y-2 max-h-[280px] overflow-x-hidden overflow-y-auto px-1 py-1">${validOptionsHtml.join('')}</div>`,
                    showCancelButton: true,
                    confirmButtonText: 'Download & Sync',
                    preConfirm() {
                        const checkedRadio = document.querySelector('input[name="swal-cloud-select"]:checked')
                        if (!checkedRadio) {
                            G.swal.showValidationMessage('Please choose a backup file to import.')
                            const validationMsg = G.swal.getValidationMessage()
                            if (validationMsg) {
                                validationMsg.className = 'mt-2 text-xs font-medium text-red-600 bg-red-50 p-2 border border-red-100 text-center'
                                validationMsg.style = ''
                            }
                            return false
                        }
                        return checkedRadio.value
                    }
                })

                if (!selectResult.isConfirmed) return

                G.swal.fire({
                    title: 'Downloading file payload...',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showCloseButton: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        G.swal.showLoading()
                    }
                })

                await Utils.sleep(200)

                const selectedListId = selectResult.value
                const loadedInstance = await PatientList.loadFromCloud(selectedListId)

                const lists = G.store.patients.data.lists || []
                const index = lists.findIndex(l => l.id === patientList.id)
                if (index === -1) throw new Error('No list to replace.')

                lists[index] = loadedInstance
                await G.store.patients.update({ lists })

                if (listBtn) {
                    listBtn.innerText = loadedInstance.name
                }
                if (rowWrapper) {
                    rowWrapper.dataset.listId = loadedInstance.id
                }
                this.lastSelectedListId = loadedInstance.id
                this.myPatientsBtn.click()

                G.ui.swalSuccessShort('Cloud data loaded successfully!')
            } catch (error) {
                console.error(error)
                G.swal.fire({
                    icon: 'error',
                    title: 'Error loading data',
                    text: error.message || 'The specified cloud asset could not be recovered or parsed properly.',
                })
            }
        },
        async renamePatientList(listId, newName, listBtn) {
            const listToRename = G.store.getPatientListById(listId)
            if (!listToRename || !newName.trim()) return
            listToRename.name = newName.trim()

            await G.store.patients.update({})

            if (listBtn) {
                listBtn.innerText = listToRename.name
            }
            const activeTitle = document.querySelector(`.my-patients-title[data-list-id="${listId}"]`)
            if (activeTitle) {
                activeTitle.innerText = listToRename.name
            }
        },
        async removePatientList(listId, rowWrapper) {
            let lists = G.store.patients.data.lists || []

            lists = lists.filter(l => l.id !== listId)

            await G.store.patients.update({ lists })

            if (rowWrapper && rowWrapper.parentNode) {
                rowWrapper.remove()
            }

            this.updateMyPatientsBadge()
        },
        generateNextListName(existingLists) {
            let maxNumber = 0
            const regex = /^New List #(\d+)$/
            existingLists.forEach(list => {
                const match = list.name.match(regex)
                if (match) {
                    const num = parseInt(match[1], 10)
                    if (num > maxNumber) {
                        maxNumber = num
                    }
                }
            })
            return `New List #${maxNumber + 1}`
        },
        updateMyPatientsBadge(value = G.store.patients.data.lists.length) {
            this.myPatientsBadge.innerText = value || 0
            this.myPatientsCollapsedBadge.innerText = value || 0
        },
    },
    content: {
        myPatients: {
            home: {
                getPanel() {
                    return document.querySelector('.tab-contents-container div[data-tab-id="my-home"]')
                },
                async render(listId) {
                    try {
                        G.swal.fire({
                            title: 'Generating view...',
                            text: 'Processing data, please wait.',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showCloseButton: false,
                            showConfirmButton: false,
                            didOpen: () => {
                                G.swal.showLoading()
                            }
                        })

                        const myHomePanel = this.getPanel()
                        if (!myHomePanel) return
                        myHomePanel.innerHTML = ''

                        await Utils.sleep(500)

                        const rawListData = G.store.patients.data.lists.find(list => String(list.id) === String(listId))
                        if (!rawListData) return

                        const patientList = rawListData instanceof PatientList ? rawListData : PatientList.fromJSON(rawListData)

                        const myPatientsRenderer = new MyPatientsRenderer()
                        await myPatientsRenderer.init(
                            myHomePanel,
                            patientList,
                            G.store.settings,
                            G.store.patients,
                            G.hospitalManager.roomLookup,
                            G.hospitalManager.docLookup,
                        )
                        await myPatientsRenderer.buildAndRender()

                        G.swal.close()
                    }
                    catch (err) {
                        G.ui.swalFatalError(
                            err,
                            'Render Failed',
                            'The application encountered a fatal render error:',
                        )
                    }
                },
                reset() {
                    const myHomePanel = this.getPanel()
                    if (myHomePanel) {
                        myHomePanel.innerHTML = `
                        <div class="opacity-0 animate-[fadeInUp_0.2s_ease-out_forwards] p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No lists found. Click the '+ Add New List' button in the sidebar to create your first patient list!</div>`
                    }
                },
            },
        },
    },
    ui: {
        tabCounter: 0,
        patientLookup: new PatientLookup(),
        async init() {
            const allPatientContentPanel = G.nav.tabs.allPatients.getTabContentEl('all-home')
            this.patientLookup.init(allPatientContentPanel, null, null, (payload, docGroups, roomGroups, driver) => {
                Events.emit('patient_lookup_submit', { payload, docGroups, roomGroups, driver })
            })
            Events.on('hospital_change', () => this.onSwitchHospital())
            Events.on('patient_lookup_submit', async ({ payload, docGroups, roomGroups, driver }) => {
                try {
                    await this.launchPatientLookupTab(payload, docGroups, roomGroups, driver)
                }
                catch (err) {
                    this.swalFatalError(
                        err,
                        'Lookup Failed',
                        'The application encountered a fatal lookup error:',
                    )
                }
            })
            this.onSwitchHospital()
        },
        swalSuccessShort(title = 'Success!') {
            G.swal.fire({
                icon: 'success',
                title: title,
                showCloseButton: false,
                showConfirmButton: false,
                timer: 1000,
                timerProgressBar: true,
            })
        },
        swalFatalError(err, title, preMessage) {
            console.error(`${title}:`, err)
            let fullErrorPayload = ''
            if (err instanceof Error) {
                fullErrorPayload = err.stack || err.message
            } else if (typeof err === 'object' && err !== null) {
                try {
                    fullErrorPayload = JSON.stringify(err, null, 2)
                } catch (_) {
                    fullErrorPayload = String(err)
                }
            } else {
                fullErrorPayload = String(err)
            }
            G.swal.fire({
                icon: 'error',
                title: title,
                html: `<p class="mb-3 text-sm font-medium text-slate-700">${preMessage}</p>
                <div class="w-full max-h-60 overflow-y-auto overflow-x-auto bg-slate-900 text-rose-400 p-3 rounded-md border border-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre">
                ${Utils.escapeHtml(fullErrorPayload)}</div>`,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCloseButton: false,
            })
        },
        onSwitchHospital() {
            const activeHospital = G.getActiveHospital()
            if (!activeHospital) return

            const config = {
                driver: activeHospital.DRIVER,
                database: activeHospital.DATABASE,
                systemName: activeHospital.DRIVER.SYSTEM_NAME,
                wardOptions: activeHospital.WARD_OPTIONS,
            }

            this.patientLookup.setDriver(config.driver)
            this.patientLookup.setDatabase(config.database, true)
            this.patientLookup.updateInputs(config.wardOptions)
            this.patientLookup.addSpecificInputs(config.systemName)
        },
        async launchPatientLookupTab(payload, docGroups, roomGroups, driver) {
            this.tabCounter++
            const tabId = `pat-lookup-${this.tabCounter}`
            const tabName = `Search-${this.tabCounter}`
            const c = Utils.DOM.createElement

            let successCount = 0
            let failCount = 0
            let totalRecords = 0
            let isCriteriaOpen = true
            let isInteractivityEnabled = false

            const pingEffect = c('span', { classes: 'animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75' })
            const pingCenter = c('span', { classes: 'relative inline-flex rounded-full h-2 w-2 bg-blue-500' })
            const pingContainer = c('span', { classes: 'relative flex h-2 w-2' }, [pingEffect, pingCenter])
            const statusText = c('p', { classes: 'text-xs font-semibold tracking-wide', text: 'Searching...' })
            const statusBanner = c('div', { classes: 'flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 transition-colors duration-300' }, [
                pingContainer,
                statusText,
            ])

            const chevronIcon = c('svg', { attrs: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, classes: 'w-3 h-3 text-slate-400 transition-transform duration-300 rotate-180' }, [
                c('path', { attrs: { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '3', d: 'M19 9l-7 7-7-7' } }),
            ])
            const criteriaHeader = c('div', { classes: 'flex items-center justify-between p-1 cursor-not-allowed select-none transition-all duration-200 group text-slate-500 hover:text-blue-600' }, [
                c('h4', { classes: 'text-[11px] font-bold uppercase tracking-wider', text: 'Search Criteria' }),
                chevronIcon,
            ])
            const criteriaBody = c('div', { classes: 'max-h-[1000px] opacity-100 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out font-mono text-[9px]' })
            const criteriaContainer = c('div', { classes: 'p-2 bg-white rounded-xl border border-slate-200' }, [
                criteriaHeader,
                criteriaBody,
            ])
            const toggleCriteriaSection = (forceState = null) => {
                isCriteriaOpen = forceState !== null ? forceState : !isCriteriaOpen

                if (isCriteriaOpen) {
                    criteriaBody.classList.remove('max-h-0', 'opacity-0')
                    criteriaBody.classList.add('max-h-[1000px]', 'opacity-100')
                    chevronIcon.classList.add('rotate-180')
                } else {
                    criteriaBody.classList.remove('max-h-[1000px]', 'opacity-100')
                    criteriaBody.classList.add('max-h-0', 'opacity-0')
                    chevronIcon.classList.remove('rotate-180')
                }
            }
            criteriaHeader.addEventListener('click', () => {
                if (!isInteractivityEnabled) return
                toggleCriteriaSection()
            })

            const queryList = driver.buildFinalQueryList(docGroups, roomGroups, payload.wardType)
            const criteriaRowElements = []
            const statusDotElements = []
            const labelTextElements = []
            queryList.forEach((q, i) => {
                const payloadSummary = `[MRN: ${payload.mrn || '*'}] [Name: ${payload.name || '*'}] [Doc: ${q.doc || '*'}] [Room: ${q.room || '*'}] [Ward: ${q.ward || '*'}]`
                const statusDot = c('span', { classes: 'h-1 w-1 rounded-full bg-amber-400 animate-pulse flex-shrink-0' })
                const nodeLabel = c('span', { classes: 'text-slate-400 font-bold min-w-[55px]', text: `Search ${i + 1}` })
                const infoLabel = c('span', { classes: 'text-slate-500 truncate', text: `${payloadSummary} · PENDING` })
                const searchRow = c('div', { classes: 'flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-slate-50 transition-colors' }, [
                    statusDot,
                    nodeLabel,
                    infoLabel,
                ])
                criteriaBody.append(searchRow)
                criteriaRowElements.push(searchRow)
                statusDotElements.push(statusDot)
                labelTextElements.push(infoLabel)
            })

            const resultStatusText = c('p', { text: 'Awaiting search results...' })
            const resultTable = c('div', { classes: 'p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-center' }, [
                resultStatusText,
            ])

            statusBanner.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_forwards]')
            criteriaContainer.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_100ms_forwards]')
            resultTable.classList.add('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_200ms_forwards]')

            const contentPane = c('div', { classes: 'space-y-3', attrs: { id: `pane-${tabId}` } }, [
                statusBanner,
                criteriaContainer,
                resultTable,
            ])

            const activeTabManager = G.nav.tabs.allPatients
            activeTabManager.addTab(tabId, tabName, [contentPane], false)
            activeTabManager.open(tabId)

            await Utils.sleep(500)

            try {
                const hid = Utils.getValidValue(G.getActiveHospital()?.ID, -1)
                const session = G.store.session.data
                const targetDomain = G.getActiveDomain()
                const completeDataset = await driver.handleFetch(hid, targetDomain, payload, docGroups, roomGroups, session, (progress) => {
                    const { index, status, data } = progress
                    const targetDot = statusDotElements[index]
                    const targetText = labelTextElements[index]

                    const q = queryList[index]
                    const payloadSummary = `[MRN: ${payload.mrn || '*'}] [Name: ${payload.name || '*'}] [Doc: ${q.doc || '*'}] [Room: ${q.room || '*'}] [Ward: ${q.ward || '*'}]`

                    if (status === 'success') {
                        successCount++
                        totalRecords += (data ? data.length : 0)
                        targetDot.className = 'h-1 w-1 rounded-full bg-emerald-500 flex-shrink-0'
                        targetText.className = 'text-emerald-600 font-medium truncate'
                        targetText.textContent = `${payloadSummary} · DONE (${data.length} records)`
                    } else if (status === 'error') {
                        failCount++
                        targetDot.className = 'h-1 w-1 rounded-full bg-rose-500 flex-shrink-0'
                        targetText.className = 'text-rose-600 font-medium truncate'
                        targetText.textContent = `${payloadSummary} · ERROR`
                    }
                    statusText.innerHTML = `<span class="font-bold text-blue-900">${successCount}</span> Search${successCount === 1 ? '' : 'es'} Completed, <span class="font-bold text-rose-900">${failCount}</span> Search${failCount === 1 ? '' : 'es'} Failed...`
                    resultStatusText.textContent = `${totalRecords} record${totalRecords === 1 ? '' : 's'} found so far...`
                })

                statusBanner.className = 'flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100'
                pingContainer.style.display = 'none'
                statusText.textContent = `${successCount} Search${successCount === 1 ? '' : 'es'} Completed, ${failCount} Search${failCount === 1 ? '' : 'es'} Failed, ${totalRecords} Record${totalRecords === 1 ? '' : 's'} Found`
                isInteractivityEnabled = true
                criteriaHeader.classList.replace('cursor-not-allowed', 'cursor-pointer')
                criteriaHeader.classList.replace('text-slate-500', 'text-slate-700')
                toggleCriteriaSection(false)

                resultTable.classList.remove('flex', 'items-center', 'justify-center')
                resultTable.innerHTML = ''
                this.renderPatientLookupResultTable(resultTable, completeDataset)
            }
            catch (err) {
                console.error('Search failed: ', err)
                statusBanner.className = 'flex flex-col gap-1 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100'
                pingContainer.style.display = 'none'
                statusBanner.replaceChildren(
                    c('div', { classes: 'font-bold text-sm', text: 'Search Failed' }),
                    c('div', { classes: 'text-xs opacity-90 font-mono whitespace-pre-wrap', text: err.message }),
                )
                isInteractivityEnabled = true
                criteriaHeader.classList.replace('cursor-not-allowed', 'cursor-pointer')
                criteriaHeader.classList.replace('text-slate-500', 'text-slate-700')
                toggleCriteriaSection(false)
            }
            finally {
                statusBanner.classList.remove('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_forwards]')
                criteriaContainer.classList.remove('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_100ms_forwards]')
                resultTable.classList.remove('opacity-0', 'animate-[fadeInUp_0.2s_ease-out_200ms_forwards]')
            }
        },
        renderPatientLookupResultTable(resultTable, completeDataset, currentGroupingMode = 'ROOM') {
            const c = Utils.DOM.createElement

            resultTable.textContent = ''

            const originalCount = completeDataset ? completeDataset.length : 0
            const uniqueDataset = PatientList.filterDuplicates(completeDataset)
            const uniqueCount = uniqueDataset.length

            if (uniqueCount === 0) {
                const noDataRow = c('div', {
                    classes: 'px-3 py-4 text-xs font-medium text-slate-400 text-center bg-slate-50 border border-dashed border-slate-200 rounded',
                    text: 'No patient records discovered.',
                })
                resultTable.append(noDataRow)
                return
            }

            const btnCopyAll = c('button', {
                classes: 'flex-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black py-2 rounded shadow-sm transition-colors uppercase tracking-widest',
                text: 'Copy All Records',
            })

            const btnAddAll = c('button', {
                classes: 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 rounded shadow-sm transition-colors uppercase tracking-widest',
                text: 'Add All Records',
            })

            const getTabClass = (isActive, colorClass = 'text-blue-600') => isActive
                ? `toggle-view flex-1 px-3 py-1 text-[10px] font-bold rounded bg-white ${colorClass} shadow-sm`
                : 'toggle-view flex-1 px-3 py-1 text-[10px] font-bold rounded text-slate-500 hover:text-slate-700'

            const viewControls = c('div', { classes: 'flex items-center justify-end bg-white border border-slate-200 p-2 rounded-lg shadow-sm' }, [
                c('div', { classes: 'flex-1 flex gap-1 bg-slate-100 p-1 rounded-md' }, [
                    c('button', { classes: getTabClass(currentGroupingMode === 'ROOM'), attrs: { 'data-mode': 'ROOM' }, text: 'BY ROOM' }),
                    c('button', { classes: getTabClass(currentGroupingMode === 'DOCTOR', 'text-emerald-600'), attrs: { 'data-mode': 'DOCTOR' }, text: 'BY DOCTOR' })
                ]),
                // c('div', { classes: 'flex gap-1 bg-slate-100 p-1 rounded-md' }, [
                //     c('button', { classes: getTabClass(false), attrs: { 'data-sort': 'QUERY' }, text: 'QUERY ORDER' }),
                //     c('button', { classes: getTabClass(true), attrs: { 'data-sort': 'BED' }, text: 'BED SORT' })
                // ]),
            ])

            const dataSummaryStrip = c('div', { classes: 'px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-md text-center italic' }, [
                c('span', { text: `Showing a total of ` }),
                c('span', { classes: 'font-bold text-slate-800', text: `${uniqueCount} unique record${uniqueCount === 1 ? '' : 's'}` }),
                c('span', { text: ` from ${originalCount} record${originalCount === 1 ? '' : 's'} found.` }),
            ])

            const headerLayoutWrapper = c('div', { classes: 'sticky top-0 z-30 pt-2 -mt-1 bg-white space-y-2 mb-4 rounded-b-lg shadow-lg overflow-hidden' }, [
                c('div', { classes: 'flex gap-2' }, [btnCopyAll, btnAddAll]),
                viewControls,
                dataSummaryStrip,
            ])

            resultTable.append(headerLayoutWrapper)

            btnCopyAll.addEventListener('click', async (e) => {
                const fullTextPayload = this.generateAllPatientsCopyText(sortedPrimaryGroups, currentGroupingMode)
                await Utils.executeNativeClipboardCopy(fullTextPayload, e.currentTarget)
            })

            btnAddAll.addEventListener('click', () => {
                this.promptAndAddPatientToList(uniqueDataset)
            })

            const groupedData = uniqueDataset.reduce((acc, current) => {
                const p = current.toJSON ? current.toJSON() : current

                const roomName = p.roomId ? this.getResolvedNameFromDatabase(p.hid, 'room', p.roomId) : 'UNKNOWN ROOM'
                const docName = p.docId ? this.getResolvedNameFromDatabase(p.hid, 'doctor', p.docId) : 'NO DOCTOR ASSIGNED'

                const primaryId = currentGroupingMode === 'ROOM' ? p.roomId : p.docId
                const secondaryId = currentGroupingMode === 'ROOM' ? p.docId : p.roomId

                const primaryLabel = currentGroupingMode === 'ROOM' ? roomName : docName
                const secondaryLabel = currentGroupingMode === 'ROOM' ? docName : roomName

                if (!acc[primaryId]) {
                    acc[primaryId] = { primaryName: primaryLabel, subPatientsTotal: 0, subGroups: {} }
                }
                if (!acc[primaryId].subGroups[secondaryId]) {
                    acc[primaryId].subGroups[secondaryId] = { secondaryName: secondaryLabel, patients: [] }
                }

                acc[primaryId].subGroups[secondaryId].patients.push(p)
                acc[primaryId].subPatientsTotal += 1

                return acc
            }, {})

            const sortedPrimaryGroups = Object.values(groupedData).sort((a, b) =>
                a.primaryName.localeCompare(b.primaryName)
            )

            const uiThemes = {
                ROOM: { bg: 'bg-blue-600', btn: 'bg-blue-500 hover:bg-blue-400', badge: 'bg-blue-700', label: 'COPY ROOM' },
                DOCTOR: { bg: 'bg-emerald-600', btn: 'bg-emerald-500 hover:bg-emerald-400', badge: 'bg-emerald-700', label: 'COPY DOCTOR' },
            }

            const currentTheme = uiThemes[currentGroupingMode]

            sortedPrimaryGroups.forEach(primaryGroup => {
                const btnCopyGroup = c('button', {
                    classes: `btn-copy-group text-[9px] ${currentTheme.btn} text-white font-bold px-2 py-0.5 rounded transition-colors`,
                    attrs: { 'data-group': primaryGroup.primaryName },
                    text: currentTheme.label,
                })
                const totalBadge = c('span', {
                    classes: `${currentTheme.badge} text-white text-center text-[9px] font-bold px-2 py-0.5 rounded-full`,
                    text: `${primaryGroup.subPatientsTotal} RECORD${primaryGroup.subPatientsTotal !== 1 ? 'S' : ''}`,
                })
                const cardHeader = c('div', { classes: `${currentTheme.bg} px-3 py-1.5 flex justify-between items-center` }, [
                    c('span', { classes: 'text-[11px] font-black text-white uppercase tracking-widest', text: primaryGroup.primaryName }),
                    c('div', { classes: 'flex items-center gap-2' }, [btnCopyGroup, totalBadge]),
                ])

                btnCopyGroup.addEventListener('click', async (e) => {
                    const cardTextPayload = currentGroupingMode === 'ROOM'
                        ? this.generateRoomGroupCopyText(primaryGroup)
                        : this.generateDoctorGroupCopyText(primaryGroup)
                    await Utils.executeNativeClipboardCopy(cardTextPayload, e.currentTarget, 'COPIED!')
                })

                const sortedSubGroups = Object.values(primaryGroup.subGroups).sort((a, b) =>
                    a.secondaryName.localeCompare(b.secondaryName)
                )
                const innerSubContainers = sortedSubGroups.map(subGroup => {
                    const subTitleBar = c('div', { classes: 'px-3 py-1 border-b border-slate-100 flex justify-between items-center' }, [
                        c('span', { classes: 'text-[10px] font-bold text-slate-500 uppercase tracking-tight italic', text: subGroup.secondaryName }),
                        c('span', { classes: 'text-[9px] text-slate-400 font-bold', text: subGroup.patients.length.toString() }),
                    ])

                    const patientRowNodes = subGroup.patients
                        .sort((a, b) => (a.bedName || '').localeCompare(b.bedName || ''))
                        .map(patientInstance => {
                            const p = patientInstance instanceof Patient ? patientInstance : new Patient(patientInstance)
                            const ui = p.getUIDisplayData()
                            let genderColorClass = 'text-slate-400'
                            if (p.gender === Patient.MALE) {
                                genderColorClass = 'text-blue-500'
                            } else if (p.gender === Patient.FEMALE) {
                                genderColorClass = 'text-rose-500'
                            }
                            const losBadgeClasses = ui.los.isFresh
                                ? 'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border bg-amber-50 text-amber-700 border-amber-200 tracking-tighter ml-1'
                                : 'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border bg-slate-100 text-slate-500 border-slate-200 tracking-tighter ml-1'
                            const dataContainer = c('div', { classes: 'text-xs font-medium text-slate-700 leading-relaxed patient-data' }, [
                                c('span', { classes: 'font-bold text-slate-400', text: ui.bedName }),
                                c('span', { text: '/' }),
                                c('span', { classes: `font-bold ${genderColorClass}`, text: ui.gender }),
                                c('span', { text: '/' }),
                                c('span', { classes: 'font-bold text-slate-900', text: ui.name }),
                                c('span', { text: '/' }),
                                c('span', { classes: 'text-slate-500', text: ui.mrn }),
                                c('span', { text: '/' }),
                                c('span', { classes: 'text-slate-500', text: ui.age }),
                                c('span', { text: '/' }),
                                c('span', { classes: 'text-blue-600 font-semibold', text: ui.dx }),
                                ui.los.text !== '??' ? c('span', {
                                    classes: losBadgeClasses,
                                    text: ui.los.text
                                }) : null
                            ])
                            const btnCopy = c('button', {
                                classes: 'btn-copy text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200 transition-colors',
                                text: 'Copy'
                            })
                            const btnAdd = c('button', {
                                classes: 'btn-more text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 border border-emerald-200 transition-colors',
                                text: 'Add',
                            })

                            btnCopy.addEventListener('click', async (e) => {
                                const singleTextPayload = p.toClipboardString()
                                await Utils.executeNativeClipboardCopy(singleTextPayload, e.currentTarget)
                            })

                            btnAdd.addEventListener('click', async () => {
                                await this.promptAndAddPatientToList(p)
                            })

                            return c('div', { classes: 'compact-row flex items-center justify-between px-3 py-2 hover:bg-white group transition-colors' }, [
                                dataContainer,
                                c('div', { classes: 'actions flex flex-col sm:flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-end sm:items-center' }, [
                                    btnCopy,
                                    btnAdd,
                                ]),
                            ])
                        })

                    return c('div', { classes: 'bg-slate-50/50' }, [
                        subTitleBar,
                        c('div', { classes: 'divide-y divide-slate-50' }, patientRowNodes),
                    ])
                })

                const groupPanelCard = c('div', { classes: 'bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-4' }, [
                    cardHeader,
                    c('div', { classes: 'divide-y divide-slate-100' }, innerSubContainers),
                ])

                resultTable.append(groupPanelCard)
            })

            viewControls.querySelectorAll('button[data-mode]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedMode = e.target.getAttribute('data-mode')
                    if (selectedMode !== currentGroupingMode) {
                        this.renderPatientLookupResultTable(resultTable, completeDataset, selectedMode)
                    }
                })
            })
        },
        getResolvedNameFromDatabase(hid, type, idToFind) {
            // work: find a faster way
            const database = G.getHospitalDatabaseById(hid)
            if (!database) return idToFind
            const arrayKey = type === 'room' ? 'roomDatabase' : 'doctorDatabase'
            const dataset = database[arrayKey] || []
            const foundEntry = dataset.find(item => String(item.id) === String(idToFind))
            return foundEntry ? foundEntry.name : idToFind
        },
        generateRoomGroupCopyText(roomGroup) {
            const lines = []
            const totalPrimaryPatients = Object.values(roomGroup.subGroups).reduce((sum, docSub) => {
                return sum + (Array.isArray(docSub.patients) ? docSub.patients.length : 0)
            }, 0)
            lines.push(`*${roomGroup.primaryName} (${totalPrimaryPatients})*`)
            lines.push('')

            const sortedDocs = Object.values(roomGroup.subGroups).sort((a, b) =>
                a.secondaryName.localeCompare(b.secondaryName)
            )
            sortedDocs.forEach(docSubGroup => {
                const subGroupCount = Array.isArray(docSubGroup.patients) ? docSubGroup.patients.length : 0
                lines.push(`${docSubGroup.secondaryName} (${subGroupCount})`)
                const sortedPatients = docSubGroup.patients.sort((a, b) =>
                    (a.bedName || '').localeCompare(b.bedName || '')
                )
                sortedPatients.forEach(patientData => {
                    const p = patientData instanceof Patient ? patientData : new Patient(patientData)
                    lines.push(`- ${p.toClipboardString()}`)
                })
                lines.push('')
            })

            return lines.join('\n').trim()
        },
        generateDoctorGroupCopyText(docGroup) {
            const lines = []
            const totalPrimaryPatients = Object.values(docGroup.subGroups).reduce((sum, roomSub) => {
                return sum + (Array.isArray(roomSub.patients) ? roomSub.patients.length : 0)
            }, 0)
            lines.push(`*${docGroup.primaryName} (${totalPrimaryPatients})*`)
            lines.push('')

            const sortedRooms = Object.values(docGroup.subGroups).sort((a, b) =>
                a.secondaryName.localeCompare(b.secondaryName)
            )
            sortedRooms.forEach(roomSubGroup => {
                const subGroupCount = Array.isArray(roomSubGroup.patients) ? roomSubGroup.patients.length : 0
                lines.push(`${roomSubGroup.secondaryName} (${subGroupCount})`)
                const sortedPatients = roomSubGroup.patients.sort((a, b) =>
                    (a.bedName || '').localeCompare(b.bedName || '')
                )
                sortedPatients.forEach(patientData => {
                    const p = patientData instanceof Patient ? patientData : new Patient(patientData)
                    lines.push(`- ${p.toClipboardString()}`)
                })
                lines.push('')
            })

            return lines.join('\n').trim()
        },
        generateAllPatientsCopyText(sortedPrimaryGroups, mode) {
            return sortedPrimaryGroups.map(group => {
                return mode === 'ROOM'
                    ? this.generateRoomGroupCopyText(group)
                    : this.generateDoctorGroupCopyText(group)
            }).join('\n\n\n')
        },
        async promptAndAddPatientToList(rawInput) {
            const listArray = G.store.patients?.data?.lists

            if (!Array.isArray(listArray) || listArray.length === 0) {
                G.swal.fire({
                    icon: 'warning',
                    title: 'No Lists Found',
                    text: 'Please create a list first.',
                })
                return
            }

            try {
                const isBulk = Array.isArray(rawInput)
                const incomingPatients = isBulk
                    ? rawInput.map(p => p instanceof Patient ? p : new Patient(p))
                    : [rawInput instanceof Patient ? rawInput : new Patient(rawInput)]

                const descriptionText = isBulk
                    ? `Choose where to add <strong>${incomingPatients.length} record${incomingPatients.length === 1 ? '' : 's'}</strong>:`
                    : `Choose where to add <strong>${incomingPatients[0].processName(incomingPatients[0].name) || 'this patient'}</strong>:`

                const validOptionsHtml = []
                listArray.forEach(listData => {
                    const id = listData.id
                    const name = Utils.getValidValue(listData.name, 'Unnamed List')
                    const currentPatients = Array.isArray(listData.patients) ? listData.patients : []
                    const count = currentPatients.length

                    const tempListInstance = PatientList.fromJSON(listData)
                    const duplicateCount = incomingPatients.filter(p =>
                        tempListInstance.findDuplicate(p) !== undefined
                    ).length

                    let duplicateBadgeHtml = ''
                    if (duplicateCount > 0) {
                        duplicateBadgeHtml = isBulk && duplicateCount === incomingPatients.length
                            ? `<span class="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100 whitespace-nowrap shrink-0">All items exist</span>`
                            : `<span class="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap shrink-0">${isBulk ? `${duplicateCount} ` : ''}already exist${duplicateCount === 1 ? 's' : ''}</span>`
                    }

                    const recordsHtml = `<span class="text-blue-700">${count} record${count === 1 ? '' : 's'}</span>`

                    validOptionsHtml.push(`
                    <label class="flex items-center justify-between p-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-md shadow-sm cursor-pointer transition active:scale-[0.99] overflow-x-hidden">
                        <div class="text-left flex items-center gap-3">
                            <input type="radio" name="swal-patient-list-select" value="${id}" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                            <div>
                                <div class="font-bold text-[11px] text-slate-700 max-w-[180px] line-clamp-2">${name}</div>
                                <div class="text-[9px] text-slate-400">Current Total: ${recordsHtml}</div>
                            </div>
                        </div>
                        ${duplicateBadgeHtml}
                    </label>`)
                })

                const selectResult = await G.swal.fire({
                    title: 'Select Destination List',
                    html: `
                        <div class="text-xs text-slate-500 text-left mb-3">${descriptionText}</div>
                        <div class="space-y-2 max-h-[280px] overflow-x-hidden overflow-y-auto px-1 py-1">${validOptionsHtml.join('')}</div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: isBulk ? 'Add All Records' : 'Add Record',
                    preConfirm() {
                        const checkedRadio = document.querySelector('input[name="swal-patient-list-select"]:checked')
                        if (!checkedRadio) {
                            G.swal.showValidationMessage('You must select a destination list!')
                            const validationMsg = G.swal.getValidationMessage()
                            if (validationMsg) {
                                validationMsg.className = 'mt-2 text-xs font-medium text-red-600 bg-red-50 p-2 border border-red-100 text-center'
                                validationMsg.style = ''
                            }
                            return false
                        }
                        return checkedRadio.value
                    }
                })

                if (!selectResult.isConfirmed) return

                const selectedListId = selectResult.value
                const targetListIndex = listArray.findIndex(l => l.id === selectedListId)

                if (targetListIndex === -1) throw new Error('Selected list could not be resolved in matching memory storage references.')

                const targetList = PatientList.fromJSON(listArray[targetListIndex])

                let addedCount = 0
                let updatedCount = 0

                incomingPatients.forEach(patient => {
                    const existingPatient = targetList.findDuplicate(patient)

                    if (existingPatient) {
                        const idx = targetList.patients.findIndex(p => p === existingPatient)
                        if (idx !== -1) {
                            targetList.patients[idx] = patient
                            updatedCount++
                        }
                    } else {
                        targetList.addPatient(patient)
                        addedCount++
                    }
                })

                listArray[targetListIndex] = targetList
                await G.store.patients.update({ lists: listArray })

                if (isBulk) {
                    G.swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        html: `Added <strong>${addedCount}</strong> and updated <strong>${updatedCount}</strong> records in "${targetList.name}".`,
                    })
                } else {
                    if (updatedCount > 0) {
                        G.ui.swalSuccessShort('Updated successfully!')
                    } else {
                        G.ui.swalSuccessShort('Added successfully!')
                    }
                }
            } catch (err) {
                G.ui.swalFatalError(
                    err,
                    'Save Action Failed',
                    'The application encountered a fatal error while trying to append the patient records:',
                )
            }
        },
    },
    HOSPITAL: {
        SOEDIRAN: {
            ID: 0,
            NAME: ApiSoediranDriver.NAME,
            DATABASE: SOEDIRAN_DATABASE,
            DOMAINS: ApiSoediranDriver.DOMAINS,
            PATHS: ApiSoediranDriver.PATHS,
            DRIVER: ApiSoediranDriver,
            WARD_OPTIONS: SOEDIRAN_DATABASE.wardOptions,
        },
        SOEHADI: {
            ID: 1,
            NAME: ApiSoehadiDriver.NAME,
            DATABASE: SOEHADI_DATABASE,
            DOMAINS: ApiSoehadiDriver.DOMAINS,
            PATHS: ApiSoehadiDriver.PATHS,
            DRIVER: ApiSoehadiDriver,
            WARD_OPTIONS: SOEHADI_DATABASE.wardOptions,
        },
    },
    hospitalManager: {
        roomLookup: {},
        docLookup: {},
        init() {
            this.roomLookup = {}
            this.docLookup = {}

            const ALL_HOSPITALS = Object.values(G.HOSPITAL)
            for (const h of ALL_HOSPITALS) {
                if (h?.DATABASE?.roomDatabase) {
                    for (const r of Object.values(h.DATABASE.roomDatabase)) {
                        const uniqueKey = `${h.ID}_${r.id}`
                        this.roomLookup[uniqueKey] = {
                            // hospital: h,
                            hid: h.ID,
                            room: r,
                        }
                    }
                }
                if (h?.DATABASE?.doctorDatabase) {
                    for (const d of Object.values(h.DATABASE.doctorDatabase)) {
                        const uniqueKey = `${h.ID}_${d.id}`
                        this.docLookup[uniqueKey] = {
                            hid: h.ID,
                            doc: d,
                        }
                    }
                }
            }
        },
    },
    getActiveHospital() {
        const selectedHospitalKey = this.sidebar.targetHospitalSelect.value
        return this.HOSPITAL && this.HOSPITAL[selectedHospitalKey] ? this.HOSPITAL[selectedHospitalKey] : null
    },
    getActiveDomain() {
        return this.sidebar.targetDomainSelect.value
    },
    getActiveHospitalDatabase() {
        const activeHospital = this.getActiveHospital()
        return activeHospital ? activeHospital.DATABASE : null
    },
    getActiveDriver() {
        const activeHospital = this.getActiveHospital()
        return activeHospital ? activeHospital.DRIVER : null
    },
    getHospitalById(targetId) {
        const key = this.getHospitalKeyById(targetId)
        return key ? G.HOSPITAL[key] : null
    },
    getHospitalKeyById(targetId) {
        const foundEntry = Object.entries(this.HOSPITAL).find(([key, hospital]) => {
            return hospital && hospital.ID !== undefined && String(hospital.ID) === String(targetId)
        })
        return foundEntry ? foundEntry[0] : null
    },
    getHospitalDatabaseById(targetId) {
        const hospital = this.getHospitalById(targetId)
        return hospital ? hospital.DATABASE : null
    },
}

Events.on('entrypoint', async (ev) => {
    try {
        G.preInit()
        G.swal.fire({
            title: 'Initializing...',
            text: 'Please wait while the system loads.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCloseButton: false,
            showConfirmButton: false,
            didOpen: () => {
                G.swal.showLoading()
            }
        })

        await G.init()

        // Resize logic
        const scaleMainContainer = () => {
            if (!G.mainContainer) return
            const scale = window.innerWidth < G.targetWidth ? window.innerWidth / G.targetWidth : 1
            G.mainContainer.style.scale = `${scale}`
            G.mainContainer.style.height = `${100 / scale}vh`
        }
        window.addEventListener('resize', scaleMainContainer)
        scaleMainContainer()

        await Utils.sleep(1000)

        G.swal.close()
    }
    catch (err) {
        G.ui.swalFatalError(
            err,
            'Initialization Failed',
            'The application encountered a fatal initialization error:',
        )
    }

    // Check for browser
    const browser = Utils.getBrowser()
    if (browser !== 'Chrome') {
        G.swal.fire({
            icon: 'warning',
            title: `Using ${browser}?`,
            html: `This extension is for <strong>Google Chrome</strong>. Some features might not work properly on ${browser}.`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCloseButton: false,
        })
    }
})

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            Events.emit('visible')
        }
    })
    api.tabs.onRemoved.addListener((tabId, removeInfo) => {
        if (tabId === G.store.temp.activeTargetTabId) {
            Events.emit('target_tab_closed')
            G.store.temp.activeTargetTabId = null
        }
    })
    Events.emit('entrypoint')
})

window.G = G
