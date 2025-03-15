import { VDR_URL } from "@/app/constants";
import { VC } from "@/app/types";

interface CredentialProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: VC<Record<string, any>>;
}
export default function Credential(props: CredentialProps) {
  return (
    <li
      key={props.credential.id}
      className="border p-4 rounded-lg shadow-md bg-gray-50"
    >
      <p>
        <strong>ID:</strong> {props.credential.id}
      </p>
      <p>
        <strong>Credential Schema:</strong>{" "}
        {`${VDR_URL}${props.credential.credentialSchema.id}`}
      </p>
      <p>
        <strong>Type:</strong>{" "}
        {props.credential.type.map((type: string) => (
          <span
            key={type}
            className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm mr-1"
          >
            {type}
          </span>
        ))}
      </p>
      <p>
        <strong>Issuer:</strong> {`${VDR_URL}${props.credential.issuer}`}
      </p>
      <p>
        <strong>Issuance Date:</strong> {props.credential.issuanceDate}
      </p>
      <p>
        <strong>Holder ID:</strong> {props.credential.credentialSubject.id}
      </p>
      <p>
        <strong>Name:</strong> {props.credential.credentialSubject.name}
      </p>
      <p>
        <strong>Alter:</strong> {props.credential.credentialSubject.age}
      </p>
      <p>
        <strong>Reg.-Nr.:</strong>{" "}
        {props.credential.credentialSubject.registration_number}
      </p>
      <p className="truncate">
        <strong>Proof:</strong>{" "}
        <span className="text-xs text-gray-600">
          {props.credential.proof.jws}
        </span>
      </p>
    </li>
  );
}
