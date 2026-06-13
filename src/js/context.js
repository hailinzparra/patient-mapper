import { VaultDriver } from './utils.js'
import { SOEDIRAN_DATABASE, ApiSoediranDriver } from './api-soediran.js'
import { SOEHADI_DATABASE, ApiSoehadiDriver } from './api-soehadi.js'

export const HOSPITAL_REGISTRY = {
    [ApiSoediranDriver.SYSTEM_NAME]: {
        id: ApiSoediranDriver.HID,
        name: ApiSoediranDriver.NAME,
        driver: ApiSoediranDriver,
        database: SOEDIRAN_DATABASE,
        wardOptions: SOEDIRAN_DATABASE.wardOptions,
    },
    [ApiSoehadiDriver.SYSTEM_NAME]: {
        id: ApiSoehadiDriver.HID,
        name: ApiSoehadiDriver.NAME,
        driver: ApiSoehadiDriver,
        database: SOEHADI_DATABASE,
        wardOptions: SOEHADI_DATABASE.wardOptions,
    },
}

class HospitalContextManager {
    constructor() {
        this.activeConfig = null
        this.activeDriver = null
        this.activeDomain = null
        this.session = new VaultDriver('session')

        this.roomLookup = new Map()
        this.docLookup = new Map()

        this.initLookups()
        this.changeHospital(ApiSoediranDriver.SYSTEM_NAME)
    }
    initLookups() {
        this.roomLookup.clear()
        this.docLookup.clear()

        for (const [key, h] of Object.entries(HOSPITAL_REGISTRY)) {
            if (h.database?.roomDatabase) {
                Object.values(h.database.roomDatabase).forEach(room => {
                    this.roomLookup.set(`${h.id}_${room.id}`, { hid: h.id, room })
                })
            }
            if (h.database?.doctorDatabase) {
                Object.values(h.database.doctorDatabase).forEach(doc => {
                    this.docLookup.set(`${h.id}_${doc.id}`, { hid: h.id, doc })
                })
            }
        }
    }
    changeHospital(systemName, targetDomain = null) {
        const config = HOSPITAL_REGISTRY[systemName]
        if (!config) throw new Error(`Hospital system '${systemName}' is unsupported.`)

        this.activeConfig = config
        this.activeDriver = config.driver
        this.activeDomain = targetDomain || config.driver.DOMAINS[0]
    }
    get activeDatabase() {
        return this.activeConfig ? this.activeConfig.database : null
    }
    getHospitalById(id) {
        return Object.values(HOSPITAL_REGISTRY).find(h => String(h.id) === String(id)) || null
    }
    getRoomByUniqueKey(hospitalId, roomId) {
        return this.roomLookup.get(`${hospitalId}_${roomId}`) || null
    }
    getDoctorByUniqueKey(hospitalId, doctorId) {
        return this.docLookup.get(`${hospitalId}_${doctorId}`) || null
    }
    getRoomName(hospitalId, roomId) {
        if (!roomId) return 'No Room Assigned'
        const key = `${hospitalId}_${roomId}`
        const record = this.roomLookup.get(key)
        return record ? record.room.name : `(Room N/A) ${roomId}`
    }
    getDoctorName(hospitalId, doctorId) {
        if (!doctorId) return 'No Doctor Assigned'
        const key = `${hospitalId}_${doctorId}`
        const record = this.docLookup.get(key)
        return record ? record.doc.name : `(Doctor N/A) ${doctorId}`
    }
}

export const hospitalContext = new HospitalContextManager()
