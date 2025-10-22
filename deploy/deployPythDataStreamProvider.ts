import { createDeployFunction } from "../utils/deploy";
import { setBoolIfDifferent } from "../utils/dataStore";
import * as keys from "../utils/keys";

const constructorContracts = ["DataStore", "RoleStore"];

const func = createDeployFunction({
  contractName: "PythDataStreamProvider",
  dependencyNames: constructorContracts,
  getDeployArgs: async ({ dependencyContracts, plasmic, network, get }) => {
    const oracleConfig = await plasmic.getOracle();
    let dataStreamFeedVerifierAddress = oracleConfig.dataStreamFeedVerifier;
    if (network.name === "hardhat") {
      const dataStreamFeedVerifier = await get("MockPyth");
      dataStreamFeedVerifierAddress = dataStreamFeedVerifier.address;
    }
    if (!dataStreamFeedVerifierAddress) {
      throw new Error("dataStreamFeedVerifierAddress is not defined");
    }
    return constructorContracts
      .map((dependencyName) => dependencyContracts[dependencyName].address)
      .concat(dataStreamFeedVerifierAddress);
  },
  afterDeploy: async ({ deployedContract, plasmic }) => {
    await setBoolIfDifferent(
      keys.isOracleProviderEnabledKey(deployedContract.address),
      true,
      "isOracleProviderEnabledKey"
    );
    const oracleConfig = await plasmic.getOracle();
    const contract = await ethers.getContractAt("PythDataStreamProvider", deployedContract.address);
    if (oracleConfig.pythFeedSpreadReductionBps) {
      // set the spread reductions
      for (const [feedId, reductionBps] of Object.entries(oracleConfig.pythFeedSpreadReductionBps)) {
        await contract.setSpreadReductionBps(feedId, reductionBps);
      }
    }
  },
  id: "PythDataStreamProvider_3",
});

func.dependencies = func.dependencies.concat(["MockPyth"]);

export default func;
