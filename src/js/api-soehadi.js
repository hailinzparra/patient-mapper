// PROTOTYPE/MOCKUP
export const ApiSoehadiDriver = {
    DOMAINS: [
        'https://apirssoehadi.sragenkab.go.id'
    ],
    PATHS: {
        HOME: '/app/',
        BASE: '/service/medifirst2000',
    },
    /**
     * Hospital B's own network call structure (No custom encryption payload wrapper required)
     */
    async apiRequest(url, session, options = {}) {
        // const headers = {
        //     'X-Sragen-Auth': session.decodedToken, // Hypothetical alternative headers rule assignment
        //     'Accept': 'application/json',
        //     ...options.headers
        // }

        // const response = await fetch(url, { ...options, headers })
        // if (!response.ok) throw new Error("Sragen Portal Connection Error")

        // const result = await response.json()

        // // Maybe Sragen doesn't wrap data inside a ".success" property block.
        // // We parse it directly according to their custom schema rules!
        // return result
        return null
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
                isEncrypted: localStorage.getItem('_lapp-https_encrypt') === 'true'
            })
        })

        const result = injectionResults?.[0]?.result
        if (!result || !result.token) throw new Error('Token not found.')

        return {
            rawToken: result.token,
            decodedToken: atob(result.token),
            isEncryptionEnabled: result.isEncrypted
        }
    },


    async syncUserData(targetDomain, session, api) {
        // Query their profile endpoint
        const profile = await this.apiRequest(`${targetDomain}/api/v1/doctor/profile`, session)

        // Map their custom schema variables to match your popup's layout structure requirements
        return {
            username: profile.login_name,      // Map variations cleanly here
            displayName: profile.full_name,
            userId: profile.uid,
            doctorId: profile.doc_id,
            patientCount: 0
        }
    }
}
