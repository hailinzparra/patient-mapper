import { Utils, Vault } from './utils.js'

export class Patient {
    static GENDER_MAP = {
        0: { long: 'Female', short: 'F' },
        1: { long: 'Male', short: 'M' },
    }
    static FEMALE = 0
    static MALE = 1
    static STATUS = {
        INACTIVE: 'Inactive', // cancelled or deceased
        ACTIVE: 'Active',
        DISCHARGED: 'Discharged',
    }

    constructor({
        id,
        hid = null,
        recId = null,
        mrn = null,
        name = null,
        dob = null,
        gender = null,
        dx = null,
        roomId = null,
        bedName = null,
        docId = null,
        admDate = null,
        disDate = null,
    } = {}) {
        this.id = id || Utils.ID()
        this.hid = hid
        this.recId = recId
        this.mrn = mrn
        this.name = name
        this.dob = dob
        this.gender = gender
        this.dx = dx
        this.roomId = roomId
        this.bedName = bedName
        this.docId = docId
        this.admDate = admDate
        this.disDate = disDate
        this.lastUpdated = Date.now()
    }
    update(newData) {
        Object.assign(this, newData)
        this.lastUpdated = Date.now()
    }
    toJSON() {
        return {
            id: this.id,
            hid: this.hid,
            recId: this.recId,
            mrn: this.mrn,
            name: this.name,
            dob: this.dob,
            gender: this.gender,
            dx: this.dx,
            roomId: this.roomId,
            bedName: this.bedName,
            docId: this.docId,
            admDate: this.admDate,
            disDate: this.disDate,
            lastUpdated: this.lastUpdated,
        }
    }
    get ageMetrics() {
        if (!this.dob) return null
        try {
            const birthDate = new Date(this.dob)
            const today = new Date()
            if (isNaN(birthDate.getTime())) return null

            let years = today.getFullYear() - birthDate.getFullYear()
            let months = today.getMonth() - birthDate.getMonth()
            let days = today.getDate() - birthDate.getDate()

            if (days < 0) {
                const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
                days += prevMonth.getDate()
                months--
            }
            if (months < 0) {
                months += 12
                years--
            }

            return { y: Math.max(0, years), m: Math.max(0, months), d: Math.max(0, days) }
        } catch (e) {
            return null
        }
    }
    get losMetrics() {
        if (!this.admDate) return null
        try {
            const start = new Date(this.admDate)
            const isDischarged = !!this.disDate
            const end = isDischarged ? new Date(this.disDate) : new Date()

            if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

            const totalMilliseconds = end - start
            if (totalMilliseconds < 0) return { d: 0, h: 0, isDischarged }

            const totalHours = Math.floor(totalMilliseconds / (1000 * 60 * 60))
            const days = Math.floor(totalHours / 24)
            const hours = totalHours % 24

            return { d: days, h: hours, isDischarged }
        } catch (e) {
            return null
        }
    }
    processName(rawName) {
        if (!rawName || typeof rawName !== 'string' || !rawName.trim().length) return null
        return rawName
            .toLowerCase()
            .replace(/(?:^|[\s\-\'])\S/g, (match) => match.toUpperCase())
    }
    getGenderText() {
        const validGenderIdx = Utils.getValidValue(this.gender, null)
        if (validGenderIdx !== null && Patient.GENDER_MAP[validGenderIdx] !== undefined) {
            return Patient.GENDER_MAP[validGenderIdx]
        }
        return { long: 'Tidak Diketahui', short: '?' }
    }
    getDateText(date) {
        return Utils.formatDateVariants(date)
    }
    getUIDisplayData() {
        const v = Utils.getValidValue
        const recId = v(this.recId, '??')
        const mrn = v(this.mrn, '??')
        const bedName = v(this.bedName, '??')
        const cleanName = v(this.name, null)
        const name = cleanName ? this.processName(cleanName) : '??'
        const dx = v(this.dx, '??')
        const gender = this.getGenderText().short
        const admText = this.getDateText(this.admDate)
        const disText = this.getDateText(this.disDate)
        const status = !!this.disDate ? Patient.STATUS.DISCHARGED : Patient.STATUS.ACTIVE
        const lastUp = Utils.formatFullTimestamp(this.lastUpdated)

        let age = '??y'
        const ageObj = this.ageMetrics
        if (ageObj) {
            age = `${ageObj.y}y, ${ageObj.m}m, ${ageObj.d}d`
        }

        let los = { text: '??', isFresh: false }
        const losObj = this.losMetrics
        if (losObj) {
            const text = `${losObj.d}d ${losObj.h}h`
            const hoursTotal = (losObj.d * 24) + losObj.h
            const isFresh = hoursTotal < 24 && !losObj.isDischarged
            los = { text, isFresh }
        }

        return {
            recId,
            mrn,
            bedName,
            name,
            age,
            dx,
            los,
            gender,
            admText,
            disText,
            status,
            lastUp,
        }
    }
    toClipboardString() {
        const ui = this.getUIDisplayData()
        return `${ui.bedName}/${ui.gender}/${ui.name}/${ui.mrn}/${ui.age}/${ui.dx} [${ui.los.text}]`
    }
    static isSimilar(p1, p2) {
        if (!p1 || !p2) return false
        const d1 = p1.toJSON ? p1.toJSON() : p1
        const d2 = p2.toJSON ? p2.toJSON() : p2
        const clean = (val) => String(val ?? '').trim().toLowerCase()
        return (
            clean(d1.hid) === clean(d2.hid) &&
            clean(d1.recId) === clean(d2.recId) &&
            clean(d1.mrn) === clean(d2.mrn) &&
            clean(d1.name) === clean(d2.name) &&
            clean(d1.dob) === clean(d2.dob) &&
            clean(d1.gender) === clean(d2.gender) &&
            clean(d1.roomId) === clean(d2.roomId) &&
            clean(d1.bedName) === clean(d2.bedName) &&
            clean(d1.docId) === clean(d2.docId) &&
            clean(d1.admDate) === clean(d2.admDate) &&
            clean(d1.disDate) === clean(d2.disDate)
        )
    }
}

export class PatientList {
    constructor({ id, name, patients = [], roomOrder = [], patientOrderMap = {} }) {
        this.id = id || Utils.ID()
        this.name = name
        this.patients = patients.map(p => p instanceof Patient ? p : new Patient(p))
        this.roomOrder = roomOrder
        this.patientOrderMap = patientOrderMap
        this.cleanUpMetadata()
    }
    // Call this whenever patients are added, removed, or changed rooms to keep metadata clean
    cleanUpMetadata() {
        const activeRoomIds = new Set()
        const activePatientIds = new Set(this.patients.map(p => p.id))
        // 1. Group active patient IDs by their current roomId
        const currentGroupings = {}
        this.patients.forEach(p => {
            if (!p.roomId) return // Ignore patients with no room assigned
            activeRoomIds.add(p.roomId)
            if (!currentGroupings[p.roomId]) currentGroupings[p.roomId] = []
            currentGroupings[p.roomId].push(p.id)
        })
        // 2. Fix roomOrder: Add new rooms, remove deleted rooms
        this.roomOrder = this.roomOrder.filter(roomId => activeRoomIds.has(roomId))
        activeRoomIds.forEach(roomId => {
            if (!this.roomOrder.includes(roomId)) {
                this.roomOrder.push(roomId) // Append new rooms to the bottom
            }
        })
        // 3. Fix patientOrderMap: Filter out deleted patients, append new patients
        const newOrderMap = {}
        this.roomOrder.forEach(roomId => {
            const existingOrder = this.patientOrderMap[roomId] || []
            const activeRoomPatients = currentGroupings[roomId] || []
            // Keep existing order but filter out anyone who was deleted/moved out
            let updatedOrder = existingOrder.filter(id => activeRoomPatients.includes(id) && activePatientIds.has(id))
            // Find anyone newly added to this room and append them
            const newAdditions = activeRoomPatients.filter(id => !updatedOrder.includes(id))
            newOrderMap[roomId] = [...updatedOrder, ...newAdditions]
        })
        this.patientOrderMap = newOrderMap
    }
    reorderRooms(fromIndex, toIndex) {
        const [movedRoomId] = this.roomOrder.splice(fromIndex, 1)
        this.roomOrder.splice(toIndex, 0, movedRoomId)
        // Trigger save after this
    }
    reorderPatientsInRoom(roomId, fromIndex, toIndex) {
        const order = this.patientOrderMap[roomId]
        if (!order) return
        const [movedPatientId] = order.splice(fromIndex, 1)
        order.splice(toIndex, 0, movedPatientId)
    }
    addPatient(patientData) {
        const newPatient = patientData instanceof Patient ? patientData : new Patient(patientData)
        this.patients.push(newPatient)
        this.cleanUpMetadata()
        return newPatient
    }
    removePatient(patientId) {
        this.patients = this.patients.filter(p => p.id !== patientId)
        this.cleanUpMetadata()
    }
    getPatient(patientId) {
        return this.patients.find(p => p.id === patientId)
    }
    findDuplicate(patientData) {
        if (!Array.isArray(this.patients)) return undefined
        const targetPatient = patientData instanceof Patient ? patientData : new Patient(patientData)
        return this.patients.find(existingPatient =>
            Patient.isSimilar(existingPatient, targetPatient)
        )
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            patients: this.patients.map(p => p.toJSON()),
            roomOrder: this.roomOrder,
            patientOrderMap: this.patientOrderMap,
        }
    }
    static fromJSON(data) {
        return new PatientList({
            id: data.id,
            name: data.name,
            patients: data.patients || [],
            roomOrder: data.roomOrder || [],
            patientOrderMap: data.patientOrderMap || {},
        })
    }
    static getLastUpdatedText(patientList) {
        const patients = patientList?.patients
        if (!patients || patients.length === 0) {
            return 'No records found'
        }
        const timestamps = patients
            .map(p => Number(p.lastUpdated))
            .filter(t => !isNaN(t) && t > 0)
        if (timestamps.length === 0) {
            return 'No recent updates'
        }
        const latestTimestamp = Math.max(...timestamps)
        return Utils.formatFullTimestamp(latestTimestamp)
    }
    static filterDuplicates(patients) {
        if (!Array.isArray(patients)) return []
        const uniquePatients = []
        patients.forEach(currentPatient => {
            const targetPatient = currentPatient instanceof Patient
                ? currentPatient
                : new Patient(currentPatient)
            const isDuplicate = uniquePatients.some(existingPatient =>
                Patient.isSimilar(existingPatient, targetPatient)
            )
            if (!isDuplicate) {
                uniquePatients.push(targetPatient)
            }
        })
        return uniquePatients
    }
    static async saveToDevice(inputData) {
        let listData
        let listName = 'list'
        let totalPatients = 0

        if (inputData instanceof PatientList) {
            listData = inputData.toJSON()
            listName = inputData.name || 'list'
            totalPatients = inputData.patients.length || 0
        } else if (inputData && typeof inputData === 'object') {
            listData = inputData
            listName = inputData.name || 'list'
            totalPatients = inputData.patients.length || (Array.isArray(inputData) ? inputData.length : 0)
        } else {
            throw new Error('Provided data must be an instance of PatientList or a valid JSON object')
        }

        const exportData = {
            listData: listData,
            exportDate: Utils.toLocalISOString(new Date()),
            version: '1.0',
        }

        const encryptedString = PatientList.#spondylosis(JSON.stringify(exportData))
        const blob = new Blob([encryptedString], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)

        const now = new Date()
        const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-')
        const timeStr = now.toLocaleTimeString('en-GB').replace(/:/g, '-')
        const safeListName = listName.replace(/\s+/g, '_').toLowerCase()

        const link = document.createElement('a')
        link.href = url
        link.download = `${safeListName}_${totalPatients}_patients_${dateStr}_${timeStr}.txt`

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
    static loadFromDevice() {
        return new Promise((resolve, reject) => {
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.accept = '.txt'

            fileInput.oncancel = (e) => {
                return reject(new Error('File selection cancelled'))
            }
            fileInput.onchange = (e) => {
                const file = e.target.files[0]
                if (!file) return reject(new Error('File selection cancelled'))

                const reader = new FileReader()
                reader.onload = (event) => {
                    try {
                        const decryptedStr = PatientList.#spondylitis(event.target.result)
                        const importedData = JSON.parse(decryptedStr)

                        if (!importedData.listData) {
                            throw new Error("Invalid backup file format")
                        }

                        const rebuiltList = PatientList.fromJSON(importedData.listData)
                        rebuiltList.id = Utils.ID()
                        resolve(rebuiltList)
                    } catch (err) {
                        reject(err)
                    }
                }
                reader.onerror = (err) => reject(err)
                reader.readAsText(file)
            }

            fileInput.click()
        })
    }
    static async saveToCloud(inputData) {
        let listData
        let listName = 'list'
        let totalPatients = 0

        if (inputData instanceof PatientList) {
            listData = inputData.toJSON()
            listName = inputData.name || 'list'
            totalPatients = inputData.patients.length || 0
        } else if (inputData && typeof inputData === 'object') {
            listData = inputData
            listName = inputData.name || 'list'
            totalPatients = inputData.patients.length || (Array.isArray(inputData) ? inputData.length : 0)
        } else {
            throw new Error('Provided data must be an instance of PatientList or a valid JSON object')
        }

        const timestamp = Math.round(Date.now()).toString()
        const exportData = {
            listData: listData,
            exportDate: Utils.toLocalISOString(new Date()),
            version: '1.0',
        }

        const encryptedString = PatientList.#spondylosis(JSON.stringify(exportData))
        const manifestItem = {
            id: Utils.ID(),
            name: listName,
            count: totalPatients,
        }

        await Vault.upload(`previewlist/${timestamp}`, manifestItem)
        await Vault.upload(`getlist/${manifestItem.id}`, encryptedString)
    }
    static async loadFromCloud(patientListId) {
        const encryptedString = await Vault.download(`getlist/${patientListId}`)
        if (!encryptedString) {
            throw new Error('Cloud file not found or has expired.')
        }

        const decryptedStr = PatientList.#spondylitis(encryptedString)
        const importedData = JSON.parse(decryptedStr)

        if (!importedData.listData) {
            throw new Error('Invalid cloud database structure')
        }

        const rebuiltList = PatientList.fromJSON(importedData.listData)
        rebuiltList.id = Utils.ID()
        return rebuiltList
    }
    static #get_pain() {
        const _K = '2d3e5f6g9h0i1j4k7l2m5n8o1p4q7r0s3t6u9v2w5x8y1z4a7b0c3d6e9f2g5h8i'
        return _K.split('').reverse().map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('').substring(0, 64)
    }
    static #spondylosis(wear) {
        const back = PatientList.#get_pain()
        const encryptedChars = Array.from(wear).map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ back.charCodeAt(i % back.length))
        )
        return btoa(encryptedChars.join(''))
    }
    static #spondylitis(tear) {
        const back = PatientList.#get_pain()
        const text = atob(tear)
        const decryptedChars = Array.from(text).map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ back.charCodeAt(i % back.length))
        )
        return decryptedChars.join('')
    }
}

