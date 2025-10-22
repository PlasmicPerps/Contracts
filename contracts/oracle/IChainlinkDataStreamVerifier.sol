// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface Common {
    struct Asset {
        address assetAddress;
        uint256 amount;
    }
}

interface IFeeManager {
    /**
     * @return fee, reward, totalDiscount
     */
    function getFeeAndReward(
        address subscriber,
        bytes memory unverifiedReport,
        address quoteAddress
    ) external returns (Common.Asset memory, Common.Asset memory, uint256);

    function i_linkAddress() external view returns (address);

    function i_nativeAddress() external view returns (address);

    function i_rewardManager() external view returns (address);
}

interface IChainlinkDataStreamVerifier {
    /**
     * @notice Verifies that the data encoded has been signed
     * correctly by routing to the correct verifier, and bills the user if applicable.
     * @param payload The encoded data to be verified, including the signed
     * report.
     * @param parameterPayload fee metadata for billing. For the current implementation this is just the abi-encoded fee token ERC-20 address
     * @return verifierResponse The encoded report from the verifier.
     */
    function verify(
        bytes calldata payload,
        bytes calldata parameterPayload
    ) external payable returns (bytes memory verifierResponse);

    function s_feeManager() external view returns (IFeeManager);
}
