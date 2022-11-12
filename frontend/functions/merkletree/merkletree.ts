import { Handler } from '@netlify/functions'
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
import { addressAndAlCountMapPreMint } from './addressesPreMint'
import { addressAndAlCountMapPublicMint } from './addressesPublicMint'
import Web3 from 'web3'

export const handler: Handler = async (event, context) => {
  const address = event.queryStringParameters?.address
  if (!address) {
    return { statusCode: 400, body: 'Set address on API' }
  }
  const addressLower = address.toLowerCase()

  // get preMint MerkleProof
  let alCountPreMint = addressAndAlCountLowerPreMint.get(addressLower)
  console.log('alCountPreMint:', alCountPreMint)

  if (!alCountPreMint) {
    alCountPreMint = 0
  }

  const proofPreMint = createLeaf(addressLower, alCountPreMint)
  // console.log('leaves', leaves)
  // console.log('proof', proof)

  // const nodeIndex: number = leavesPreMint.indexOf(proofPreMint)
  const rootHashPreMint = treePreMint.getRoot()
  console.log('rootHashPreMint:', treePreMint.getHexRoot())

  let hexProofPreMint = treePreMint.getHexProof(proofPreMint)
  const verifyPreMint = treePreMint.verify(
    hexProofPreMint,
    proofPreMint,
    rootHashPreMint
  )

  if (!verifyPreMint) {
    hexProofPreMint = []
  }

  // get publicMint MerkleProof
  let alCountPublicMint = addressAndAlCountLowerPublicMint.get(addressLower)
  console.log('alCountPublicMint:', alCountPublicMint)

  if (!alCountPublicMint) {
    alCountPublicMint = 0
  }

  const proofPublicMint = createLeaf(addressLower, alCountPublicMint)
  // console.log('leaves', leaves)
  // console.log('proof', proof)

  // const nodeIndex: number = leavesPublicMint.indexOf(proofPublicMint)
  const rootHashPublicMint = treePublicMint.getRoot()
  console.log('rootHashPublicMint:', treePublicMint.getHexRoot())

  let hexProofPublicMint = treePublicMint.getHexProof(proofPublicMint)
  const verifyPublicMint = treePublicMint.verify(
    hexProofPublicMint,
    proofPublicMint,
    rootHashPublicMint
  )

  if (!verifyPublicMint) {
    hexProofPublicMint = []
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      hexProofPreMint: hexProofPreMint,
      alCountPreMint: alCountPreMint,
      hexProofPublicMint: hexProofPublicMint,
      alCountPublicMint: alCountPublicMint,
    }),
  }
}

const web3 = new Web3()

//
// create PreMint MerkleTree
//

// MerkleTreeにするもの。「addressLower + alCount」というフォーマット
const leavesPreMint: Buffer[] = []

// addressとalCountの対応表のアドレスを小文字化したもの
const addressAndAlCountLowerPreMint = new Map<string, number>()

// addressAndAlCountを元に、小文字化しつつaddressesLowerとaddressAndAlCountLowerを作る
for (const [address, presaleMax] of addressAndAlCountMapPreMint) {
  leavesPreMint.push(createLeaf(address, presaleMax))
  addressAndAlCountLowerPreMint.set(address.toLowerCase(), presaleMax)
}

const treePreMint = new MerkleTree(leavesPreMint, keccak256, {
  sortPairs: true,
})

//
// create PublicMint MerkleTree
//

// MerkleTreeにするもの。「addressLower + alCount」というフォーマット
const leavesPublicMint: Buffer[] = []

// addressとalCountの対応表のアドレスを小文字化したもの
const addressAndAlCountLowerPublicMint = new Map<string, number>()

// addressAndAlCountを元に、小文字化しつつaddressesLowerとaddressAndAlCountLowerを作る
for (const [address, publicsaleMax] of addressAndAlCountMapPublicMint) {
  leavesPublicMint.push(createLeaf(address, publicsaleMax))
  addressAndAlCountLowerPublicMint.set(address.toLowerCase(), publicsaleMax)
}

const treePublicMint = new MerkleTree(leavesPublicMint, keccak256, {
  sortPairs: true,
})

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

  // console.log(leaf)

  return leaf
}