export class ClinicalNote {
    static TYPES = Object.freeze({
        SOAP: 'SOAP',
        SBAR: 'SBAR',
        ADIME: 'ADIME',
    })

    static CREATOR_TYPES = Object.freeze({
        DOCTOR: 'Doctor',
        PARAMEDIC: 'Paramedic',
        PHARMACIST: 'Pharmacist',
        MIDWIFE: 'Midwife',
        NUTRITIONIST: 'Nutritionist',
        UNKNOWN: 'Unknown',
    })

    constructor(init = {}) {
        this.id = init.id || ''
        this.recId = init.recId || ''
        this.roomId = init.roomId || ''
        this.roomName = init.roomName || 'Unknown Room'
        this.type = init.type || ClinicalNote.TYPES.SOAP

        this.content = {
            // SOAP / SOAPI
            subjective: init.content?.subjective || '',
            objective: init.content?.objective || '',
            assessment: init.content?.assessment || '',
            planning: init.content?.planning || '',
            instruction: init.content?.instruction || '',
            // SBAR
            situation: init.content?.situation || '',
            background: init.content?.background || '',
            recommendation: init.content?.recommendation || '',
            // ADIME
            diagnosis: init.content?.diagnosis || '',
            intervention: init.content?.intervention || '',
            monitoring: init.content?.monitoring || '',
            evaluation: init.content?.evaluation || '',
        }

        this.creator = {
            id: init.creator?.id || '',
            name: init.creator?.name || 'Staff Member',
            type: init.creator?.type || ClinicalNote.CREATOR_TYPES.UNKNOWN,
        }

        this.timestamp = init.timestamp || ''

        this.verification = init.verification ? {
            isVerified: !!init.verification.isVerified,
            id: init.verification.id || '',
            verificatorName: init.verification.verificatorName || '',
            timestamp: init.verification.timestamp || ''
        } : null
    }

