import { Utils } from './utils.js'
import { ApiBase, ApiSettings } from './base.js'
import { Patient, ClinicalNote } from './clinical.js'

// ==========================================
// SOEHADI DRIVER CLASS
// ==========================================
class ApiSoehadiClass extends ApiBase {
    constructor() {
        super({
            HID: 1,
            NAME: 'RSUD Soehadi',
            SYSTEM_NAME: 'Soehadi',
            DOMAINS: [
                'https://apirssoehadi.sragenkab.go.id',
                'http://172.166.182.12',
            ],
            PATHS: {
                HOME: '/app/',
                BASE: '/service/medifirst2000',
            },
            DATABASE: SOEHADI_DATABASE,
            SETTINGS: new ApiSettings({
                patients: {
                    canRefresh: false,
                },
                notes: {
                    canCreate: false,
                    canRead: true,
                    canUpdate: false,
                    canDelete: false,
                },
            }),
        })
    }
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
    }
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
                staffId: result.pegawai.id,
            },
        }
    }
    async syncUserData(targetDomain, session) {
        if (!session.userData) throw new Error('Not Authenticated')
        return session.userData
    }
    async handleFetch(hid, targetDomain, payload, docGroups, roomGroups, session, onProgress) {
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
            if (q.ward === 'in') {
                const p = payload
                if (!p.dateFilterEnabled || (p.dateFilterEnabled && (!p.dateRange.start || !p.dateRange.end))) {
                    payloadManager.update({
                        tglAwal: null,
                        tglAkhir: null,
                    })
                }
            }
            const url = Utils.buildUrl(targetDomain, this.PATHS.BASE, detailPath,
                payloadManager.toQueryString(),
            )
            try {
                const result = await this.apiRequest(url, session)
                const data = result || []
                const newPatients = data.map(item => this.createPatientFromApiItem(item, hid))
                results.push(...newPatients)
                if (typeof onProgress === 'function') {
                    onProgress({ index: i, status: 'success', data: newPatients })
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
    }
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
    }
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
    }
    createPatientFromApiItem(item, hid) {
        const g = item?.jeniskelamin === 'PEREMPUAN'
            ? Patient.FEMALE
            : item?.jeniskelamin === 'LAKI-LAKI' ? Patient.MALE : null
        const v = Utils.getValidValue
        return new Patient({
            hid: hid,
            recId: v(item?.noregistrasi, null),
            mrn: v(item?.nocm, null),
            name: v(item?.namapasien, null),
            dob: v(item?.tgllahir, null),
            gender: v(g, null),
            dx: v(item?.ketklinis, null),
            roomId: v(item?.objectruanganfk || item?.namaruangan, null),
            bedName: v(item?.namabed, null),
            docId: v(item?.objectpegawaifk || item?.namadokter, null),
            admDate: v(item?.tglregistrasi, null),
            disDate: v(item?.tglselesaiperiksa, null),
        })
    }
    clinicalNotesContext(targetDomain, session) {
        return new SoehadiClinicalNotesContext(this, targetDomain, session)
    }
}

