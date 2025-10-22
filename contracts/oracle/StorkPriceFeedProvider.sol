// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {Keys} from "../data/Keys.sol";
import {DataStore} from "../data/DataStore.sol";
import {Chain} from "../chain/Chain.sol";
import {Precision} from "../utils/Precision.sol";
import "./IOracleProvider.sol";

/// @title IStork Interface
/// @notice Interface for interacting with the Stork oracle system
interface IStork {
    struct TemporalNumericValue {
        /// @dev Nanosecond level precision timestamp of latest publisher update in batch
        uint64 timestampNs;
        /// @dev Quantized value with high precision support
        int192 quantizedValue;
    }

    struct TemporalNumericValueInput {
        TemporalNumericValue temporalNumericValue;
        bytes32 id;
        bytes32 publisherMerkleRoot;
        bytes32 valueComputeAlgHash;
        bytes32 r;
        bytes32 s;
        uint8 v;
    }

    /// @notice Updates multiple temporal numeric values
    /// @dev Requires payment for update fees
    /// @param updateData Array of temporal numeric value inputs to update
    function updateTemporalNumericValuesV1(TemporalNumericValueInput[] calldata updateData) external payable;

    /// @notice Calculates the fee required for updating temporal numeric values
    /// @param updateData Array of temporal numeric value inputs to calculate fees for
    /// @return feeAmount The total fee required in wei
    function getUpdateFeeV1(TemporalNumericValueInput[] calldata updateData) external view returns (uint256 feeAmount);
}

/// @title StorkPriceFeedProvider
/// @notice Contract for managing and updating price feeds through the Stork oracle system
/// @dev Implements IOracleProvider interface for price feed management
contract StorkPriceFeedProvider is IOracleProvider {
    IStork public immutable storkProviderContract;
    DataStore public immutable dataStoreContract;

    uint256 public immutable STORK_DECIMAL = 10 ** 18;

    constructor(address _dataStore, address _stork) {
        dataStoreContract = DataStore(_dataStore);
        storkProviderContract = IStork(_stork);
    }

    function isChainlinkProvider() external pure returns (bool) {
        return false;
    }

    /// @notice Retrieves and updates the oracle price for a given token
    /// @dev Handles both single and dual feed scenarios based on presence of base feed
    /// @param token The token address to update the price for
    /// @param data Encoded bytes data for price feed verification and updates
    function getOraclePrice(
        address token,
        bytes memory data
    ) external payable returns (OracleUtils.ValidatedPrice memory) {
        bytes32 feedId = dataStoreContract.getBytes32(Keys.dataStreamIdKey(token));
        bytes32 baseFeedId = dataStoreContract.getBytes32(Keys.dataStreamBaseIdKey(token));

        if (feedId == bytes32(0)) revert Errors.EmptyDataStreamFeedId(token);

        (IStork.TemporalNumericValueInput[] memory inputs) = abi.decode(data, (IStork.TemporalNumericValueInput[]));

        uint256 updateFee = storkProviderContract.getUpdateFeeV1(inputs);
        try storkProviderContract.updateTemporalNumericValuesV1{value: updateFee}(inputs)
        {}
        catch (bytes memory reason)
        {
            if (bytes4(reason) != bytes4(keccak256(bytes("NoFreshUpdate()"))))
            {
                /// @note https://github.com/ethereum/solidity/issues/11278#issuecomment-1239574905
                assembly {
                     revert(add(32, reason), mload(reason))
                }
            }
        }


        uint256 price = uint256(uint192(inputs[0].temporalNumericValue.quantizedValue));

        if (baseFeedId != bytes32(0)) {
            price = Precision.mulDiv(
                price,
                STORK_DECIMAL,
                uint256(uint192(inputs[1].temporalNumericValue.quantizedValue))
            );
        }

        uint256 precision = _getDataStreamMultiplier(token) / STORK_DECIMAL;
        uint256 adjustedPrice = Precision.mulDiv(price, precision, Precision.FLOAT_PRECISION);

        return OracleUtils.ValidatedPrice({
            token: token,
            min: adjustedPrice,
            max: adjustedPrice,
            timestamp: inputs[0].temporalNumericValue.timestampNs / (10 ** 9),
            provider: address(this)
        });
    }

    /// @notice Calculates the oracle fee for updating price feed data
    /// @param token The token address for the price feed
    /// @param data Encoded price feed data
    /// @return The oracle price fee in wei
    function getOraclePriceFee(address token, bytes memory data) external view returns (uint256) {
        bytes32 feedId = dataStoreContract.getBytes32(Keys.dataStreamIdKey(token));
        bytes32 baseFeedId = dataStoreContract.getBytes32(Keys.dataStreamBaseIdKey(token));

        if (feedId == bytes32(0)) revert Errors.EmptyDataStreamFeedId(token);

        IStork.TemporalNumericValueInput[] memory inputs = abi.decode(data, (IStork.TemporalNumericValueInput[]));

        if (baseFeedId != bytes32(0) && inputs.length != 2) revert Errors.EmptyDataStreamFeedId(token);
        if (inputs[0].id != feedId) revert Errors.InvalidDataStreamFeedId(token, inputs[0].id, feedId);

        return storkProviderContract.getUpdateFeeV1(inputs);
    }

    function _getDataStreamMultiplier(address token) internal view returns (uint256) {
        uint256 multiplier = dataStoreContract.getUint(Keys.dataStreamMultiplierKey(token));

        if (multiplier == 0) {
            revert Errors.EmptyDataStreamMultiplier(token);
        }

        return multiplier;
    }
}