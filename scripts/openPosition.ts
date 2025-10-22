import hre from "hardhat";
import { expandDecimals, decimalToFloat } from "../utils/math";
import { OrderType, DecreasePositionSwapType } from "../utils/order";
import { ExchangeRouter } from "../typechain-types";
import { EtherscanProvider } from "@ethersproject/providers";

const { ethers } = hre;

/**
 * Configuration for opening a position (increase order)
 */
interface PositionConfig {
  marketAddress: string;
  collateralToken: string;
  collateralAmount: string; // Amount in token decimals (e.g., "10" for 10 USDC)
  sizeDeltaUsd: string; // Position size in USD (e.g., "100" for $100)
  isLong: boolean; // true for long, false for short
  acceptablePrice: string; // Acceptable execution price (30 decimals)

  // Optional
  receiverAddress?: string;
  executionFee?: string; // In ETH
  triggerPrice?: string; // For limit orders (30 decimals)
  orderType?: number; // Defaults to MarketIncrease
}

async function openPosition(config: PositionConfig) {
  console.log("\n📈 Opening Position\n");

  // Get contracts
  const exchangeRouter: ExchangeRouter = await ethers.getContract("ExchangeRouter");
  const orderVault = await ethers.getContract("OrderVault");
  const router = await ethers.getContract("Router");
  // const wnt = await ethers.getContractAt("WNT", "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73");
  const wnt = await ethers.getContractAt("WNT", "0x6100E367285b01F48D07953803A2d8dCA5D19873");

  const [signer] = await ethers.getSigners();
  const receiver = config.receiverAddress || signer.address;

  console.log("Market:", config.marketAddress);
  console.log("Trader:", signer.address);
  console.log("Direction:", config.isLong ? "LONG" : "SHORT");
  console.log("Size:", `$${config.sizeDeltaUsd}`);

  // Get collateral token
  const collateralToken = await ethers.getContractAt("MintableToken", config.collateralToken);
  const decimals = await collateralToken.decimals();
  const symbol = await collateralToken.symbol();

  const collateralAmount = expandDecimals(config.collateralAmount, decimals);
  const sizeDeltaUsd = decimalToFloat(config.sizeDeltaUsd);
  // const acceptablePrice = decimalToFloat(config.acceptablePrice);
  const acceptablePrice = decimalToFloat("477499793451");

  // Calculate execution fee
  const executionFee = config.executionFee
    ? expandDecimals(config.executionFee, 18)
    : expandDecimals(1, 15); // 0.001 ETH

  console.log(`Collateral: ${config.collateralAmount} ${symbol}`);
  console.log(`Execution Fee: ${ethers.utils.formatEther(executionFee)} ETH\n`);

  // Check collateral balance
  const collateralBalance = await collateralToken.balanceOf(signer.address);
  if (collateralBalance.lt(collateralAmount)) {
    if (hre.network.name == "arbitrumSepolia") {
      console.log("Minting collateral token...");
      await (await collateralToken.mint(signer.address, collateralAmount)).wait();
    } else {
      throw new Error(
        `Insufficient ${symbol}. Required: ${config.collateralAmount}, Available: ${ethers.utils.formatUnits(
          collateralBalance,
          decimals
        )}`
      );
    }
  }

  // Check WNT balance and wrap if needed
  const wntBalance = await wnt.balanceOf(signer.address);
  if (wntBalance.lt(executionFee)) {
    console.log("Wrapping ETH for execution fee...");
    await (await wnt.deposit({ value: executionFee })).wait();
  }

  // Approve collateral token
  const collateralAllowance = await collateralToken.allowance(signer.address, router.address);
  if (collateralAllowance.lt(collateralAmount)) {
    console.log(`Approving ${symbol}...`);
    await (await collateralToken.approve(router.address, ethers.constants.MaxUint256)).wait();
  }

  // Approve WNT
  const wntAllowance = await wnt.allowance(signer.address, router.address);
  if (wntAllowance.lt(executionFee)) {
    console.log("Approving WNT...");
    await (await wnt.approve(router.address, ethers.constants.MaxUint256)).wait();
  }

  // Create order parameters
  const orderType = config.orderType !== undefined ? config.orderType : OrderType.MarketIncrease;
  const triggerPrice = config.triggerPrice ? decimalToFloat(config.triggerPrice) : 0;

  const orderParams = {
    addresses: {
      receiver,
      callbackContract: ethers.constants.AddressZero,
      cancellationReceiver: receiver,
      uiFeeReceiver: ethers.constants.AddressZero,
      market: config.marketAddress,
      initialCollateralToken: config.collateralToken,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd,
      initialCollateralDeltaAmount: collateralAmount,
      triggerPrice,
      acceptablePrice,
      executionFee,
      callbackGasLimit: 0,
      minOutputAmount: 0,
    },
    orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: config.isLong,
    shouldUnwrapNativeToken: false,
    referralCode: ethers.constants.HashZero,
  };

  // Build multicall
  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [orderVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [
      config.collateralToken,
      orderVault.address,
      collateralAmount,
    ]),
    exchangeRouter.interface.encodeFunctionData("createOrder", [orderParams]),
  ];

  console.log("Sending transaction...");
  const tx = await exchangeRouter.multicall(multicallArgs, {
    value: executionFee,
    gasLimit: 2500000,
  });

  console.log("Transaction:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Position order created!\n");

  return tx.hash;
}

async function main() {
  // Configuration - populate this struct with your values
  const config: PositionConfig = {
    marketAddress: "0x25c576ea2d567651255DDd4bA115e6a5A0abc394",
    // marketAddress: "0xE52D5bc3bC754A56A5ea71e4e2F167a5de6a5dF4",
    collateralToken: "0x6100E367285b01F48D07953803A2d8dCA5D19873", // USDC
    // collateralToken: "0x3321Fd36aEaB0d5CdfD26f4A3A93E2D2aAcCB99f", // USDC
    collateralAmount: "3", // 10 USDC
    sizeDeltaUsd: "1", // $20 position
    isLong: true, // true = LONG, false = SHORT
    acceptablePrice: "0", // BTC @ $115k + 1% slippage = $116,150 max

    // Optional
    receiverAddress: process.env.RECEIVER,
    // executionFee: "0.001",
    // triggerPrice: "0", // For limit orders
    // orderType: OrderType.MarketIncrease, // Default
  };

  await openPosition(config);
}

export { openPosition, PositionConfig };

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((ex) => {
      console.error("Error:", ex.message);
      process.exit(1);
    });
}
