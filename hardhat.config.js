require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-ganache");//to run ganache on hardhat 


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks:
  {
    localhost: {
      url: "http://127.0.0.1:7545",
      // accounts: {
      //   mnemonic: process.env.NETWORK_PROVIDER_GANACHE_MNEMONIC,
      // },
    },
    sepolia:
    {
      url: process.env.NETWORK_PROVIDER_INFURA_SEPOLIA,
      accounts: [process.env.PRIVATE_KEY_METAMASK]
    },

    ganache:
    {
      url: process.env.NETWORK_PROVIDER_GANACHE,
      accounts: [process.env.PRIVATE_KEY_GANACHE_ACCOUNT0]
    }
  }
};
