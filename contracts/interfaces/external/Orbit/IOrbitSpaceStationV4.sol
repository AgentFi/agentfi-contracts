// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IOrbitSpaceStationV4 {
    /**
     * @notice Returns whether the given account is entered in the given asset
     * @param account The address of the account to check
     * @param oToken The oToken to check
     * @return True if the account is in the asset, otherwise false.
     */
    function checkMembership(address account, address oToken) external view returns (bool);

    /**
     * @notice Add assets to be included in account liquidity calculation
     * @param oTokens The list of addresses of the oToken markets to be enabled
     * @return Success indicator for whether each corresponding market was entered
     */
    function enterMarkets(address[] memory oTokens) external returns (uint[] memory);

    /**
     * @notice Determine the current account liquidity wrt collateral requirements
     * @return (possible error code (semi-opaque),
                account liquidity in excess of collateral requirements,
     *          account shortfall below collateral requirements)
     */
    function getAccountLiquidity(address account) external view returns (uint, uint, uint);

    function oracle() external view returns (address);

    //isListed, collateralFactorMantissa, isComped
    function markets(address oTokenAddress) external view returns (bool, uint, bool);

    /**
     * @notice Claim all the incentive tokens accrued by holder in all markets
     * @param holder The address to claim tokens for
     */
    function claimOrb(address holder) external;

    /**
     * @notice Return the address of the tokens token
     * @return The address of tokens
     */
    function getTokenAddress() external view returns (address);
}
