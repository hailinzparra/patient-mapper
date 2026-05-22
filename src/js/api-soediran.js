// Helper for encryption/decryption
const myBase64 = {
    _str: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    decode(z) {
        var A = this
        var D = '', E, G, w, F, v, x, y, C = 0
        z = z.replace(/[^A-Za-z0-9\+\/\=]/g, '')
        var B = z.length
        while (C < B) {
            F = A._str.indexOf(z.charAt(C++))
            v = A._str.indexOf(z.charAt(C++))
            x = A._str.indexOf(z.charAt(C++))
            y = A._str.indexOf(z.charAt(C++))
            E = (F << 2) | (v >> 4)
            G = ((v & 15) << 4) | (x >> 2)
            w = ((x & 3) << 6) | y
            D = D + String.fromCharCode(E)
            if (x !== 64) { D += String.fromCharCode(G) }
            if (y !== 64) { D += String.fromCharCode(w) }
        }
        return A._utf8_decode(D)
    },
    _utf8_decode(t) {
        var q = '', w = 0, v = 0, s = 0, p = 0, u = t.length
        while (w < u) {
            v = t.charCodeAt(w)
            if (v < 128) {
                q += String.fromCharCode(v)
                w++
            }
            else if (v > 191 && v < 224) {
                p = t.charCodeAt(w + 1)
                q += String.fromCharCode(((v & 31) << 6) | (p & 63))
                w += 2
            } else {
                p = t.charCodeAt(w + 1)
                s = t.charCodeAt(w + 2)
                q += String.fromCharCode(((v & 15) << 12) | ((p & 63) << 6) | (s & 63))
                w += 3
            }
        }
        return q
    }
}

const hexToArrayData = (o) => {
    var q = Math.ceil(o.length / 2)
    var s = new Uint8Array(q)
    for (var p = 0; p < q; p++) {
        var n = o.substr(p * 2, 2)
        s[p] = parseInt(n, 16)
    }
    return s
}

const asciiToHex = (p) => {
    var o = ''
    for (var n = 0; n < p.length; n++) {
        var m = p.charCodeAt(n).toString(16)
        o += m.padStart(2, '0')
    }
    return o
}

async function decryptData(encryptedBase64, tokenBase64) {
    return new Promise((resolve, reject) => {
        try {
            var C = window.crypto.subtle || window.crypto.webkitSubtle,
                z = myBase64.decode(tokenBase64),
                u = myBase64.decode(encryptedBase64),
                y = u.substring(0, 16),
                A = new TextDecoder(),
                B = hexToArrayData(z),
                uData = u.substring(16)

            if (!C) throw new Error('Crypto API not available')
            const ivArr = hexToArrayData(asciiToHex(y))
            const cipherArr = hexToArrayData(asciiToHex(uData))

            C.importKey("raw", B, { name: 'AES-CBC', length: 32 }, false, ['decrypt'])
                .then(f => C.decrypt({ name: 'AES-CBC', iv: ivArr }, f, cipherArr))
                .then(g => {
                    const decodedText = A.decode(new Uint8Array(g))
                    const decompressed = LZString.decompressFromEncodedURIComponent(decodedText)
                    try { resolve(JSON.parse(decompressed)) } catch (e) { resolve(decompressed) }
                }).catch(e => reject(e))
        } catch (err) { reject(err) }
    })
}

export const ApiSoediranDriver = {
    DOMAINS: [
        'https://api.rsudsoediranms.com',
        'http://192.168.13.6',
        'http://192.168.13.7',
        'http://192.168.13.8',
    ],
    PATHS: {
        HOME: '/apps/SIMpel/',
        BASE: '/webservice',
    },
    async apiRequest(url, session, options = {}) {
        const headers = {
            'Authorization': `Bearer ${session.authToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
        }

        let response
        try {
            response = await fetch(url, { ...options, headers })
        } catch (err) {
            throw new Error(`Connection failed: Please check your internet or site permissions.`)
        }

        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status}`
            try {
                const errorData = await response.json()
                errorMsg = errorData.message || errorData.detail || errorMsg
            } catch { }
            throw new Error(errorMsg)
        }

        let result
        try {
            result = await response.json()
        } catch (jsonError) {
            throw new Error('The server returned an invalid data format.')
        }

        if (result.success !== true) {
            throw new Error(result.message || result.detail || 'The API returned an unsuccessful status.')
        }

        if (session.isEncryptionEnabled && typeof result.data === 'string' && result.data.length > 0) {
            try {
                result.data = await decryptData(result.data, session.rawToken)
            } catch (decryptError) {
                console.error('Decryption failed:', decryptError)
                throw new Error('Security Error: Could not decrypt the received data.')
            }
        }

        return result
    },
    async getSession(targetDomain, api) {
        const matchPattern = `${targetDomain}/*`
        const allTabs = await api.tabs.query({ url: matchPattern })
        const targetTab = allTabs[0]

        if (!targetTab || !targetTab.id) throw new Error('Portal tab not found.')

        const injectionResults = await api.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: () => ({
                token: localStorage.getItem('_lapp-access_token'),
                isEncrypted: localStorage.getItem('_lapp-https_encrypt') === 'true',
            }),
        })

        const result = injectionResults?.[0]?.result
        if (!result || !result.token) throw new Error('Session not found.')

        return {
            rawToken: result.token,
            authToken: atob(result.token),
            isEncryptionEnabled: result.isEncrypted,
        }
    },
    async syncUserData(targetDomain, session) {
        const dc = Date.now()
        const authUrl = `${targetDomain}${this.PATHS.BASE}/authentication/isAuthenticate?_dc=${dc}`

        const authResponse = await this.apiRequest(authUrl, session)

        if (!authResponse || !authResponse.data) throw new Error('Not Authenticated')

        const rawUser = authResponse.data

        return {
            username: rawUser.LGN,
            displayName: rawUser.NAME,
            userId: rawUser.ID,
        }
    },
}
