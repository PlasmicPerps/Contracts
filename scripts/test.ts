import hre from "hardhat";
async function main() {
  const reader = await hre.ethers.getContract("Reader");
  const dataStore = await hre.ethers.getContract("DataStore");
  const feeHandler = await hre.ethers.getContract("FeeHandler");

  // Market addresses and their respective long/short tokens
  const markets = [
    "0xe273272dD4016626C2C640Cf85c9cdBB8786286B",
    "0x394ffe92ae4f9a3B3Ba81A6Fd16de423891358C9",
    "0x567779Fd248a6f5596748510200C00655b3a0e01",
    "0x62170Af269E9Acd09a89279C0485e89aA42857A3", // sus
    "0x29c8973cfc64780B9d7fb532A014b3F66DBfD9d1",
    "0x4B1ef8Eb333FAE7CdaEc847475CC47bcDB70bF3f", // sus
    "0x822eeCbF89f2431d50Bb540980Cb98F01a5A4eea",
    "0x3bA5B5bd204D2a3DC42eD520626744acaCbBa215",
    "0xBA06793bb5E3495c54330F5c5400C9AD14443586",
    "0x79302b73acF3ec1c18433ef6E04F814C1Cdc408F",
    "0x9D4d54c8661a17604A46B849DED78Cf20127fB92",
    "0x57ff14bD78d4B9B14E9aEC6e1D5d580d5DCa86ED",
    "0x8EFA54951bF70D9775DFe8F9364df83aD1e1a8cF",
    "0x2B7402FfecBC34eBB2a5E87A8F22677Ba0a3b2F5",
    "0x0b4D1d74890a860a7a3dF7769114bCeA7AA8B713",
    "0x7D00EBe4a0aA10eB99dC661e5A305fb3cdB79E8c",
  ];

  // Long tokens for each market
  const longTokens = [
    "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
  ];

  // Short tokens for each market
  const shortTokens = [
    "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    "0xB21f16d1EA2E8D96CcFafA397cEf855Bf368AA83",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0xB21f16d1EA2E8D96CcFafA397cEf855Bf368AA83",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0xB21f16d1EA2E8D96CcFafA397cEf855Bf368AA83",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0xB21f16d1EA2E8D96CcFafA397cEf855Bf368AA83",
    "0x0469d9d1dE0ee58fA1153ef00836B9BbCb84c0B6",
    "0xB21f16d1EA2E8D96CcFafA397cEf855Bf368AA83",
  ];

  const n = 5;
  console.log("Claiming fees for markets with their long tokens...");
  const txLong = await feeHandler.claimFees([markets[n]], [longTokens[n]]);
  const receiptLong = await txLong.wait();
  console.log("Long tokens claim transaction:", receiptLong.transactionHash);

  console.log("\nClaiming fees for markets with their short tokens...");
  const txShort = await feeHandler.claimFees([markets[n]], [shortTokens[n]]);
  const receiptShort = await txShort.wait();
  console.log("Short tokens claim transaction:", receiptShort.transactionHash);
}
main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
