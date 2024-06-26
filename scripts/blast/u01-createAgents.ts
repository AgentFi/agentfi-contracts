import hardhat from "hardhat";
const { ethers } = hardhat;
const { provider } = ethers;
import { BigNumber as BN, BigNumberish, utils } from "ethers";
import { config as dotenv_config } from "dotenv";
dotenv_config();

const accounts = JSON.parse(process.env.ACCOUNTS || "{}");
const boombotseth = new ethers.Wallet(accounts.boombotseth.key, provider);
const agentfideployer = new ethers.Wallet(accounts.agentfideployer.key, provider);
const blasttestnetuser1 = new ethers.Wallet(accounts.blasttestnetuser1.key, provider);
const blasttestnetuser2 = new ethers.Wallet(accounts.blasttestnetuser2.key, provider);
const blasttestnetuser3 = new ethers.Wallet(accounts.blasttestnetuser3.key, provider);
const allowlistSignerKey = accounts.allowlistSigner.key

import { Agents, BlastAgentAccount, AgentFactory01, AgentFactory02, AgentFactory03 } from "../../typechain-types";

import { delay, deduplicateArray } from "./../utils/misc";
import { isDeployed, expectDeployed } from "./../utils/expectDeployed";
import { logContractAddress } from "./../utils/logContractAddress";
import { getNetworkSettings } from "./../utils/getNetworkSettings";
import { deployContractUsingContractFactory, verifyContract } from "./../utils/deployContract";
import { toBytes32 } from "./../utils/setStorage";
import { getSelectors, FacetCutAction, calcSighash, calcSighashes, getCombinedAbi } from "./../utils/diamond"
import { MulticallProvider, MulticallContract } from "./../utils/multicall";
import { multicallChunked } from "./../utils/network";
import { sign, assembleSignature, getMintFromAllowlistDigest, getMintFromAllowlistSignature } from "./../utils/signature";

const { AddressZero, WeiPerEther, MaxUint256 } = ethers.constants;

let networkSettings: any;
let chainID: number;

const fs = require("fs")
const ABI_AGENTS_NFT = JSON.parse(fs.readFileSync("abi/contracts/tokens/Agents.sol/Agents.json").toString()).filter(x=>!!x&&x.type=="function")
let mcProvider = new MulticallProvider(provider, 81457);

const ERC6551_REGISTRY_ADDRESS        = "0x000000006551c19487814612e58FE06813775758";
const BLAST_ADDRESS                   = "0x4300000000000000000000000000000000000002";
const ENTRY_POINT_ADDRESS             = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const MULTICALL_FORWARDER_ADDRESS     = "0x26aDd0cB3eA65ADBb063739A5C5735055029B6BD"; // genesis
const CONTRACT_FACTORY_ADDRESS        = "0x9D735e7926729cAB93b10cb5814FF8487Fb6D5e8"; // genesis

const GAS_COLLECTOR_ADDRESS           = "0xf237c20584DaCA970498917470864f4d027de4ca"; // genesis
const BALANCE_FETCHER_ADDRESS         = "0x5f3Ab2963DD2c61c6d69a3E42f51135cfdC189B0"; // genesis

const GENESIS_COLLECTION_ADDRESS      = "0x5066A1975BE96B777ddDf57b496397efFdDcB4A9"; // genesis
const GENESIS_FACTORY_ADDRESS         = "0x700b6f8B315247DD41C42A6Cfca1dAE6B4567f3B"; // genesis
const ACCOUNT_IMPL_BASE_ADDRESS       = "0x8836060137a20E41d599565F644D9EB0807A5353"; // genesis

const MULTISIG_ADDRESS                = "0xc3d5fb76F5ce147508AE0129Af0327226B1A01EA"

// tokens
const ETH_ADDRESS                = "0x0000000000000000000000000000000000000000";
const ALL_CLAIMABLE_GAS_ADDRESS  = "0x0000000000000000000000000000000000000001";
const MAX_CLAIMABLE_GAS_ADDRESS  = "0x0000000000000000000000000000000000000002";
const WETH_ADDRESS               = "0x4200000000000000000000000000000000000023";
const USDB_ADDRESS               = "0x4200000000000000000000000000000000000022";

// ring protocol
const UNIVERSAL_ROUTER_ADDRESS   = "0x334e3F7f5A9740627fA47Fa9Aa51cE0ccbD765cF";
const FEW_ROUTER_ADDRESS         = "0x02F1e7A518e3E286C8E305E39cA7D4f25e0a44Aa";
const STAKING_REWARDS_ADDRESS    = "0x366Ac78214aFE145Ca35d4A6513F4eD9e8909Fe8";
const USDC_ADDRESS               = "0xF19A5b56b419170Aa2ee49E5c9195F5902D39BF1";
const USDT_ADDRESS               = "0xD8F542D710346DF26F28D6502A48F49fB2cFD19B";
const DAI_ADDRESS                = "0x9C6Fc5bF860A4a012C9De812002dB304AD04F581";
const BOLT_ADDRESS               = "0x1B0cC80F4E2A7d205518A1Bf36de5bED686662FE";
const RGB_ADDRESS                = "0x7647a41596c1Ca0127BaCaa25205b310A0436B4C";

