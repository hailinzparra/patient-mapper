export class Patient {
    constructor({ id, name, dob, gender, condition = '' }) {
        this.id = id || crypto.randomUUID()
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
        this.id = id || crypto.randomUUID()
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
        return this.patients.find(p => p.id !== patientId)
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
}
