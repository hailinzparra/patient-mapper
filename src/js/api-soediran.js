import { Utils } from './utils.js'
import { Patient } from './clinical.js'
import { PatientLookup } from './ui.js'

export const SOEDIRAN_DATABASE = {
    doctorDatabase: [
        { name: 'dr. Firman, Sp.B', id: '37' },
        { name: 'dr. Satria, Sp.B', id: '71' },
        { name: 'dr. Andri, Sp.U', id: '36' },
        { name: 'dr. Aris, Sp.BS', id: '98' },
        { name: 'dr. Robin, Sp.BA', id: '104' },
        { name: 'dr. Amir, Sp.OT', id: '24' },
        { name: 'dr. Twody, Sp.OT', id: '10' },
        { name: 'dr. Eka, Sp.OG', id: '11' },
        { name: 'dr. Cakra, Sp.OG', id: '27' },
        { name: 'dr. Guntur, Sp.OG', id: '57' },
        { name: 'dr. Khome, Sp.OG', id: '62' },
        { name: 'dr. Endra, Sp.PD', id: '12' },
        { name: 'dr. Dar, Sp.PD', id: '30' },
        { name: 'dr. Diksi, Sp.PD', id: '63' },
        { name: 'dr. Afandi, Sp.JP', id: '89' },
        { name: 'dr. Shigma, Sp.JP', id: '103' },
        { name: 'dr. Enny, Sp.P', id: '19' },
        { name: 'dr. Bimo, Sp.P', id: '67' },
        { name: 'dr. Ain, Sp.A', id: '28' },
        { name: 'dr. Nisa, Sp.A', id: '25' },
        { name: 'dr. Sari, Sp.A', id: '32' },
        { name: 'dr. Yani, Sp.S', id: '14' },
        { name: 'dr. Agung, Sp.S', id: '15' },
        { name: 'dr. Palma, Sp.N', id: '109' },
        { name: 'dr. Romy, Sp.KJ', id: '29' },
        { name: 'dr. Har, Sp.KJ', id: '59' },
        { name: 'dr. Tavip, Sp.THT-KL', id: '16' },
        { name: 'dr. Yoice, Sp.THT-KL', id: '17' },
        { name: 'dr. Retna, Sp.M', id: '80' },
        { name: 'dr. Anin, Sp.DVE', id: '101' },
        { name: 'dr. Yosie, Sp.An', id: '21' },
        { name: 'dr. Giri, Sp.An', id: '9' },
        { name: 'dr. Erry, Sp.An', id: '68' },
        { name: 'dr. Endrawati, Sp.Rad', id: '4' },
        { name: 'dr. Yusuf, Sp.Rad', id: '5' },
        { name: 'dr. Harnadi, Sp.PK', id: '2' },
        { name: 'dr. Magendi, Sp.PK', id: '99' },
        { name: 'dr. Kumala, Sp.MK', id: '111' },
        { name: 'dr. Mukhtar Ali, Sp.KFR', id: '100' },
        { name: 'dr. Pitut, MM', id: '95' },
        { name: 'dr. Supriyadi', id: '38' },
        { name: 'dr. Sartono', id: '39' },
        { name: 'dr. Yuline', id: '40' },
        { name: 'dr. Gatot', id: '41' },
        { name: 'dr. Galih', id: '43' },
        { name: 'dr. Yudi', id: '46' },
        { name: 'dr. Liliek', id: '47' },
        { name: 'dr. Mursit', id: '51' },
        { name: 'dr. Bram', id: '54' },
        { name: 'dr. Septiana', id: '55' },
        { name: 'dr. Hendra', id: '72' },
        { name: 'dr. Rohmah', id: '73' },
        { name: 'dr. Candra', id: '75' },
        { name: 'dr. Fauzi', id: '76' },
        { name: 'dr. Arief', id: '77' },
        { name: 'dr. Azizah', id: '78' },
        { name: 'dr. Isnaini', id: '79' },
        { name: 'dr. Paramita', id: '81' },
        { name: 'dr. Amelia', id: '82' },
        { name: 'dr. Nurdiana', id: '83' },
        { name: 'dr. Ibnu', id: '84' },
        { name: 'dr. Anton', id: '85' },
        { name: 'dr. Ery', id: '86' },
        { name: 'dr. Onika', id: '87' },
        { name: 'dr. Risky', id: '88' },
        { name: 'dr. Philia', id: '105' },
        { name: 'dr. Esna', id: '107' },
        { name: 'dr. Britania', id: '108' },
        { name: 'dr. Thallyta', id: '110' },
        { name: 'drg. Anita, Sp.Pros', id: '34' },
        { name: 'drg. Retno, Sp.Ort', id: '35' },
        { name: 'drg. Hikmah', id: '90' },
        { name: 'drg. Qumara', id: '106' },
    ],
    roomDatabase: [
        { name: 'Poli Anak', id: '101010107' },
        { name: 'Poli Syaraf', id: '101010111' },
        { name: 'Poli Jantung', id: '101010114' },
        { name: 'Poli Kebidanan dan Kandungan', id: '101010116' },
        { name: 'Poli Anastesi', id: '101010125' },
        { name: 'RD Bedah Umum', id: '101020101' },
        { name: 'RD Non Bedah', id: '101020201' },
        { name: 'RD Kandungan', id: '101020301' },
        { name: 'RD Psikiatri', id: '101020401' },
        { name: 'RD Anak', id: '101020501' },
        { name: 'RD Bedah Orthopedi', id: '101020601' },
        { name: 'RD Bedah Saraf', id: '101020701' },
        { name: 'Bangsal Amarilis', id: '101030101' },
        { name: 'Bangsal Aster 1', id: '101030102' },
        { name: 'Bangsal Aster 2', id: '101030103' },
        { name: 'Bangsal Teratai', id: '101030104' },
        { name: 'Bangsal Bougenvile', id: '101030105' },
        { name: 'Bangsal Anyelir 1', id: '101030106' },
        { name: 'Bangsal Anggrek 1', id: '101030107' },
        { name: 'Bangsal Anggrek 2', id: '101030108' },
        { name: 'Bangsal Anggrek 3', id: '101030109' },
        { name: 'Bangsal Melati', id: '101030110' },
        { name: 'Bangsal Asoka', id: '101030111' },
        { name: 'Bangsal Cempaka', id: '101030112' },
        { name: 'Bangsal Dahlia', id: '101030113' },
        { name: 'Bangsal Mawar', id: '101030114' },
        { name: 'Bangsal Anyelir 2 (Unit stroke)', id: '101030115' },
        { name: 'Ruang Medik Operatif (IBS)', id: '101080201' },
        { name: 'Instalasi ICU', id: '101150101' },
    ],
    templates: [
        {
            id: 'igd',
            name: 'IGD',
            docs: [],
            rooms: [],
            wardType: 'er',
        },
        {
            id: 'anak',
            name: 'Anak',
            docs: ['28', '25', '32'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'anak-bangsal',
            name: 'Anak + Bangsal Anak',
            docs: ['28', '25', '32'],
            rooms: [';', '101030109', '101030111', '101030112', '101030110', '101020501', '101020301'],
            wardType: '',
        },
        {
            id: 'bedah',
            name: 'Bedah Umum',
            docs: ['37', '71'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'uro',
            name: 'Uro',
            docs: ['36'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'ortho',
            name: 'Ortho',
            docs: ['24', '10'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'obgyn',
            name: 'Obgyn',
            docs: ['11', '27', '57', '62'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'interna',
            name: 'Interna',
            docs: ['12', '30', '63'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'jantung',
            name: 'Jantung',
            docs: ['89', '103'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'paru',
            name: 'Paru',
            docs: ['19', '67'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'saraf',
            name: 'Saraf',
            docs: ['14', '15', '109'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'jiwa',
            name: 'Jiwa',
            docs: ['29', '59'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'tht',
            name: 'THT',
            docs: ['16', '17'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'mata',
            name: 'Mata',
            docs: ['80'],
            rooms: [],
            wardType: '',
        },
        {
            id: 'kulit',
            name: 'Kulit',
            docs: ['101'],
            rooms: [],
            wardType: '',
        },
    ],
    wardOptions: [
        { value: '', text: 'All Wards' },
        { value: 'er', text: 'ER' },
        { value: 'in', text: 'Inpatient' },
        { value: 'out', text: 'Outpatient' },
        { value: 'erin', text: 'ER & Inpatient' },
        { value: 'erout', text: 'ER & Outpatient' },
        { value: 'inout', text: 'Inpatient & Outpatient' },
    ],
}

export const ApiSoediranDriver = {
    NAME: 'RSUD Soediran',
    SYSTEM_NAME: 'Soediran',
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
                console.warn('Decryption failed:', decryptError)
                throw new Error('Security Error: Could not decrypt the received data.')
            }
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
    async handleFetch(hid, targetDomain, payload, docGroups, roomGroups, session, onProgress) {
        const results = []
        const queryList = this.buildFinalQueryList(docGroups, roomGroups, payload.wardType)
        const payloadManager = new SoediranRequestPayload(payload, this.SYSTEM_NAME)
        for (let i = 0; i < queryList.length; i++) {
            const q = queryList[i]
            const detailPath = '/pendaftaran/kunjungan'
            payloadManager.reset()
            payloadManager.update({
                DPJP: q.doc,
                RUANGAN: q.room,
                JENIS_KUNJUNGAN: q.ward,
            })
            const url = Utils.buildUrl(targetDomain, this.PATHS.BASE, detailPath,
                payloadManager.toQueryString(),
            )
            try {
                const result = await this.apiRequest(url, session)
                const data = result.data || []
                const newPatients = data.map(item => this.createPatientFromApiItem(item, hid))
                results.push(...newPatients)
                if (typeof onProgress === 'function') {
                    onProgress({ index: i, status: 'success', data: newPatients })
                }
            } catch (err) {
                console.warn(`Search ${i + 1} failed:`, err.message)
                if (typeof onProgress === 'function') {
                    if (err.message === 'Kunjungan tidak ditemukan') {
                        onProgress({ index: i, status: 'success', data: [] })
                    }
                    else {
                        onProgress({ index: i, status: 'error', error: err.message })
                    }
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
            case 'er':
                return ['2']
            case 'in':
                return ['3']
            case 'out':
                return ['1']
            case 'erin':
                return ['2', '3']
            case 'erout':
                return ['2', '1']
            case 'inout':
                return ['3', '1']
            case '':
            default:
                return [null]
        }
    },
    createPatientFromApiItem(item, hid) {
        const a = item?.REFERENSI
        const b = a?.PENDAFTARAN
        const c = b?.REFERENSI?.PASIEN
        const d = b?.DIAGNOSAMASUK?.REFERENSI?.DIAGNOSA
        const g = c?.JENIS_KELAMIN == '2'
            ? Patient.FEMALE
            : c?.JENIS_KELAMIN == '1' ? Patient.MALE : null
        const v = Utils.getValidValue

        return new Patient({
            hid: hid,
            recId: v(item?.NOMOR, null),
            mrn: v(c?.NORM, null),
            name: v(c?.NAMA, null),
            dob: v(c?.TANGGAL_LAHIR, null),
            gender: v(g, null),
            dx: d ? `${v(d.CODE, '??')} - ${v(d.STR, '??')}` : null,
            roomId: v(item?.RUANGAN, null),
            bedName: v(a?.RUANG_KAMAR_TIDUR?.TEMPAT_TIDUR, null),
            docId: v(a?.DPJP?.ID, null),
            admDate: v(item?.MASUK, null),
            disDate: v(item?.KELUAR, null),
        })
    },
}

class SoediranRequestPayload {
    #initialState = {}
    constructor(p, systemName) {
        const s = p[systemName]
        const v = Utils.getValidValue
        this.raw = {
            _dc: Date.now(),
            STATUS: v(s?.status, '1'),
            REFERENSI: JSON.stringify({ "Ruangan": { "COLUMNS": ["DESKRIPSI", "JENIS_KUNJUNGAN"], "REFERENSI": { "Referensi": true } }, "Pendaftaran": true, "Referensi": true, "RuangKamarTidur": true, "DPJP": true, "Mutasi": true }),
            RUANGAN: null,
            JENIS_KUNJUNGAN: null,
            DPJP: null,
            NORM: v(p.mrn, null),
            NAMA: v(p.name, null),
            sort: JSON.stringify([{ "property": "MASUK", "direction": "ASC" }]),
            MASUK: p.dateFilterEnabled && p.dateRange?.start ? p.dateRange.start.split('T')[0] : null,
            AKHIR: p.dateFilterEnabled && p.dateRange?.end ? p.dateRange.end.split('T')[0] : null,
            page: '1',
            start: '0',
            limit: v(s?.limit, '25'),
        }
        this.#initialState = { ...this.raw }
    }
    update(fields = {}) {
        Object.assign(this.raw, fields)
        return this
    }
    reset() {
        this.raw = { ...this.#initialState, _dc: Date.now() }
        return this
    }
    toQueryString() {
        const cleanEntries = Object.entries(this.raw).filter(
            ([_, val]) => val !== null && val !== undefined && val !== ''
        )
        return new URLSearchParams(Object.fromEntries(cleanEntries)).toString()
    }
}

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

            C.importKey('raw', B, { name: 'AES-CBC', length: 32 }, false, ['decrypt'])
                .then(f => C.decrypt({ name: 'AES-CBC', iv: ivArr }, f, cipherArr))
                .then(g => {
                    const decodedText = A.decode(new Uint8Array(g))
                    const decompressed = LZString.decompressFromEncodedURIComponent(decodedText)
                    try { resolve(JSON.parse(decompressed)) } catch (e) { resolve(decompressed) }
                }).catch(e => reject(e))
        } catch (err) { reject(err) }
    })
}
