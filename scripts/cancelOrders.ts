import hre from "hardhat";
import { getAccountOrderCount, getAccountOrderKeys } from "../utils/order";
import { toLoggableObject } from "../utils/print";

async function main() {
  const dataStore = await hre.ethers.getContract("DataStore");
  const reader = await hre.ethers.getContract("Reader");
  const orderHandler = await hre.ethers.getContract("OrderHandler");

  const account = "0x5DD5FEc335C700390AC6EB331DE8097C59346858";

  const orderCount = await getAccountOrderCount(dataStore, account);
  const orderKeys = await getAccountOrderKeys(dataStore, account, 0, orderCount);

  console.log(`${orderKeys.length} orders for account ${account}`);

  for (const key of orderKeys) {
    const order = await reader.getOrder(dataStore.address, key);
    console.log("key: %s", key);
    console.log(toLoggableObject(order));

    const tx = await orderHandler.cancelOrder(key);
    await tx.wait();
    console.log("order cancelled, tx: %s", tx.hash);
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
