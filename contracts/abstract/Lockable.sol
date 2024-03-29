// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC6551AccountLib } from "erc6551/lib/ERC6551AccountLib.sol";

import { Errors } from "./../libraries/Errors.sol";

/**
 * @title Account Lock
 * @dev Allows the root owner of a token bound account to lock access to an account until a
 * certain timestamp
 */
abstract contract Lockable {
    /**
     * @notice The timestamp at which this account will be unlocked
     */
    uint256 public lockedUntil;

    event LockUpdated(uint256 lockedUntil);

    /**
     * @dev Locks the account until a certain timestamp
     *
     * @param _lockedUntil The time at which this account will no longer be locked
     */
    function lock(uint256 _lockedUntil) external virtual {
        (uint256 chainId, address tokenContract, uint256 tokenId) = ERC6551AccountLib.token();
        address _owner = _rootTokenOwner(chainId, tokenContract, tokenId);

        if (_owner == address(0)) revert Errors.NotAuthorized();
        if (msg.sender != _owner) revert Errors.NotAuthorized();

        if (_lockedUntil > block.timestamp + 365 days) {
            revert Errors.ExceedsMaxLockTime();
        }

        _beforeLock();

        lockedUntil = _lockedUntil;

        emit LockUpdated(_lockedUntil);
    }

    /**
     * @dev Returns the current lock status of the account as a boolean
     */
    function isLocked() public view virtual returns (bool) {
        return lockedUntil > block.timestamp;
    }

    function _verifyIsUnlocked() internal view virtual {
        if (isLocked()) revert Errors.AccountLocked();
    }

    function _rootTokenOwner(uint256 chainId, address tokenContract, uint256 tokenId)
        internal
        view
        virtual
        returns (address);

    function _beforeLock() internal virtual {}
}
