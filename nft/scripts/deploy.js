async function main() {
    const ExampleNFT = await ethers.getContractFactory("ExampleNFT");
    const contract = await ExampleNFT.deploy(process.env.DEFENDER_RELAYER_ADDRESS);
  
    console.log("Deploying to: ", contract.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  