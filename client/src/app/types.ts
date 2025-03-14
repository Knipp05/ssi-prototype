export type VC<T> = {
    id: string;
    type: string[];
    issuer: string;
    issuanceDate: string;
    credentialSubject: T;
    credentialSchema: { id: string; }
    proof: { 
        type: string; 
        created: string;
        proofPurpose: string;
        verificationMethod: string;
        jws: string;
    }
}

export type TempVP<T> = {
    type: string;
    verifiableCredential: VC<T>[];
};

export type VP<T> = TempVP<T> & {
    proof: {
        type: string;
        created: string;
        proofPurpose: string;
        verificationMethod: string;
        jws: string;
    };
};

export type CredentialOffer = {
    offerId: string;
    schemaId: string;
    schemaType: string;
    issuerId: string;
    sessionId: string;
  };
