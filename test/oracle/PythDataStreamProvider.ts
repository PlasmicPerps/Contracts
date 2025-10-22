import { expect } from "chai";

import { expandDecimals } from "../../utils/math";
import { hashString } from "../../utils/hash";
import { deployFixture } from "../../utils/fixture";
import { TOKEN_ORACLE_TYPES, getOracleParams } from "../../utils/oracle";
import * as keys from "../../utils/keys";

describe("PythDataStreamProvider", () => {
  let signers;
  let dataStore, oracle, mockPyth, wbtc;
  let oracleSalt, signerIndexes;
  let pythDataStreamProvider;

  beforeEach(async () => {
    const fixture = await deployFixture();
    ({ signers } = fixture.accounts);

    ({ dataStore, oracle, mockPyth, wbtc } = fixture.contracts);
    ({ oracleSalt, signerIndexes } = fixture.props);
    pythDataStreamProvider = await hre.ethers.getContract("PythDataStreamProvider");
  });

  it("caps spread reduction to 10000 bps", async () => {
    await expect(pythDataStreamProvider.setSpreadReductionBps(hashString("WBTC"), 10001)).to.be.revertedWithCustomError(
      pythDataStreamProvider,
      "InvalidReductionBps"
    );
  });

  it("reduces pyth price spread by half", async () => {
    const block = await ethers.provider.getBlock();

    await dataStore.setBytes32(keys.dataStreamIdKey(wbtc.address), hashString("WBTC"));
    await dataStore.setUint(keys.dataStreamMultiplierKey(wbtc.address), expandDecimals(1, 42));

    const updateData = await mockPyth.createPriceFeedUpdateData(
      hashString("WBTC"),
      expandDecimals(100000, 8),
      expandDecimals(1, 8),
      -8,
      expandDecimals(100000, 8),
      expandDecimals(1, 8),
      block.timestamp,
      block.timestamp
    );

    const params = await getOracleParams({
      oracleSalt,
      minOracleBlockNumbers: [block.number],
      maxOracleBlockNumbers: [block.number],
      oracleTimestamps: [block.timestamp],
      blockHashes: [block.hash],
      signerIndexes,
      tokens: [],
      tokenOracleTypes: [TOKEN_ORACLE_TYPES.DEFAULT],
      precisions: [],
      minPrices: [],
      maxPrices: [],
      signers,
      dataStreamTokens: [wbtc.address],
      dataStreamData: [updateData],
      priceFeedTokens: [],
    });

    const fee = await mockPyth.getUpdateFee([updateData]);

    // Reduce the spread by 50%
    await pythDataStreamProvider.setSpreadReductionBps(hashString("WBTC"), 5000);
    await oracle.setPrices(params, { value: fee });

    expect(await oracle.getTokensWithPrices(0, 10)).eql([wbtc.address]);

    expect((await oracle.primaryPrices(wbtc.address))[0]).eq("99999500000000000");
    expect((await oracle.primaryPrices(wbtc.address))[1]).eq("100000500000000000");
  });

  it("reduces pyth price spread completely", async () => {
    const block = await ethers.provider.getBlock();

    await dataStore.setBytes32(keys.dataStreamIdKey(wbtc.address), hashString("WBTC"));
    await dataStore.setUint(keys.dataStreamMultiplierKey(wbtc.address), expandDecimals(1, 42));

    const updateData = await mockPyth.createPriceFeedUpdateData(
      hashString("WBTC"),
      expandDecimals(100000, 8),
      expandDecimals(1, 8),
      -8,
      expandDecimals(100000, 8),
      expandDecimals(1, 8),
      block.timestamp,
      block.timestamp
    );

    const params = await getOracleParams({
      oracleSalt,
      minOracleBlockNumbers: [block.number],
      maxOracleBlockNumbers: [block.number],
      oracleTimestamps: [block.timestamp],
      blockHashes: [block.hash],
      signerIndexes,
      tokens: [],
      tokenOracleTypes: [TOKEN_ORACLE_TYPES.DEFAULT],
      precisions: [],
      minPrices: [],
      maxPrices: [],
      signers,
      dataStreamTokens: [wbtc.address],
      dataStreamData: [updateData],
      priceFeedTokens: [],
    });

    const fee = await mockPyth.getUpdateFee([updateData]);

    // Reduce the spread by 100%
    await pythDataStreamProvider.setSpreadReductionBps(hashString("WBTC"), 10000);
    await oracle.setPrices(params, { value: fee });

    expect(await oracle.getTokensWithPrices(0, 10)).eql([wbtc.address]);

    expect((await oracle.primaryPrices(wbtc.address))[0]).eq("100000000000000000");
    expect((await oracle.primaryPrices(wbtc.address))[1]).eq("100000000000000000");
  });
});
