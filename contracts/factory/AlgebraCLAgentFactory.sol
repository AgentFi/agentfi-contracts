// SPDX-License-Identifier: none
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { MulticallableERC2771Context } from "./../utils/MulticallableERC2771Context.sol";
import { Calls } from "./../libraries/Calls.sol";
import { Errors } from "./../libraries/Errors.sol";
import { IBlastooorStrategyAgents } from "./../interfaces/tokens/IBlastooorStrategyAgents.sol";
import { IExplorerAgents } from "./../interfaces/tokens/IExplorerAgents.sol";
import { IERC6551Registry } from "./../interfaces/erc6551/IERC6551Registry.sol";
import { IAgentRegistry } from "./../interfaces/utils/IAgentRegistry.sol";
import { IAlgebraCLAgentFactory } from "./../interfaces/factory/IAlgebraCLAgentFactory.sol";
import { Blastable } from "./../utils/Blastable.sol";
import { Ownable2Step } from "./../utils/Ownable2Step.sol";
import { IConcentratedLiquidityModuleE } from "./../interfaces/modules/IConcentratedLiquidityModuleE.sol";


/**
 * @title AlgebraCLAgentFactory
 * @author AgentFi
 * @notice A factory for strategy agents. This version integrates with Alebgra
 *
 * Agent operators can use one of the create methods to create a new agent. The agent will be created based on settings stored in the factory by the contract owner. These settings can be viewed via [`getAgentCreationSettings()`](#getagentcreationsettings).
 */
