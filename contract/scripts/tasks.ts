/* eslint-disable dot-notation */
import { task, types } from 'hardhat/config'
import { ethers } from 'ethers'
import { getContract, getEnvVariable, getProvider } from './helpers'
import fs from 'fs'
import readline from 'readline'

task('checksum', 'Change address to checksum address')
  .addParam('address', 'wallet address')
  .setAction(async (taskArgs, hre) => {
    console.log(ethers.utils.getAddress(taskArgs.address))
  })

task('checkStats', 'Change address to checksum address').setAction(
  async (taskArgs, hre) => {
    const { ethers, network } = hre
    const deployer = (await ethers.getSigners())[0]
    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    console.log(`network: ${network.name}`)
    console.log(`deployer: ${deployer!.address}`)
    console.log(`contract: ${contract!.address}`)
  }
)

task('setMerkleRootPreMint', 'setMerkleRootPreMint')
  .addParam('merkleroot', 'merkleRoot for PublicMint')
  .setAction(async (taskArgs, hre) => {
    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    const transactionResponse = await contract['setMerkleRootPreMint'](
      taskArgs.merkleroot,
      {
        gasLimit: 14900000,
      }
    )
    console.log(`Transaction Response Hash: ${transactionResponse.hash}`)
  })

task('setMerkleRootPublicMint', 'setMerkleRootPublicMint')
  .addParam('merkleroot', 'merkleRoot for PublicMint')
  .setAction(async (taskArgs, hre) => {
    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    const transactionResponse = await contract['setMerkleRootPublicMint'](
      taskArgs.merkleroot,
      {
        gasLimit: 14900000,
      }
    )
    console.log(`Transaction Response Hash: ${transactionResponse.hash}`)
  })

task('setPreSale', 'setMerkleRootPublicMint')
  .addParam('merkleroot', 'merkleRoot for PublicMint')
  .setAction(async (taskArgs, hre) => {
    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    const transactionResponse = await contract['setMerkleRootPublicMint'](
      taskArgs.merkleroot,
      {
        gasLimit: 14900000,
      }
    )
    console.log(`Transaction Response Hash: ${transactionResponse.hash}`)
  })

task('setRoyaltyFee', 'setRoyaltyFee')
  .addParam('fee', 'fee')
  .setAction(async (taskArgs, hre) => {
    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    const transactionResponse = await contract['setRoyaltyFee'](taskArgs.fee, {
      gasLimit: 30000000,
    })
    console.log(`Transaction Response Hash: ${transactionResponse.hash}`)
  })

task('pushWL', 'Push WhiteList from JSON file')
  .addOptionalParam(
    'filename',
    'WhiteList txt file name',
    './scripts/whitelist_import.txt'
  )
  .setAction(async (taskArgs, hre) => {
    const whitelist: string[] = []

    const rl = readline.createInterface({
      input: fs.createReadStream(taskArgs.filename, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    })

    for await (const line of rl) {
      if (!ethers.utils.isAddress(line)) throw Error(line + 'is not valid.')
      whitelist.push(line)
    }

    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    const transactionResponse = await contract['pushMultiWL'](whitelist, {
      gasLimit: 14900000,
    })
    console.log(`Transaction Hash: ${transactionResponse.hash}`)
  })

task('snapshot', 'Take Snapshot NFT')
  .addOptionalParam(
    'filename',
    'White txt file name',
    './scripts/snapshot.csv',
    types.string
  )
  .addOptionalParam('start', 'Start ID', 1, types.int)
  .setAction(async function (taskArguments, hre) {
    const contract = await getContract(
      getEnvVariable('CONTRACT_NAME'),
      hre,
      getProvider(hre)
    )
    const totalSupply = Number(await contract['totalSupply']())
    console.log(`totalSupply: ${totalSupply}`)
    if (fs.existsSync(taskArguments.filename)) {
      fs.truncateSync(taskArguments.filename)
    }
    for (let i = taskArguments.start; i <= totalSupply; i++) {
      const ownerOf = await contract['ownerOf'](i)
      console.log(`ID:${i} owner:${ownerOf}`)
      fs.appendFileSync(taskArguments.filename, [i, ownerOf].join(',') + '\n')
    }

    console.log('done')
  })
