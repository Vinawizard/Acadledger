require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        amoy: {
            url: "https://rpc-amoy.polygon.technology/",
            chainId: 80002,
            accounts: [PRIVATE_KEY],
        },
    },
};
