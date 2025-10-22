// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./OracleUtils.sol";

// @title IOracleProvider
// @dev Interface for an oracle provider
interface IOracleProvider {
    function getOraclePrice(
        address token,
        bytes memory data
    ) external payable returns (OracleUtils.ValidatedPrice memory);

    /// @dev We can assume any provider giving back a price value expect money in native tokens as both
    /// of our primary dataStream providers Pyth and Stork expecting payement in native tokens returns values in wei
    /// For other providers like Chainlink which take payement through verifier contracts this value can be set to 0
    function getOraclePriceFee(address token, bytes memory data) external view returns (uint256);

    /// @dev Use this to differentiate between Chainlink DataStream and DataFeed Providers
    function isChainlinkProvider() external view returns (bool);
}
