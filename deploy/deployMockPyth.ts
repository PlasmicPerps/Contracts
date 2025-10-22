import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "MockPyth",
  getDeployArgs: async () => [60, 1],
});

func.skip = async ({ network }: HardhatRuntimeEnvironment) => {
  const shouldDeployForNetwork = ["hardhat"];
  return !shouldDeployForNetwork.includes(network.name);
};

export default func;
