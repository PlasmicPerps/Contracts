import { createDeployFunction } from "../utils/deploy";
import { setBoolIfDifferent } from "../utils/dataStore";
import * as keys from "../utils/keys";

const constructorContracts = ["DataStore"];

const func = createDeployFunction({
  contractName: "StorkPriceFeedProvider",
  dependencyNames: constructorContracts,
  getDeployArgs: async ({ dependencyContracts, plasmic, network, get }) => {
    const oracleConfig = await plasmic.getOracle();
    let dataStreamFeedVerifierAddress = oracleConfig.storkPriceFeedVerifier;
    if (network.name === "hardhat") {
      const dataStreamFeedVerifier = await get("MockStork");
      dataStreamFeedVerifierAddress = dataStreamFeedVerifier.address;
    }
    if (!dataStreamFeedVerifierAddress) {
      throw new Error("dataStreamFeedVerifierAddress is not defined");
    }
    return constructorContracts
      .map((dependencyName) => dependencyContracts[dependencyName].address)
      .concat(dataStreamFeedVerifierAddress);
  },
  afterDeploy: async ({ deployedContract }) => {
    await setBoolIfDifferent(
      keys.isOracleProviderEnabledKey(deployedContract.address),
      true,
      "isOracleProviderEnabledKey"
    );
  },
  id: "StorkPriceFeedProvider_2",
});

func.dependencies = func.dependencies.concat(["MockStork"]);

func.tags = ["StorkPriceFeedProvider"];
export default func;
