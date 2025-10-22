import hre from "hardhat";
import { getDepositCount, getDepositKeys } from "../utils/deposit";
import { toLoggableObject } from "../utils/print";

async function main() {
  const dataStore = await hre.ethers.getContract("DataStore");
  const reader = await hre.ethers.getContract("Reader");
  const depositHandler = await hre.ethers.getContract("DepositHandler");

  const depositCount = await getDepositCount(dataStore);
  const depositKeys = await getDepositKeys(dataStore, 0, depositCount);
  console.log(`${depositKeys.length} deposits`);
  for (const key of depositKeys) {
    const deposit = await reader.getDeposit(dataStore.address, key);
    console.log("key: %s", key);
    console.log(toLoggableObject(deposit));

    try {

      const tx = await depositHandler.cancelDeposit(key);
      await tx.wait();
      console.log("deposit cancelled, tx: %s", key);
    }catch(err)
    {
      continue
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
