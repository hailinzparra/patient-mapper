import { Utils, Vault } from './utils.js'

export class Patient {
    constructor({ id, name, dob, gender, condition = '' }) {
        this.id = id || Utils.ID()
        this.name = name
        this.dob = dob
        this.gender = gender
        this.condition = condition
        this.createdAt = new Date().toISOString()
    }
    updateDetails(newData) {
        Object.assign(this, newData)
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            dob: this.dob,
            gender: this.gender,
            condition: this.condition,
            createdAt: this.createdAt,
        }
    }
}

export class PatientList {
    constructor({ id, name, patients = [] }) {
        this.id = id || Utils.ID()
        this.name = name
        this.patients = patients.map(p => p instanceof Patient ? p : new Patient(p))
    }
    getPatientCount() {
        return this.patients.length
    }
    addPatient(patientData) {
        const newPatient = patientData instanceof Patient ? patientData : new Patient(patientData)
        this.patients.push(newPatient)
        return newPatient
    }
    removePatient(patientId) {
        this.patients = this.patients.filter(p => p.id !== patientId)
    }
    getPatient(patientId) {
        return this.patients.find(p => p.id === patientId)
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            patientCount: this.getPatientCount(),
            patients: this.patients.map(p => p.toJSON())
        }
    }
    static fromJSON(data) {
        return new PatientList({
            id: data.id,
            name: data.name,
            patients: data.patients || []
        })
    }
    static saveToDevice(patientListInstance) {
        return new Promise((resolve, reject) => {
            if (!(patientListInstance instanceof PatientList)) {
                return reject(new Error('Provided object is not an instance of PatientList'))
            }

            try {
                const exportData = {
                    listData: patientListInstance.toJSON(),
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                }

                const encryptedString = PatientList.#spondylosis(JSON.stringify(exportData))
                const blob = new Blob([encryptedString], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)

                const now = new Date()
                const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-')
                const timeStr = now.toLocaleTimeString('en-GB').replace(/:/g, '-')
                const listName = patientListInstance.name?.replace(/\s+/g, '_').toLowerCase() || 'list'
                const totalPatients = patientListInstance.getPatientCount()

                const link = document.createElement('a')
                link.href = url
                link.download = `${listName}_${totalPatients}_patients_${dateStr}_${timeStr}.txt`

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)

                resolve()
            } catch (error) {
                reject(error)
            }
        })
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
    static async saveToCloud(patientListInstance) {
        if (!(patientListInstance instanceof PatientList)) {
            throw new Error('Provided object is not an instance of PatientList')
        }

        const timestamp = Math.round(Date.now()).toString()
        const exportData = {
            listData: patientListInstance.toJSON(),
            exportDate: new Date().toISOString(),
            version: '1.0',
        }

        const encryptedString = PatientList.#spondylosis(JSON.stringify(exportData))
        const manifestItem = {
            id: Utils.ID(),
            name: patientListInstance.name,
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
        const charCodes = Array.from(wear).map((char, i) =>
            char.charCodeAt(0) ^ back.charCodeAt(i % back.length)
        )
        return btoa(String.fromCharCode(...charCodes))
    }
    static #spondylitis(tear) {
        const back = PatientList.#get_pain()
        const text = atob(tear)
        const charCodes = Array.from(text).map((char, i) =>
            char.charCodeAt(0) ^ back.charCodeAt(i % back.length)
        )
        return String.fromCharCode(...charCodes)
    }
}
