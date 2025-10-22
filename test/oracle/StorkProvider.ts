import { expect } from "chai";
import hre, { ethers } from "hardhat";
import * as keys from "../../utils/keys";
import { utils } from "ethers";
import { deployFixture } from "../../utils/fixture";
import { keccakString } from "../../utils/hash";

const prepareTemporalNumericValue = (input) => {
  if (
    !input.temporalNumericValue ||
    !input.id ||
    !input.publisherMerkleRoot ||
    !input.valueComputeAlgHash ||
    !input.r ||
    !input.s ||
    typeof input.v !== "number"
  ) {
    throw new Error("Missing required parameters");
  }

  return [
    [input.temporalNumericValue.timestampNs, input.temporalNumericValue.quantizedValue],
    input.id,
    input.publisherMerkleRoot,
    input.valueComputeAlgHash,
    input.r,
    input.s,
    input.v,
  ];
};

const encodeSingleFeedUpdate = (input) => {
  const abiCoder = new utils.AbiCoder();

  const type =
    "tuple(tuple(uint64,int192) temporalNumericValue, bytes32 id, bytes32 publisherMerkleRoot, bytes32 valueComputeAlgHash, bytes32 r, bytes32 s, uint8 v)[]";

  // Prepare the value as a single-element fixed array
  const value = [prepareTemporalNumericValue(input)];

  return abiCoder.encode([type], [value]);
};

const encodeDualFeedUpdate = (tokenFeed, baseFeed) => {
  const abiCoder = new utils.AbiCoder();

  // Define the type as a fixed-size array of 2 elements containing the struct
  const type =
    "tuple(tuple(uint64,int192) temporalNumericValue, bytes32 id, bytes32 publisherMerkleRoot, bytes32 valueComputeAlgHash, bytes32 r, bytes32 s, uint8 v)[]";

  // Prepare both inputs in a fixed-size array
  const values = [prepareTemporalNumericValue(tokenFeed), prepareTemporalNumericValue(baseFeed)];

  return abiCoder.encode([type], [values]);
};

describe("StorkPriceFeedProvider", () => {
  let signers;
  let mockStork;
  let dataStore, storkPriceFeedProvider, wbtc, wnt;

  before(async () => {
    const fixture = await deployFixture();
    ({ signers } = fixture.accounts);

    ({ dataStore, mockStork, wbtc, wnt } = fixture.contracts);

    storkPriceFeedProvider = await hre.ethers.getContract("StorkPriceFeedProvider");
    await dataStore.setBytes32(keys.dataStreamIdKey(wbtc.address), keccakString("BTCUSD"));
  });

  describe("Deployment", () => {
    it("sets the correct version on the stork oracle", async () => {
      expect(await mockStork.getVersion()).to.equal("1.0.2");
    });

    it("sets the correct stork provider address", async () => {
      expect(await storkPriceFeedProvider.storkProviderContract()).to.equal(mockStork.address);
    });

    it("sets the correct dataStore address", async () => {
      console.log("DATA STORE ADDRESS", dataStore.address);
      console.log("STORK DATA STORE", await storkPriceFeedProvider.dataStoreContract());
      expect(await storkPriceFeedProvider.dataStoreContract()).to.equal(dataStore.address);
    });
  });

  describe("Interaction", () => {
    it("getOraclePriceFee() reverts with if incorrect dataStreamId is sent for token", async () => {
      expect(await dataStore.getBytes32(keys.dataStreamIdKey(wbtc.address))).to.be.eq(keccakString("BTCUSD"));

      expect(
        storkPriceFeedProvider.getOraclePriceFee(
          wbtc.address,
          encodeSingleFeedUpdate({
            temporalNumericValue: {
              timestampNs: ethers.BigNumber.from("1234567890"),
              quantizedValue: ethers.BigNumber.from("1000000000000000000"),
            },
            id: keccakString("BTCUSD!@#"),
            publisherMerkleRoot: ethers.utils.hexZeroPad("0x1234", 32),
            valueComputeAlgHash: ethers.utils.hexZeroPad("0x5678", 32),
            r: "0x1234567890123456789012345678901234567890123456789012345678901234",
            s: "0x1234567890123456789012345678901234567890123456789012345678901234",
            v: 27,
          })
        )
      )
        .to.be.revertedWithCustomError(storkPriceFeedProvider, "InvalidDataStreamFeedId")
        .withArgs(wbtc.address, keccakString("BTCUSD!@#"), keccakString("BTCUSD"));
    });
  });

  it("getOraclePrice() reverts with invalid dataStreamId ", async () => {
    expect(await dataStore.getBytes32(keys.dataStreamIdKey(wbtc.address))).to.be.eq(keccakString("BTCUSD"));

    expect(
      storkPriceFeedProvider.getOraclePriceFee(
        wbtc.address,
        encodeSingleFeedUpdate({
          temporalNumericValue: {
            timestampNs: ethers.BigNumber.from("1234567890"),
            quantizedValue: ethers.BigNumber.from("1000000000000000000"),
          },
          id: keccakString("BTCUSD!@#"),
          publisherMerkleRoot: ethers.utils.hexZeroPad("0x1234", 32),
          valueComputeAlgHash: ethers.utils.hexZeroPad("0x5678", 32),
          r: "0x1234567890123456789012345678901234567890123456789012345678901234",
          s: "0x1234567890123456789012345678901234567890123456789012345678901234",
          v: 27,
        })
      )
    )
      .to.be.revertedWithCustomError(storkPriceFeedProvider, "InvalidDataStreamFeedId")
      .withArgs(wbtc.address, keccakString("BTCUSD!@#"), keccakString("BTCUSD"));
  });

  it("getOraclePriceFee() reverts in case of invalid input array lenght", async () => {
    await dataStore.setBytes32(keys.dataStreamBaseIdKey(wbtc.address), keccakString("ETHUSD"));
    expect(await dataStore.getBytes32(keys.dataStreamIdKey(wbtc.address))).to.be.eq(keccakString("BTCUSD"));
    expect(await dataStore.getBytes32(keys.dataStreamBaseIdKey(wbtc.address))).to.be.eq(keccakString("ETHUSD"));

    expect(
      storkPriceFeedProvider.getOraclePriceFee(
        wbtc.address,
        encodeSingleFeedUpdate({
          temporalNumericValue: {
            timestampNs: ethers.BigNumber.from("1234567890"),
            quantizedValue: ethers.BigNumber.from("1000000000000000000"),
          },
          id: keccakString("BTCUSD"),
          publisherMerkleRoot: ethers.utils.hexZeroPad("0x1234", 32),
          valueComputeAlgHash: ethers.utils.hexZeroPad("0x5678", 32),
          r: "0x1234567890123456789012345678901234567890123456789012345678901234",
          s: "0x1234567890123456789012345678901234567890123456789012345678901234",
          v: 27,
        })
      )
    )
      .to.be.revertedWithCustomError(storkPriceFeedProvider, "EmptyDataStreamFeedId")
      .withArgs(wbtc.address);
  });
});
