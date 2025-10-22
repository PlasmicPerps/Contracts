import hre from "hardhat";
import { Reader } from "../typechain-types";
import { toLoggableObject } from "../utils/print";
import { Position } from "../typechain-types/contracts/position/PositionUtils";
import { hashData } from "../utils/hash";

async function main() {
  const dataStoreDeployment = await hre.deployments.get("DataStore");

  const blockTag: number | "latest" = "latest";

  const reader = (await hre.ethers.getContractAt("Reader", "0x25A5cFB62a7461a3EEEC6e076DE522521298511b")) as Reader;

  const traderAddress = process.env.TRADER || "0x2Bff16A21368B688a7f2FdfE96a592568385cBeb";
  console.warn("using default trader address %s", traderAddress);
  const traderPositions = await reader.getAccountPositions(dataStoreDeployment.address, traderAddress, 0, 1, {
    blockTag,
  });

  const position = traderPositions[0];
  const positionKey = hashData(
    ["address", "address", "address", "bool"],
    [position.addresses.account, position.addresses.market, position.addresses.collateralToken, position.flags.isLong]
  );

  console.log("position", toLoggableObject(position));
  console.log("position key", toLoggableObject(positionKey));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => {
    console.log("Done");
    process.exit(0);
  });
