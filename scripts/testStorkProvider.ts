import hre from "hardhat";
async function main() {
  const contract = await hre.ethers.getContract("StorkPriceFeedProvider");
  const token = "0x0469d9d1de0ee58fa1153ef00836b9bbcb84c0b6";

  const data = [
    {
      temporalNumericValue: {
        timestampNs: '1740463696466742899',
        quantizedValue: '1000114171257000000'
      },
      id: '0x810c0f50dc3af1ab1f99a766364531d36ec597530fe669bd313f8e1799afea99',
      publisherMerkleRoot: '0x27c2f8154ce269dae96ede61d5834a97d7582d3b285e0594b7c24cafe32a71ec',
      valueComputeAlgHash: '0x9be7e9f9ed459417d96112a7467bd0b27575a2c7847195c68f805b70ce1795ba',
      r: '0x22a581b0e4044ffe428242b520ec52e3db4a296699bb0c10999bf5cbdeb123d0',
      s: '0x079a8959f01af2e9b1c919a4e7e668f38aa670399c04eae210c17bb113853e6a',
      v: '0x1b'
    }
  ]

  const abiTypes = [
    "tuple(tuple(uint64 timestampNs,int192 quantizedValue) temporalNumericValue, bytes32 id, bytes32 publisherMerkleRoot, bytes32 valueComputeAlgHash, bytes32 r, bytes32 s, uint8 v)[]",
  ];

  // ABI encode the data
  const encodedData = hre.ethers.utils.defaultAbiCoder.encode(abiTypes, [data]);

  const decodedData = hre.ethers.utils.defaultAbiCoder.decode(abiTypes, encodedData);

  console.log(encodedData);
  console.log(decodedData);

  const res = await contract.getOraclePrice(token, encodedData, { value: 1 });

  console.log(await res.wait());


  console.log(res);
}
main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
