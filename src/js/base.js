// @ts-check

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
    // @ts-ignore
    clinicalNotesContext(targetDomain, session) { throw new Error('Not implemented') }
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
