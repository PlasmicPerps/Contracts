import hre from "hardhat";
import { expandDecimals } from "../utils/math";
import { ExchangeRouter } from "../typechain-types";
import { DepositUtils } from "../typechain-types/contracts/exchange/DepositHandler";
import { CHAINLINK_PAYMENT_TOKEN } from "../utils/keys";
import { setAddressIfDifferent } from "../utils/dataStore";

const { ethers } = hre;

/**
 * Simple configuration for creating a single collateral deposit
 */
interface DepositConfig {
  marketAddress: string;
  initialCollateralToken: string; // The token being deposited
  collateralAmount: string; // Amount in token decimals (e.g., "1.5" for 1.5 tokens)

  // Market token addresses (for the params struct)
  longToken: string;
  shortToken: string;

  // Optional
  receiverAddress?: string;
  executionFee?: string; // In ETH, defaults to 0.001
  minMarketTokens?: string;
}

async function createDeposit(config: DepositConfig) {
  console.log("\n🔄 Creating Single Collateral Deposit\n");

  // Get contracts
  const exchangeRouter: ExchangeRouter = await ethers.getContract("ExchangeRouter");
  const depositVault = await ethers.getContract("DepositVault");
  const router = await ethers.getContract("Router");
  const dataStore = await ethers.getContract("DataStore");
  // const wnt = await ethers.getContractAt("WNT", "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73");
  const wnt = await ethers.getContractAt("WNT", "0x6100E367285b01F48D07953803A2d8dCA5D19873");


  const [signer] = await ethers.getSigners();
  const receiver = config.receiverAddress || signer.address;

  console.log("Market:", config.marketAddress);
  console.log("Depositor:", signer.address);
  console.log("Receiver:", receiver);

  // Get collateral token contract
  const collateralToken = await ethers.getContractAt("MintableToken", config.initialCollateralToken);
  const decimals = await collateralToken.decimals();
  const symbol = await collateralToken.symbol();

  const collateralAmount = expandDecimals(config.collateralAmount, decimals);
  const executionFee = config.executionFee ? expandDecimals(config.executionFee, 18) : expandDecimals(1, 15); // 0.001 ETH

  console.log(`\nDepositing: ${config.collateralAmount} ${symbol}`);
  console.log(`Execution Fee: ${ethers.utils.formatEther(executionFee)} ETH\n`);

  // Check balances
  const collateralBalance = await collateralToken.balanceOf(signer.address);
  if (collateralBalance.lt(collateralAmount)) {
    if (hre.network.name == "arbitrumSepolia") await collateralToken.mint(signer.address, config.collateralAmount);
    else {
      throw new Error(
        `Insufficient ${symbol}. Required: ${config.collateralAmount}, Available: ${ethers.utils.formatUnits(
          collateralBalance,
          decimals
        )}`
      );
    }
  }

  const wntBalance = await wnt.balanceOf(signer.address);
  if (wntBalance.lt(executionFee)) {
    console.log("Wrapping ETH for execution fee...");
    await (await wnt.deposit({ value: executionFee })).wait();
  }

  // Approve tokens
  const wntAllowance = await wnt.allowance(signer.address, router.address);
  if (wntAllowance.lt(executionFee)) {
    console.log("Approving WNT...");
    await (await wnt.approve(router.address, ethers.constants.MaxUint256)).wait();
  }

  const collateralAllowance = await collateralToken.allowance(signer.address, router.address);
  if (collateralAllowance.lt(collateralAmount)) {
    console.log(`Approving ${symbol}...`);
    await (await collateralToken.approve(router.address, ethers.constants.MaxUint256)).wait();
  }

  // Create deposit params
  const params: DepositUtils.CreateDepositParamsStruct = {
    receiver: receiver,
    callbackContract: ethers.constants.AddressZero,
    market: config.marketAddress,
    minMarketTokens: config.minMarketTokens || 0,
    shouldUnwrapNativeToken: false,
    executionFee: executionFee,
    callbackGasLimit: 0,
    initialLongToken: config.longToken,
    initialShortToken: config.shortToken,
    longTokenSwapPath: [],
    shortTokenSwapPath: [],
    uiFeeReceiver: ethers.constants.AddressZero,
  };

  // Build multicall with single sendTokens
  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [depositVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [
      config.initialCollateralToken,
      depositVault.address,
      collateralAmount,
    ]),
    exchangeRouter.interface.encodeFunctionData("createDeposit", [params]),
  ];

  console.log("Sending transaction...");
  const tx = await exchangeRouter.multicall(multicallArgs, {
    value: executionFee,
    gasLimit: 2500000,
  });

  console.log("Transaction:", tx.hash);
  await tx.wait();
  console.log("✅ Deposit created!\n");

  return tx.hash;
}

async function main() {
  // Configuration - populate this struct with your values
  const config: DepositConfig = {
    // marketAddress: "0xE52D5bc3bC754A56A5ea71e4e2F167a5de6a5dF4",
    marketAddress: "0x25c576ea2d567651255DDd4bA115e6a5A0abc394", // Mainnet Market Address
    // initialCollateralToken: "0x3321Fd36aEaB0d5CdfD26f4A3A93E2D2aAcCB99f",
    initialCollateralToken: "0x6100E367285b01F48D07953803A2d8dCA5D19873",
    longToken: "0x6100E367285b01F48D07953803A2d8dCA5D19873",
    shortToken: "0x6100E367285b01F48D07953803A2d8dCA5D19873",
    collateralAmount: "1",

    // Optional
    receiverAddress: process.env.RECEIVER,
    // executionFee: "0.001", // e.g., "0.001"
    minMarketTokens: process.env.MIN_MARKET_TOKENS,
  };

  await createDeposit(config);
}

export { createDeposit, DepositConfig };

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((ex) => {
      console.error("Error:", ex.message);
      process.exit(1);
    });
}
