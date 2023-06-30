const hre = require("hardhat");

async function main() 
{
  const Lottery=await hre.ethers.getContractFactory("lottery");
  const lottery= await Lottery.deploy();
  await lottery.deployed();
  console.log("lottery contract is deployed to Ganache:",lottery.address);
  //contract deployed to sepolia network id is 0x5a225F614984aC34e435fBCdc638f9430F633342
}


main().catch((error) => 
{
  console.error(error);
  process.exitCode = 1;
});
