declare function extendEnvironment(any): void;
import { ethers as ethersModule } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// declare module "hardhat/types/runtime" {
//   interface HardhatRuntimeEnvironment {
//     plasmic: {
//       getTokens: () => Promise<any>;
//       getOracle: () => Promise<any>;
//       getMarkets: () => Promise<any>;
//       getGeneral: () => Promise<any>;
//       getRoles: () => Promise<any>;
//     };
//   }
// }

declare global {
  let ethers: typeof ethersModule;
  let hre: typeof HardhatRuntimeEnvironment;
}

