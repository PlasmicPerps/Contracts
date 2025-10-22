import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { decimalToFloat, percentageToFloat, expandDecimals } from "../utils/math";

export default async function ({ network }: HardhatRuntimeEnvironment) {
  if (network.name === "hardhat") {
    // Note that this is only for the hardhat config, the config for all
    // other networks is separate from this
    return {
      feeReceiver: ethers.constants.AddressZero,
      holdingAddress: ethers.constants.AddressZero,
      insuranceFund: ethers.constants.AddressZero,
      sequencerUptimeFeed: ethers.constants.AddressZero,
      sequencerGraceDuration: 300,
      maxUiFeeFactor: decimalToFloat(5, 5), // 0.005%
      maxAutoCancelOrders: 5,
      maxTotalCallbackGasLimitForAutoCancelOrders: 3_000_000,
      minHandleExecutionErrorGas: 1_200_000,
      minHandleExecutionErrorGasToForward: 1_000_000,
      minAdditionalGasForExecution: 1_000_000,
      refundExecutionFeeGasLimit: 200_000,

      depositGasLimitSingle: 0,
      depositGasLimitMultiple: 0,
      withdrawalGasLimit: 0,

      singleSwapGasLimit: 0,
      increaseOrderGasLimit: 0,
      decreaseOrderGasLimit: 0,
      swapOrderGasLimit: 0,

      tokenTransferGasLimit: 200_000,
      nativeTokenTransferGasLimit: 50_000,

      estimatedGasFeeBaseAmount: 0,
      estimatedGasPerOraclePriceKey: 0,
      estimatedGasFeeMultiplierFactor: 0,

      executionGasFeeBaseAmount: 0,
      executionGasPerOraclePriceKey: 0,
      executionGasFeeMultiplierFactor: 0,

      requestExpirationTime: 300,

      maxSwapPathLength: 5,
      maxCallbackGasLimit: 2_000_000,
      minCollateralUsd: decimalToFloat(1),

      minPositionSizeUsd: decimalToFloat(1),
      claimableCollateralTimeDivisor: 60 * 60,

      positionFeeReceiverFactor: 0,
      swapFeeReceiverFactor: 0,
      borrowingFeeReceiverFactor: 0,
      positionInsuranceFeeFactor: 0,

      skipBorrowingFeeForSmallerSide: false,
    };
  }

  const generalConfig = {
    sequencerUptimeFeed: ethers.constants.AddressZero,
    sequencerGraceDuration: 300,
    maxUiFeeFactor: percentageToFloat("0.05%"),
    maxAutoCancelOrders: 5,
    maxTotalCallbackGasLimitForAutoCancelOrders: 5_000_000,
    minHandleExecutionErrorGas: 1_200_000,
    minHandleExecutionErrorGasToForward: 1_000_000, // measured gas required for an order cancellation: ~600,000
    minAdditionalGasForExecution: 1_000_000,
    refundExecutionFeeGasLimit: 200_000,

    depositGasLimitSingle: 1_500_000,
    depositGasLimitMultiple: 1_800_000,
    withdrawalGasLimit: 1_500_000,

    singleSwapGasLimit: 1_000_000, // measured gas required for a swap in a market increase order: ~600,000
    increaseOrderGasLimit: 2_000_000,
    decreaseOrderGasLimit: 2_000_000,
    swapOrderGasLimit: 3_000_000,

    tokenTransferGasLimit: 200_000,
    nativeTokenTransferGasLimit: 50_000,

    estimatedGasFeeBaseAmount: 400_000, // measured gas for an order execution without any main logic: ~400,000
    estimatedGasPerOraclePriceKey: 50_000,
    estimatedGasFeeMultiplierFactor: expandDecimals(1, 30), // 1x

    executionGasFeeBaseAmount: 400_000, // measured gas for an order execution without any main logic: ~400,000
    executionGasPerOraclePriceKey: 50_000,
    executionGasFeeMultiplierFactor: expandDecimals(1, 30), // 1x

    requestExpirationTime: 300,

    maxSwapPathLength: 3,
    maxCallbackGasLimit: 2_000_000,
    minCollateralUsd: decimalToFloat(1),

    minPositionSizeUsd: decimalToFloat(1),
    claimableCollateralTimeDivisor: 60 * 60,

    positionFeeReceiverFactor: decimalToFloat(30, 2), // 30%
    swapFeeReceiverFactor: decimalToFloat(30, 2), // 30%
    borrowingFeeReceiverFactor: decimalToFloat(30, 2), // 30%
    positionInsuranceFeeFactor: decimalToFloat(10, 2), // 10%

    skipBorrowingFeeForSmallerSide: true,
  };

  const networkConfig = {
    arbitrumGoerli: {},
    arbitrumSepolia: {
      maxAutoCancelOrders: 10,
      maxTotalCallbackGasLimitForAutoCancelOrders: 10_000_000,
    },
    avalancheFuji: {},
    arbitrum: {
      maxAutoCancelOrders: 10,
      maxTotalCallbackGasLimitForAutoCancelOrders: 10_000_000,
      maxCallbackGasLimit: 3_000_000,
      estimatedGasFeeBaseAmount: false,
      executionGasFeeBaseAmount: false,
      sequencerUptimeFeed: "0xFdB631F5EE196F0ed6FAa767959853A9F217697D",
    },
    plasma: {
      feeReceiver: "0x17f34aC85Df112f43262A748a813dA56a2eD78aa",
      holdingAddress: "0x17f34aC85Df112f43262A748a813dA56a2eD78aa",
      insuranceFund: ethers.constants.AddressZero,
    }
  }[network.name];

  if (!networkConfig) {
    throw new Error(`Network config not defined for ${network.name}`);
  }

  return { ...generalConfig, ...networkConfig };
}
