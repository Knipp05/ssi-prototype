export type CredentialOffer = {
    offerId: string;
    sessionId: string;
    schemaType: string;
    issuerId: string;
}

export type PresentationRequest = {
    requestId: string;
    sessionId: string;
    requiredSchemaTypes: string[];
}

export type Student = {
    registrationNumber: number;
    firstName: string;
    lastName: string;
    birthDate: Date;
    birthPlace: string;
    enrollmentDate: Date;
    studyCourse: string;
    studyDegree: "Bachelor" | "Master"    
}

export type EnrollmentCredential = {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    birthPlace: string;
    registrationNumer: number;
    enrollmentDate: string;
    studyCourse: string;
    studyDegree: "Bachelor" | "Master";
    universitySemester: number;
    issuanceDate: string;
    expiryDate: string;
}