    static NOTE_TYPE_CONFIGS = {
        [ClinicalNote.TYPES.SOAP]: [
            { label: 'Subjective (S)', key: 'subjective', valClass: 'val-subjective' },
            { label: 'Objective (O)', key: 'objective', valClass: 'val-objective' },
            { label: 'Assessment (A)', key: 'assessment', valClass: 'val-assessment' },
            { label: 'Planning (P)', key: 'planning', valClass: 'val-planning' },
            { label: 'Instruction (I)', key: 'instruction', valClass: 'val-instruction' },
        ],
        [ClinicalNote.TYPES.SBAR]: [
            { label: 'Situation (S)', key: 'situation', valClass: 'val-situation' },
            { label: 'Background (B)', key: 'background', valClass: 'val-background' },
            { label: 'Assessment (A)', key: 'assessment', valClass: 'val-assessment' },
            { label: 'Recommendation (R)', key: 'recommendation', valClass: 'val-recommendation' },
        ],
        [ClinicalNote.TYPES.ADIME]: [
            { label: 'Assessment (A)', key: 'assessment', valClass: 'val-assessment' },
            { label: 'Diagnosis (D)', key: 'diagnosis', valClass: 'val-diagnosis' },
            { label: 'Intervention (I)', key: 'intervention', valClass: 'val-intervention' },
            { label: 'Monitoring (M)', key: 'monitoring', valClass: 'val-monitoring' },
            { label: 'Evaluation (E)', key: 'evaluation', valClass: 'val-evaluation' },
        ]
    }

    static formatToText(note, fallback = '-') {
        if (!note) return fallback

        const config = ClinicalNote.NOTE_TYPE_CONFIGS[note.type] || ClinicalNote.NOTE_TYPE_CONFIGS[ClinicalNote.TYPES.SOAP]

        const dateVariants = Utils.formatDateVariants(note.timestamp)
        const longDate = dateVariants.long
        let timeStr = ''
        try {
            const dateObj = note.timestamp instanceof Date ? note.timestamp : new Date(note.timestamp)
            if (!isNaN(dateObj.getTime())) {
                timeStr = dateObj.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                })
            }
        } catch {
            timeStr = ''
        }
        const finalTimestampLine = (longDate !== '--' && timeStr) ? `Date: ${longDate} ${timeStr}` : 'Date: --'

        const lines = [
            `[${note.type} Note by ${note.creator.name} (${note.creator.type})]`,
            finalTimestampLine,
        ]

        config.forEach(field => {
            const rawContent = note.content[field.key] || '-'
            let cleanContent = Utils.decodeHtmlEntities(rawContent)
            cleanContent = cleanContent.replace(/<br\s*\/?>/gi, '\n')
            lines.push(`${field.label}:\n${cleanContent}`)
        })

        return lines.join('\n\n')
    }
}
