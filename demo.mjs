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

// Main issuer address (constant)
const mainIssuerKeypair = Keypair.random(); // Generate and store securely

// Function to create and fund accounts
const fundAccount = async (account) => {
    const response = await fetch(`https://friendbot.diamcircle.io/?addr=${account.publicKey()}`);
    if (!response.ok) {
        throw new Error(`Failed to activate account ${account.publicKey()}: ${response.status}`);
    }
    console.log(`Funded account: ${account.publicKey()}`);
};

const userCreateIaAccount = async (user, intermediary, assetName) => {
    try {
        const account = await server.loadAccount(user.publicKey());
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: "Diamante Testnet"
        })
            .addOperation(Operation.createAccount({
                destination: intermediary,
                startingBalance: "4.00001" // since testnet base reserve is 1 DIAM
            }))
            .addOperation(Operation.changeTrust({
                asset: new Asset(assetName, intermediary),
                limit: "0.0000001"
            }))
            
            .setTimeout(100)
            .build();

        transaction.sign(user);
        const result = await server.submitTransaction(transaction);

        console.log('User created a IA and funded:', result.hash);
    } catch (error) {
        console.log(error)
        console.error("Error during user trustline and fee payment:", error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.extras) {
            console.error("Operation result codes:", error.response.data.extras.result_codes.operations);
        }
    }
};


// Function for user to create trustline and pay fee to intermediary account
const userCreateTrustlineAndFeePayment = async (assetName, user, intermediary) => {
    try {
        const account = await server.loadAccount(user.publicKey());
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: "Diamante Testnet"
        })
            .addOperation(Operation.changeTrust({
                asset: new Asset(assetName, intermediary.publicKey()),
                limit: "0.0000001"
            }))
            
            .setTimeout(100)
            .build();

        transaction.sign(user);
        const result = await server.submitTransaction(transaction);

        console.log('User trustline and fee payment transaction result:', result.hash);
    } catch (error) {
        console.error("Error during user trustline and fee payment:", error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.extras) {
            console.error("Operation result codes:", error.response.data.extras.result_codes.operations);
        }
    }
};

// Function to mint KYC asset to user from intermediate issuer
const mintKycAsset = async (assetName, mainIssuer, intermediateIssuer, user, CID) => {
    try {
        // Intermediate issuer mints the asset to the user
        const account = await server.loadAccount(intermediateIssuer.publicKey());
        const metadata = {
            issuerDID: mainIssuer.publicKey(),//just adding issuer address for demo
            issuerDomain: "issuer.example.com",
            userWallet: user.publicKey()
        };
        const metadataString = JSON.stringify(metadata);
        const encodedMetadata = Buffer.from(metadataString).toString('base64').slice(0, 64); // Ensure the metadata length is within 64 bytes

        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: "Diamante Testnet"
        })
            .addOperation(Operation.payment({
                destination: user.publicKey(),
                asset: new Asset(assetName, intermediateIssuer.publicKey()),
                amount: "0.0000001"
            }))
            .addOperation(Operation.manageData({
                name: `cid:${assetName}`,
                value: encodedMetadata
            }))
            .addOperation(Operation.setOptions({
                masterWeight: 0 // Set master weight to 0
            }))
            .setTimeout(100)
            .build();

        transaction.sign(intermediateIssuer);
        const result = await server.submitTransaction(transaction);

        console.log('Intermediate issuer minting KYC asset transaction result:', result.hash);
    } catch (error) {
        console.log(error)
        console.error("Error during asset minting:", error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.extras) {
            console.error("Operation result codes:", error.response.data.extras.result_codes.operations);
        }
    }
};



// Main function to run the entire process
const runProcess = async () => {
    try {
        // Fund the main issuer account
        await fundAccount(mainIssuerKeypair);

        // For each user request
        const user = Keypair.random();

        const intermediateIssuer = Keypair.random();
        await fundAccount(user);
        // await fundAccount(intermediateIssuer);

        const assetName = "KYCASSET1";
        const CID = "samplecid123";

        await userCreateIaAccount(user, intermediateIssuer.publicKey(), assetName)

        // await userCreateTrustlineAndFeePayment(assetName, user, intermediateIssuer); //by extension

        await mintKycAsset(assetName, mainIssuerKeypair, intermediateIssuer, user, CID);// on server end
     

    } catch (error) {
        console.error("Error during process execution:", error);
    }
};

runProcess().catch(console.error);
