"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agent = void 0;
// Core interfaces
const core_1 = require("@veramo/core");
// Core identity manager plugin
const did_manager_1 = require("@veramo/did-manager");
// Ethr did identity provider
const did_provider_ethr_1 = require("@veramo/did-provider-ethr");
// Core key manager plugin
const key_manager_1 = require("@veramo/key-manager");
// Custom key management system for RN
const kms_local_1 = require("@veramo/kms-local");
// W3C Verifiable Credential plugin
const credential_w3c_1 = require("@veramo/credential-w3c");
// Custom resolvers
const did_resolver_1 = require("@veramo/did-resolver");
const did_resolver_2 = require("did-resolver");
const ethr_did_resolver_1 = require("ethr-did-resolver");
// Storage plugin using TypeOrm
const data_store_1 = require("@veramo/data-store");
// TypeORM is installed with `@veramo/data-store`
const typeorm_1 = require("typeorm");
// This will be the name for the local sqlite database for demo purposes
const DATABASE_FILE = 'database.sqlite';
// You will need to get a project ID from infura https://www.infura.io
const INFURA_PROJECT_ID = 'ab68bdc6be4042ae95da0025f1d9a8bc';
// This will be the secret key for the KMS (replace this with your secret key)
const KMS_SECRET_KEY = '43580ae143b86c9f0445cad13537be9876910cf1668624716c1c2b9b698b6945';
const dbConnection = new typeorm_1.DataSource({
    type: 'sqlite',
    database: DATABASE_FILE,
    synchronize: false,
    migrations: data_store_1.migrations,
    migrationsRun: true,
    logging: ['error', 'info', 'warn'],
    entities: data_store_1.Entities,
}).initialize();
exports.agent = (0, core_1.createAgent)({
    plugins: [
        new key_manager_1.KeyManager({
            store: new data_store_1.KeyStore(dbConnection),
            kms: {
                local: new kms_local_1.KeyManagementSystem(new data_store_1.PrivateKeyStore(dbConnection, new kms_local_1.SecretBox(KMS_SECRET_KEY))),
            },
        }),
        new did_manager_1.DIDManager({
            store: new data_store_1.DIDStore(dbConnection),
            defaultProvider: 'did:ethr:sepolia',
            providers: {
                'did:ethr:sepolia': new did_provider_ethr_1.EthrDIDProvider({
                    defaultKms: 'local',
                    network: 'sepolia',
                    rpcUrl: 'https://sepolia.infura.io/v3/' + INFURA_PROJECT_ID,
                }),
            },
        }),
        new did_resolver_1.DIDResolverPlugin({
            resolver: new did_resolver_2.Resolver(Object.assign({}, (0, ethr_did_resolver_1.getResolver)({ infuraProjectId: INFURA_PROJECT_ID }))),
        }),
        new credential_w3c_1.CredentialPlugin(),
    ],
});
