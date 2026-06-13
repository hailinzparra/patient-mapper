// @ts-check
import { ClinicalNote } from './clinical.js'

// ==========================================
// BASE CLASS
// ==========================================
/**
 * @typedef {Object} DatabaseItem
 * @property {string} name - The display name of the doctor or room.
 * @property {string} id - The unique identifier string.
 */

/**
 * @typedef {Object} TemplateItem
 * @property {string} id - Unique identifier for the template.
 * @property {string} name - Display name of the template.
 * @property {string[]} docs - Array of doctor IDs mapped to this template.
 * @property {string[]} rooms - Array of room IDs mapped to this template.
 * @property {string} wardType - The targeted ward code (e.g., 'er', 'in', 'out', or '').
 */

/**
 * @typedef {Object} WardOptionItem
 * @property {string} value - The form or query parameter value representing the ward.
 * @property {string} text - The human-readable label for the ward selection.
 */

/**
 * @typedef {Object} HospitalDatabase
 * @property {DatabaseItem[]} doctorDatabase - Complete directory of local doctors.
 * @property {DatabaseItem[]} roomDatabase - Complete directory of available clinics/rooms.
 * @property {TemplateItem[]} templates - Pre-configured query filtering presets.
 * @property {WardOptionItem[]} wardOptions - Selectable ward options configured for the UI.
 */

/**
 * @typedef {Object} ApiConfig
 * @property {number} HID - The unique hospital identifier ID.
 * @property {string} NAME - The full display name of the hospital.
 * @property {string} SYSTEM_NAME - The system shorthand code name.
 * @property {string[]} DOMAINS - Array of allowable API base URLs or IPs.
 * @property {Object} PATHS - Endpoint routing paths.
 * @property {string} PATHS.HOME - The landing path application route.
 * @property {string} PATHS.BASE - The base endpoint path for backend service routing.
 * @property {HospitalDatabase} DATABASE - The static datasets used for mapping and presets.
 * @property {ApiSettings} SETTINGS - Instance handling specialized driver settings.
 */

export class ApiBase {
    /**
     * @param {ApiConfig} config - The driver structural configuration.
     */
    constructor(config) {
        /** @type {number} */
        this.HID = config.HID

        /** @type {string} */
        this.NAME = config.NAME

        /** @type {string} */
        this.SYSTEM_NAME = config.SYSTEM_NAME

        /** @type {string[]} */
        this.DOMAINS = config.DOMAINS

        /** @type {{ HOME: string, BASE: string }} */
        this.PATHS = config.PATHS

        /** @type {HospitalDatabase} */
        this.DATABASE = config.DATABASE

        /** @type {ApiSettings} */
        this.SETTINGS = config.SETTINGS
    }
    /**
     * 
     * @param {string[][]} docGroups 
     * @param {string[][]} roomGroups 
     * @returns {{ doc: any; room: any; }[]}
     */
    buildQueryList(docGroups = [], roomGroups = []) {
        /**
         * @type {{ doc: any; room: any; }[]}
         */
        const queryList = []
        const maxGroups = Math.max(docGroups.length, roomGroups.length)
        for (let i = 0; i < maxGroups; i++) {
            const currentDocGroup = docGroups[i] || [null]
            const currentRoomGroup = roomGroups[i] || [null]
            currentDocGroup.forEach(d => {
                currentRoomGroup.forEach(r => {
                    queryList.push({ doc: d, room: r })
                })
            })
        }
        return queryList
    }
    /**
     * @param {string[][] | undefined} docGroups
     * @param {string[][] | undefined} roomGroups
     * @param {any} wardType
     */
    buildFinalQueryList(docGroups, roomGroups, wardType) {
        const baseQueryList = this.buildQueryList(docGroups, roomGroups)
        const wardTypeList = this.getWardTypeList(wardType)
        return wardTypeList.flatMap(item =>
            baseQueryList.map(query => ({
                ...query,
                ward: item,
            }))
        )
    }
    // @ts-ignore
    async apiRequest(url, session, options = {}) { throw new Error('Not implemented') }
    // @ts-ignore
    async getSession(targetDomain, api, store) { throw new Error('Not implemented') }
    // @ts-ignore
    async syncUserData(targetDomain, session) { throw new Error('Not implemented') }
    // @ts-ignore
    async handleFetch(hid, targetDomain, payload, docGroups, roomGroups, session, onProgress) { throw new Error('Not implemented') }
    /**
     * @param {string} wardType 
     * @returns {string[] | null[]}
     */
    getWardTypeList(wardType) { throw new Error('Not implemented') }
    // @ts-ignore
    createPatientFromApiItem(item, hid) { throw new Error('Not implemented') }
    /**
     * Factory method to generate a hospital-specific Clinical Notes operations context handler.
     * @param {string} targetDomain - Active base target URL/domain string.
     * @param {Object} session - Active user extension authentication context.
     * @returns {BaseClinicalNotesContext} An active instance derived from the Base Clinical Notes Context class.
     * @throws {Error} If the subclass does not implement this method.
     */
    clinicalNotesContext(targetDomain, session) {
        throw new Error(`Method 'clinicalNotesContext()' must be implemented by subclass.`);
    }
}

