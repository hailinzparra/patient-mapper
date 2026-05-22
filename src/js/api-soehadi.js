export const ApiSoehadiDriver = {
    DOMAINS: [
        'https://apirssoehadi.sragenkab.go.id'
    ],
    PATHS: {
        HOME: '/app/',
        BASE: '/service/medifirst2000',
    },
    async apiRequest(url, session, options = {}) {
        const headers = {
            'X-AUTH-TOKEN': session.authToken || '',
            'Accept': 'application/json, text/plain, */*',
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

        if (result.success === false || result.statResponse === false) {
            throw new Error(result.message || result.detail || 'The API returned an unsuccessful status.')
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
            func: () => {
                const rawUserLogin = localStorage.getItem('datauserlogin')
                const rawPegawai = localStorage.getItem('pegawai')
                const cookieArray = document.cookie.split(';')
                let authorizationToken = ''

                for (let i = 0; i < cookieArray.length; i++) {
                    const element = cookieArray[i].trim().split('=')
                    if (element[0].indexOf('authorization') > -1) {
                        authorizationToken = element[1] || ''
                        break
                    }
                }

                return {
                    authToken: authorizationToken,
                    userLogin: rawUserLogin ? JSON.parse(rawUserLogin) : null,
                    pegawai: rawPegawai ? JSON.parse(rawPegawai) : null,
                }
            },
        })

        const result = injectionResults?.[0]?.result
        if (!result) throw new Error('Session not found.')

        return {
            authToken: result.authToken,
            userData: {
                username: result.userLogin.kdUser,
                displayName: result.pegawai.namaLengkap,
                userId: result.pegawai.id,
            },
        }
    },
    async syncUserData(targetDomain, session) {
        if (!session.userData) throw new Error('Not Authenticated')
        return session.userData
    },
}
