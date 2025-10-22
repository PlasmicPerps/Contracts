import { grantRoleIfNotGranted, revokeRoleIfGranted } from "../utils/role";

// example rolesToRemove format:
// {
//   arbitrum: [
//     {
//       role: "CONTROLLER",
//       member: "0x9d44B89Eb6FB382b712C562DfaFD8825829b422e",
//     },
//   ],
// };

const rolesToRemove = {
  hardhat: [],
  arbitrum: [],
  avalanche: [],
  avalancheFuji: [],
  arbitrumGoerli: [],
  arbitrumSepolia: [],
  zkSync: [],
  zkSyncInternal: [],
  sonic: [],
  sonicInternal: [],
  plasma: []
};

const func = async ({ plasmic, network }) => {
  const rolesConfig = await plasmic.getRoles();
  for (const role in rolesConfig) {
    const accounts = rolesConfig[role];
    for (const account in accounts) {
      await grantRoleIfNotGranted(account, role);
    }
  }

  const _rolesToRemove = rolesToRemove[network.name];
  for (const { account, role } of _rolesToRemove) {
    await revokeRoleIfGranted(account, role);
  }
};

func.tags = ["Roles"];
func.dependencies = ["RoleStore"];

export default func;
