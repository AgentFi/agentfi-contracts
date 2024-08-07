/* global describe it before ethers */

import hre from "hardhat";
const { ethers } = hre;
const { provider } = ethers;
import { BigNumber as BN, BigNumberish, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
const { expect, assert } = chai;

import { IERC6551Registry, BlastooorGenesisAgents, AgentFactory01, BlastooorGenesisFactory, MockERC20, MockERC721, RevertAccount, MockERC1271, GasCollector, BlastooorGenesisAgentAccount, AgentRegistry, BlastooorAccountFactory, BlastooorAccountFactoryV2, BalanceFetcher } from "./../typechain-types";

import { isDeployed, expectDeployed } from "./../scripts/utils/expectDeployed";
import { toBytes32 } from "./../scripts/utils/setStorage";
import { getNetworkSettings } from "../scripts/utils/getNetworkSettings";
import { decimalsToAmount } from "../scripts/utils/price";
import { deployContract } from "../scripts/utils/deployContract";
import L1DataFeeAnalyzer from "../scripts/utils/L1DataFeeAnalyzer";
import { MulticallProvider, MulticallContract } from "./../scripts/utils/multicall";
import { getSelectors, FacetCutAction, calcSighash, calcSighashes, getCombinedAbi } from "./../scripts/utils/diamond"
import { sign, assembleSignature, getMintFromAllowlistDigest, getMintFromAllowlistSignature } from "./../scripts/utils/signature";
import { getERC20PermitSignature } from "./../scripts/utils/getERC20PermitSignature";
import { convertToStruct } from "../scripts/utils/test";
import { moduleCFunctionParams as functionParams } from "../scripts/configuration/ConcentratedLiquidityModuleC";

const { AddressZero, WeiPerEther, MaxUint256, Zero } = ethers.constants;
const { formatUnits } = ethers.utils;

const ERC6551_REGISTRY_ADDRESS        = "0x000000006551c19487814612e58FE06813775758";
const BLAST_ADDRESS                   = "0x4300000000000000000000000000000000000002";
const BLAST_POINTS_ADDRESS            = "0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800";
const BLAST_POINTS_OPERATOR_ADDRESS   = "0x454c0C1CF7be9341d82ce0F16979B8689ED4AAD0";

const ENTRY_POINT_ADDRESS             = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const MULTICALL_FORWARDER_ADDRESS     = "0xAD55F8b65d5738C6f63b54E651A09cC5d873e4d8"; // v1.0.1
const CONTRACT_FACTORY_ADDRESS        = "0x9D735e7926729cAB93b10cb5814FF8487Fb6D5e8"; // v1.0.0

const GAS_COLLECTOR_ADDRESS           = "0xf237c20584DaCA970498917470864f4d027de4ca"; // v1.0.0
const BALANCE_FETCHER_ADDRESS         = "0x3f8Dc480BEAeF711ecE5110926Ea2780a1db85C5"; // v1.0.1

const GENESIS_COLLECTION_ADDRESS      = "0x5066A1975BE96B777ddDf57b496397efFdDcB4A9"; // v1.0.0
const GENESIS_FACTORY_ADDRESS         = "0x700b6f8B315247DD41C42A6Cfca1dAE6B4567f3B"; // v1.0.0
const GENESIS_ACCOUNT_IMPL_ADDRESS    = "0xb9b7FFBaBEC52DFC0589f7b331E4B8Cb78E06301"; // v1.0.1
const GENESIS_ACCOUNT_FACTORY_ADDRESS = "0x101E03D71e756Da260dC5cCd19B6CdEEcbB4397F"; // v1.0.1

const AGENT_REGISTRY_ADDRESS          = "0x12F0A3453F63516815fe41c89fAe84d218Af0FAF"; // v1.0.1

const STRATEGY_COLLECTION_ADDRESS     = "0x73E75E837e4F3884ED474988c304dE8A437aCbEf"; // v1.0.1
const STRATEGY_FACTORY_ADDRESS        = "0x09906C1eaC081AC4aF24D6F7e05f7566440b4601"; // v1.0.1
const STRATEGY_ACCOUNT_IMPL_ADDRESS   = "0x4b1e8C60E4a45FD64f5fBf6c497d17Ab12fba213"; // v1.0.1

const DISPATCHER_ADDRESS              = "0x59c0269f4120058bA195220ba02dd0330d92c36D"; // v1.0.1


const WETH_ADDRESS                    = "0x4300000000000000000000000000000000000004";
const USDB_ADDRESS                    = "0x4300000000000000000000000000000000000003";

const THRUSTER_POSITION_MANAGER_ADDRESS = "0x434575EaEa081b735C985FA9bf63CD7b87e227F9";
const THRUSTER_POOL_WETH_USDB_030_ADDRESS = "0xf00DA13d2960Cf113edCef6e3f30D92E52906537";


const THRUSTER_ROUTER_ADDRESS_030     = "0x98994a9A7a2570367554589189dC9772241650f6"; // 0.3% fee
const THRUSTER_ROUTER_ADDRESS_100     = "0x44889b52b71E60De6ed7dE82E2939fcc52fB2B4E"; // 1% fee
const THRUSTER_LP_TOKEN_ADDRESS       = "0x12c69BFA3fb3CbA75a1DEFA6e976B87E233fc7df";

const HYPERLOCK_STAKING_ADDRESS       = "0xC3EcaDB7a5faB07c72af6BcFbD588b7818c4a40e";

//const UNIVERSAL_ROUTER_ADDRESS        = "";
const RING_SWAP_V2_ROUTER_ADDRESS     = "0x7001F706ACB6440d17cBFaD63Fa50a22D51696fF";
const RING_STAKING_REWARDS_ADDRESS    = "0xEff87A51f5Abd015F1AFCD5737BBab450eA15A24";
const RING_FWWETH_ADDRESS             = "0x66714DB8F3397c767d0A602458B5b4E3C0FE7dd1";
const RING_FWUSDB_ADDRESS             = "0x866f2C06B83Df2ed7Ca9C2D044940E7CD55a06d6";
const RING_LP_TOKEN_ADDRESS           = "0x9BE8a40C9cf00fe33fd84EAeDaA5C4fe3f04CbC3";
const RING_FWLP_TOKEN_ADDRESS         = "0xA3F8128166E54d49A65ec2ba12b45965E4FA87C9";
//const RING_ADDRESS                    = "";
const RING_ADDRESS                    = "0x4300000000000000000000000000000000000003";
const RING_STAKING_REWARDS_INDEX      = 3;

const BLASTERSWAP_ROUTER_ADDRESS      = "0xc972FaE6b524E8A6e0af21875675bF58a3133e60";
const BLASTERSWAP_LP_TOKEN_ADDRESS    = "0x3b5d3f610Cc3505f4701E9FB7D0F0C93b7713adD";


const MAGIC_VALUE_0 = "0x00000000";
const MAGIC_VALUE_IS_VALID_SIGNER = "0x523e3260";
const MAGIC_VALUE_IS_VALID_SIGNATURE = "0x1626ba7e";

const STRATEGY_MANAGER_ROLE = "0x4170d100a3a3728ae51207936ee755ecaa64a7f6e9383c642ab204a136f90b1b";

describe("ConcentratedLiquidityAgentFactory", function () {
  let deployer: SignerWithAddress;
  let owner: SignerWithAddress;
  let strategyManager: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;
  let user6: SignerWithAddress;
  let user7: SignerWithAddress;

  let erc6551Registry: IERC6551Registry;

  let gasCollector: GasCollector;
  let genesisAgentNft: BlastooorGenesisAgents;
  let strategyAgentNft: BlastooorStrategyAgents;
  let explorerAgentNft: ExplorerAgents;
  let genesisAccountImplementation: BlastooorGenesisAgentAccount; // the base implementation for token bound accounts
  let strategyAccountImplementation: BlastooorStrategyAgentAccount; // the base implementation for token bound accounts
  let explorerAccountImplementation: ExplorerAgentAccount; // the base implementation for token bound accounts
  let genesisFactory: BlastooorGenesisFactory;
  let strategyFactory: BlastooorStrategyFactory;
  let dispatcher: Dispatcher;
  let strategyModuleA: DexBalancerModuleA;
  let multicallForwarder: MulticallForwarder;
  let agentRegistry: AgentRegistry;
  let genesisAccountFactory: BlastooorAccountFactory;
  let genesisAccountFactoryV2: BlastooorAccountFactoryV2;
  let balanceFetcher: BalanceFetcher;
  let clAgentFactory: ConcentratedLiquidityAgentFactory;

  let tbaccountG1A: BlastooorGenesisAgentAccount; // an account bound to a token
  let tbaccountG1B: BlastooorGenesisAgentAccount; // an account bound to a token
  let tbaccountG1C: BlastooorGenesisAgentAccount; // an account bound to a token
  let tbaccountG2A: BlastooorGenesisAgentAccount; // an account bound to a token
  let tbaccountG2B: BlastooorGenesisAgentAccount; // an account bound to a token
  let tbaccountS1: BlastooorStrategyAgentAccount; // an account bound to a token
  let tbaccountS2: BlastooorStrategyAgentAccount; // an account bound to a token
  let tbaccountS3: BlastooorStrategyAgentAccount; // an account bound to a token
  let tbaccountS4: BlastooorStrategyAgentAccount; // an account bound to a token
  let tbaccountS5: BlastooorStrategyAgentAccount; // an account bound to a token
  let tbaccountS6: BlastooorStrategyAgentAccount; // an account bound to a token
  let tbaccountS7: BlastooorStrategyAgentAccount; // an account bound to a token
  let agentInitializationCode1: any;
  let agentInitializationCode2: any;
  let tbaccountE1: BlastooorStrategyAgentAccount; // an account bound to a token

  let moduleC: ConcentratedLiquidityModuleC;
  let gatewayModuleC: ConcentratedLiquidityGatewayModuleC;

  let erc20a: MockERC20;
  let erc20b: MockERC20;
  let erc20c: MockERC20;
  let weth: MockERC20;
  let usdb: MockERC20;

  let mockERC1271: MockERC1271;

  let thrusterRouter_030: IThrusterRouter;
  let thrusterRouter_100: IThrusterRouter;
  let thrusterLpToken: MockERC20;
  let thrusterPositionManager: INonfungiblePositionManager;

  let hyperlockStaking: IHyperlockStaking;

  let ring: MockERC20;
  let ringLpToken: MockERC20;
  let ringStakingRewards: IFixedStakingRewards;

  let blasterRouter: IBlasterswapV2Router02;
  let blasterLpToken: MockERC20;

  let collectionListGenesis = []
  let collectionListStrategy = []
  let collectionListAll = []
  let tokenList = []

  let chainID: number;
  let networkSettings: any;
  let snapshot: BN;

  let l1DataFeeAnalyzer = new L1DataFeeAnalyzer();

  before(async function () {
    [deployer, owner, strategyManager, user1, user2, user3, user4, user5, user6, user7] = await ethers.getSigners();
    chainID = (await provider.getNetwork()).chainId;
    networkSettings = getNetworkSettings(chainID);
    if(!networkSettings.isTestnet) throw new Error("Do not run tests on production networks");
    snapshot = await provider.send("evm_snapshot", []);
    await deployer.sendTransaction({to:deployer.address}); // for some reason this helps solidity-coverage

    erc20a = await deployContract(deployer, "MockERC20", [`Token A`, `TKNA`, 18]) as MockERC20;
    erc20b = await deployContract(deployer, "MockERC20", [`Token B`, `TKNB`, 18]) as MockERC20;
    erc20c = await deployContract(deployer, "MockERC20", [`Token C`, `TKNC`, 18]) as MockERC20;

    await expectDeployed(ERC6551_REGISTRY_ADDRESS); // expect to be run on a fork of a testnet with registry deployed
    //await expectDeployed(THRUSTER_ROUTER_ADDRESS_030);
    //await expectDeployed(THRUSTER_ROUTER_ADDRESS_100);
    await expectDeployed(THRUSTER_POSITION_MANAGER_ADDRESS);
    await expectDeployed(THRUSTER_POOL_WETH_USDB_030_ADDRESS);
    await expectDeployed(WETH_ADDRESS);
    await expectDeployed(USDB_ADDRESS);

    erc6551Registry = await ethers.getContractAt("IERC6551Registry", ERC6551_REGISTRY_ADDRESS) as IERC6551Registry;

    weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS) as MockERC20;
    usdb = await ethers.getContractAt("MockERC20", USDB_ADDRESS) as MockERC20;

    thrusterRouter_030 = await ethers.getContractAt("IThrusterRouter", THRUSTER_ROUTER_ADDRESS_030) as IThrusterRouter;
    thrusterRouter_100 = await ethers.getContractAt("IThrusterRouter", THRUSTER_ROUTER_ADDRESS_100) as IThrusterRouter;
    thrusterLpToken = await ethers.getContractAt("MockERC20Permit", THRUSTER_LP_TOKEN_ADDRESS) as MockERC20;
    thrusterPositionManager = await ethers.getContractAt("contracts/interfaces/external/Thruster/INonfungiblePositionManager.sol:INonfungiblePositionManager", THRUSTER_POSITION_MANAGER_ADDRESS) as INonfungiblePositionManager;

    hyperlockStaking = await ethers.getContractAt("IHyperlockStaking", HYPERLOCK_STAKING_ADDRESS) as IHyperlockStaking;

    //ring = await ethers.getContractAt("MockERC20", RING_ADDRESS) as MockERC20;
    ringLpToken = await ethers.getContractAt("MockERC20Permit", RING_LP_TOKEN_ADDRESS) as MockERC20;
    ringStakingRewards = await ethers.getContractAt("IFixedStakingRewards", RING_STAKING_REWARDS_ADDRESS) as IFixedStakingRewards;

    blasterRouter = await ethers.getContractAt("IBlasterswapV2Router02", BLASTERSWAP_ROUTER_ADDRESS) as IBlasterswapV2Router02;
    blasterLpToken = await ethers.getContractAt("MockERC20Permit", BLASTERSWAP_LP_TOKEN_ADDRESS) as MockERC20;

    tokenList = [AddressZero, WETH_ADDRESS, USDB_ADDRESS, erc20a.address]
  });

  after(async function () {
    await provider.send("evm_revert", [snapshot]);
  });

  describe("setup", function () {
    it("can deploy gas collector", async function () {
      gasCollector = await deployContract(deployer, "GasCollector", [owner.address, BLAST_ADDRESS, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]);
      await expectDeployed(gasCollector.address);
      expect(await gasCollector.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy GasCollector", gasCollector.deployTransaction);
    })
    it("can deploy genesis agent ERC721", async function () {
      genesisAgentNft = await deployContract(deployer, "BlastooorGenesisAgents", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, ERC6551_REGISTRY_ADDRESS]) as BlastooorGenesisAgents;
      await expectDeployed(genesisAgentNft.address);
      expect(await genesisAgentNft.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy BlastooorGenesisAgents", genesisAgentNft.deployTransaction);
      expect(await genesisAgentNft.totalSupply()).eq(0);
      expect(await genesisAgentNft.balanceOf(user1.address)).eq(0);
      expect(await genesisAgentNft.getERC6551Registry()).eq(ERC6551_REGISTRY_ADDRESS);
      collectionListGenesis = [genesisAgentNft.address]
    });
    it("can deploy MulticallForwarder", async function () {
      multicallForwarder = await deployContract(deployer, "MulticallForwarder", [BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]) as MulticallForwarder;
      await expectDeployed(multicallForwarder.address);
      l1DataFeeAnalyzer.register("deploy MulticallForwarder", multicallForwarder.deployTransaction);
    });
    it("can deploy BlastooorGenesisAgentAccount implementation", async function () {
      genesisAccountImplementation = await deployContract(deployer, "BlastooorGenesisAgentAccount", [BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, ENTRY_POINT_ADDRESS, multicallForwarder.address, ERC6551_REGISTRY_ADDRESS, AddressZero]) as BlastooorGenesisAgentAccount;
      await expectDeployed(genesisAccountImplementation.address);
      l1DataFeeAnalyzer.register("deploy BlastooorGenesisAgentAccount impl", genesisAccountImplementation.deployTransaction);
    });
    it("can deploy BlastooorGenesisFactory", async function () {
      genesisFactory = await deployContract(deployer, "BlastooorGenesisFactory", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, genesisAgentNft.address]) as BlastooorGenesisFactory;
      await expectDeployed(genesisFactory.address);
      expect(await genesisFactory.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy BlastooorGenesisFactory", genesisFactory.deployTransaction);
    });
    it("can deploy AgentRegistry", async function () {
      agentRegistry = await deployContract(deployer, "AgentRegistry", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]) as AgentRegistry;
      await expectDeployed(agentRegistry.address);
      expect(await agentRegistry.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy AgentRegistry", agentRegistry.deployTransaction);
    });
    it("can deploy BlastooorAccountFactory", async function () {
      genesisAccountFactory = await deployContract(deployer, "BlastooorAccountFactory", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, multicallForwarder.address, genesisAgentNft.address, agentRegistry.address, ERC6551_REGISTRY_ADDRESS]) as BlastooorAccountFactory;
      await expectDeployed(genesisAccountFactory.address);
      expect(await genesisAccountFactory.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy BlastooorAccountFactory", genesisAccountFactory.deployTransaction);
    });
    it("can deploy BlastooorAccountFactoryV2", async function () {
      genesisAccountFactoryV2 = await deployContract(deployer, "BlastooorAccountFactoryV2", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, genesisAgentNft.address, agentRegistry.address, ERC6551_REGISTRY_ADDRESS]) as BlastooorAccountFactoryV2;
      await expectDeployed(genesisAccountFactoryV2.address);
      expect(await genesisAccountFactoryV2.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy BlastooorAccountFactoryV2", genesisAccountFactoryV2.deployTransaction);
    });
    it("can deploy BlastooorStrategyAgents ERC721", async function () {
      strategyAgentNft = await deployContract(deployer, "BlastooorStrategyAgents", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]) as BlastooorStrategyAgents;
      await expectDeployed(strategyAgentNft.address);
      expect(await strategyAgentNft.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy BlastooorStrategyAgents", strategyAgentNft.deployTransaction);
      expect(await strategyAgentNft.totalSupply()).eq(0);
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0);
      collectionListStrategy = [strategyAgentNft.address]
      collectionListAll = [genesisAgentNft.address, strategyAgentNft.address]
    });
    it("can deploy BlastooorStrategyAgentAccount implementation", async function () {
      strategyAccountImplementation = await deployContract(deployer, "BlastooorStrategyAgentAccount", [BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, ENTRY_POINT_ADDRESS, multicallForwarder.address, ERC6551_REGISTRY_ADDRESS, AddressZero]) as BlastooorGenesisAgentAccount;
      await expectDeployed(strategyAccountImplementation.address);
      l1DataFeeAnalyzer.register("deploy BlastooorStrategyAgentAccount impl", strategyAccountImplementation.deployTransaction);
    });
    it("can deploy BlastooorStrategyFactory", async function () {
      strategyFactory = await deployContract(deployer, "BlastooorStrategyFactory", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, genesisAgentNft.address, strategyAgentNft.address, ERC6551_REGISTRY_ADDRESS, agentRegistry.address]) as BlastooorStrategyFactory;
      await expectDeployed(strategyFactory.address);
      expect(await strategyFactory.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy BlastooorStrategyFactory", strategyFactory.deployTransaction);
    });
    it("can deploy Dispatcher", async function () {
      dispatcher = await deployContract(deployer, "Dispatcher", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]);
      await expectDeployed(dispatcher.address);
      expect(await dispatcher.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy Dispatcher", dispatcher.deployTransaction);
    })
    it("can deploy ExplorerAgents ERC721", async function () {
      explorerAgentNft = await deployContract(deployer, "ExplorerAgents", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]) as ExplorerAgents;
      await expectDeployed(explorerAgentNft.address);
      expect(await explorerAgentNft.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy ExplorerAgents", explorerAgentNft.deployTransaction);
      expect(await explorerAgentNft.totalSupply()).eq(0);
      expect(await explorerAgentNft.balanceOf(user1.address)).eq(0);
      collectionListStrategy = [explorerAgentNft.address]
      collectionListAll = [genesisAgentNft.address, explorerAgentNft.address]
    });
    it("can deploy ExplorerAgentAccount implementation", async function () {
      explorerAccountImplementation = await deployContract(deployer, "ExplorerAgentAccount", [BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, ENTRY_POINT_ADDRESS, multicallForwarder.address, ERC6551_REGISTRY_ADDRESS, AddressZero]) as ExplorerAgentAccount;
      await expectDeployed(explorerAccountImplementation.address);
      l1DataFeeAnalyzer.register("deploy ExplorerAgentAccount impl", explorerAccountImplementation.deployTransaction);

      //explorerAccountImplementation = genesisAccountImplementation
    });
    it("can deploy ConcentratedLiquidityAgentFactory", async function () {
      clAgentFactory = await deployContract(deployer, "ConcentratedLiquidityAgentFactory", [owner.address, BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS, multicallForwarder.address, genesisAgentNft.address, strategyAgentNft.address, explorerAgentNft.address, ERC6551_REGISTRY_ADDRESS, agentRegistry.address, WETH_ADDRESS]) as ConcentratedLiquidityAgentFactory;
      await expectDeployed(clAgentFactory.address);
      expect(await clAgentFactory.owner()).eq(owner.address);
      l1DataFeeAnalyzer.register("deploy ConcentratedLiquidityAgentFactory", clAgentFactory.deployTransaction);
    });
    it("can deploy ConcentratedLiquidityModuleC", async function () {
      moduleC = await deployContract(deployer, "ConcentratedLiquidityModuleC", [BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]) as ConcentratedLiquidityModuleC;
      await expectDeployed(moduleC.address);
      l1DataFeeAnalyzer.register("deploy ConcentratedLiquidityModuleC", moduleC.deployTransaction);
    });
    it("can deploy ConcentratedLiquidityGatewayModuleC", async function () {
      gatewayModuleC = await deployContract(deployer, "ConcentratedLiquidityGatewayModuleC", [BLAST_ADDRESS, gasCollector.address, BLAST_POINTS_ADDRESS, BLAST_POINTS_OPERATOR_ADDRESS]) as ConcentratedLiquidityGatewayModuleC;
      await expectDeployed(gatewayModuleC.address);
      l1DataFeeAnalyzer.register("deploy ConcentratedLiquidityGatewayModuleC", gatewayModuleC.deployTransaction);
    });
  });

  describe("genesis agent creation", function () {
    it("owner can whitelist", async function () {
      let whitelist = [
        {
          factory: genesisFactory.address,
          shouldWhitelist: true
        }
      ];
      let tx = await genesisAgentNft.connect(owner).setWhitelist(whitelist);
      for(let i = 0; i < whitelist.length; i++) {
        let whitelistItem = whitelist[i]
        await expect(tx).to.emit(genesisAgentNft, "FactoryWhitelisted").withArgs(whitelistItem.factory, whitelistItem.shouldWhitelist);
        expect(await genesisAgentNft.factoryIsWhitelisted(whitelistItem.factory)).eq(whitelistItem.shouldWhitelist);
      }
      l1DataFeeAnalyzer.register("whitelist factories[1]", tx);
    });
    it("owner can postAgentCreationSettings", async function () {
      let params = {
        agentImplementation: genesisAccountImplementation.address,
        initializationCalls: [],
        isActive: true,
        paymentToken: AddressZero,
        paymentAmount: WeiPerEther.mul(1).div(100),
        paymentReceiver: owner.address,
        timestampAllowlistMintStart: 0,
        timestampAllowlistMintEnd: 1,
        timestampPublicMintStart: 0,
      }
      let tx = await genesisFactory.connect(owner).postAgentCreationSettings(params)
      let res = await genesisFactory.getAgentCreationSettings()
      expect(res.agentImplementation).eq(params.agentImplementation)
      expect(res.initializationCalls.length).eq(params.initializationCalls.length)
      expect(res.isActive).eq(params.isActive)
      await expect(tx).to.emit(genesisFactory, "AgentCreationSettingsPosted")
      l1DataFeeAnalyzer.register("postAgentCreationSettings", tx);
    })
    it("can create genesis agents", async function () {
      let tx = await genesisFactory.connect(user1).blastooorPublicMint(10, {value:WeiPerEther.div(100).mul(10)});
    });
    it("owner can post settings", async function () {
      let tx = await genesisAccountFactoryV2.connect(owner).postAgentCreationSettings({
        agentImplementation: genesisAccountImplementation.address,
        initializationCalls: [
          genesisAccountImplementation.interface.encodeFunctionData("blastConfigure()")
        ]
      })
      let settings = await genesisAccountFactoryV2.getAgentCreationSettings()
      expect(settings.agentNft).eq(genesisAgentNft.address)
      expect(settings.agentImplementation).eq(genesisAccountImplementation.address)
      expect(settings.initializationCalls.length).eq(1)
      await expect(tx).to.emit(genesisAccountFactoryV2, "AgentCreationSettingsPosted")
    })
    it("can set agent registry operator", async function () {
      let params1 = [
        {
          account: genesisAccountFactoryV2.address,
          isAuthorized: true,
        },
        {
          account: user5.address,
          isAuthorized: true,
        },
      ]
      let tx = await agentRegistry.connect(owner).setOperators(params1)
      l1DataFeeAnalyzer.register("setOperators", tx);
    })
    it("owner create accounts", async function () {
      let txnum = 0
      let supply = await genesisAgentNft.totalSupply()
      while(true) {
        let lastCheckedAgentID0 = await genesisAccountFactoryV2.lastCheckedAgentID()
        if(lastCheckedAgentID0.gte(supply)) {
          //console.log(`\n\nLast agent checked: ${lastCheckedAgentID0.toNumber()}. Supply: ${supply.toNumber()}. breaking`)
          break
        }
        ++txnum
        //console.log(`\n\nLast agent checked: ${lastCheckedAgentID0.toNumber()}. Supply: ${supply.toNumber()}. sending tx ${txnum}`)
        let tx = await genesisAccountFactoryV2.connect(owner).createAccounts({gasLimit: 15_000_000})
        l1DataFeeAnalyzer.register("createAccounts", tx);
        let receipt = await tx.wait()
        //console.log(`gasUsed: ${receipt.gasUsed.toNumber().toLocaleString()}`)
      }
    })
  });

  describe("initial values", function () {
    it("static addresses are set properly", async function () {
      let res = await clAgentFactory.getStaticAddresses()
      expect(res.erc6551Registry_).eq(erc6551Registry.address)
      expect(res.agentRegistry_).eq(agentRegistry.address)
      expect(res.genesisAgentNft_).eq(genesisAgentNft.address)
      expect(res.strategyAgentNft_).eq(strategyAgentNft.address)
      expect(res.explorerAgentNft_).eq(explorerAgentNft.address)
      expect(res.weth_).eq(weth.address)
    })
    it("creation settings are initially empty", async function () {
      let res = await clAgentFactory.getAgentCreationSettings()
      expect(res.strategyAccountImpl_).eq(AddressZero)
      expect(res.explorerAccountImpl_).eq(AddressZero)
      expect(res.strategyInitializationCall_).eq("0x")
      expect(res.explorerInitializationCall_).eq("0x")
      expect(res.isActive_).eq(false)
    })
  });

  describe("ways to not create agents pt 1", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let deposit0 = {
      token: WETH_ADDRESS,
      amount: WeiPerEther.div(10)
    }
    let deposit1 = {
      token: USDB_ADDRESS,
      amount: WeiPerEther.mul(300)
    }
    let depositLpToken = {
      token: THRUSTER_LP_TOKEN_ADDRESS,
      amount: WeiPerEther.div(10000)
    }
    it("cannot create agents if inactive pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "CreationSettingsPaused")
    })
    it("cannot create agents if inactive pt 2", async function () {
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(clAgentFactory, "CreationSettingsPaused")
    })
    it("cannot create agents if inactive pt 3", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "CreationSettingsPaused")
    })
    it("cannot create agents if inactive pt 4", async function () {
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(clAgentFactory, "CreationSettingsPaused")
    })
    it("cannot create agents if inactive pt 5", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndMigrate(
        mintParams, depositLpToken, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "CreationSettingsPaused")
    })
    it("cannot create agents if inactive pt 6", async function () {
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndMigrate(
        mintParams, depositLpToken
      )).to.be.revertedWithCustomError(clAgentFactory, "CreationSettingsPaused")
    })
  });

  describe("post settings", function () {
    it("non owner cannot post settings", async function () {
      await expect(clAgentFactory.connect(user1).postAgentCreationSettings({
        strategyAccountImpl: strategyAccountImplementation.address,
        explorerAccountImpl: explorerAccountImplementation.address,
        strategyInitializationCall: "0x",
        explorerInitializationCall: "0x",
        isActive: true,
      })).to.be.revertedWithCustomError(clAgentFactory, "NotContractOwner")
    })
    it("owner can post settings", async function () {
      let blastConfigureCalldata = strategyAccountImplementation.interface.encodeFunctionData("blastConfigure()")
      let overrides = [
        {
          implementation: gatewayModuleC.address,
          functionParams: functionParams
        }
      ]
      let setOverridesCalldata = strategyAccountImplementation.interface.encodeFunctionData("setOverrides", [overrides])
      let txdatas = [blastConfigureCalldata, setOverridesCalldata]
      let multicallCalldata = strategyAccountImplementation.interface.encodeFunctionData("multicall", [txdatas])
      let settings1 = {
        strategyAccountImpl: strategyAccountImplementation.address,
        explorerAccountImpl: explorerAccountImplementation.address,
        strategyInitializationCall: multicallCalldata,
        explorerInitializationCall: blastConfigureCalldata,
        isActive: true,
      }
      let tx = await clAgentFactory.connect(owner).postAgentCreationSettings(settings1)
      await expect(tx).to.emit(clAgentFactory, "AgentCreationSettingsPosted")
      let res = await clAgentFactory.getAgentCreationSettings()
      expect(res.strategyAccountImpl_).eq(settings1.strategyAccountImpl)
      expect(res.explorerAccountImpl_).eq(settings1.explorerAccountImpl)
      expect(res.strategyInitializationCall_).eq(settings1.strategyInitializationCall)
      expect(res.explorerInitializationCall_).eq(settings1.explorerInitializationCall)
      expect(res.isActive_).eq(settings1.isActive)
      l1DataFeeAnalyzer.register("ConcentratedLiquidityAgentFactory.postAgentCreationSettings", tx);
    })
  });

  describe("ways to not create agents pt 2", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let deposit0 = {
      token: WETH_ADDRESS,
      amount: WeiPerEther.div(10)
    }
    let deposit1 = {
      token: USDB_ADDRESS,
      amount: WeiPerEther.mul(300)
    }

    it("cannot create a v3 agent for not an agent pt 1", async function () {
      let rootAgentAddress = AddressZero
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for not an agent pt 2", async function () {
      let rootAgentAddress = user1.address
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for not an agent pt 3", async function () {
      let rootAgentAddress = strategyAccountImplementation.address
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for not an agent pt 4", async function () {
      let rootAgentAddress = AddressZero
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for not an agent pt 5", async function () {
      let rootAgentAddress = user1.address
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for not an agent pt 6", async function () {
      let rootAgentAddress = strategyAccountImplementation.address
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("register more agents", async function () {
      let registerAgentParams = [
        {
            agentAddress: user1.address,
            implementationAddress: user1.address,
            collection: user1.address,
            agentID: 999,
        },
        {
            agentAddress: user2.address,
            implementationAddress: user2.address,
            collection: genesisAgentNft.address,
            agentID: 999,
        },
        {
            agentAddress: user3.address,
            implementationAddress: user3.address,
            collection: strategyAgentNft.address,
            agentID: 999,
        },
        {
            agentAddress: user4.address,
            implementationAddress: user4.address,
            collection: explorerAgentNft.address,
            agentID: 999,
        },
      ]
      await agentRegistry.connect(user5).registerAgents(registerAgentParams)
    })
    it("cannot create a v3 agent for not an agent pt 7", async function () {
      let rootAgentAddress = user1.address
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for not an agent pt 8", async function () {
      let rootAgentAddress = user1.address
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotAnAgent")
    })
    it("cannot create a v3 agent for a root agent you dont own pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user2).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotOwnerOfAgent")
    })
    it("cannot create a v3 agent for a root agent you dont own pt 2", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user2).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(clAgentFactory, "NotOwnerOfAgent")
    })
    it("cannot create a v3 agent with insufficient balance pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.reverted
    })
    it("cannot create a v3 agent with insufficient balance pt 2", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.reverted
    })
    it("get tokens", async function () {
      expect(await weth.balanceOf(user1.address)).eq(0)
      expect(await usdb.balanceOf(user1.address)).eq(0)

      //await weth.connect(user1).deposit({value: WeiPerEther})
      await user1.sendTransaction({
        to: WETH_ADDRESS,
        value: WeiPerEther.mul(10),
        gasLimit: 100_000
      })

      let amountIn = WeiPerEther.mul(10)
      let amountOutMin = WeiPerEther.mul(10_000)
      let path = [WETH_ADDRESS, USDB_ADDRESS]
      let tx = await thrusterRouter_030.connect(user1).swapExactETHForTokens(amountOutMin, path, user1.address, MaxUint256, {value:amountIn})

      expect(await weth.balanceOf(user1.address)).eq(WeiPerEther.mul(10))
      expect(await usdb.balanceOf(user1.address)).gte(amountOutMin)
    })
    it("cannot create a v3 agent with insufficient allowance pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.reverted
    })
    it("cannot create a v3 agent with insufficient allowance pt 2", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.reverted
    })
    it("approve", async function () {
      await weth.connect(user1).approve(clAgentFactory.address, MaxUint256)
      await usdb.connect(user1).approve(clAgentFactory.address, MaxUint256)
    })
    it("cannot create a v3 agent if factory is not whitelisted for strategy agents pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(strategyAgentNft, "FactoryNotWhitelisted")
    })
    it("cannot create a v3 agent if factory is not whitelisted for strategy agents pt 2", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(strategyAgentNft, "FactoryNotWhitelisted")
    })
    it("cannot create a v3 agent if factory is not whitelisted for strategy agents pt 3", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(strategyAgentNft, "FactoryNotWhitelisted")
    })
    it("cannot create a v3 agent if factory is not whitelisted for strategy agents pt 4", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(strategyAgentNft, "FactoryNotWhitelisted")
    })
    it("whitelist factory for strategy agents", async function () {
      let whitelist = [
        {
          factory: clAgentFactory.address,
          shouldWhitelist: true
        }
      ];
      let tx = await strategyAgentNft.connect(owner).setWhitelist(whitelist);
      for(let i = 0; i < whitelist.length; i++) {
        let whitelistItem = whitelist[i]
        await expect(tx).to.emit(strategyAgentNft, "FactoryWhitelisted").withArgs(whitelistItem.factory, whitelistItem.shouldWhitelist);
        expect(await strategyAgentNft.factoryIsWhitelisted(whitelistItem.factory)).eq(whitelistItem.shouldWhitelist);
      }
      l1DataFeeAnalyzer.register("whitelist factories 2", tx);
    });
    it("cannot create a explorer agent if factory is not whitelisted for explorer agents pt 1", async function () {
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(explorerAgentNft, "FactoryNotWhitelisted")
    })
    it("cannot create a explorer agent if factory is not whitelisted for explorer agents pt 2", async function () {
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(explorerAgentNft, "FactoryNotWhitelisted")
    })
    it("whitelist factory for explorer agents", async function () {
      let whitelist = [
        {
          factory: clAgentFactory.address,
          shouldWhitelist: true
        }
      ];
      let tx = await explorerAgentNft.connect(owner).setWhitelist(whitelist);
      for(let i = 0; i < whitelist.length; i++) {
        let whitelistItem = whitelist[i]
        await expect(tx).to.emit(explorerAgentNft, "FactoryWhitelisted").withArgs(whitelistItem.factory, whitelistItem.shouldWhitelist);
        expect(await explorerAgentNft.factoryIsWhitelisted(whitelistItem.factory)).eq(whitelistItem.shouldWhitelist);
      }
      l1DataFeeAnalyzer.register("whitelist factories 2", tx);
    });
    it("cannot create agent if factory is not registry operator pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(agentRegistry, "NotOperator");
    });
    it("cannot create agent if factory is not registry operator pt 2", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )).to.be.revertedWithCustomError(agentRegistry, "NotOperator");
    });
    it("cannot create agent if factory is not registry operator pt 3", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(agentRegistry, "NotOperator");
    });
    it("cannot create agent if factory is not registry operator pt 4", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1
      )).to.be.revertedWithCustomError(agentRegistry, "NotOperator");
    });
    it("registry setup", async function () {
      let params1 = [
        {
          account: clAgentFactory.address,
          isAuthorized: true,
        },
      ]
      let tx = await agentRegistry.connect(owner).setOperators(params1)
      for(let i = 0; i < params1.length; i++) {
        let { account, isAuthorized } = params1[i]
        await expect(tx).to.emit(agentRegistry, "OperatorSet").withArgs(account, isAuthorized);
        expect(await agentRegistry.isOperator(account)).eq(isAuthorized);
      }
    });
    it("cannot create a v3 agent using eth with insufficient value pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      deposit0.token = AddressZero
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit0.amount.sub(1)}
      )).to.be.revertedWithCustomError(clAgentFactory, "InsufficientBalance");
    })
    it("cannot create a v3 agent using eth with insufficient value pt 2", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      deposit0.token = AddressZero
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit0.amount.sub(1)}
      )).to.be.revertedWithCustomError(clAgentFactory, "InsufficientBalance");
    })
    it("cannot create a v3 agent using eth with insufficient value pt 3", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      deposit0.token = AddressZero
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1, {value: deposit0.amount.sub(1)}
      )).to.be.revertedWithCustomError(clAgentFactory, "InsufficientBalance");
    })
    it("cannot create a v3 agent using eth with insufficient value pt 4", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      deposit0.token = AddressZero
      await expect(clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1, {value: deposit0.amount.sub(1)}
      )).to.be.revertedWithCustomError(clAgentFactory, "InsufficientBalance");
    })
  });

  describe("createConcentratedLiquidityAgentForRoot()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let deposit0 = {
      token: WETH_ADDRESS,
      amount: WeiPerEther.div(10)
    }
    let deposit1 = {
      token: USDB_ADDRESS,
      amount: WeiPerEther.mul(300)
    }

    it("can create a v3 agent for a root agent you do own", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      // create
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )
      let strategyAgentID = 1
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRoot", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(1)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(1)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).gte(0)
      expect(balances.usdb).gte(0)
      expect(balances.weth.add(balances.usdb)).gt(0) // should keep dust amounts
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(0)
    })
    it("can create a v3 agent using eth pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      // create
      deposit0.token = AddressZero
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit0.amount}
      )
      let strategyAgentID = 2
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit0.amount}
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRoot", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(2)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(2)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).gte(0)
      expect(balances.usdb).gte(0)
      expect(balances.weth.add(balances.usdb)).gt(0) // should keep dust amounts
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(0)
    })
    it("can create a v3 agent using eth pt 2", async function () {
      let genesisAgentID = 2
      let strategyAgentID = 3
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, genesisAgentID))[0].agentAddress
      // create
      deposit0 = {
        token: USDB_ADDRESS,
        amount: WeiPerEther.mul(300)
      }
      deposit1 = {
        token: AddressZero,
        amount: WeiPerEther.div(10)
      }
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit1.amount}
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRoot(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit1.amount}
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRoot", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(3)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(1)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).gte(0)
      expect(balances.usdb).gte(0)
      expect(balances.weth.add(balances.usdb)).gt(0) // should keep dust amounts
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(0)
    })
  });

  describe("createConcentratedLiquidityAgentAndExplorer()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let deposit0 = {
      token: WETH_ADDRESS,
      amount: WeiPerEther.div(10)
    }
    let deposit1 = {
      token: USDB_ADDRESS,
      amount: WeiPerEther.mul(300)
    }

    it("can create a v3 agent and new explorer agent", async function () {
      // create
      let strategyAgentID = 4
      let explorerAgentID = 1
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      expect(staticRes.explorerAgentID).eq(explorerAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorer(
        mintParams, deposit0, deposit1
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentAndExplorer", tx);
      await watchTxForEvents(tx)
      // created a new explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(1)
      expect(await explorerAgentNft.balanceOf(user1.address)).eq(1)
      let explorerTbas = await agentRegistry.getTbasOfNft(explorerAgentNft.address, explorerAgentID)
      expect(explorerTbas.length).eq(1)
      let explorerAddress = explorerTbas[0].agentAddress
      await expectDeployed(explorerAddress)
      expect(explorerAddress).eq(staticRes.explorerAddress)
      let explorerBalances = await getBalances(explorerAddress, false, "explorer agent")
      expect(explorerBalances.eth).eq(0)
      expect(explorerBalances.weth).eq(0)
      expect(explorerBalances.usdb).eq(0)
      expect(explorerBalances.blasterLpToken).eq(0)
      expect(explorerBalances.genesisAgents).eq(0)
      expect(explorerBalances.strategyAgents).eq(1)
      expect(explorerBalances.explorerAgents).eq(0)
      expect(explorerBalances.thrusterPositions).eq(0)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(4)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(explorerAddress)).eq(1)
      let strategyTbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(strategyTbas.length).eq(1)
      let strategyAddress = strategyTbas[0].agentAddress
      await expectDeployed(strategyAddress)
      expect(strategyAddress).eq(staticRes.strategyAddress)
      let strategyBalances = await getBalances(strategyAddress, false, "strategy agent")
      expect(strategyBalances.eth).eq(0)
      expect(strategyBalances.weth).gte(0)
      expect(strategyBalances.usdb).gte(0)
      expect(strategyBalances.weth.add(strategyBalances.usdb)).gt(0) // should keep dust amounts
      expect(strategyBalances.blasterLpToken).eq(0)
      expect(strategyBalances.genesisAgents).eq(0)
      expect(strategyBalances.strategyAgents).eq(0)
      expect(strategyBalances.explorerAgents).eq(0)
      expect(strategyBalances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", strategyAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
    })
  });

  describe("ways to not create agents pt 3", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let depositLpToken = {
      token: THRUSTER_LP_TOKEN_ADDRESS,
      amount: WeiPerEther.div(10000)
    }

    it("cannot migrate zero balance pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndMigrate(
        mintParams, depositLpToken, rootAgentAddress
      )).to.be.revertedWith("ds-math-sub-underflow")
    })
    it("cannot migrate zero balance pt 2", async function () {
      await expect(clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentAndExplorerAndMigrate(
        mintParams, depositLpToken
      )).to.be.revertedWith("ds-math-sub-underflow")
    })
    it("can deposit liquidity", async function () {
      await usdb.connect(user1).approve(THRUSTER_ROUTER_ADDRESS_030, MaxUint256)
      await thrusterRouter_030.connect(user1).addLiquidityETH(USDB_ADDRESS, WeiPerEther.mul(100), 0, 0, user1.address, MaxUint256, {value: WeiPerEther.div(30)})
      expect(await thrusterLpToken.balanceOf(user1.address)).gt(0)
    })
    it("cannot migrate with insufficient allowance pt 1", async function () {
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, 1))[0].agentAddress
      await expect(clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndMigrate(
        mintParams, depositLpToken, rootAgentAddress
      )).to.be.revertedWith("ds-math-sub-underflow")
    })
    it("cannot migrate with insufficient allowance pt 2", async function () {
      await expect(clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentAndExplorerAndMigrate(
        mintParams, depositLpToken
      )).to.be.revertedWith("ds-math-sub-underflow")
    })
    it("can approve liquidity", async function () {
      await thrusterLpToken.connect(user1).approve(clAgentFactory.address, MaxUint256)
    })
  })

  describe("createConcentratedLiquidityAgentForRootAndMigrate()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let depositLpToken = {
      token: THRUSTER_LP_TOKEN_ADDRESS,
      amount: WeiPerEther.div(10000)
    }

    it("can create a v3 agent for a root agent you do own", async function () {
      let genesisAgentID = 3
      let strategyAgentID = 5
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, genesisAgentID))[0].agentAddress
      // create
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndMigrate(
        mintParams, depositLpToken, rootAgentAddress
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndMigrate(
        mintParams, depositLpToken, rootAgentAddress
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRootAndMigrate", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(5)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(1)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).gte(0)
      expect(balances.usdb).gte(0)
      expect(balances.weth.add(balances.usdb)).gt(0) // should keep dust amounts
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(1)
    })
  })

  describe("createConcentratedLiquidityAgentAndExplorerAndMigrate()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let depositLpToken = {
      token: THRUSTER_LP_TOKEN_ADDRESS,
      amount: WeiPerEther.div(10000)
    }

    it("can create a v3 agent and new explorer agent", async function () {
      // create
      let strategyAgentID = 6
      let explorerAgentID = 2
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentAndExplorerAndMigrate(
        mintParams, depositLpToken
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      expect(staticRes.explorerAgentID).eq(explorerAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndMigrate(
        mintParams, depositLpToken
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentAndExplorerAndMigrate", tx);
      await watchTxForEvents(tx)
      // created a new explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(2)
      expect(await explorerAgentNft.balanceOf(user1.address)).eq(2)
      let explorerTbas = await agentRegistry.getTbasOfNft(explorerAgentNft.address, explorerAgentID)
      expect(explorerTbas.length).eq(1)
      let explorerAddress = explorerTbas[0].agentAddress
      await expectDeployed(explorerAddress)
      expect(explorerAddress).eq(staticRes.explorerAddress)
      let explorerBalances = await getBalances(explorerAddress, false, "explorer agent")
      expect(explorerBalances.eth).eq(0)
      expect(explorerBalances.weth).eq(0)
      expect(explorerBalances.usdb).eq(0)
      expect(explorerBalances.blasterLpToken).eq(0)
      expect(explorerBalances.genesisAgents).eq(0)
      expect(explorerBalances.strategyAgents).eq(1)
      expect(explorerBalances.explorerAgents).eq(0)
      expect(explorerBalances.thrusterPositions).eq(0)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(6)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(explorerAddress)).eq(1)
      let strategyTbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(strategyTbas.length).eq(1)
      let strategyAddress = strategyTbas[0].agentAddress
      await expectDeployed(strategyAddress)
      expect(strategyAddress).eq(staticRes.strategyAddress)
      let strategyBalances = await getBalances(strategyAddress, false, "strategy agent")
      expect(strategyBalances.eth).eq(0)
      expect(strategyBalances.weth).gte(0)
      expect(strategyBalances.usdb).gte(0)
      expect(strategyBalances.weth.add(strategyBalances.usdb)).gt(0) // should keep dust amounts
      expect(strategyBalances.blasterLpToken).eq(0)
      expect(strategyBalances.genesisAgents).eq(0)
      expect(strategyBalances.strategyAgents).eq(0)
      expect(strategyBalances.explorerAgents).eq(0)
      expect(strategyBalances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", strategyAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
    })
  })

  describe("createConcentratedLiquidityAgentForRootAndMigrateWithPermit()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let depositLpToken = {
      token: THRUSTER_LP_TOKEN_ADDRESS,
      amount: WeiPerEther.div(10000)
    }

    it("can create a v3 agent for a root agent you do own", async function () {
      let genesisAgentID = 4
      let strategyAgentID = 7
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, genesisAgentID))[0].agentAddress
      // sign
      let { v, r, s } = await getERC20PermitSignature(user1, clAgentFactory.address, thrusterLpToken, depositLpToken.amount, MaxUint256, MaxUint256, 81457);
      let deadline = MaxUint256
      // create
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndMigrateWithPermit(
        mintParams, depositLpToken, rootAgentAddress, deadline, v, r, s
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndMigrateWithPermit(
        mintParams, depositLpToken, rootAgentAddress, deadline, v, r, s
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRootAndMigrateWithPermit", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(7)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(1)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).gte(0)
      expect(balances.usdb).gte(0)
      expect(balances.weth.add(balances.usdb)).gt(0) // should keep dust amounts
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(2)
    })
  })

  describe("createConcentratedLiquidityAgentAndExplorerAndMigrateWithPermit()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let depositLpToken = {
      token: THRUSTER_LP_TOKEN_ADDRESS,
      amount: WeiPerEther.div(10000)
    }

    it("can create a v3 agent and new explorer agent", async function () {
      // create
      let strategyAgentID = 8
      let explorerAgentID = 3
      let { v, r, s } = await getERC20PermitSignature(user1, clAgentFactory.address, thrusterLpToken, depositLpToken.amount, MaxUint256, MaxUint256, 81457);
      let deadline = MaxUint256
      // create
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentAndExplorerAndMigrateWithPermit(
        mintParams, depositLpToken, deadline, v, r, s
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      expect(staticRes.explorerAgentID).eq(explorerAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndMigrateWithPermit(
        mintParams, depositLpToken, deadline, v, r, s
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentAndExplorerAndMigrateWithPermit", tx);
      await watchTxForEvents(tx)
      // created a new explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(3)
      expect(await explorerAgentNft.balanceOf(user1.address)).eq(3)
      let explorerTbas = await agentRegistry.getTbasOfNft(explorerAgentNft.address, explorerAgentID)
      expect(explorerTbas.length).eq(1)
      let explorerAddress = explorerTbas[0].agentAddress
      await expectDeployed(explorerAddress)
      expect(explorerAddress).eq(staticRes.explorerAddress)
      let explorerBalances = await getBalances(explorerAddress, false, "explorer agent")
      expect(explorerBalances.eth).eq(0)
      expect(explorerBalances.weth).eq(0)
      expect(explorerBalances.usdb).eq(0)
      expect(explorerBalances.blasterLpToken).eq(0)
      expect(explorerBalances.genesisAgents).eq(0)
      expect(explorerBalances.strategyAgents).eq(1)
      expect(explorerBalances.explorerAgents).eq(0)
      expect(explorerBalances.thrusterPositions).eq(0)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(8)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(explorerAddress)).eq(1)
      let strategyTbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(strategyTbas.length).eq(1)
      let strategyAddress = strategyTbas[0].agentAddress
      await expectDeployed(strategyAddress)
      expect(strategyAddress).eq(staticRes.strategyAddress)
      let strategyBalances = await getBalances(strategyAddress, false, "strategy agent")
      expect(strategyBalances.eth).eq(0)
      expect(strategyBalances.weth).gte(0)
      expect(strategyBalances.usdb).gte(0)
      expect(strategyBalances.weth.add(strategyBalances.usdb)).gt(0) // should keep dust amounts
      expect(strategyBalances.blasterLpToken).eq(0)
      expect(strategyBalances.genesisAgents).eq(0)
      expect(strategyBalances.strategyAgents).eq(0)
      expect(strategyBalances.explorerAgents).eq(0)
      expect(strategyBalances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", strategyAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
    })
  })

  describe("createConcentratedLiquidityAgentForRootAndRefundExcess()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let deposit0 = {
      token: WETH_ADDRESS,
      amount: WeiPerEther.div(10)
    }
    let deposit1 = {
      token: USDB_ADDRESS,
      amount: WeiPerEther.mul(300)
    }

    it("can create a v3 agent for a root agent you do own", async function () {
      let genesisAgentID = 5
      let strategyAgentID = 9
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, genesisAgentID))[0].agentAddress
      // create
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRootAndRefundExcess", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(strategyAgentID)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(1)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).eq(0) // should not keep dust amounts
      expect(balances.usdb).eq(0)
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(3)
    })
    it("can create a v3 agent using eth pt 1", async function () {
      let genesisAgentID = 5
      let strategyAgentID = 10
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, genesisAgentID))[0].agentAddress
      // create
      deposit0.token = AddressZero
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit0.amount}
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit0.amount}
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRootAndRefundExcess", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(strategyAgentID)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(2)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).eq(0) // should not keep dust amounts
      expect(balances.usdb).eq(0)
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(3)
    })
    it("can create a v3 agent using eth pt 2", async function () {
      let genesisAgentID = 5
      let strategyAgentID = 11
      let rootAgentAddress = (await agentRegistry.getTbasOfNft(genesisAgentNft.address, genesisAgentID))[0].agentAddress
      // create
      deposit0 = {
        token: USDB_ADDRESS,
        amount: WeiPerEther.mul(300)
      }
      deposit1 = {
        token: AddressZero,
        amount: WeiPerEther.div(10)
      }
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit1.amount}
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentForRootAndRefundExcess(
        mintParams, deposit0, deposit1, rootAgentAddress, {value: deposit1.amount}
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentForRootAndRefundExcess", tx);
      await watchTxForEvents(tx)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(strategyAgentID)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(rootAgentAddress)).eq(3)
      let tbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(tbas.length).eq(1)
      let agentAddress = tbas[0].agentAddress
      await expectDeployed(agentAddress)
      expect(agentAddress).eq(staticRes.strategyAddress)
      let balances = await getBalances(agentAddress, false, "strategy agent")
      expect(balances.eth).eq(0)
      expect(balances.weth).eq(0) // should not keep dust amounts
      expect(balances.usdb).eq(0)
      expect(balances.blasterLpToken).eq(0)
      expect(balances.genesisAgents).eq(0)
      expect(balances.strategyAgents).eq(0)
      expect(balances.explorerAgents).eq(0)
      expect(balances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", agentAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
      // does not create an explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(3)
    })
  });

  describe("createConcentratedLiquidityAgentAndExplorerAndRefundExcess()", function () {
    const sqrtPriceX96 = BN.from("1392486909633467119786647344");
    let mintParams = {
      manager: THRUSTER_POSITION_MANAGER_ADDRESS,
      pool: THRUSTER_POOL_WETH_USDB_030_ADDRESS,
      slippageLiquidity: 1_000_000,
      tickLower: -82920,
      tickUpper: -76020,
      sqrtPriceX96: sqrtPriceX96,
    }
    let deposit0 = {
      token: WETH_ADDRESS,
      amount: WeiPerEther.div(10)
    }
    let deposit1 = {
      token: USDB_ADDRESS,
      amount: WeiPerEther.mul(300)
    }

    it("can create a v3 agent and new explorer agent", async function () {
      // create
      let strategyAgentID = 12
      let explorerAgentID = 4
      let staticRes = await clAgentFactory.connect(user1).callStatic.createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1
      )
      expect(staticRes.strategyAgentID).eq(strategyAgentID)
      expect(staticRes.explorerAgentID).eq(explorerAgentID)
      let tx = await clAgentFactory.connect(user1).createConcentratedLiquidityAgentAndExplorerAndRefundExcess(
        mintParams, deposit0, deposit1
      )
      l1DataFeeAnalyzer.register("createConcentratedLiquidityAgentAndExplorerAndRefundExcess", tx);
      await watchTxForEvents(tx)
      // created a new explorer agent
      expect(await explorerAgentNft.totalSupply()).eq(explorerAgentID)
      expect(await explorerAgentNft.balanceOf(user1.address)).eq(explorerAgentID)
      let explorerTbas = await agentRegistry.getTbasOfNft(explorerAgentNft.address, explorerAgentID)
      expect(explorerTbas.length).eq(1)
      let explorerAddress = explorerTbas[0].agentAddress
      await expectDeployed(explorerAddress)
      expect(explorerAddress).eq(staticRes.explorerAddress)
      let explorerBalances = await getBalances(explorerAddress, false, "explorer agent")
      expect(explorerBalances.eth).eq(0)
      expect(explorerBalances.weth).eq(0)
      expect(explorerBalances.usdb).eq(0)
      expect(explorerBalances.blasterLpToken).eq(0)
      expect(explorerBalances.genesisAgents).eq(0)
      expect(explorerBalances.strategyAgents).eq(1)
      expect(explorerBalances.explorerAgents).eq(0)
      expect(explorerBalances.thrusterPositions).eq(0)
      // created a new agent
      expect(await strategyAgentNft.totalSupply()).eq(strategyAgentID)
      expect(await strategyAgentNft.balanceOf(user1.address)).eq(0)
      expect(await strategyAgentNft.balanceOf(explorerAddress)).eq(1)
      let strategyTbas = await agentRegistry.getTbasOfNft(strategyAgentNft.address, strategyAgentID)
      expect(strategyTbas.length).eq(1)
      let strategyAddress = strategyTbas[0].agentAddress
      await expectDeployed(strategyAddress)
      expect(strategyAddress).eq(staticRes.strategyAddress)
      let strategyBalances = await getBalances(strategyAddress, false, "strategy agent")
      expect(strategyBalances.eth).eq(0)
      expect(strategyBalances.weth).eq(0) // should not keep dust amounts
      expect(strategyBalances.usdb).eq(0)
      expect(strategyBalances.blasterLpToken).eq(0)
      expect(strategyBalances.genesisAgents).eq(0)
      expect(strategyBalances.strategyAgents).eq(0)
      expect(strategyBalances.explorerAgents).eq(0)
      expect(strategyBalances.thrusterPositions).eq(1)
      // agent has a v3 position
      let moduleContract = await ethers.getContractAt("ConcentratedLiquidityGatewayModuleC", strategyAddress) as ConcentratedLiquidityGatewayModuleC
      let moduleName = await moduleContract.moduleName()
      expect(moduleName).eq("ConcentratedLiquidityModuleC")
      let strategyType = await moduleContract.strategyType()
      expect(strategyType).eq("Concentrated Liquidity")
      let manager = await moduleContract.manager()
      expect(manager).eq(THRUSTER_POSITION_MANAGER_ADDRESS)
      let pool = await moduleContract.pool()
      expect(pool).eq(THRUSTER_POOL_WETH_USDB_030_ADDRESS)
      let tokenId = await moduleContract.tokenId()
      expect(tokenId).gt(0)
      expect(tokenId).eq(staticRes.nonfungiblePositionTokenId)
      //console.log(`tokenId ${tokenId.toString()}`)
      let slot0 = await moduleContract.slot0()
      //console.log(`slot0`, slot0)
      //expect().eq("")
      let position = await moduleContract.position()
      //console.log(`position`, position)
      expect(position.token0).eq(USDB_ADDRESS)
      expect(position.token1).eq(WETH_ADDRESS)
      expect(position.fee).eq(3000)
      expect(position.liquidity).gt(0)
    })
  });

  async function watchTxForEvents(tx:any, debug=false) {
    //console.log("tx:", tx);
    if(debug) console.log("tx:", tx.hash);
    let receipt = await tx.wait(networkSettings.confirmations);
    //let receipt = await tx.wait(0);
    //console.log(`gasUsed: ${receipt.gasUsed.toNumber().toLocaleString()}`)
    if(!receipt || !receipt.logs || receipt.logs.length == 0) {
      console.log(receipt)
      //throw new Error("events not found");
      console.log("No events found")
    }
    if(!debug) return
    /*
    console.log('logs:')
    for(let i = 0; i < receipt.logs.length; i++) {
      let log = receipt.logs[i]
      console.log(`event ${i}/${receipt.logs.length}`)
      console.log(log)
    }
    */
    // create genesis accounts
    //let agentList = receipt.logs.filter(log => log.address == ERC6551_REGISTRY_ADDRESS).map(log => BN.from(log.topics[3]).toString())
    //if(agentList.length > 0) console.log(`Created accounts for ${agentList.length} agents: ${agentList.join(', ')}`)
    console.log('logs:')
    for(let i = 0; i < receipt.logs.length; i++) {
      let log = receipt.logs[i]
      //console.log(`log ${i}/${receipt.logs.length}`)
      //console.log(log)
      let address = log.address

      if(address == genesisAgentNft.address) {
        console.log("Did something with a genesis agent")
      }
      else if(address == strategyAgentNft.address) {
        console.log("Did something with a strategy agent")
      }
      else if(address == explorerAgentNft.address) {
        console.log("Did something with an explorer agent")
      }
      else if(address == ERC6551_REGISTRY_ADDRESS) {
        console.log("Created TBA in ERC6551Registry")
      }
      else if(address == agentRegistry.address) {
        console.log("Registered TBA in AgentRegistry")
      }
      else if(address == weth.address) {
        console.log("Transferred WETH")
      }
      else if(address == usdb.address) {
        console.log("Transferred USDB")
      }
      else if(address == THRUSTER_POSITION_MANAGER_ADDRESS) {
        console.log("Did something with a Thruster CL Position")
      }
      else if(address == THRUSTER_POOL_WETH_USDB_030_ADDRESS) {
        console.log("Did something in the Thruster WETH/USDB 0.30% v3 pool")
      }
      else if(address == THRUSTER_LP_TOKEN_ADDRESS) {
        console.log("Did something in the Thruster WETH/USDB 0.30% v2 pool")
      }
      else if(address == BLAST_POINTS_ADDRESS) {
        console.log("Did something with Blast Points")
      }
      else {
        console.log(`Unknown address ${address}`)
      }
    }
  }

  async function getBalances(account:string, log=false, accountName="") {
    let res = {
      eth: await provider.getBalance(account),
      weth: await weth.balanceOf(account),
      usdb: await usdb.balanceOf(account),

      genesisAgents: await genesisAgentNft.balanceOf(account),
      strategyAgents: await strategyAgentNft.balanceOf(account),
      explorerAgents: await explorerAgentNft.balanceOf(account),

      blasterLpToken: await blasterLpToken.balanceOf(account),
      thrusterPositions: await thrusterPositionManager.balanceOf(account),
    }
    if(log) {
      console.log(`Balances of ${accountName || account}`)
      console.log({
        eth: formatUnits(res.eth),
        weth: formatUnits(res.weth),
        usdb: formatUnits(res.usdb),
        blasterLpToken: formatUnits(res.blasterLpToken),
        genesisAgents: res.genesisAgents.toString(),
        strategyAgents: res.strategyAgents.toString(),
        explorerAgents: res.explorerAgents.toString(),
        thrusterPositions: res.thrusterPositions.toString(),
      })
    }
    return res
  }

  describe("L1 gas fees", function () {
    it("calculate", async function () {
      l1DataFeeAnalyzer.analyze()
    });
  });
});
