const { ethers } = require("ethers");
const {
  DefenderRelayProvider,
  DefenderRelaySigner
} = require('defender-relay-client/lib/ethers');

const contractAbi = ['function tokenIdCounter() view returns (uint256)'];

exports.handler = async function(event) {
  // Get data from POST request's body
  const { userAddress, contractAddress } = event.request.body;
  
  // Initialize defender relayer provider and signer
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });
  
  const nftContract = new ethers.Contract(contractAddress, contractAbi, provider);
  const tokenId = await nftContract.tokenIdCounter();
  
  console.log(
    `User: ${userAddress}\nToken ID: ${tokenId}\nContract: ${contractAddress}`
  );
  
  // Build, hash and sign message with relayer key
  const message = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'address'],
    [userAddress, tokenId, contractAddress]
  );
  const hash = ethers.utils.keccak256(message);
  const signature = await signer.signMessage(ethers.utils.arrayify(hash));
  
  return {hash, signature};
}
