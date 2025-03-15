export type CredentialOffer = {
    offerId: string;
    sessionId: string;
    schemaId: string;
    schemaType: string;
    issuerId: string;
}

export type PresentationRequest = {
    requestId: string;
    sessionId: string;
    requiredSchemaTypes: string[];
}