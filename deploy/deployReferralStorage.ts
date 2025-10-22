import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "ReferralStorage",
  id: "ReferralStorage_2",
  afterDeploy: async ({ deployer, deployments }) => {
    const { read, execute, log } = deployments;

    const tiers = [{ totalRebate: 1000, discountShare: 5000 }];

    for (const [tierId, tier] of tiers.entries()) {
      const onchainTier = await read("ReferralStorage", "tiers", tierId);
      if (onchainTier.totalRebate.eq(tier.totalRebate) && onchainTier.discountShare.eq(tier.discountShare)) {
        continue;
      }
      log(`Updating tier ${tierId} to ${JSON.stringify(tier)}`);
      await execute(
        "ReferralStorage",
        { from: deployer, log: true },
        "setTier",
        tierId,
        tier.totalRebate,
        tier.discountShare
      );
    }
  },
});

func.skip = async ({ network }: HardhatRuntimeEnvironment) => {
  const shouldDeployForNetwork = [
    "avalancheFuji",
    "arbitrumSepolia",
    "hardhat",
    "zkSync",
    "zkSyncInternal",
    "sonic",
    "sonicInternal",
    "plasma",
  ];
  return !shouldDeployForNetwork.includes(network.name);
};

export default func;
