import { VDR_URL } from "@/app/constants";
import { VC } from "@/app/types";
import { SetStateAction } from "react";

interface CredentialProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credential: VC<Record<string, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setCredentials: React.Dispatch<SetStateAction<VC<Record<string, any>>[]>>;
}
export default function Credential(props: CredentialProps) {
  const credentialSubject = Object.entries(
    props.credential?.credentialSubject
  ).map((entry) => (
    <p className="ml-6" key={entry[0]}>
      <strong>{entry[0]}:</strong> {entry[1]}
    </p>
  ));

  function handleDelete() {
    props.setCredentials((oldCredentials) => {
      const updatedCredentials = oldCredentials.filter(
        (cred) => cred.id !== props.credential.id
      );
      localStorage.setItem(
        "dummyWalletCredentials",
        JSON.stringify(updatedCredentials)
      );
      return updatedCredentials;
    });
  }
  return (
    <li
      key={props.credential?.id}
      className="border p-4 rounded-lg shadow-md bg-gray-50 text-black overflow-hidden break-words"
    >
      {/* Erste Zeile mit ID und Löschen-Button */}
      <div className="flex items-center justify-between">
        <p className="whitespace-normal">
          <strong>ID:</strong> {props.credential?.id}
        </p>
        <button
          onClick={handleDelete}
          className="text-red-500 text-2xl hover:text-red-700 p-2 transition duration-200"
          title="Löschen"
        >
          🗑
        </button>
      </div>

      <p className="whitespace-normal">
        <strong>Credential Schema:</strong>{" "}
        <a
          href={`${VDR_URL}${props.credential?.credentialSchema?.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="break-words">{`${VDR_URL}${props.credential?.credentialSchema?.id}`}</span>
        </a>
      </p>

      <p className="whitespace-normal">
        <strong>Type:</strong>{" "}
        {props.credential?.type?.map((type: string) => (
          <span
            key={type}
            className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm mr-1 break-words"
          >
            {type}
          </span>
        ))}
      </p>

      <p className="whitespace-normal">
        <strong>Issuer:</strong>{" "}
        <a
          href={`${VDR_URL}${props.credential?.issuer}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="break-words">{`${VDR_URL}${props.credential?.issuer}`}</span>
        </a>
      </p>

      {credentialSubject}

      <p className="whitespace-normal">
        <strong>Issuance Date:</strong> {props.credential?.issuanceDate}
      </p>

      <p className="truncate">
        <strong>Proof:</strong>{" "}
        <span className="text-xs text-gray-600 break-words">
          {props.credential?.proof?.jws}
        </span>
      </p>
    </li>
  );
}
