import { Handler } from '@netlify/functions'
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
import { addressAndAlCountMap } from './addresses'
import Web3 from 'web3'

export const handler: Handler = async (event, context) => {
  const address = event.queryStringParameters?.address
  if (!address) {
    return { statusCode: 400, body: 'Set address on API' }
  }
  const addressLower = address.toLowerCase()

  const alCount = addressAndAlCountLower.get(addressLower)
  if (!alCount) {
    console.log('address not wl:', addressLower)
    return { statusCode: 400, body: "Your Address don't eligible whitelist" }
  }
  console.log('alCount:', alCount)

  const proof = createLeaf(addressLower, alCount)
  console.log('leaves', leaves)
  console.log('proof', proof)

  const nodeIndex: number = leaves.indexOf(proof)
  const rootHash = tree.getRoot()
  console.log('rootHash:', tree.getHexRoot())

  const hexProof = tree.getHexProof(proof)
  const verify = tree.verify(hexProof, proof, rootHash)

  if (!verify) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        address,
        message: 'your address can not verify',
      }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      hexProof: hexProof,
      alCount: alCount,
    }),
  }
}

// MerkleTreeにするもの。「addressLower + alCount」というフォーマット
const leaves: Buffer[] = []

// addressとalCountの対応表のアドレスを小文字化したもの
const addressAndAlCountLower = new Map<string, number>()

const web3 = new Web3()
// addressAndAlCountを元に、小文字化しつつaddressesLowerとaddressAndAlCountLowerを作る
for (const [address, presaleMax] of addressAndAlCountMap) {
  leaves.push(createLeaf(address, presaleMax))
  addressAndAlCountLower.set(address.toLowerCase(), presaleMax)
}

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })

function createLeaf(address, presaleMax) {
  // see https://ethereum.stackexchange.com/questions/127471/use-javascript-merkle-tree-to-generate-hex-proof-for-solidity-merkletree-validat
  const bufferAddress = Buffer.from(
    address.toLowerCase().replace('0x', ''),
    'hex'
  )
  const bufferPresaleMax = Buffer.from(
    web3.eth.abi.encodeParameter('uint256', presaleMax).replace('0x', ''),
    'hex'
  )
  const leaf: Buffer = keccak256(
    Buffer.concat([bufferAddress, bufferPresaleMax])
  )

  console.log(leaf)

  return leaf
}
