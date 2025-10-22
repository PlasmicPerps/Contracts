import { expect } from "chai";

import { expandDecimals } from "../../utils/math";
import { hashString } from "../../utils/hash";
import { deployFixture } from "../../utils/fixture";
import { TOKEN_ORACLE_TYPES, getOracleParams, encodeDataStreamData } from "../../utils/oracle";
import { errorsContract } from "../../utils/error";
import * as keys from "../../utils/keys";
import { defaultAbiCoder } from "ethers/lib/utils";

describe("Oracle", () => {
  let signers;
  let dataStore, oracle, mockPyth, wnt, wbtc;
  let oracleSalt, signerIndexes;

  beforeEach(async () => {
    const fixture = await deployFixture();
    ({ signers } = fixture.accounts);

    ({ dataStore, oracle, mockPyth, wnt, wbtc } = fixture.contracts);
    ({ oracleSalt, signerIndexes } = fixture.props);
  });

  it("setPrices", async () => {
    const block = await ethers.provider.getBlock();

    await dataStore.setBytes32(keys.dataStreamIdKey(wbtc.address), hashString("WBTC"));
    await dataStore.setUint(keys.dataStreamMultiplierKey(wbtc.address), expandDecimals(1, 42));

    console.log("HERE");


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
    await oracle.setPrices(params, { value: fee });

    expect(await oracle.getTokensWithPrices(0, 10)).eql([wbtc.address]);

    expect((await oracle.primaryPrices(wbtc.address))[0]).eq("99999000000000000");
    expect((await oracle.primaryPrices(wbtc.address))[1]).eq("100001000000000000");

    expect(await oracle.minTimestamp()).eq(block.timestamp);
    expect(await oracle.maxTimestamp()).eq(block.timestamp);

    await expect(
      oracle.setPrices({
        tokens: [wnt.address],
        providers: [wbtc.address],
        data: ["0x"],
      })
    ).to.be.revertedWithCustomError(errorsContract, "InvalidOracleProvider");
  });

  it("setPrices for quote/base tokens", async () => {
    const block = await ethers.provider.getBlock();

    // assuming wbtc is quote/base token with base as WBTC, quote as USDC
    await dataStore.setBytes32(keys.dataStreamIdKey(wbtc.address), hashString("WBTC"));
    await dataStore.setBytes32(keys.dataStreamBaseIdKey(wbtc.address), hashString("USDC"));

    await dataStore.setUint(keys.dataStreamMultiplierKey(wbtc.address), expandDecimals(1, 42));

    const updateData1 = await mockPyth.createPriceFeedUpdateData(
      hashString("WBTC"),
      expandDecimals(100000, 8),
      expandDecimals(1, 8),
      -8,
      expandDecimals(100000, 8),
      expandDecimals(1, 8),
      block.timestamp,
      block.timestamp
    );

    const updateData2 = await mockPyth.createPriceFeedUpdateData(
      hashString("USDC"),
      expandDecimals(1, 8),
      expandDecimals(1, 7),
      -8,
      expandDecimals(1, 8),
      expandDecimals(1, 7),
      block.timestamp,
      block.timestamp
    );

    const updateData = defaultAbiCoder.encode(["bytes", "bytes"], [updateData1, updateData2]);

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

    const fee1 = await mockPyth.getUpdateFee([updateData1]);
    const fee2 = await mockPyth.getUpdateFee([updateData2]);

    await oracle.setPrices(params, { value: Number(fee1) + Number(fee2) });

    expect(await oracle.getTokensWithPrices(0, 10)).eql([wbtc.address]);

    expect((await oracle.primaryPrices(wbtc.address))[0]).eq("90908181818181818");
    expect((await oracle.primaryPrices(wbtc.address))[1]).eq("111112222222222222");

    expect(await oracle.minTimestamp()).eq(block.timestamp);
    expect(await oracle.maxTimestamp()).eq(block.timestamp);
  });
});
