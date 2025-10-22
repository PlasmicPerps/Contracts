import { expandDecimals } from "../utils/math";
import * as keys from "../utils/keys";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { setAddressIfDifferent, setBytes32IfDifferent, setUintIfDifferent } from "../utils/dataStore";
import { OracleProvider } from "../config/oracle";

const func = async ({ plasmic, deployments, network }: HardhatRuntimeEnvironment) => {
  const oracleConfig = await plasmic.getOracle();
  const tokens = await plasmic.getTokens();
  const { get } = deployments;

  const defaultOracleProvider: OracleProvider = network.name === "hardhat" ? "gmOracle" : "pythDataStream";
  const oracleProviders = {
    gmOracle: (await get("GmOracleProvider")).address,
    pythDataStream: (await get("PythDataStreamProvider")).address,
    storkOracle: (await get("StorkPriceFeedProvider")).address,
    chainlinkOracle: (await get("ChainlinkDataStreamProvider")).address
  };

  if (oracleConfig) {
    for (const tokenSymbol of Object.keys(oracleConfig.tokens)) {
      const token = tokens[tokenSymbol];
      if (!token) {
        throw new Error(`Missing token for ${tokenSymbol}`);
      }
      const { priceFeed, oracleType } = oracleConfig.tokens[tokenSymbol];

      const oracleTypeKey = keys.oracleTypeKey(token.address);
      await setBytes32IfDifferent(oracleTypeKey, oracleType, "oracle type");

      const key = token.oracleProvider || defaultOracleProvider;
      const oracleProvider = oracleProviders[key];
      await setAddressIfDifferent(
        keys.oracleProviderForTokenKey(token.address),
        oracleProvider,
        `oracle provider ${key} for ${tokenSymbol}`
      );

      if (!priceFeed) {
        continue;
      }

      const priceFeedAddress = priceFeed.deploy ? (await get(`${tokenSymbol}PriceFeed`)).address : priceFeed.address;

      const priceFeedKey = keys.priceFeedKey(token.address);
      await setAddressIfDifferent(priceFeedKey, priceFeedAddress, `${tokenSymbol} price feed`);

      const priceFeedMultiplierKey = keys.priceFeedMultiplierKey(token.address);
      const priceFeedMultiplier = expandDecimals(1, 60 - priceFeed.decimals - token.decimals);
      await setUintIfDifferent(priceFeedMultiplierKey, priceFeedMultiplier, `${tokenSymbol} price feed multiplier`);

      if (priceFeed.stablePrice) {
        const stablePriceKey = keys.stablePriceKey(token.address);
        const stablePrice = priceFeed.stablePrice.div(expandDecimals(1, token.decimals));
        await setUintIfDifferent(stablePriceKey, stablePrice, `${tokenSymbol} stable price`);
      }

      await setUintIfDifferent(
        keys.priceFeedHeartbeatDurationKey(token.address),
        priceFeed.heartbeatDuration,
        `${tokenSymbol} heartbeat duration`
      );
    }
  }
};

func.dependencies = [
  "Tokens",
  "PriceFeeds",
  "DataStore",
  "GmOracleProvider",
  "PythDataStreamProvider",
  "StorkPriceFeedProvider",
  "ChainlinkDataStreamProvider"
];
func.tags = ["ConfigureOracleTokens"];

export default func;