class SoehadiRequestPayload {
    #initialState = {}
    constructor(p, systemName) {
        const s = p[systemName]
        const v = Utils.getValidValue
        this.raw = {
            tglAwal: p.dateFilterEnabled && p.dateRange?.start ? p.dateRange.start.replace('T', ' ') : `${Utils.toLocalISOString(new Date()).split('T')[0]} 00:00:00`,
            tglAkhir: p.dateFilterEnabled && p.dateRange?.end ? p.dateRange.end.replace('T', ' ') : `${Utils.toLocalISOString(new Date()).split('T')[0]} 23:59:59`,
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

class SoehadiClinicalNotesContext {
    constructor(driver, targetDomain, session) {
        this.driver = driver
        this.targetDomain = targetDomain
        this.session = session
        this.basePath = driver.PATHS.BASE
    }
    _url(endpoint) {
        return `${this.targetDomain}${this.basePath}${endpoint}`
    }
    extractContentByNoteType(type, raw) {
        switch (type) {
            case ClinicalNote.TYPES.SBAR:
                return {
                    situation: raw.s_sbar || '',
                    background: raw.b_sbar || '',
                    assessment: raw.a_sbar || '',
                    recommendation: raw.r_sbar || '',
                    instruction: raw.instruksi_ppa || '',
                }
            case ClinicalNote.TYPES.ADIME:
                return {
                    assessment: raw.a_adime || '',
                    diagnosis: raw.d_adime || '',
                    intervention: raw.i_adime || '',
                    monitoring: raw.m_adime || '',
                    evaluation: raw.e_adime || '',
                    instruction: raw.instruksi_ppa || '',
                }
            default:
                return {
                    subjective: raw.s_soap || '',
                    objective: raw.o_soap || '',
                    assessment: raw.a_soap || '',
                    planning: raw.p_soap || '',
                    instruction: raw.instruksi_ppa || '',
                }
        }
    }
    async fetch(mrn, recId, signal) {
        const url = this._url(`/emr/get-riwayatcppt-rajalranap-v2?nocm=${mrn}&noregistrasi=${recId}&pegawaiMultiple=`)
        const result = await this.driver.apiRequest(url, this.session, { signal })
        const rawList = result?.data?.data || []

        const creatorTypeMap = {
            '1': ClinicalNote.CREATOR_TYPES.DOCTOR,
            '2': ClinicalNote.CREATOR_TYPES.NURSE,
            '3': ClinicalNote.CREATOR_TYPES.MIDWIFE,
            '14': ClinicalNote.CREATOR_TYPES.PHARMACIST,
            '19': ClinicalNote.CREATOR_TYPES.NUTRITIONIST,
        }

        return rawList.map(raw => {
            const creatorType = creatorTypeMap[String(raw.profesional_pemberi_asuhan_fk)]

            const type = (raw.jenis_cppt === 'ADIME' || creatorType === ClinicalNote.CREATOR_TYPES.NUTRITIONIST)
                ? ClinicalNote.TYPES.ADIME
                : (raw.jenis_cppt === 'SBAR'
                    ? ClinicalNote.TYPES.SBAR
                    : ClinicalNote.TYPES.SOAP)

            return new ClinicalNote({
                id: String(raw.norec || ''),
                recId: String(raw.noregistrasi || ''),
                roomId: '',
                roomName: raw.namaruangan || '',
                type: type,
                content: this.extractContentByNoteType(type, raw),
                creator: {
                    id: String(raw.paraf_soap_adime_fk || ''),
                    name: Utils.formatNameWithTitle(raw.paraf_soap_adime || ''),
                    type: creatorType,
                },
                timestamp: Utils.toLocalISOString(new Date(raw.tanggal_jam)),
                verification: raw.review_dpjp ? {
                    isVerified: !!raw.review_tanggal,
                    id: String(raw.review_dpjp_fk || ''),
                    verificatorName: Utils.formatNameWithTitle(raw.review_dpjp),
                    timestamp: raw.review_tanggal ? Utils.toLocalISOString(new Date(raw.review_tanggal)) : '',
                } : null,
            })
        })
    }
    async submit(note) {
    }
    async amend(note) {
    }
    async archive(id) {
    }
}

export const SOEHADI_DATABASE = {
    doctorDatabase: [
        { name: 'dr. Agus Dwi Sasongko, Sp.OT', id: '320400003' },
        { name: 'dr. Agus Supriyanta, Sp.PD', id: '320400006' },
        { name: 'dr. Akbar Zulkifli Osman, Sp.KJ', id: '320400009' },
        { name: 'dr. Aminan, Sp.JP', id: '320400015' },
        { name: 'dr. Ana Yuliani, Sp.KJ, M.Kes', id: '320400018' },
        { name: 'dr. Andi Ris Firmansyah, Sp.AN,M.Kes', id: '320400021' },
        { name: 'dr. Arso Pranindyo Utomo, Sp.F.M', id: '320402303' },
        { name: 'dr. Bagus Gilang Samudra, Sp.U', id: '320400030' },
        { name: 'dr. Balqis Kartika Murti', id: '320402334' },
        { name: 'dr. Bayu Anita Indriyani', id: '320400033' },
        { name: 'dr. Chandra Nur Indenta Prima Budi, Sp.M', id: '320402302' },
        { name: 'dr. Derajad Bayu Atmawan, Sp.An', id: '320400039' },
        { name: 'dr. Dian Ika Putri Syafaruddin., Sp.OG', id: '320400042' },
        { name: 'dr. Dwi Budi Wahyono, Sp.KFR', id: '320400048' },
        { name: 'dr. Dwi Purwanti', id: '320400141' },
        { name: 'dr. Edy Purwanto, M.Si.Med., Sp.PK., Subsp.BDKT(K)', id: '320400051' },
        { name: 'dr. Efi Andriawati, Sp.Rad.', id: '320400054' },
        { name: 'dr. Eksy Andhika Wulandari', id: '320400057' },
        { name: 'dr. Fiftin Desy Auliafadina', id: '320400063' },
        { name: 'dr. Fitri Yulianti', id: '320400066' },
        { name: 'dr. Fred Septo Arityawan, Sp.S', id: '320400069' },
        { name: 'drg. Aditya Ayat Santiko, Sp.Prost', id: '320400000' },
        { name: 'drg. Aliffia Sandy', id: '320400012' },
        { name: 'drg. Anna Susanti, Sp.Pros.', id: '320400027' },
        { name: 'dr. Hanifa Agung Kurniawan, Sp.An', id: '320400072' },
        { name: 'dr. Hernita', id: '320400075' },
        { name: 'dr. Imron Riyatno, Sp.P, M.Kes', id: '320400081' },
        { name: 'dr. Indarsih', id: '320401940' },
        { name: 'dr. Indra Agus Setyawan', id: '320400084' },
        { name: 'dr. Indrati Tyas Siwi TR., Sp.An', id: '320400087' },
        { name: 'dr. Istika Wulandari, Sp.A', id: '320401733' },
        { name: 'dr. Joko Daryanto', id: '320400090' },
        { name: 'dr. Joko Haryono, M.Kes', id: '320402182' },
        { name: 'dr. Leni Yusanti, MSC.,Sp.T.H.T.B.K.L', id: '320400093' },
        { name: 'dr. Linda Dini Primasari', id: '320400096' },
        { name: 'dr. Lulus Budiarto, Sp.PD', id: '320400099' },
        { name: 'dr. Meiza Fadhila Azzahra', id: '320402324' },
        { name: 'dr. Miratri Winny Risadini, Sp.DVE', id: '320400102' },
        { name: 'dr. Mugiono, Sp.JP', id: '320400105' },
        { name: 'dr. Niffa Carlisa', id: '320400108' },
        { name: 'dr. Nur Cahyani Setiawati, Sp.S', id: '320400111' },
        { name: 'dr. Nurul Aini, M.Sc.,Sp.PD', id: '320400114' },
        { name: 'dr. Octav Andy Sanjaya, Sp.M', id: '320400117' },
        { name: 'dr. Okkie Mharga Sentana, Sp.OT', id: '320400120' },
        { name: 'dr. Priyambada, Sp.B.,Sp.B(K) Onk', id: '320400126' },
        { name: 'dr. Puji Hastuti, Sp.OG.,M.Kes.', id: '320400129' },
        { name: 'dr. Putri Nilla Shanty, Sp.A', id: '320402300' },
        { name: 'dr. Raden Djoyo Marsiono B., Sp.U', id: '320400045' },
        { name: 'dr. Rahman, Sp.OG', id: '320400132' },
        { name: 'dr. Rahmat Nugroho, Sp. PD., AIFO-K', id: '320402329' },
        { name: 'dr. Rini Kusumo Hastuti, Sp.PK.,M.H.', id: '320400138' },
        { name: 'dr. R. Prasetyo Budi Dewanto, M.Sc.,Sp.Rad', id: '320400123' },
        { name: 'dr. Saqib Nahdi, Sp.B', id: '320400144' },
        { name: 'dr. Sunaryo, Sp.THT', id: '320400147' },
        { name: 'dr. Titie Isnarti, SH.MH', id: '320400150' },
        { name: 'dr. Toddy Guntersah, Sp.PA.M.P.H.', id: '320400153' },
        { name: 'dr. Widya Permatasari, Sp.A.M.Kes', id: '320400156' },
        { name: 'dr. Windu Prasetya, Sp.P.(K)', id: '320400159' },
        { name: 'dr. WP Budi Setiawan Sp.B', id: '320400162' },
        { name: 'dr. Yohan Agusaputra Situmorang, Sp.BS', id: '320402330' },
        { name: 'Idris Y. Min`un, S.Psi', id: '320402290' },
    ],
    roomDatabase: [
        { name: 'Alamanda', id: '933' },
        { name: 'Ambulance', id: '912' },
        { name: 'Anastesi', id: '905' },
        { name: 'Anggrek', id: '756' },
        { name: 'Asoka', id: '925' },
        { name: 'Aster', id: '770' },
        { name: 'Asuhan Keperawatan', id: '598' },
        { name: 'Bag. Kepegawaian', id: '353' },
        { name: 'Bag. Keuangan', id: '140' },
        { name: 'Bank Darah', id: '41' },
        { name: 'Bansos', id: '932' },
        { name: 'Bendahara Penerimaan', id: '492' },
        { name: 'Bendahara Pengeluaran', id: '493' },
        { name: 'Bougenville', id: '760' },
        { name: 'BPJS', id: '599' },
        { name: 'Cempaka', id: '757' },
        { name: 'CSSD', id: '66' },
        { name: 'Depo Farmasi IBS', id: '800' },
        { name: 'Depo Farmasi IGD', id: '125' },
        { name: 'Depo Farmasi Rajal', id: '94' },
        { name: 'Depo Farmasi Ranap', id: '116' },
        { name: 'Depo Farmasi Sitostatika', id: '802' },
        { name: 'Depo Farmasi VIP', id: '801' },
        { name: 'Diklat', id: '920' },
        { name: 'Direktur', id: '922' },
        { name: 'Entry Data', id: '924' },
        { name: 'E-Reservasi', id: '805' },
        { name: 'GD Farmasi', id: '59' },
        { name: 'GD Sentral', id: '50' },
        { name: 'Gudang Gizi', id: '211' },
        { name: 'Hemodialisa', id: '783' },
        { name: 'ICCU', id: '755' },
        { name: 'ICU', id: '754' },
        { name: 'IGD', id: '29' },
        { name: 'Information Center', id: '741' },
        { name: 'Instalasi Farmasi', id: '927' },
        { name: 'Instalasi Gizi', id: '931' },
        { name: 'Inst. Loundry', id: '123' },
        { name: 'IPSRS', id: '249' },
        { name: 'IT', id: '917' },
        { name: 'Jamkesda', id: '600' },
        { name: 'Jasa Ketatausahaan', id: '604' },
        { name: 'Klinik Anak', id: '780' },
        { name: 'Klinik Bedah', id: '777' },
        { name: 'Klinik Bedah Syaraf', id: '936' },
        { name: 'Klinik CPMI', id: '938' },
        { name: 'Klinik Estetika', id: '903' },
        { name: 'Klinik Gigi', id: '784' },
        { name: 'Klinik Gigi Prosthodonti', id: '778' },
        { name: 'Klinik Gizi', id: '781' },
        { name: 'Klinik Jantung', id: '785' },
        { name: 'Klinik Jiwa', id: '786' },
        { name: 'Klinik Kandungan', id: '787' },
        { name: 'Klinik Kemo Therapy', id: '782' },
        { name: 'Klinik Kulit & Kelamin', id: '788' },
        { name: 'Klinik Laktasi', id: '573' },
        { name: 'Klinik Mata', id: '789' },
        { name: 'Klinik Nyeri', id: '904' },
        { name: 'Klinik Onkologi', id: '790' },
        { name: 'Klinik Ortopedi', id: '791' },
        { name: 'Klinik Paru', id: '792' },
        { name: 'Klinik Penyakit Dalam', id: '776' },
        { name: 'Klinik Penyakit Dalam (Sore)', id: '935' },
        { name: 'Klinik Psikologi Klinis', id: '926' },
        { name: 'Klinik Stroke', id: '793' },
        { name: 'Klinik Syaraf', id: '794' },
        { name: 'Klinik TB DOTS', id: '796' },
        { name: 'Klinik TB MDR', id: '795' },
        { name: 'Klinik THT', id: '779' },
        { name: 'Klinik Tumbuh Kembang Anak', id: '937' },
        { name: 'Klinik Umum', id: '774' },
        { name: 'Klinik Urologi', id: '797' },
        { name: 'Klinik Vaksin', id: '919' },
        { name: 'Klinik VCT', id: '798' },
        { name: 'Klinik VIP', id: '913' },
        { name: 'Laboratorium Patologi Anatomi', id: '39' },
        { name: 'Laboratorium Patologi Klinik', id: '575' },
        { name: 'Lavender', id: '761' },
        { name: 'Linen', id: '165' },
        { name: 'Mawar', id: '768' },
        { name: 'Melati Barat', id: '758' },
        { name: 'Melati Timur', id: '759' },
        { name: 'Mobile JKN', id: '806' },
        { name: 'Pemeriksaan CPNS', id: '939' },
        { name: 'Pemeriksaan Haji', id: '934' },
        { name: 'PEP', id: '305' },
        { name: 'Perlengkapan', id: '906' },
        { name: 'PKRS', id: '911' },
        { name: 'PONEK', id: '908' },
        { name: 'Radiologi', id: '576' },
        { name: 'Rehabilitasi Medik', id: '799' },
        { name: 'Rekam Medis', id: '914' },
        { name: 'Ruang Bedah Sentral ( OK )', id: '44' },
        { name: 'Ruang Jenazah', id: '907' },
        { name: 'Ruang Sidang B', id: '915' },
        { name: 'Sakura', id: '771' },
        { name: 'Sanitasi', id: '602' },
        { name: 'Sekretariat', id: '928' },
        { name: 'Seroja', id: '916' },
        { name: 'Sewa Ruang', id: '605' },
        { name: 'Sewa Ruang', id: '606' },
        { name: 'SPI', id: '921' },
        { name: 'Teratai', id: '769' },
        { name: 'TPPRI', id: '909' },
        { name: 'TPPRJ', id: '910' },
        { name: 'Tulip', id: '753' },
        { name: 'TU (Tata Usaha)', id: '304' },
        { name: 'Umum dan Rumah Tangga', id: '929' },
        { name: 'Wakil Direktur Pelayanan dan Mutu', id: '930' },
        { name: 'Wakil Direktur Umum', id: '923' },
        { name: 'Wijaya Kusuma Lt. 4', id: '767' },
    ],
    templates: [
        {
            id: 'igd',
            name: 'IGD',
            docs: [],
            rooms: ['29'],
            wardType: 'out',
        },
        {
            id: 'anak',
            name: 'Anak',
            docs: ['320401733', '320402300', '320400156'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'bedah',
            name: 'Bedah Umum',
            docs: ['320400126', '320400144', '320400162'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'uro',
            name: 'Uro',
            docs: ['320400030', '320400045'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'ortho',
            name: 'Ortho',
            docs: ['320400033', '320400120'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'obgyn',
            name: 'Obgyn',
            docs: ['320400042', '320400129', '320400132'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'interna',
            name: 'Interna',
            docs: ['320400006', '320400099', '320400114', '320402329'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'jantung',
            name: 'Jantung',
            docs: ['320400015', '320400105'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'paru',
            name: 'Paru',
            docs: ['320400081', '320400159'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'saraf',
            name: 'Saraf',
            docs: ['320400069', '320400111'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'jiwa',
            name: 'Jiwa',
            docs: ['320400009', '320400018', '320402290'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'tht',
            name: 'THT',
            docs: ['320400093', '320400147'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'mata',
            name: 'Mata',
            docs: ['320402302', '320400117'],
            rooms: [],
            wardType: 'in',
        },
        {
            id: 'kulit',
            name: 'Kulit',
            docs: ['320400102'],
            rooms: [],
            wardType: 'in',
        },
    ],
    wardOptions: [
        // { value: '', text: 'All Wards' },
        { value: 'in', text: 'Inpatient' },
        { value: 'out', text: 'Outpatient' },
    ],
}

export const ApiSoehadiDriver = new ApiSoehadiClass()
