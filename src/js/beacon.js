const Beacon = {
    maxLogs: 500,
    logs: [],
    init() {
        ['log', 'error', 'warn'].forEach(type => {
            const originalMethod = console[type]
            console[type] = (...args) => {
                const newEntry = {
                    timestamp: new Date().toLocaleTimeString([], { hour12: false }),
                    type: type,
                    message: args.map(arg => {
                        try {
                            let str = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                            return str.length > 1000 ? str.substring(0, 1000) + '...' : str
                        } catch (e) {
                            return '[Unserializable Object]'
                        }
                    }).join(' '),
                }
                this.logs.push(newEntry)
                if (this.logs.length > this.maxLogs) this.logs.shift()
                originalMethod.apply(console, args)
            }
        })
    },
    clear() {
        this.logs = []
    },
    render(targetElement) {
        if (!targetElement) return
        targetElement.style.backgroundColor = '#1e1e1e'
        targetElement.style.color = '#f0f0f0'
        targetElement.style.fontFamily = 'monospace'
        targetElement.style.overflowY = 'auto'
        targetElement.style.padding = '10px'
        const colors = {
            log: '#ffffff',
            warn: '#ffcc00',
            error: '#ff5f56',
        }
        const html = this.logs.map(log => {
            return `
                <div style="margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
                    <span style="color: #888; font-size: 10px;">[${log.timestamp}]</span>
                    <span style="color: ${colors[log.type]}; font-weight: bold; font-size: 10px;">
                        ${log.type.toUpperCase()}:
                    </span>
                    <pre style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 12px; color: ${colors[log.type]}">${log.message}</pre>
                </div>
            `
        }).join('')
        targetElement.innerHTML = html
        targetElement.scrollTop = targetElement.scrollHeight
    },
}
