import { utils } from 'ethers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Unsupported method
    return res.status(405).json({});
  }

  const { address, token } = req.body;

  if (!address || !token || !utils.isAddress(address)) {
    return res.status(400).json({});
  }
  /*
    At this point all we know is that the request's contained a valid address.
    Yet not necessarily the real user's one originally set by the client-side code.
    That is, in reality anybody could send whatever address they want to this endpoint.
    
    In principle it should be pointless to make the Defender Autotask sign data including an address
    whose private key the caller doesn't control. Because the ultimate verification in
    the smart contract should include msg.sender.
    
    Still, this endpoint is public. An adversary could attempt to spam it using addresses under their control
    to obtain lots of signed messages (and then mint the corresponding NFTs).
    Alternatively, could just simply spam the endpoint aiming for a DoS. Or to consume the Autotask quota.
    Therefore this endpoint MUST be protected with anti-spam techniques.
    Below I implement a simple captcha validation with hCaptcha.
  */

  // Following https://docs.hcaptcha.com/
  const captchaServiceResponse = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    body: `response=${token}&secret=${process.env.HCAPTCHA_SECRET}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const { success } = await captchaServiceResponse.json();

  if (!success) {
    // Captcha validation failed
    return res.status(400).json({});
  }
  
  // After passing the captcha, we can submit the request to the Defender Autotask.
  // Remember that the autotask quota is (at least in free plan) limited to 120 runs / hour.
  // Assuming all autotask executions end up as actual mints in the contract,
  // then this app can only support up to 120 mint operations per hour.
  
  let autotaskResponse = await fetch(
    `https://api.defender.openzeppelin.com/autotasks/${process.env.AUTOTASK_SECRET_WEBHOOK}`,
    {
      method: 'POST',
      body: JSON.stringify({ // Autotask webhook expects a JSON string in the request's body
        userAddress: address,
        contractAddress: process.env.NEXT_PUBLIC_NFT_ADDRESS
      })
    }
  );

  if (!autotaskResponse.ok) {
    return res.status(autotaskResponse.status).json({});
  }
  // Response's JSON fields documented at https://docs.openzeppelin.com/defender/autotasks#webhook-handler
  const autotaskResult = await autotaskResponse.json();

  if (autotaskResult.status === 'success') {
    const { result } = autotaskResult;
    return res.status(200).json({ result });
  } else {
    console.error(`Autotask run failed with result ${JSON.stringify(autotaskResult)}`);
    return res.status(500).json({})
  }
}
