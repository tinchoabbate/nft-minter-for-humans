const { ethers } = require("ethers");
const {
  DefenderRelayProvider,
  DefenderRelaySigner
} = require('defender-relay-client/lib/ethers');

const contractAbi = ['function tokenIdCounter() view returns (uint256)'];

exports.handler = async function(event) {
  /**
   * Get data from POST request's body.
   * 
   * Note that this script does not implement any sort of validation on these two parameters.
   * Under the assumption that the endpoint URI is a secret only known by the app, this should be ok.
   * Worst case scenario, should the endpoint be leaked, you can easily
   * pause the autotask, change the endpoint via Defender, and include the new URI in the app.
   * Or if you feel like, you can think of ways to implement validations on these two parameters here.
   */
  const { userAddress, contractAddress } = event.request.body;
  
  // Initialize defender relayer provider and signer
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });
  
  const nftContract = new ethers.Contract(contractAddress, contractAbi, provider);
  const tokenId = await nftContract.tokenIdCounter();
  
  console.log(
    `User: ${userAddress}\nToken ID: ${tokenId}\nContract: ${contractAddress}`
  );

  // In here you could also use the built-in Key-Value store (https://docs.openzeppelin.com/defender/autotasks#kvstore)
  // available in any autotask to implementfurther anti-spam features.
  // For example, preventing the same user address to obtain two signed messages.
  
  // Build, hash and sign message with relayer key
  const message = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'address'],
    [userAddress, tokenId, contractAddress]
  );
  const hash = ethers.utils.keccak256(message);
  const signature = await signer.signMessage(ethers.utils.arrayify(hash));
  
  return {hash, signature};
}
