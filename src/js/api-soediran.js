import { Utils } from './utils.js'
import { ApiBase, ApiSettings } from './base.js'
import { Patient, ClinicalNote } from './clinical.js'

// ==========================================
// SOEDIRAN DRIVER CLASS
// ==========================================
class ApiSoediranClass extends ApiBase {
    constructor() {
        super({
            HID: 0,
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
            DATABASE: SOEDIRAN_DATABASE,
            SETTINGS: new ApiSettings({
                patients: {
                    canRefresh: true,
                    // canOpenDetails: true,
                },
                notes: {
                    canCreate: true,
                    canRead: true,
                    canUpdate: true,
                    canDelete: true,
                },
            }),
        })
    }
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
    }
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
    }
    async syncUserData(targetDomain, session) {
        const dc = Date.now()
        const authUrl = `${targetDomain}${this.PATHS.BASE}/authentication/isAuthenticate?_dc=${dc}`

        const authResponse = await this.apiRequest(authUrl, session)

        if (!authResponse || !authResponse.data) throw new Error('Not Authenticated')

        const rawUser = authResponse.data

        const getStaffByNIP = async (nip, jns) => {
            const dc = Date.now()
            const url = `${targetDomain}${this.PATHS.BASE}/general/tenagamedis?_dc=${dc}&JENIS=${jns}&NIP=${nip}&page=1&start=0&limit=25`
            try {
                const result = await this.apiRequest(url, session, { method: 'GET' })
                if (result && result.data && result.data.length > 0) {
                    return result.data[0]
                }
                console.warn(`No staff found with NIP: ${nip}`)
                return null
            } catch (err) {
                console.error('Failed to fetch ID from NIP:', err)
            }
        }

        const staff = await getStaffByNIP(rawUser.NIP, rawUser.JNS)

        return {
            username: rawUser.LGN,
            displayName: staff?.NAMA || rawUser.NAME,
            userId: rawUser.ID,
            staffId: staff?.ID || null,
        }
    }
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
    }
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
    }
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
    }
    clinicalNotesContext(targetDomain, session) {
        return new SoediranClinicalNotesContext(this, targetDomain, session)
    }
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

