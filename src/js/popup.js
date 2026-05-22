import { Events, Utils, Vault, VaultDriver } from './utils.js'
import { ApiSoediranDriver } from './api-soediran.js'
import { ApiSoehadiDriver } from './api-soehadi.js'

const api = typeof browser !== 'undefined' ? browser : chrome

const G = {
    swal: null,
    targetWidth: 360,
    mainContainer: null,
    preInit() {
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
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-xl bg-white p-6 shadow-xl border border-gray-100',
                title: 'text-lg font-bold text-gray-900',
                htmlContainer: 'text-sm text-gray-600 mt-2',
                confirmButton: 'mx-2 inline-flex justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition ease-in-out duration-150',
                cancelButton: 'mx-2 inline-flex justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition ease-in-out duration-150',
            },
        })
    },
    async init() {
        await this.store.settings.load()
        if (this.store.settings.data.devMode) {
            Beacon.init()
        }
        await this.sidebar.init()
    },
    store: {
        temp: {
            activeTargetTabId: null,
        },
        session: new VaultDriver('session'),
        patients: new VaultDriver('patients', {
            lists: [], // { id: 1, name: 'List #1', patientCount: 12 }
        }),
        settings: new VaultDriver('settings', {
            devMode: false,
            activeHospitalId: 0,
            activeDomainIndex: 0,
            isSidebarCollapsed: false,
            isAccordionOpen: true,
        }),
    },
    sidebar: {
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
        // Collapsible list / Accordion components
        myPatientsCollapsedBadge: null,
        myPatientsBadge: null,
        myPatientsAccordionArrow: null,
        myPatientsAccordionContent: null,
        myPatientsAddBtn: null,
        myPatientsListsContainer: null,
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
            this.myPatientsCollapsedBadge = document.getElementById('sidebar-my-patients-collapsed-badge')
            this.myPatientsBadge = document.getElementById('sidebar-my-patients-badge')
            this.myPatientsAccordionArrow = document.getElementById('sidebar-my-patients-accordion-arrow')
            this.myPatientsAccordionContent = document.getElementById('sidebar-my-patients-accordion-content')
            this.myPatientsAddBtn = document.getElementById('sidebar-my-patients-add-btn')
            this.myPatientsListsContainer = document.getElementById('sidebar-my-patients-lists-container')

            this.toggleBtn.addEventListener('click', () => {
                G.store.settings.update({ isSidebarCollapsed: !G.store.settings.data.isSidebarCollapsed })
                this.updateOnToggle()
            })

            this.targetHospitalSelect.innerHTML = Object.keys(G.HOSPITAL)
                .map(key => `<option value="${key}">${G.HOSPITAL[key].NAME}</option>`)
                .join('')
            this.targetHospitalSelect.addEventListener('change', async () => {
                await G.store.settings.update({
                    activeHospitalId: G.getActiveHospital().ID,
                    activeDomainIndex: 0,
                })
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

            this.updateOnToggle() // call once to match loaded settings
            const activeDomainIndexOnLoad = G.store.settings.data.activeDomainIndex
            Utils.DOM.selectOptionByValue(this.targetHospitalSelect, G.getHospitalKeyById(G.store.settings.data.activeHospitalId))
            await Utils.sleep(100)
            Utils.DOM.selectOptionByDatasetIndex(this.targetDomainSelect, activeDomainIndexOnLoad)

            Events.on('visible', () => this.runLiveEnvSync())
            Events.on('target_tab_closed', () => this.runLiveEnvSync())
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
                this.myPatientsAccordionContent.style.maxHeight = '0px'

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
                if (isAccordionOpen) this.myPatientsAccordionContent.style.maxHeight = '500px'

                this.myPatientsCollapsedBadge.classList.add('hidden')
                this.myPatientsBadge.classList.remove('hidden')
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
    },
    getActiveDomain() {
        return this.sidebar.targetDomainSelect.value
    },
    getActiveHospital() {
        const selectedHospitalKey = this.sidebar.targetHospitalSelect.value
        return this.HOSPITAL && this.HOSPITAL[selectedHospitalKey] ? this.HOSPITAL[selectedHospitalKey] : null
    },
    getActiveDriver() {
        const activeHospital = this.getActiveHospital()
        return activeHospital ? activeHospital.DRIVER : null
    },
    getHospitalKeyById(targetId) {
        const foundEntry = Object.entries(this.HOSPITAL).find(([key, hospital]) => {
            return hospital && hospital.ID !== undefined && String(hospital.ID) === String(targetId)
        })
        return foundEntry ? foundEntry[0] : null
    },
    getHospitalById(targetId) {
        const key = this.getHospitalKeyById(targetId)
        return key ? G.HOSPITAL[key] : null
    },
    HOSPITAL: {
        SOEDIRAN: {
            ID: 0,
            NAME: 'RSUD Soediran',
            DOMAINS: ApiSoediranDriver.DOMAINS,
            PATHS: ApiSoediranDriver.PATHS,
            DRIVER: ApiSoediranDriver,
        },
        SOEHADI: {
            ID: 1,
            NAME: 'RSUD Soehadi',
            DOMAINS: ApiSoehadiDriver.DOMAINS,
            PATHS: ApiSoehadiDriver.PATHS,
            DRIVER: ApiSoehadiDriver,
        },
    },
}

Events.on('entrypoint', async (ev) => {
    G.preInit()
    G.swal.fire({
        title: 'Initializing...',
        text: 'Please wait while the system loads.',
        allowOutsideClick: false,
        allowEscapeKey: false,
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

    await Utils.sleep(100)
    G.swal.close()

    // Check for browser
    const browser = Utils.getBrowser()
    if (browser !== 'Chrome') {
        G.swal.fire({
            title: `Using ${browser}?`,
            html: `This extension is for <strong>Google Chrome</strong>. Some features might not work properly on ${browser}.`,
            icon: 'warning',
            allowOutsideClick: false,
            allowEscapeKey: false,
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
