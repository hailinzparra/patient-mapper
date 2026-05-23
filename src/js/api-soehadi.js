import { Utils } from './utils.js'
import { PatientLookup } from './ui.js'

export const SOEHADI_DATABASE = {
    doctorDatabase: [
        { name: 'dr. Abc, Sp.A', id: '1' },
        { name: 'dr. Def, Sp.B', id: '2' },
        { name: 'dr. Ghi, Sp.C', id: '3' },
    ],
    roomDatabase: [
        { name: 'Poli Anak', id: '1' },
        { name: 'Poli Bedah', id: '2' },
        { name: 'Poli Cardio', id: '3' },
    ],
    templates: [
        {
            id: 'igd',
            name: 'IGD',
            docs: [],
            rooms: ['101020101', '101020201', '101020301'],
        },
        {
            id: 'anak',
            name: 'Anak',
            docs: ['1', '3'],
            rooms: [],
        },
    ],
    wardOptions: [
        { value: '', text: 'All Wards' },
        { value: 'in', text: 'Inpatient' },
        { value: 'out', text: 'Outpatient' },
    ],
}

export const ApiSoehadiDriver = {
    NAME: 'RSUD Soehadi',
    SYSTEM_NAME: 'Soehadi',
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
    async getSession(targetDomain, api, store) {
        const matchPattern = `${targetDomain}/*`
        const allTabs = await api.tabs.query({ url: matchPattern })
        const targetTab = allTabs[0]

        if (!targetTab || !targetTab.id) throw new Error('Portal tab not found.')

        store.temp.activeTargetTabId = targetTab.id

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
        if (!result || !result.authToken || !result.userLogin || !result.pegawai) throw new Error('Session not found.')

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
    async handleFetch(targetDomain, payload, docGroups, roomGroups, session, onProgress) {
        const results = []
        const queryList = this.buildFinalQueryList(docGroups, roomGroups, payload.wardType)
        const payloadManager = new SoehadiRequestPayload(payload, this.SYSTEM_NAME)
        for (let i = 0; i < queryList.length; i++) {
            const q = queryList[i]
            const detailPath = this.getWardPath(q.ward)
            payloadManager.reset()
            payloadManager.update({
                dokId2: q.doc,
                ruangId: q.room,
            })
            const url = Utils.buildUrl(targetDomain, this.PATHS.BASE, detailPath,
                payloadManager.toQueryString(),
            )
            try {
                const result = await this.apiRequest(url, session)
                const data = result || []
                results.push(...data)
                if (typeof onProgress === 'function') {
                    onProgress({ index: i, status: 'success', data })
                }
            } catch (err) {
                console.warn(`Search ${i + 1} failed:`, err.message)
                if (typeof onProgress === 'function') {
                    onProgress({ index: i, status: 'error', error: err.message })
                }
            }
            if (i < queryList.length - 1) {
                const delay = Utils.randomRange(200, 500)
                await Utils.sleep(delay)
            }
        }
        return results
    },
    buildFinalQueryList(docGroups, roomGroups, wardType) {
        const baseQueryList = PatientLookup.buildQueryList(docGroups, roomGroups)
        const wardTypeList = this.getWardTypeList(wardType)
        return wardTypeList.flatMap(item =>
            baseQueryList.map(query => ({
                ...query,
                ward: item,
            }))
        )
    },
    getWardTypeList(wardType) {
        switch (wardType) {
            case 'in':
                return ['in']
            case 'out':
                return ['out']
            case '':
            default:
                return ['in', 'out']
        }
    },
    getWardPath(wardType) {
        const inPath = '/rawatinap/get-daftar-antrian-ranap'
        const outPath = '/rawatjalan/get-daftar-antrian-rajal-dokter'
        switch (wardType) {
            case 'out':
                return outPath
            case 'in':
            default:
                return inPath
        }
    },
}

class SoehadiRequestPayload {
    #initialState = {}
    constructor(p, systemName) {
        const s = p[systemName]
        const v = Utils.getValidValue
        this.raw = {
            tglAwal: p.dateFilterEnabled && p.dateRange?.start ? p.dateRange.start.replace('T', ' ') : `${new Date().toISOString().split('T')[0]} 00:00:00`,
            tglAkhir: p.dateFilterEnabled && p.dateRange?.end ? p.dateRange.end.replace('T', ' ') : `${new Date().toISOString().split('T')[0]} 23:59:59`,
            norm: v(p.mrn, null),
            noreg: v(s?.noReg, null),
            nama: v(p.name, null),
            ruangId: null,
            dokId2: null,
        }
        this.#initialState = { ...this.raw }
    }
    update(fields = {}) {
        Object.assign(this.raw, fields)
        return this
    }
    reset() {
        this.raw = { ...this.#initialState }
        return this
    }
    toQueryString() {
        const cleanEntries = Object.entries(this.raw).filter(
            ([_, val]) => val !== null && val !== undefined && val !== ''
        )
        return new URLSearchParams(Object.fromEntries(cleanEntries)).toString()
    }
}
