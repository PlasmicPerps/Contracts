import hre from "hardhat";
import { Reader } from "../typechain-types";
import { toLoggableObject } from "../utils/print";

async function main() {
  const orderHandler = await hre.ethers.getContract("OrderHandler");

  const key = process.env.ORDER_KEY;

  const tx = await orderHandler.cancelOrder(key);
  await tx.wait();

  console.log("order cancelled, tx: %s", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
