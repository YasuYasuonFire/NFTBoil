import { ethers } from 'hardhat'
import type { BigNumber } from 'ethers'
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'

export const testConfig = {
  price: 0.001,
  price_pre: 0.001,
  contract_name: 'NFTBoilMerkle',
  symbol: 'BOIL',
  max_supply: 10000,
  initialSupply: 0,
  public_max_per_tx: 5,
  max_per_wallet: 300,
  max_mint: 10,
  presale_max_mint: 100,
}

export async function assertPreMint(
  ad: any,
  cost: BigNumber,
  signer: SignerWithAddress,
  hexProof: any,
  num: number,
  alreadySupply = 0
) {
  const tokenId = await ad.totalSupply()
  expect(
    await ad.connect(signer).preMint(num, hexProof, {
      value: cost,
    })
  )
    .to.emit(ad, 'Transfer')
    .withArgs(
      ethers.constants.AddressZero,
      signer.address,
      tokenId.add(num.toString())
    )
  expect(await ad.totalSupply()).to.equal(num + alreadySupply)
}

export async function assertPublicMintSuccess(
  ad: any,
  cost: number | BigNumber,
  signer: SignerWithAddress,
  num: number,
  alreadySupply = 0
) {
  const tokenId = await ad.totalSupply()

  expect(
    await ad.connect(signer).publicMint(num, {
      value: cost,
    })
  )
    .to.emit(ad, 'Transfer')
    .withArgs(
      ethers.constants.AddressZero,
      signer.address,
      tokenId.add(num.toString())
    )
  expect(await ad.totalSupply()).to.equal(num + alreadySupply)
}