class SoediranClinicalNotesContext {
    constructor(driver, targetDomain, session) {
        this.driver = driver
        this.targetDomain = targetDomain
        this.session = session
        this.basePath = driver.PATHS.BASE
    }
    _url(endpoint) {
        const dc = Date.now()
        const delimiter = endpoint.includes('?') ? '&' : '?'
        return `${this.targetDomain}${this.basePath}${endpoint}${delimiter}_dc=${dc}`
    }
    extractContentByNoteType = (type, raw) => {
        switch (type) {
            case ClinicalNote.TYPES.SBAR:
                return {
                    situation: raw.SUBYEKTIF || '',
                    background: raw.OBYEKTIF || '',
                    assessment: raw.ASSESMENT || '',
                    recommendation: raw.PLANNING || '',
                    instruction: raw.INSTRUKSI || '',
                }
            case ClinicalNote.TYPES.ADIME:
                return {
                    assessment: raw.SUBYEKTIF || '',
                    diagnosis: raw.OBYEKTIF || '',
                    intervention: raw.ASSESMENT || '',
                    monitoring: raw.PLANNING || '',
                    evaluation: '' || '',
                    instruction: raw.INSTRUKSI || '',
                }
            default:
                return {
                    subjective: raw.SUBYEKTIF || '',
                    objective: raw.OBYEKTIF || '',
                    assessment: raw.ASSESMENT || '',
                    planning: raw.PLANNING || '',
                    instruction: raw.INSTRUKSI || '',
                }
        }
    }
    async fetch(mrn, recId, signal) {
        const url = this._url(`/medicalrecord/cppt?KUNJUNGAN=${recId}&STATUS=1&page=1&start=0&limit=25`)

        const result = await this.driver.apiRequest(url, this.session, { signal })
        const rawList = result.data || []

        const creatorTypeMap = {
            '1': ClinicalNote.CREATOR_TYPES.DOCTOR,
            '3': ClinicalNote.CREATOR_TYPES.NURSE,
            '4': ClinicalNote.CREATOR_TYPES.PHARMACIST,
            '5': ClinicalNote.CREATOR_TYPES.MIDWIFE,
            '8': ClinicalNote.CREATOR_TYPES.NUTRITIONIST,
        }

        return rawList.map(raw => {
            const creatorType = creatorTypeMap[raw.JENIS]

            const type = (raw.ADIME !== '0' || creatorType === ClinicalNote.CREATOR_TYPES.NUTRITIONIST)
                ? ClinicalNote.TYPES.ADIME
                : (raw.STATUS_SBAR !== '0'
                    ? ClinicalNote.TYPES.SBAR
                    : ClinicalNote.TYPES.SOAP)

            const staff = raw.REFERENSI?.TENAGA_MEDIS
            const staffName = `${staff?.GELAR_DEPAN ? `${staff.GELAR_DEPAN} ` : ''}${staff?.NAMA}${staff?.GELAR_BELAKANG ? `, ${staff.GELAR_BELAKANG}` : ''}`

            return new ClinicalNote({
                id: String(raw.ID || ''),
                recId: String(raw.KUNJUNGAN || ''),
                roomId: raw.REFERENSI?.KUNJUNGAN?.RUANGAN,
                roomName: raw.REFERENSI?.KUNJUNGAN?.REFERENSI?.RUANGAN?.DESKRIPSI,
                type: type,
                content: this.extractContentByNoteType(type, raw),
                creator: {
                    id: String(raw.TENAGA_MEDIS || ''),
                    name: Utils.formatNameWithTitle(staffName),
                    type: creatorType,
                },
                timestamp: Utils.toLocalISOString(new Date(raw.TANGGAL)),
                verification: raw.VERIFIKASI !== '0' ? {
                    isVerified: raw.REFERENSI?.VERIFIKASI?.STATUS === '1',
                    id: String(raw.VERIFIKASI),
                    verificatorName: (() => {
                        const n = raw.REFERENSI?.VERIFIKASI?.REFERENSI?.PENGGUNA
                        if (!n) return ''
                        const a = n.GELAR_DEPAN ? `${n.GELAR_DEPAN} ` : ''
                        const b = n.NAMA || ''
                        const c = n.GELAR_BELAKANG ? `, ${n.GELAR_BELAKANG}` : ''
                        return `${a}${b}${c}`.trim()
                    })(),
                    timestamp: Utils.toLocalISOString(new Date(raw.REFERENSI?.VERIFIKASI?.TANGGAL)),
                } : null,
            })
        })
    }
    async submit(note) {
        if (!(note instanceof ClinicalNote)) {
            throw new Error('Not a clinical note.')
        }

        const cyclingNum = (Math.floor(Date.now() / 1000) % 100) + 1
        const modelId = `rekammedis.cppt.Model-${cyclingNum}`
        const timestamp = note.timestamp || ''
        const timeValue = timestamp.split(' ')[1] || '00:00:00'

        const payload = {
            'STATUS': 1,
            'JENIS': note.creator.type === ClinicalNote.CREATOR_TYPES.DOCTOR ? 1 : 3,
            'SUBYEKTIF': note.content.subjective,
            'OBYEKTIF': note.content.objective,
            'ASSESMENT': note.content.assessment,
            'PLANNING': note.content.planning,
            'INSTRUKSI': note.content.instruction,
            'KUNJUNGAN': note.recId,
            'TANGGAL': timestamp,
            'WAKTU': timeValue,
            'ID': modelId,
            'TENAGA_MEDIS': parseInt(note.creator.id),
            'TULIS': '',
            'RENCANA_PULANG': 0,
            'STATUS_TBAK_SBAR': 0,
            'STATUS_TBAK': 0,
            'STATUS_SBAR': note.type === ClinicalNote.TYPES.SBAR ? 1 : 0,
            'BACA': 0,
            'KONFIRMASI': 0,
            'TANGGAL_RENCANA_PULANG': null,
            'SUB_DEVISI': 0,
            'DOKTER_TBAK_OR_SBAR': null,
            'OLEH': 0,
            'SELESAI_RAWAT_BERSAMA': '0',
        }

        const url = this._url('/medicalrecord/cppt')
        return await this.driver.apiRequest(url, this.session, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    }
    async amend(note) {
        const payload = {
            'ID': parseInt(note.id),
            'SUBYEKTIF': note.content.subjective,
            'OBYEKTIF': note.content.objective,
            'ASSESMENT': note.content.assessment,
            'PLANNING': note.content.planning,
            'TANGGAL': note.timestamp,
            'DOKTER_TBAK_OR_SBAR': null, // figure out if needed
            'SELESAI_RAWAT_BERSAMA': '0',
        }
        const url = this._url(`/medicalrecord/cppt/${note.id}`)
        return await this.driver.apiRequest(url, this.session, {
            method: 'PUT',
            body: JSON.stringify(payload),
        })
    }
    async archive(id) {
        const url = this._url(`/medicalrecord/cppt/${id}`)
        return await this.driver.apiRequest(url, this.session, {
            method: 'PUT',
            body: JSON.stringify({ 'STATUS': 0, 'ID': parseInt(id) }),
        })
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
        { name: 'Poli Dalam', id: '101010104' },
        { name: 'Poli Anak', id: '101010107' },
        { name: 'Poli Syaraf', id: '101010111' },
        { name: 'Poli Jantung', id: '101010114' },
        { name: 'Poli Kebidanan dan Kandungan', id: '101010116' },
        { name: 'Poli VCT', id: '101010122' },
        { name: 'Poli Anastesi', id: '101010125' },
        { name: 'Poli Dalam (DM)', id: '101010140' },
        { name: 'RD Bedah Umum', id: '101020101' },
        { name: 'RD Non Bedah', id: '101020201' },
        { name: 'RD Kandungan', id: '101020301' },
        { name: 'RD Psikiatri', id: '101020401' },
        { name: 'RD Anak', id: '101020501' },
        { name: 'RD Bedah Orthopedi', id: '101020601' },
        { name: 'RD Bedah Saraf', id: '101020701' },
        { name: 'Amarilis', id: '101030101' },
        { name: 'Aster 1', id: '101030102' },
        { name: 'Aster 2', id: '101030103' },
        { name: 'Teratai', id: '101030104' },
        { name: 'Bougenvile', id: '101030105' },
        { name: 'Anyelir 1', id: '101030106' },
        { name: 'Anggrek 1', id: '101030107' },
        { name: 'Anggrek 2', id: '101030108' },
        { name: 'Anggrek 3', id: '101030109' },
        { name: 'Melati', id: '101030110' },
        { name: 'Asoka', id: '101030111' },
        { name: 'Cempaka', id: '101030112' },
        { name: 'Dahlia', id: '101030113' },
        { name: 'Mawar', id: '101030114' },
        { name: 'Anyelir 2 (Unit stroke)', id: '101030115' },
        { name: 'Ruang Medik Operatif (IBS)', id: '101080201' },
        { name: 'Ruang Radiologi', id: '101130101' },
        { name: 'Instalasi Hemodialisa', id: '101140101' },
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

export const ApiSoediranDriver = new ApiSoediranClass()
