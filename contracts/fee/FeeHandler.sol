// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../data/DataStore.sol";
import "../role/RoleModule.sol";
import "../fee/FeeUtils.sol";

// @title FeeHandler
contract FeeHandler is ReentrancyGuard, RoleModule {
    DataStore public immutable dataStore;
    EventEmitter public immutable eventEmitter;

    constructor(
        RoleStore _roleStore,
        DataStore _dataStore,
        EventEmitter _eventEmitter
    ) RoleModule(_roleStore) {
        dataStore = _dataStore;
        eventEmitter = _eventEmitter;
    }

    // @dev claim fees and insurance fees from the specified markets
    // @param markets the markets to claim fees from
    // @param tokens the fee tokens to claim
    function claimFees(
        address[] memory markets,
        address[] memory tokens
    ) external nonReentrant onlyFeeKeeper {
        if (markets.length != tokens.length) {
            revert Errors.InvalidClaimFeesInput(markets.length, tokens.length);
        }

        address receiver = dataStore.getAddress(Keys.FEE_RECEIVER);
        address insuranceFund = dataStore.getAddress(Keys.INSURANCE_FUND);

        for (uint256 i; i < markets.length; i++) {
            FeeUtils.claimFees(
                dataStore,
                eventEmitter,
                markets[i],
                tokens[i],
                receiver
            );
            FeeUtils.claimInsuranceFees(
                dataStore,
                eventEmitter,
                markets[i],
                tokens[i],
                insuranceFund
            );
        }
    }
}