const FWWETH_ADDRESS             = "0x798dE0520497E28E8eBfF0DF1d791c2E942eA881";
const FWUSDC_ADDRESS             = "0xa7870cf9143084ED04f4C2311f48CB24a2b4A097";
const LP_TOKEN_ADDRESS           = "0x024Dd95113137f04E715B2fC8F637FBe678e9512";
const RING_ADDRESS               = "0x0BD5539E33a1236bA69228271e60f3bFf8fDB7DB";
const STAKING_REWARDS_INDEX      = 2;

const DOMAIN_NAME = "AgentFi-BlastooorGenesisFactory";
const MINT_FROM_ALLOWLIST_TYPEHASH = utils.keccak256(utils.toUtf8Bytes("MintFromAllowlist(address receiver)"));


let genesisCollection: Agents;
let genesisCollectionMC: any;
let genesisFactory: BlastooorGenesisFactory;
let accountImplBase: BlastAgentAccount; // the base implementation for agentfi accounts
let accountImplRingC: BlastAgentAccountRingProtocolC;
let accountImplRingD: BlastAgentAccountRingProtocolD;
let accountImplThrusterA: BlastAgentAccountThrusterA;
let accountImplBasketA: BlastAgentAccountBasketA;

async function main() {
  console.log(`Using ${boombotseth.address} as boombotseth`);
  console.log(`Using ${agentfideployer.address} as agentfideployer`);

  chainID = (await provider.getNetwork()).chainId;
  networkSettings = getNetworkSettings(chainID);
  function isChain(chainid: number, chainName: string) {
    //return ((chainID == chainid)/* || ((chainID == 31337) && (process.env.FORK_NETWORK === chainName))*/);
    return ((chainID === chainid) || ((chainID === 31337) && (process.env.FORK_NETWORK === chainName)));
  }
  if(!isChain(81457, "blast")) throw("Only run this on Blast Mainnet or a local fork of Blast Mainnet");

  genesisCollection = await ethers.getContractAt("Agents", GENESIS_COLLECTION_ADDRESS, boombotseth) as Agents;
  genesisCollectionMC = new MulticallContract(GENESIS_COLLECTION_ADDRESS, ABI_AGENTS_NFT)
  genesisFactory = await ethers.getContractAt("BlastooorGenesisFactory", GENESIS_FACTORY_ADDRESS, agentfideployer) as BlastooorGenesisFactory;
  accountImplBase = await ethers.getContractAt("BlastAgentAccount", ACCOUNT_IMPL_BASE_ADDRESS, agentfideployer) as BlastAgentAccount;

  await listAgents();
  //await createAgents();
  //await listAgents();
  //await transferAgents();
}

async function listAgents(detailed=true) {
  let ts = (await genesisCollection.totalSupply()).toNumber();
  console.log(`Number agents created: ${ts}`);
  if(ts == 0) return;
  if(!detailed) return;
  console.log("Info:")
  let calls = [] as any[]
  for(let agentID = 1; agentID <= ts; agentID++) {
    calls.push(genesisCollectionMC.getAgentInfo(agentID))
    calls.push(genesisCollectionMC.ownerOf(agentID))
  }
  const results = await multicallChunked(mcProvider, calls, "latest", 500)
  for(let agentID = 1; agentID <= ts; agentID++) {
    console.log(`Agent ID ${agentID}`)
    let agentInfo = results[agentID*2-2]
    let agentAddress = agentInfo.agentAddress
    let implementationAddress = agentInfo.implementationAddress
    let owner = results[agentID*2-1]
    console.log(`  Agent Address  ${agentAddress}`)
    console.log(`  TBA Impl       ${implementationAddress}`)
    console.log(`  Owner          ${owner}`)
  }
}

async function createAgents() {
  //await createAgent(agentfideployer, 1);
  //await createAgent(agentfideployer, 2);
  //await createAgent(agentfideployer, 3);
  //await createAgent(agentfideployer, 4);
  //await createAgent(agentfideployer, 6);

  //await createCustomAgent2(agentfideployer);
  //await createCustomAgent4(agentfideployer);
  //await createCustomAgent6(agentfideployer);
  //await createCustomAgent7(agentfideployer);
  //await createCustomAgent7_2(agentfideployer);

  //await createAgent(agentfideployer, 5);
  //await createAgent(agentfideployer, 6);
  //await createAgent(agentfideployer, 7);
  //await createAgent(agentfideployer, 8);
  //await createAgent(agentfideployer, 9);
  //await createCustomAgent1(agentfideployer, 9);

  //await mintGenesisBlastooorPublic(agentfideployer, 1);
  //await mintGenesisBlastooorAllowlist(blasttestnetuser1, 1);
  //await mintGenesisBlastooorAllowlistAndPublic(blasttestnetuser2)
  //await mintGenesisBlastooorTreasury()
}

