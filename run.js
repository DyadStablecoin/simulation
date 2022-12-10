import * as dotenv from "dotenv";
import axios from "axios";
import { ethers } from "ethers";
import poolABI from "./abi/Pool.json" assert { type: "json" };
import dnftABI from "./abi/dNFT.json" assert { type: "json" };

dotenv.config();

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY, INFURA } =
  process.env;
const TENDERLY_FORK_API = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork`;

const opts = {
  headers: {
    "X-Access-Key": TENDERLY_ACCESS_KEY,
  },
};

async function run() {
  const gp = new ethers.providers.JsonRpcProvider(INFURA);
  const blockNumber = await gp.getBlockNumber();

  console.log(blockNumber);
  const body = {
    network_id: "5",
    block_number: blockNumber,
  };

  let forkId;
  await axios
    .post(TENDERLY_FORK_API, body, opts)
    .then((res) => {
      console.log(
        `Forked with fork ID ${res.data.simulation_fork.id}. Check the Dashboard!`
      );
      forkId = res.data.simulation_fork.id;
    })
    .catch((err) => console.error(err));

  const forkRPC = `https://rpc.tenderly.co/fork/${forkId}`;
  const provider = new ethers.providers.JsonRpcProvider(forkRPC);
  const signer = provider.getSigner();

  const params = [
    ["0xEd6715D2172BFd50C2DBF608615c2AB497904803"],
    ethers.utils.hexValue(100), // hex encoded wei amount
  ];
  await provider.send("tenderly_addBalance", params);

  const pool = new ethers.Contract(
    "0x67488Df72673d85c42a83e5ECAdBBEeA16C01A22",
    poolABI["abi"],
    signer
  );

  const dnft = new ethers.Contract(
    "0x93c23f661F11E5cF62791294E03ee353AD1009a3",
    dnftABI["abi"],
    signer
  );

  const unsignedTx = await pool.populateTransaction.sync();
  const transactionParameters = [
    {
      to: pool.address,
      from: "0xEd6715D2172BFd50C2DBF608615c2AB497904803",
      data: unsignedTx.data,
      gas: ethers.utils.hexValue(3000000),
      gasPrice: ethers.utils.hexValue(1),
      value: ethers.utils.hexValue(0),
    },
  ];

  const id = 8;
  let res = await dnft.idToNft(id);
  console.log(res);

  const txHash = await provider.send(
    "eth_sendTransaction",
    transactionParameters
  );
  console.log(txHash);

  res = await pool.lastEthPrice();
  console.log(parseInt(res._hex));

  res = await dnft.idToNft(id);
  console.log(res);

  const TENDERLY_FORK_ACCESS_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork/${forkId}`;
  await axios.delete(TENDERLY_FORK_ACCESS_URL, opts);
}

run();
