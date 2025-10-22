// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

import "../role/RoleModule.sol";
import "../data/DataStore.sol";
import "../data/Keys.sol";
import "./IOracleProvider.sol";
import "../utils/Precision.sol";
import "../chain/Chain.sol";

contract PythDataStreamProvider is IOracleProvider, RoleModule {

    DataStore public immutable dataStore;
    IPyth public immutable verifier;

    // price / conf of pyth report should be > MIN_CONF_RATIO
    int64 public constant MIN_CONF_RATIO = 5;

    // Pyth has high spread even for top feeds like wBTC and ETH. Artificially reduce the spread to get a tight price
    mapping(bytes32 => uint16) public spreadReductionBps;

    // Reduction basis points must be between 0 and 10000
    error InvalidReductionBps();

    struct PythReport {
        int32 expo;
        int256 minPrice;
        int256 maxPrice;
        uint256 publishTime;
    }

    constructor(
        DataStore _dataStore,
        RoleStore _roleStore,
        IPyth _verifier
    ) RoleModule(_roleStore) {
        dataStore = _dataStore;
        verifier = _verifier;
    }

    function setSpreadReductionBps(
        bytes32 feedId,
        uint16 reductionBps
    ) external onlyConfigKeeper {
        if (reductionBps > 10000) {
            revert InvalidReductionBps();
        }
        spreadReductionBps[feedId] = reductionBps;
    }

    function isChainlinkProvider() external pure returns (bool) {
        return false;
    }

    function getOraclePrice(
        address token,
        bytes memory data
    ) external payable returns (OracleUtils.ValidatedPrice memory) {

        bytes32 feedId = dataStore.getBytes32(Keys.dataStreamIdKey(token));
        bytes32 baseFeedId = dataStore.getBytes32(Keys.dataStreamBaseIdKey(token));

        if (feedId == bytes32(0)) {
            revert Errors.EmptyDataStreamFeedId(token);
        }

        PythReport memory report;

        if (baseFeedId == bytes32(0)) {
            report = _getReport(feedId, data);   
        } else {
            (bytes memory b1, bytes memory b2) = abi.decode(data, (bytes, bytes));

            PythReport memory r1 = _getReport(feedId, b1);
            PythReport memory r2 = _getReport(baseFeedId, b2);

            report.maxPrice = (r1.maxPrice * (10 ** 18)) / r2.minPrice;
            report.minPrice = (r1.minPrice * (10 ** 18)) / r2.maxPrice;
            report.expo = r1.expo - r2.expo - 18;

            report.publishTime = r1.publishTime > r2.publishTime ? r1.publishTime : r2.publishTime;
        }

        if (report.minPrice <= 0 || report.maxPrice <= 0) {
            revert Errors.InvalidDataStreamPrices(token, int192(report.minPrice), int192(report.maxPrice));
        }

        uint256 precision = _getDataStreamMultiplier(token);
        if (report.expo < 0) {
            precision = precision / (10 ** uint32(-1 * report.expo));
        } else {
            precision = precision * (10 ** uint32(report.expo));
        }
        uint256 adjustedBidPrice = Precision.mulDiv(uint256(report.minPrice), precision, Precision.FLOAT_PRECISION);
        uint256 adjustedAskPrice = Precision.mulDiv(uint256(report.maxPrice), precision, Precision.FLOAT_PRECISION);

        return OracleUtils.ValidatedPrice({
            token: token,
            min: adjustedBidPrice,
            max: adjustedAskPrice,
            timestamp: report.publishTime,
            provider: address(this)
        });
    }

    function getOraclePriceFee(
        address token,
        bytes memory data
    ) external view returns (uint256) {
        bytes32 feedId = dataStore.getBytes32(Keys.dataStreamIdKey(token));
        bytes32 baseFeedId = dataStore.getBytes32(Keys.dataStreamBaseIdKey(token));

        if (feedId == bytes32(0)) {
            revert Errors.EmptyDataStreamFeedId(token);
        }

        if (baseFeedId == bytes32(0)) {
            bytes[] memory feedData = new bytes[](1);
            feedData[0] = data;
            return verifier.getUpdateFee(feedData);
        } else {
            bytes[] memory feedData = new bytes[](2);
            (feedData[0], feedData[1]) = abi.decode(data, (bytes, bytes));
            return verifier.getUpdateFee(feedData);
        } 
    }

    function _getReport(bytes32 feedId, bytes memory data) internal returns (PythReport memory) {
        PythStructs.PriceFeed memory report;
        
        bytes[] memory feedData = new bytes[](1);
        bytes32[] memory feedIds = new bytes32[](1);
        feedData[0] = data;
        feedIds[0] = feedId;

        
        uint256 fee = verifier.getUpdateFee(feedData);
        /// @dev Reverts if the transferred fee is not sufficient or the updateData is invalid or there is
        /// no update for any of the given `priceIds` within the given time range
        uint64 minPublishTime = uint64(Chain.currentTimestamp() - dataStore.getUint(Keys.MAX_ORACLE_PRICE_AGE));
        uint64 maxPublishTime = uint64(Chain.currentTimestamp() + dataStore.getUint(Keys.MAX_ORACLE_PRICE_AGE));
        
        PythStructs.PriceFeed[] memory verifierResponse = verifier.parsePriceFeedUpdates{value: fee}(feedData, feedIds, minPublishTime, maxPublishTime);
        report = verifierResponse[0];

        if(report.price.price <= 0 || report.price.expo < -18 || 
            (report.price.conf > 0 && (report.price.price / int64(report.price.conf) < MIN_CONF_RATIO))
        ){
            revert Errors.InvalidPythReport(report.price.price, report.price.conf, report.price.expo);
        }

        uint256 spreadFactor = uint256(10000 - spreadReductionBps[feedId]);
        int64 spread = int64(uint64(Precision.mulDiv(uint256(report.price.conf), spreadFactor, 10000)));

        return PythReport({
            expo: report.price.expo,
            minPrice: report.price.price - spread,
            maxPrice: report.price.price + spread,
            publishTime: report.price.publishTime
        });
    }

    function _getDataStreamMultiplier(address token) internal view returns (uint256) {
        uint256 multiplier = dataStore.getUint(Keys.dataStreamMultiplierKey(token));

        if (multiplier == 0) {
            revert Errors.EmptyDataStreamMultiplier(token);
        }

        return multiplier;
    }
}