/**
 * @typedef {Object} ApiSettingsOverrides
 * @property {Object} [patients] - Optional configuration overrides for patient settings.
 * @property {boolean} [patients.canRefresh] - Allow refreshing patient list.
 * @property {boolean} [patients.canOpenDetails] - Allow open patient's details.
 * @property {Object} [notes] - Optional configuration overrides for clinical notes permissions.
 * @property {boolean} [notes.canCreate] - Permission to create notes.
 * @property {boolean} [notes.canRead] - Permission to view notes.
 * @property {boolean} [notes.canUpdate] - Permission to edit notes.
 * @property {boolean} [notes.canDelete] - Permission to remove notes.
 */

export class ApiSettings {
    /**
     * @param {ApiSettingsOverrides} [overrides={}] - Configuration flags to default toggle settings features.
     */
    constructor(overrides = {}) {
        /** * @type {{ canRefresh: boolean, canOpenDetails: boolean }} 
         */
        this.patients = {
            canRefresh: overrides.patients?.canRefresh ?? false,
            canOpenDetails: overrides.patients?.canOpenDetails ?? false,
        }

        /** * @type {{ canCreate: boolean, canRead: boolean, canUpdate: boolean, canDelete: boolean }} 
         */
        this.notes = {
            canCreate: overrides.notes?.canCreate ?? false,
            canRead: overrides.notes?.canRead ?? false,
            canUpdate: overrides.notes?.canUpdate ?? false,
            canDelete: overrides.notes?.canDelete ?? false,
        }
    }
}

/**
 * @typedef {Object} ClinicalNotesDriver
 * @property {Object} PATHS
 * @property {string} PATHS.BASE
 * @property {function(string, Object, Object=): Promise<any>} apiRequest
 */

export class BaseClinicalNotesContext {
    /**
     * @param {ClinicalNotesDriver} driver - The parent hospital API driver.
     * @param {string} targetDomain - Active base target url/domain string.
     * @param {Object} session - Active user extension authentication context.
     */
    constructor(driver, targetDomain, session) {
        if (this.constructor === BaseClinicalNotesContext) {
            throw new Error('BaseClinicalNotesContext cannot be instantiated directly.')
        }

        this.driver = driver
        this.targetDomain = targetDomain
        this.session = session
        this.basePath = driver.PATHS.BASE
    }

    /**
     * Utility to cleanly construct standard endpoint URLs
     * @param {string} endpoint - The internal service path routing.
     * @param {boolean} [appendCacheBuster=false] - True if target system requires an explicit timestamp parameter.
     * @protected
     */
    _url(endpoint, appendCacheBuster = false) {
        let base = `${this.targetDomain}${this.basePath}${endpoint}`
        if (appendCacheBuster) {
            const dc = Date.now()
            const delimiter = endpoint.includes('?') ? '&' : '?'
            base += `${delimiter}_dc=${dc}`
        }
        return base
    }

    /**
     * @param {string} type - ClinicalNote type flag.
     * @param {Object} raw - Raw unformatted API row dataset object.
     * @returns {Object} Normalized unified note structural content payload object.
     */
    extractContentByNoteType(type, raw) {
        throw new Error(`Method 'extractContentByNoteType()' must be implemented by subclass.`)
    }

    /**
     * @param {string} mrn - Medical Record Number string.
     * @param {string} recId - System registration encounter record transaction reference ID.
     * @param {AbortSignal} [signal] - Optional browser networking cancel AbortSignal token wrapper wrapper.
     * @returns {Promise<ClinicalNote[]>}
     */
    async fetch(mrn, recId, signal) {
        throw new Error(`Method 'fetch()' must be implemented by subclass.`)
    }

    /**
     * @param {ClinicalNote} note 
     * @returns {Promise<ClinicalNote>}
     */
    async submit(note) {
        throw new Error(`Method 'submit()' must be implemented by subclass.`)
    }

    /**
     * @param {ClinicalNote} note
     * @returns {Promise<any>}
     */
    async amend(note) {
        throw new Error(`Method 'amend()' must be implemented by subclass.`)
    }

    /**
     * @param {string | number} id 
     * @returns {Promise<any>}
     */
    async archive(id) {
        throw new Error(`Method 'archive()' must be implemented by subclass.`)
    }
}
