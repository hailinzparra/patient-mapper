import { Events, Utils } from './utils.js'

const G = {
    targetWidth: 360,
    mainContainer: null,
    init() {
        this.mainContainer = document.getElementById('main-container')
        this.mainContainer.style.minWidth = `${this.targetWidth}px`
    },
}

Events.on('entrypoint', (ev) => {
    // Inits
    G.init()

    // Check for browser
    const browser = Utils.getBrowser()
    if (browser !== 'Chrome') {
        Modals.alert('', `You are using <strong>${browser}</strong>.<br><small>This extension is optimized for Google Chrome.</small>`)
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
