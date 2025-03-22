import { Student } from "./types.js"

export const supportedCredentials: Record<string, any> = {
    "EnrollmentCredential": {
        id: { "type": "string" },
        registration_number: { "type": "integer" },
        first_name: { "type": "string" },
        last_name: { "type": "string" },
        birth_date: { "type": "string" },
        birth_place: { "type": "string" },
        enrollment_date: { "type": "string" },
        study_course: { "type": "string"},
        study_degree : { "type": "string" },
        university_semester: { "type": "integer" },
        issuance_date: { "type": "string" },
        expiry_date: { "type": "string" }, 
    },
    "ExmatriculationCredential": {
        id: { "type": "string" },
        registration_number: { "type": "integer" },
        first_name: { "type": "string" },
        last_name: { "type": "string" },
        birth_date: { "type": "string" },
        birth_place: { "type": "string" },
        enrollment_date: { "type": "string" },
        study_course: { "type": "string"},
        study_degree : { "type": "string" },
        total_semesters: { "type": "integer" },
        exmatriculation_date: { "type": "string" },
        issuance_date: { "type": "string" },
    },
}

export const students: Student[] = [
    {
        registrationNumber: 76497,
        firstName: "Tom",
        lastName: "Schmidt",
        birthDate: new Date(Date.UTC(1999,11,6)),
        birthPlace: "Berlin",
        enrollmentDate: new Date(Date.UTC(2024,9,1)),
        studyCourse: "Informatik",
        studyDegree: "Bachelor"
    },
    {
        registrationNumber: 82317,
        firstName: "Sandra",
        lastName: "Meier",
        birthDate: new Date(Date.UTC(1998,7,14)),
        birthPlace: "Leipzig",
        enrollmentDate: new Date(Date.UTC(2022,9,1)),
        studyCourse: "Medieninformatik",
        studyDegree: "Master"
    },
]

export const studentsLogin = [
    {
        registrationNumber: 76497,
        username: "tschmidt",
        password: "tsch123"
    },
    {
        registrationNumber: 82317,
        username: "smeier",
        password: "smei456"
    }
]