async function createAgent(creator=boombotseth, createSettingsID=1) {
  console.log(`Creating new agent`)
  //let tx = await factory01.connect(creator)['createAgent(uint256)'](createSettingsID, {...networkSettings.overrides, gasLimit: 2_000_000})
  let tx = await factory03.connect(creator)['createAgent(uint256)'](createSettingsID, {...networkSettings.overrides, gasLimit: 2_000_000})
  await watchTxForCreatedAgentID(tx)
}

async function mintGenesisBlastooorPublic(creator=boombotseth, count=1) {
  console.log(`Creating ${count} new agents`)
  let ethAmount = WeiPerEther.div(100).mul(count)
  let tx = await genesisFactory.connect(creator).blastooorPublicMint(count, {...networkSettings.overrides, gasLimit: 5_000_000, value:ethAmount})
  await watchTxForCreatedAgentID(tx)
}

async function mintGenesisBlastooorAllowlist(creator=boombotseth, count=1) {
  console.log(`Checking allowlist for ${creator.address}`)
  let signature = signatures[creator.address]
  if(!signature) throw new Error(`Account ${creator.address} is not on the allowlist`)
  console.log(`Creating ${count} new agents`)
  let ethAmount = WeiPerEther.div(100).mul(count)
  let tx = await genesisFactory.connect(creator).blastooorMintWithAllowlist(count, signature, {...networkSettings.overrides, gasLimit: 5_000_000, value:ethAmount})
  await watchTxForCreatedAgentID(tx)
}

async function mintGenesisBlastooorAllowlistAndPublic(creator=boombotseth) {
  console.log(`Checking allowlist for ${creator.address}`)
  let signature = signatures[creator.address]
  if(!signature) throw new Error(`Account ${creator.address} is not on the allowlist`)
  console.log(`Creating ${10} new agents`)
  let ethAmount = WeiPerEther.div(100).mul(10)
  let tx = await genesisFactory.connect(creator).blastooorMintWithAllowlistAndPublic(2, 8, signature, {...networkSettings.overrides, gasLimit: 5_000_000, value:ethAmount})
  await watchTxForCreatedAgentID(tx)
}

async function mintGenesisBlastooorTreasury() {
  console.log(`Creating agents for treasury`)
  let txdata = genesisFactory.interface.encodeFunctionData("blastooorMintForTreasury", [10])
  let txdatas:any[] = []
  for(let i = 0; i < 0; i++) txdatas.push(txdata)
  let tx = await genesisFactory.connect(agentfideployer).multicall(txdatas, {...networkSettings.overrides, gasLimit: 15_000_000, value:0})
  await watchTxForCreatedAgentID(tx)
}

async function transferAgents() {
  console.log(`Transferring Agents`)
  let txdatas:any[] = []
  let startAgentID = 6402
  let stopAgentID = 6551
  for(let agentID = startAgentID; agentID <= stopAgentID; agentID++) {
    txdatas.push(genesisCollection.interface.encodeFunctionData("transferFrom", [agentfideployer.address, MULTISIG_ADDRESS, agentID]))
  }
  console.log('txdatas')
  console.log(txdatas)
  console.log(txdatas.length)
  //let tx = await genesisCollection.connect(agentfideployer).multicall(txdatas, {...networkSettings.overrides, gasLimit: 15_000_000, value:0})
  let tx = await genesisCollection.connect(agentfideployer).multicall(txdatas, {...networkSettings.overrides, gasLimit: 15_000_000, value:0})
  //await watchTxForCreatedAgentID(tx)
  console.log('tx')
  console.log(tx)
  await tx.wait(networkSettings.confirmations)
  console.log(`Transferred Agents`)
}

async function watchTxForCreatedAgentID(tx:any) {
  console.log("tx:", tx);
  let receipt = await tx.wait(networkSettings.confirmations);
  if(!receipt || !receipt.events || receipt.events.length == 0) {
    console.log(receipt)
    throw new Error("events not found");
  }
  let createEvents = (receipt.events as any).filter((event:any) => {
    if(event.address != GENESIS_COLLECTION_ADDRESS) return false
    if(event.topics.length != 4) return false;
    if(event.topics[0] != "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") return false // transfer topic
    if(event.topics[1] != "0x0000000000000000000000000000000000000000000000000000000000000000") return false // from address zero
    return true
  });
  if(createEvents.length == 0) {
    throw new Error("Create event not detected")
  }
  if(createEvents.length == 1) {
    let createEvent = createEvents[0]
    let agentID = BN.from(createEvent.topics[3]).toNumber()
    console.log(`Created 1 agent. agentID ${agentID}`)
    return agentID
  }
  if(createEvents.length > 1) {
    let agentIDs = createEvents.map((createEvent:any) => BN.from(createEvent.topics[3]).toNumber())
    console.log(`Created ${agentIDs.length} agents. Agent IDs ${agentIDs.join(', ')}`)
    return agentIDs
  }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
  });
