import {
    Keypair,
    BASE_FEE,
    TransactionBuilder,
    Operation,
    Asset,
    Networks,
    Transaction

} from "diamante-base";
import { Horizon } from "diamante-sdk-js";

const server = new Horizon.Server("https://diamtestnet.diamcircle.io/");

// Create issuer accounts
const createAccounts = (accountCount) => {
    const accounts = [];
    for (let i = 0; i < accountCount; i++) {
        const issuerKeypair = Keypair.random();
        accounts.push(issuerKeypair);
    }
    return accounts;
};

// Fund issuer accounts
const fundAccounts = async (accounts) => {
    for (let issuer of accounts) {
        const response = await fetch(`https://friendbot.diamcircle.io/?addr=${issuer.publicKey()}`);
        if (!response.ok) {
            throw new Error(`Failed to activate account ${issuer.publicKey()}: ${response.status}`);
        }
        console.log()
        console.log(`Funded account: ${issuer.publicKey()}`);
        console.log()

    }
};


async function userCreateTrustlineAndFeePayment(assetName, user, issuer) {
    try {
        var account = await server.loadAccount(user.publicKey());
        // Create the transaction to manage the sell offer
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: "Diamante Testnet"
        })
            .addOperation(Operation.changeTrust({
                asset: new Asset(assetName, issuer.publicKey()),
                limit: "0.0000001"

                // Price (e.g., 1 DIAM = 1 ASSET)
            }))
            // .addOperation(Operation.payment({
            //     destination: issuer.publicKey(), // Replace with the recipient's public key
            //     asset: Asset.native(), // Native asset (Lumens)
            //     amount: "0.00002" // Amount of native asset to send
            // }))
            .setTimeout(100)
            .build();

        // const sourceKeypair = Keypair.fromSecret(issuer.seed());

        transaction.sign(user);

        const result = await server.submitTransaction(transaction);

        console.log('Transaction result of user wallet creating trustline and fee payment of fee to issuer:', result.hash);

        // return transaction.toXDR()
    } catch (error) {
        console.error("Error during  execution:", error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.extras) {
            console.error("Operation result codes:", error.response.data.extras.result_codes.operations);
        }
    }
}

async function transferUserKycAsset(assetName, proof, user, issuer) {
    try {

        //ISSUER NEED TO UPDATE THE IPFS CID TO STORE THE KYCASSETS ZKPROFF
        //IPFS.GET()
        //UPDATE the new proof against the asset minted
        //IPFS.PUT()
        //NEW CID produced
        var CID = "SAMPLEcid"

        var account = await server.loadAccount(issuer.publicKey());
        // Create the transaction to manage the sell offer
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: "Diamante Testnet"
        })
            .addOperation(Operation.payment({
                destination: user.publicKey(), // Replace with the recipient's public key
                asset: new Asset(assetName, issuer.publicKey()), // Native asset (Lumens)
                amount: "0.0000001" // Amount of native asset to send
            }))
            // .addOperation(Operation.manageData({
            //     name: "registry", // Replace with the recipient's public key
            //     value: CID, // Native asset (Lumens)
            // }))
            .setTimeout(100)
            .build();

        // const sourceKeypair = Keypair.fromSecret(issuer.seed());

        transaction.sign(issuer);

        const result = await server.submitTransaction(transaction);

        console.log('Transaction hash of issuer distributin the KYC asset to user:', result.hash);

        // return transaction.toXDR()
    } catch (error) {
        console.error("Error during  execution:", error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.extras) {
            console.error("Operation result codes:", error.response.data.extras.result_codes.operations);
        }
    }
}


const runSetup = async () => {
    try {
        const accounts = createAccounts(2);

        console.log("sample public key of user :", accounts[0].publicKey())

        console.log("sample public key of issuer :", accounts[1].publicKey())

        await fundAccounts(accounts)

        let assetName = "KYCASSET1"

        let zkProof = "proof"

        //below transaciton will done by extension
        await userCreateTrustlineAndFeePayment(assetName, accounts[0], accounts[1])

        //below transaction will done by the issuer wallet on the issuer server
        transferUserKycAsset("KYCASSET1", zkProof, accounts[0], accounts[1])


    } catch (error) {
        console.error("Error during setup:", error);
    }
};

runSetup().catch(console.error);
