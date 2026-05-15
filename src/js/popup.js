import { Events, Utils, Vault } from './utils.js'

const G = {
    targetWidth: 360,
    mainContainer: null,
    settings: {
        key: 'settings',
        data: {
            isDebugging: false,
        },
    },
    async init() {
        this.mainContainer = document.getElementById('main-container')
        this.mainContainer.style.minWidth = `${this.targetWidth}px`
        await this.loadSettings()
        if (this.settings.data.isDebugging) {
            Beacon.init()
        }
    },
    async updateSettings(newData) {
        this.settings.data = { ...this.settings.data, ...newData }
        await this.saveSettings()
    },
    async saveSettings() {
        try {
            await Vault.save(this.settings.key, this.settings.data)
        } catch (err) {
            console.error('Failed to save settings: ', err)
        }
    },
    async loadSettings() {
        try {
            const savedData = await Vault.load(this.settings.key)
            if (savedData) {
                this.settings.data = { ...this.settings.data, ...savedData }
            }
        } catch (err) {
            console.error('Failed to load settings:', err)
        }
    },
}

Events.on('entrypoint', async (ev) => {
    // Inits
    Vault.init('patient-mapper', [
        'eyJhcGlLZXkiOiJBSXphU3lEODMzdGtLSEk3S1hXRFdKNTlSWVJ6TXY0aGN5TGQ5cmsiLCJhdXRoRG9tYWluIjoibHVtaWZpbGxldC5maXJlYmFzZW',
        'FwcC5jb20iLCJkYXRhYmFzZVVSTCI6Imh0dHBzOi8vbHVtaWZpbGxldC1kZWZhdWx0LXJ0ZGIuYXNpYS1zb3V0aGVhc3QxLmZpcmViYXNlZGF0YWJh',
        'c2UuYXBwIiwicHJvamVjdElkIjoibHVtaWZpbGxldCIsInN0b3JhZ2VCdWNrZXQiOiJsdW1pZmlsbGV0LmZpcmViYXNlc3RvcmFnZS5hcHAiLCJtZX',
        'NzYWdpbmdTZW5kZXJJZCI6Ijg3NDAxNjY5OTgzMyIsImFwcElkIjoiMTo4NzQwMTY2OTk4MzM6d2ViOmQ0M2E2MTk1Y2M3NjNmOGQzMzcyNjgifQ==',
    ].join(''))
    await G.init()

    // Check for browser
    const browser = Utils.getBrowser()
    if (browser !== 'Chrome') {
        Modals.alert('', `You are using <strong>${browser}</strong>.<br><small>This extension is for Google Chrome.</small>`)
    }

    // Resize logic
    const scaleMainContainer = () => {
        if (!G.mainContainer) return
        G.mainContainer.style.scale = window.innerWidth < G.targetWidth ? `${window.innerWidth / G.targetWidth}` : '1'
    }
    window.addEventListener('resize', scaleMainContainer)
    scaleMainContainer()
})

document.addEventListener('DOMContentLoaded', () => {
    Events.emit('entrypoint')
})
