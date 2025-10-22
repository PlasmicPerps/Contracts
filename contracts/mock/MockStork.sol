pragma solidity 0.8.18;

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

contract MockStork is IStork {
    bool public shouldUpdateTemporalValue = true;
    uint256 public feeAmount = 1;
    string public version = "1.0.2";

    function setFeeAmount(uint256 _feeAmount) public {
        feeAmount = _feeAmount;
    }

    function getFeeAmount() public view returns (uint256) {
        return feeAmount;
    }

    function getVersion() public view returns (string memory) {
        return version;
    }

    function setShouldUpdateTemporalValue(bool flag) public {
        shouldUpdateTemporalValue = flag;
    }

    function updateTemporalNumericValuesV1(TemporalNumericValueInput[] calldata updateData) public payable {
        if (msg.value < getUpdateFeeV1(updateData)) revert("Insuficient Update Fee");
        if (!shouldUpdateTemporalValue) revert("Error While Updating Temporal Value");
        return;
    }

    function getUpdateFeeV1(TemporalNumericValueInput[] calldata updateData) public view returns (uint256 fee) {
        return feeAmount;
    }
}