contract AlgebraCLAgentFactory is Blastable, Ownable2Step, MulticallableERC2771Context, IAlgebraCLAgentFactory {

    /***************************************
    STATE VARIABLES
    ***************************************/

    // addresses
    address internal immutable _erc6551Registry;
    address internal immutable _agentRegistry;
    address internal immutable _genesisAgentNft;
    address internal immutable _strategyAgentNft;
    address internal immutable _explorerAgentNft;
    address internal immutable _weth;

    // agent creation settings
    bool internal _isActive;
    address internal _strategyAccountImpl;
    address internal _explorerAccountImpl;
    bytes internal _strategyInitializationCall;
    bytes internal _explorerInitializationCall;

    /***************************************
    CONSTRUCTOR
    ***************************************/

    /**
     * @notice Constructs the factory contract.
     * @param owner_ The owner of the contract.
     * @param blast_ The address of the blast gas reward contract.
     * @param gasCollector_ The address of the gas collector.
     * @param blastPoints_ The address of the blast points contract.
     * @param pointsOperator_ The address of the blast points operator.
     * @param multicallForwarder_ The MulticallForwarder address.
     * @param genesisAgentNft_ The genesis agents contract.
     * @param strategyAgentNft_ The strategy agents contract.
     * @param explorerAgentNft_ The explorer agents contract.
     * @param erc6551Registry_ The erc6551 registry contract.
     * @param agentRegistry_ The agent registry contract.
     * @param weth_ The address of wrapped ether.
     */
    constructor(
        address owner_,
        address blast_,
        address gasCollector_,
        address blastPoints_,
        address pointsOperator_,
        address multicallForwarder_,
        address genesisAgentNft_,
        address strategyAgentNft_,
        address explorerAgentNft_,
        address erc6551Registry_,
        address agentRegistry_,
        address weth_
    ) Blastable(blast_, gasCollector_, blastPoints_, pointsOperator_) MulticallableERC2771Context(multicallForwarder_) {
        _transferOwnership(owner_);
        _genesisAgentNft = genesisAgentNft_;
        _strategyAgentNft = strategyAgentNft_;
        _explorerAgentNft = explorerAgentNft_;
        _erc6551Registry = erc6551Registry_;
        _agentRegistry = agentRegistry_;
        _weth = weth_;
    }

    /***************************************
    VIEW FUNCTIONS
    ***************************************/

    /**
     * @notice Gets the addresses that have been statically set.
     */
    function getStaticAddresses() external view override returns (
        address erc6551Registry_,
        address agentRegistry_,
        address genesisAgentNft_,
        address strategyAgentNft_,
        address explorerAgentNft_,
        address weth_
    ) {
        erc6551Registry_ = _erc6551Registry;
        agentRegistry_ = _agentRegistry;
        genesisAgentNft_ = _genesisAgentNft;
        strategyAgentNft_ = _strategyAgentNft;
        explorerAgentNft_ = _explorerAgentNft;
        weth_ = _weth;
    }

    /**
     * @notice Gets the agent creation settings.
     */
    function getAgentCreationSettings() external view override returns (
        address strategyAccountImpl_,
        address explorerAccountImpl_,
        bytes memory strategyInitializationCall_,
        bytes memory explorerInitializationCall_,
        bool isActive_
    ) {
        strategyAccountImpl_ = _strategyAccountImpl;
        explorerAccountImpl_ = _explorerAccountImpl;
        strategyInitializationCall_ = _strategyInitializationCall;
        explorerInitializationCall_ = _explorerInitializationCall;
        isActive_ = _isActive;
    }

    /***************************************
    CREATE AGENT FUNCTIONS
    ***************************************/

    /**
     * @notice Creates a new V3 strategy agent.
     * The new agent will be minted to an existing root agent.
     * Can only be called by the owner of the root agent.
     * @param mintParams Parameters to use to mint the position.
     * @param farmParams Parameters to use to farm rewards for the position.
     * @param deposit0 The first token and amount to deposit.
     * @param deposit1 The second token and amount to deposit.
     * @param rootAgentAddress The address of the root agent to transfer the v3 agent to.
     * @return nonfungiblePositionTokenId The ID of the concentrated liquidity position.
     * @return strategyAgentID The ID of the newly created strategy agent.
     * @return strategyAddress The address of the newly created strategy agent.
     */
    function createConcentratedLiquidityAgentForRoot(
        MintBalanceParams calldata mintParams,
        FarmParams calldata farmParams,
        TokenDeposit calldata deposit0,
        TokenDeposit calldata deposit1,
        address rootAgentAddress
    ) external payable override returns (
        uint256 nonfungiblePositionTokenId,
        uint256 strategyAgentID,
        address strategyAddress
    ) {
        // checks
        _createAgentForRootPrecheck(rootAgentAddress);
        // create v3 agent
        (nonfungiblePositionTokenId, strategyAgentID, strategyAddress) =
            _createConcentratedLiquidityAgent(mintParams, farmParams, deposit0, deposit1);
        // transfer strategy agent to root agent
        IBlastooorStrategyAgents(_strategyAgentNft).transferFrom(address(this), rootAgentAddress, strategyAgentID);
    }

    /**
     * @notice Creates a new V3 strategy agent.
     * The new agent will be minted to a new explorer agent.
     * @param mintParams Parameters to use to mint the position.
     * @param farmParams Parameters to use to farm rewards for the position.
     * @param deposit0 The first token and amount to deposit.
     * @param deposit1 The second token and amount to deposit.
     * @return nonfungiblePositionTokenId The ID of the concentrated liquidity position.
     * @return strategyAgentID The ID of the newly created strategy agent.
     * @return strategyAddress The address of the newly created strategy agent.
     * @return explorerAgentID The ID of the newly created explorer agent.
     * @return explorerAddress The address of the newly created explorer agent.
     */
    function createConcentratedLiquidityAgentAndExplorer(
        MintBalanceParams calldata mintParams,
        FarmParams calldata farmParams,
        TokenDeposit calldata deposit0,
        TokenDeposit calldata deposit1
    ) external payable override returns (
        uint256 nonfungiblePositionTokenId,
        uint256 strategyAgentID,
        address strategyAddress,
        uint256 explorerAgentID,
        address explorerAddress
    ) {
        // checks
        if(!_isActive) revert Errors.CreationSettingsPaused();
        // create explorer agent
        (explorerAgentID, explorerAddress) = _createExplorerAgent();
        // create v3 agent
        (nonfungiblePositionTokenId, strategyAgentID, strategyAddress) =
            _createConcentratedLiquidityAgent(mintParams, farmParams, deposit0, deposit1);
        // transfer v3 agent to explorer agent
        IBlastooorStrategyAgents(_strategyAgentNft).transferFrom(address(this), explorerAddress, strategyAgentID);
        // transfer explorer agent to msg sender
        IExplorerAgents(_explorerAgentNft).transferFrom(address(this), _msgSender(), explorerAgentID);
    }

    /**
     * @notice Creates a new V3 strategy agent.
     * The new agent will be minted to an existing root agent.
     * Can only be called by the owner of the root agent.
     * @param mintParams Parameters to use to mint the position.
     * @param farmParams Parameters to use to farm rewards for the position.
     * @param deposit0 The first token and amount to deposit.
     * @param deposit1 The second token and amount to deposit.
     * @param rootAgentAddress The address of the root agent to transfer the v3 agent to.
     * @return nonfungiblePositionTokenId The ID of the concentrated liquidity position.
     * @return strategyAgentID The ID of the newly created strategy agent.
     * @return strategyAddress The address of the newly created strategy agent.
     */
    function createConcentratedLiquidityAgentForRootAndRefundExcess(
        MintBalanceParams calldata mintParams,
        FarmParams calldata farmParams,
        TokenDeposit calldata deposit0,
        TokenDeposit calldata deposit1,
        address rootAgentAddress
    ) external payable override returns (
        uint256 nonfungiblePositionTokenId,
        uint256 strategyAgentID,
        address strategyAddress
    ) {
        // checks
        _createAgentForRootPrecheck(rootAgentAddress);
        // create v3 agent
        (nonfungiblePositionTokenId, strategyAgentID, strategyAddress) =
            _createConcentratedLiquidityAgentAndRefundExcess(mintParams, farmParams, deposit0, deposit1);
        // transfer strategy agent to root agent
        IBlastooorStrategyAgents(_strategyAgentNft).transferFrom(address(this), rootAgentAddress, strategyAgentID);
    }

    /**
     * @notice Creates a new V3 strategy agent.
     * The new agent will be minted to a new explorer agent.
     * @param mintParams Parameters to use to mint the position.
     * @param farmParams Parameters to use to farm rewards for the position.
     * @param deposit0 The first token and amount to deposit.
     * @param deposit1 The second token and amount to deposit.
     * @return nonfungiblePositionTokenId The ID of the concentrated liquidity position.
     * @return strategyAgentID The ID of the newly created strategy agent.
     * @return strategyAddress The address of the newly created strategy agent.
     * @return explorerAgentID The ID of the newly created explorer agent.
     * @return explorerAddress The address of the newly created explorer agent.
     */
    function createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        MintBalanceParams calldata mintParams,
        FarmParams calldata farmParams,
        TokenDeposit calldata deposit0,
        TokenDeposit calldata deposit1
    ) external payable override returns (
        uint256 nonfungiblePositionTokenId,
        uint256 strategyAgentID,
        address strategyAddress,
        uint256 explorerAgentID,
        address explorerAddress
    ) {
        // checks
        if(!_isActive) revert Errors.CreationSettingsPaused();
        // create explorer agent
        (explorerAgentID, explorerAddress) = _createExplorerAgent();
        // create v3 agent
        (nonfungiblePositionTokenId, strategyAgentID, strategyAddress) =
            _createConcentratedLiquidityAgentAndRefundExcess(mintParams, farmParams, deposit0, deposit1);
        // transfer v3 agent to explorer agent
        IBlastooorStrategyAgents(_strategyAgentNft).transferFrom(address(this), explorerAddress, strategyAgentID);
        // transfer explorer agent to msg sender
        IExplorerAgents(_explorerAgentNft).transferFrom(address(this), _msgSender(), explorerAgentID);
    }

    /***************************************
    HELPER FUNCTIONS
    ***************************************/

    /**
     * @notice Creates a new concentrated liquidity agent.
     * @param mintParams Parameters to use to mint the position.
     * @param farmParams Parameters to use to farm rewards for the position.
     * @param deposit0 The first token and amount to deposit.
     * @param deposit1 The second token and amount to deposit.
     * @return nonfungiblePositionTokenId The ID of the concentrated liquidity position.
     * @return strategyAgentID The ID of the newly created strategy agent.
     * @return strategyAddress The address of the newly created strategy agent.
     */
    function _createConcentratedLiquidityAgent(
        MintBalanceParams calldata mintParams,
        FarmParams calldata farmParams,
        TokenDeposit calldata deposit0,
        TokenDeposit calldata deposit1
    ) internal returns (
        uint256 nonfungiblePositionTokenId,
        uint256 strategyAgentID,
        address strategyAddress
    ) {
        // create nft
        (strategyAgentID, strategyAddress) = _createStrategyAgent();
        address weth = _weth;
        // handle token deposits
        if(deposit0.token == address(0)) {
            Calls.sendValue(weth, deposit0.amount);
            SafeERC20.safeTransfer(IERC20(weth), strategyAddress, deposit0.amount);
        }
        else {
            SafeERC20.safeTransferFrom(IERC20(deposit0.token), _msgSender(), strategyAddress, deposit0.amount);
        }
        if(deposit1.token == address(0)) {
            Calls.sendValue(weth, deposit1.amount);
            SafeERC20.safeTransfer(IERC20(weth), strategyAddress, deposit1.amount);
        }
        else {
            SafeERC20.safeTransferFrom(IERC20(deposit1.token), _msgSender(), strategyAddress, deposit1.amount);
        }
        // create the position in the strategy agent
        (nonfungiblePositionTokenId, , , ) =
            IConcentratedLiquidityModuleE(payable(strategyAddress)).moduleE_mintWithBalance(
                IConcentratedLiquidityModuleE.MintBalanceParams({
                  manager: mintParams.manager,
                  pool: mintParams.pool,
                  slippageLiquidity: mintParams.slippageLiquidity,
                  tickLower: mintParams.tickLower,
                  tickUpper: mintParams.tickUpper,
                  sqrtPriceX96: mintParams.sqrtPriceX96
                })
            );
        // farm the position
        IConcentratedLiquidityModuleE(payable(strategyAddress)).moduleE_enterFarming(
            IConcentratedLiquidityModuleE.FarmParams({
                rewardToken: farmParams.rewardToken,
                bonusRewardToken: farmParams.bonusRewardToken,
                nonce: farmParams.nonce
            })
        );
    }

    /**
     * @notice Creates a new concentrated liquidity agent.
     * @param mintParams Parameters to use to mint the position.
     * @param farmParams Parameters to use to farm rewards for the position.
     * @param deposit0 The first token and amount to deposit.
     * @param deposit1 The second token and amount to deposit.
     * @return nonfungiblePositionTokenId The ID of the concentrated liquidity position.
     * @return strategyAgentID The ID of the newly created strategy agent.
     * @return strategyAddress The address of the newly created strategy agent.
     */
    function _createConcentratedLiquidityAgentAndRefundExcess(
        MintBalanceParams calldata mintParams,
        FarmParams calldata farmParams,
        TokenDeposit calldata deposit0,
        TokenDeposit calldata deposit1
    ) internal returns (
        uint256 nonfungiblePositionTokenId,
        uint256 strategyAgentID,
        address strategyAddress
    ) {
        // create nft
        (strategyAgentID, strategyAddress) = _createStrategyAgent();
        address weth = _weth;
        // handle token deposits
        if(deposit0.token == address(0)) {
            Calls.sendValue(weth, deposit0.amount);
            SafeERC20.safeTransfer(IERC20(weth), strategyAddress, deposit0.amount);
        }
        else {
            SafeERC20.safeTransferFrom(IERC20(deposit0.token), _msgSender(), strategyAddress, deposit0.amount);
        }
        if(deposit1.token == address(0)) {
            Calls.sendValue(weth, deposit1.amount);
            SafeERC20.safeTransfer(IERC20(weth), strategyAddress, deposit1.amount);
        }
        else {
            SafeERC20.safeTransferFrom(IERC20(deposit1.token), _msgSender(), strategyAddress, deposit1.amount);
        }
        // create the position in the strategy agent
        (nonfungiblePositionTokenId, , , ) =
            IConcentratedLiquidityModuleE(payable(strategyAddress)).moduleE_mintWithBalanceAndRefundTo(
                IConcentratedLiquidityModuleE.MintBalanceAndRefundParams({
                  manager: mintParams.manager,
                  pool: mintParams.pool,
                  slippageLiquidity: mintParams.slippageLiquidity,
                  tickLower: mintParams.tickLower,
                  tickUpper: mintParams.tickUpper,
                  sqrtPriceX96: mintParams.sqrtPriceX96,
                  receiver: _msgSender()
                })
            );
        // farm the position
        IConcentratedLiquidityModuleE(payable(strategyAddress)).moduleE_enterFarming(
            IConcentratedLiquidityModuleE.FarmParams({
                rewardToken: farmParams.rewardToken,
                bonusRewardToken: farmParams.bonusRewardToken,
                nonce: farmParams.nonce
            })
        );
    }

    /***************************************
    HELPER FUNCTIONS for creating the agent nft and tba
    ***************************************/

    /**
     * @notice Creates a new strategy agent.
     * Includes the agent NFT and TBA.
     * Initializes the strategy but doesn't initialize the position.
     * @return strategyAgentID The ID of the new agent.
     * @return strategyAddress The address of the new agent.
     */
    function _createStrategyAgent() internal returns (
        uint256 strategyAgentID,
        address strategyAddress
    ) {
        // create nft
        address strategies = _strategyAgentNft;
        strategyAgentID = IBlastooorStrategyAgents(strategies).createAgent();
        // create account
        address accountImpl = _strategyAccountImpl;
        bytes32 salt = bytes32(uint256(0));
        strategyAddress = IERC6551Registry(_erc6551Registry).createAccount(
            accountImpl,
            salt,
            block.chainid,
            strategies,
            strategyAgentID
        );
        // register account
        IAgentRegistry(_agentRegistry).registerAgent(IAgentRegistry.RegisterAgentParam({
            agentAddress: strategyAddress,
            implementationAddress: accountImpl,
            collection: strategies,
            agentID: strategyAgentID
        }));
        // initialize account
        Calls.functionCall(strategyAddress, _strategyInitializationCall);
    }

    /**
     * @notice Creates a new explorer agent.
     * Includes the agent NFT and TBA.
     * Initializes the explorer but doesn't initialize the position.
     * @return explorerAgentID The ID of the new agent.
     * @return explorerAddress The address of the new agent.
     */
    function _createExplorerAgent() internal returns (
        uint256 explorerAgentID,
        address explorerAddress
    ) {
        // create nft
        address explorers = _explorerAgentNft;
        explorerAgentID = IExplorerAgents(explorers).createAgent();
        // create account
        address accountImpl = _explorerAccountImpl;
        bytes32 salt = bytes32(uint256(0));
        explorerAddress = IERC6551Registry(_erc6551Registry).createAccount(
            accountImpl,
            salt,
            block.chainid,
            explorers,
            explorerAgentID
        );
        // register account
        IAgentRegistry(_agentRegistry).registerAgent(IAgentRegistry.RegisterAgentParam({
            agentAddress: explorerAddress,
            implementationAddress: accountImpl,
            collection: explorers,
            agentID: explorerAgentID
        }));
        // initialize account
        Calls.functionCall(explorerAddress, _explorerInitializationCall);
    }

    /***************************************
    HELPER FUNCTIONS for prechecks
    ***************************************/

    /**
     * @notice A precheck for creating new agents to an exist root agent.
     * @param rootAgentAddress The address of the root agent to mint to.
     */
    function _createAgentForRootPrecheck(
        address rootAgentAddress
    ) internal {
        // check if is active
        if(!_isActive) revert Errors.CreationSettingsPaused();
        // check agent registry
        (address collection, uint256 rootAgentID) = IAgentRegistry(_agentRegistry).getNftOfTba(rootAgentAddress);
        // check if in one of permitted collections
        if(
            (collection == address(0)) || (
                (collection != _genesisAgentNft) &&
                (collection != _strategyAgentNft) &&
                (collection != _explorerAgentNft)
            )
        ) revert Errors.NotAnAgent();
        // check if owner
        if(IERC721(collection).ownerOf(rootAgentID) != _msgSender()) revert Errors.NotOwnerOfAgent();
    }

    /***************************************
    OWNER FUNCTIONS
    ***************************************/

    /**
     * @notice Posts a new AgentCreationSettings.
     * Can only be called by the contract owner.
     */
    function postAgentCreationSettings(
        AgentCreationSettings calldata creationSettings
    ) external payable override onlyOwner {
        _strategyAccountImpl = creationSettings.strategyAccountImpl;
        _explorerAccountImpl = creationSettings.explorerAccountImpl;
        _strategyInitializationCall = creationSettings.strategyInitializationCall;
        _explorerInitializationCall = creationSettings.explorerInitializationCall;
        _isActive = creationSettings.isActive;
        emit AgentCreationSettingsPosted();
    }
}
