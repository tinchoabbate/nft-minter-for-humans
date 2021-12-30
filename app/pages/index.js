import React from 'react';
import { ethers } from 'ethers';
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { NFT_ABI } from '../constants/abis';
import styles from '../styles/App.module.css';

export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.captchaRef = React.createRef();
    this.state = {
      provider: null,
      message: 'Connect your Metamask account (on Rinkeby)'
    };
  }

  componentDidMount = async () => {
    try {
      await window.ethereum.send('eth_requestAccounts');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId === 4 && network.name === 'rinkeby') {
        this.setState({ provider, message: 'Pass the captcha to mint one NFT' });
      } else {
        alert('Please switch to Rinkeby network');
      }
    } catch (error) {
      console.error(error);
    }
  }

  executeMint = async (hash, signature) => {
    const nftContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_NFT_ADDRESS,
      NFT_ABI,
      await this.state.provider.getSigner()
    );
    
    this.setState({ message: 'Good to go! Accept the minting tx on Metamask.' });
    try {
      const tx = await nftContract.mint(hash, signature);
      this.setState({ message: `Waiting for confirmation on tx ${tx.hash}` });

      const receipt = await tx.wait();
      alert(`Success! You minted a new NFT: https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`)
    } catch (error) {
      console.error('An error occurred. Did not mint the NFT.');
    }    
  }

  onCaptchaChange = async (token, ekey) => {
    if (!token) {
      // No token means that captcha wasn't solved correctly
      return;
    }

    // Captcha's been solved. Get the available account, and hit the API.
    let address = await (this.state.provider.getSigner()).getAddress();

    this.setState({ message: 'Verifying your request...' });
    const response = await fetch('api/mint', {
      method: 'POST',
      body: JSON.stringify({ address, token }),
      headers: { "Content-Type": "application/json" }
    });
    
    if (response.ok) {
      // Expect `result` to be a stringified JSON object like { hash, signature }
      let { result } = await response.json();
      result = JSON.parse(result);
      
      // Obtained the hash and signature. Now go for the actual mint.
      await this.executeMint(result.hash, result.signature);
    } else {
      console.error('Error verifying request');
    }

    // Cleanup
    this.setState({message: 'Pass the captcha to mint one NFT'});
    this.captchaRef.current.resetCaptcha();
  }

  render() {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>
            NFT minter app for humans
          </h1>
  
          <p className={styles.description}>
            {this.state.message}
          </p>          
          <form>
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
              onVerify={(token, ekey) => this.onCaptchaChange(token, ekey)}
              theme="dark"
              ref={this.captchaRef}
            />
          </form>
          <p><a href="https://github.com/tinchoabbate/nft-minter-for-humans" target="_blank">What's this site?</a></p>
        </main>
      </div>      
    )
  } 
}
