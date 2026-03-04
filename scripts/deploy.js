const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Starting deployment to Polygon Amoy...");
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance (Wei):", balance.toString());

    // Deploy
    const factory = await ethers.getContractFactory("AttestationRegistry");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("AttestationRegistry (v2 Generic Policies) deployed to:", address);

    // Save configuration for front-end access
    const libPath = path.join(__dirname, '..', 'lib');
    if (!fs.existsSync(libPath)) {
        fs.mkdirSync(libPath);
    }

    const configContent = `export const CONTRACT_ADDRESS = "${address}";\n`;
    fs.writeFileSync(path.join(libPath, 'contract-address.ts'), configContent);
    console.log("Updated lib/contract-address.ts");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
