export const enrolmentCertificationSchema= {
    title: "Studienbescheinigung",
    type: "object",
    properties: {
        family_name: { type: "string" },
        given_name: { type: "string" },
        birth_date: { type: "string" },
        birth_place: { type: "string" },
        registration_number: {type: "integer" },
        enrolment_date: { type: "string" },
        university_semester: { type: "integer" },
        issuance_date: { type: "string" }, //anpassen!
        expiry_date: { type: "string" }, //anpassen!
    },
    required: []
    
}