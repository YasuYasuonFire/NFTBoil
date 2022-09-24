import { Handler } from '@netlify/functions'
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
import { addressAndAlCountMap } from './addresses'

export const handler: Handler = async (event, context) => {
  const address = event.queryStringParameters?.address
  if (!address) {
    return { statusCode: 400, body: 'Set address on API' }
  }
  const addressLower = address.toLowerCase()

  // console.log("addressAndAlCountLower", addressAndAlCountLower);
  // console.log("addressesLower", addressesLower);

  const alCount = addressAndAlCountLower.get(addressLower)
  if (!alCount) {
    console.log('address not wl:', addressLower)
    return { statusCode: 400, body: "Your Address don't eligible whitelist" }
  }
  console.log('alCount:', alCount)

  const proofStr = addressLower + ':' + alCount

  const nodeIndex: number = addressesLower.indexOf(proofStr)
  const rootHash = tree.getRoot()
  console.log('rootHash:', tree.getHexRoot())

  console.log('address:', addressLower, 'nodeindex:', nodeIndex)

  if (nodeIndex === -1) {
    return { statusCode: 400, body: "Your Address don't eligible whitelist" }
  }
  const hashedProofStr = keccak256(proofStr)
  const hexProof = tree.getHexProof(hashedProofStr)
  const verify = tree.verify(hexProof, hashedProofStr, rootHash)
  // console.log('verify:', verify)

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

// MerkleTreeにするもの。「addressLower:alCount」というフォーマット
const addressesLower: string[] = []

// addressとalCountの対応表のアドレスを小文字化したもの
const addressAndAlCountLower = new Map<string, number>()

// addressAndAlCountを元に、小文字化しつつaddressesLowerとaddressAndAlCountLowerを作る
for (const [key, value] of addressAndAlCountMap) {
  addressesLower.push(key.toLowerCase() + ':' + value)
  addressAndAlCountLower.set(key.toLowerCase(), value)
}

const leafNodes = addressesLower.map((x) => keccak256(x))
const tree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
