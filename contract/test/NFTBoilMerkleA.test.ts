/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-unused-expressions */
import { ethers, waffle } from 'hardhat'
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { testConfig } from './test-helpers'
import type { NFTBoilMerkleA } from '../typechain-types'
import type { BigNumber, BytesLike } from 'ethers'
import { expect } from 'chai'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
const provider = waffle.provider

describe(`NFTBoilMerkleA contract`, function () {
  let owner: SignerWithAddress
  let bob: SignerWithAddress
  let bobs: NFTBoilMerkleA
  let alis: SignerWithAddress
  let ads: NFTBoilMerkleA
  let ad: NFTBoilMerkleA

  beforeEach(async function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    [owner, bob, alis] = await ethers.getSigners()
    const contract = await ethers.getContractFactory('NFTBoilMerkleA')
    ad = (await contract.deploy(
      'NFTBoilMerkleA',
      testConfig.symbol
    )) as NFTBoilMerkleA
    await ad.deployed()
    bobs = ad.connect(bob)
    ads = ad.connect(alis)

    // Ensure contract is paused/disabled on deployment
    expect(await ad.presale()).to.equal(true)
  })

  describe('Basic checks', function () {
    it('check the owner', async function () {
      expect(await ad.owner()).to.equal(owner.address)
    })

    it('check default is PreSale', async function () {
      expect(await ad.presale()).to.equal(true)
    })

    it('Confirm pre price', async function () {
      const cost = ethers.utils.parseUnits(testConfig.price_pre.toString())
      expect(await ad.getCurrentCost()).to.equal(cost)
    })

    it('Confirm public price', async function () {
      const cost = ethers.utils.parseUnits(testConfig.price.toString())
      await ad.setPresale(false)
      expect(await ad.getCurrentCost()).to.equal(cost)
    })
  })

  describe('Public Minting checks', function () {
    beforeEach(async function () {
      await ad.setPresale(false)
    })

    it('PublicMint fail if presale is active', async () => {
      const degenCost = await ad.getCurrentCost()
      await ad.setPresale(true)
      await expect(
        ad.connect(bob).publicMint(1, { value: degenCost })
      ).to.be.revertedWith('Presale is active.')
    })

    it('Non-owner cannot mint without enough balance', async () => {
      const degenCost = await ad.getCurrentCost()
      await expect(ad.connect(bob).publicMint(1, { value: degenCost.sub(1) }))
        .to.be.reverted
    })

    it('Owner and Bob mint', async () => {
      const degenCost = await ad.getCurrentCost()
      expect(await ad.totalSupply()).to.equal(testConfig.initialSupply)

      let tokenId = await ad.totalSupply()
      await expect(
        ad.publicMint(1, {
          value: degenCost,
        })
      )
        .to.emit(ad, 'Transfer')
        .withArgs(ethers.constants.AddressZero, owner.address, tokenId)
      expect(await ad.totalSupply()).to.equal(testConfig.initialSupply + 1)

      tokenId = await ad.totalSupply()
      await expect(
        ad.connect(bob).publicMint(1, {
          value: degenCost,
        })
      )
        .to.emit(ad, 'Transfer')
        .withArgs(ethers.constants.AddressZero, bob.address, tokenId)

      expect(await ad.totalSupply()).to.equal(testConfig.initialSupply + 2)
    })

    it('Minting tokens increased contract balance', async () => {
      const degenCost = await ad.getCurrentCost()

      // Mint first token and expect a balance increase
      expect(await ad.publicMint(1, { value: degenCost })).to.be.ok
      expect(await provider.getBalance(ad.address)).to.equal(degenCost)

      // Mint two additonal tokens and expect increase again
      expect(await ad.publicMint(2, { value: degenCost.mul(2) })).to.be.ok
      expect(await provider.getBalance(ad.address)).to.equal(degenCost.mul(3))
    })

    it('Bob mints ' + testConfig.max_mint, async () => {
      const degenCost = await ad.getCurrentCost()
      const tokenId = await ad.totalSupply()

      await expect(
        ad.connect(bob).publicMint(testConfig.max_mint, {
          value: degenCost.mul(testConfig.max_mint),
        })
      )
        .to.emit(ad, 'Transfer')
        .withArgs(
          ethers.constants.AddressZero,
          bob.address,
          tokenId.add(testConfig.max_mint - 1)
        )
    })

    it('Bob mints 1 plus ' + (testConfig.max_mint - 1), async () => {
      const degenCost = await ad.getCurrentCost()
      const tokenId = await ad.totalSupply()

      await expect(
        ad.connect(bob).publicMint(1, {
          value: degenCost.mul(1),
        })
      )
        .to.emit(ad, 'Transfer')
        .withArgs(ethers.constants.AddressZero, bob.address, tokenId)

      await expect(
        ad.connect(bob).publicMint(testConfig.max_mint - 1, {
          value: degenCost.mul(testConfig.max_mint - 1),
        })
      )
        .to.emit(ad, 'Transfer')
        .withArgs(
          ethers.constants.AddressZero,
          bob.address,
          tokenId.add(testConfig.max_mint - 1)
        )
    })

    it('Bob fails to mints ' + (testConfig.max_mint + 1), async () => {
      const degenCost = await ad.getCurrentCost()
      await expect(
        ad.connect(bob).publicMint(testConfig.max_mint + 1, {
          value: degenCost.mul(testConfig.max_mint + 1),
        })
      ).to.be.revertedWith('Mint amount over')
    })

    it('Bob fails to mints when paused', async () => {
      const cost = await ad.getCurrentCost()
      await ad.pause()

      await expect(
        ad.connect(bob).publicMint(testConfig.max_mint + 1, {
          value: cost.mul(testConfig.max_mint + 1),
        })
      ).to.be.revertedWith('Pausable: paused')
      await ad.unpause()
      expect(
        await ad.connect(bob).publicMint(1, {
          value: cost,
        })
      ).to.be.ok
    })

    it('Bob fails to mints 2 with funds for 1', async () => {
      const degenCost = await ad.getCurrentCost()

      await expect(
        ad.connect(bob).publicMint(2, { value: degenCost })
      ).to.be.revertedWith('Not enough funds')
    })

    it('Public Sale Price Boundary Check', async () => {
      const cost = ethers.utils.parseUnits(testConfig.price.toString())
      expect(await bobs.publicMint(1, { value: cost })).to.be.ok
      expect(await bobs.publicMint(1, { value: cost.add(1) })).to.be.ok
      await expect(
        bobs.publicMint(1, { value: cost.sub(1) })
      ).to.be.revertedWith('Not enough funds')
    })

    it('Public Sale Price Change Check', async () => {
      const cost = ethers.utils.parseUnits('0.001')
      expect(await ad.setPublicCost(cost))
      expect(await bobs.publicMint(1, { value: cost })).to.be.ok
      expect(await bobs.publicMint(1, { value: cost.add(1) })).to.be.ok
      await expect(
        ad.connect(bob).publicMint(1, { value: cost.sub(1) })
      ).to.be.revertedWith('Not enough funds')
    })

    it(`${testConfig.max_mint} mint Public Sale Price Boundary Check`, async () => {
      const cost = ethers.utils.parseUnits(testConfig.price.toString())
      expect(
        await bobs.publicMint(testConfig.max_mint, {
          value: cost.mul(testConfig.max_mint),
        })
      ).to.be.ok
      expect(
        await bobs.publicMint(testConfig.max_mint, {
          value: cost.mul(testConfig.max_mint).add(1),
        })
      ).to.be.ok
      await expect(
        ad.connect(bob).publicMint(testConfig.max_mint, {
          value: cost.mul(testConfig.max_mint).sub(1),
        })
      ).to.be.revertedWith('Not enough funds')
    })

    it('Pre Sale price can not buy', async () => {
      const cost = ethers.utils.parseUnits(testConfig.price_pre.toString())
      await expect(
        ad.connect(bob).publicMint(1, { value: cost.sub(1) })
      ).to.be.revertedWith('Not enough funds')
    })

    it('Public sale have no wallet restriction (only TX)', async () => {
      const cost = await ad.getCurrentCost()
      expect(
        await bobs.publicMint(testConfig.max_mint, {
          value: cost.mul(testConfig.max_mint),
        })
      ).to.be.ok
      expect(
        await bobs.publicMint(testConfig.max_mint, {
          value: cost.mul(testConfig.max_mint),
        })
      ).to.be.ok
    })
  })

  describe('Whitelist checks', function () {
    let rootTree
    let addresses: string[]
    let leaves: Buffer[]
    let hexProofs: BytesLike[][]
    let presaleMaxes: number[]
    let mintCost: BigNumber

    beforeEach(async function () {
      mintCost = await ad.getCurrentCost()

      addresses = [alis.address]
      leaves = createLeaves(addresses, [5])
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
      rootTree = tree.getRoot()
      await ad.setMerkleRoot(rootTree)

      hexProofs = [owner.address, bob.address, alis.address].map((x) => {
        return tree.getHexProof(keccak256(x))
      })
      presaleMaxes = [5, 5, 5]
    })

    // it('leaf check getLeaf', async function () {
    //   expect(
    //     await ads.getLeaf()
    //   ).to.equal(leaves[0]?.toString('hex'))

    // })

    // it('leaf check getLeafWithPreMintMax', async () => {
    //   expect(
    //     await ads.getLeafWithPreMintMax(5)
    //   ).to.equal("0x" + leaves[0]?.toString('hex'))

    // })

    it('Non Whitelisted user cant buy on PreSale', async () => {
      await expect(
        ad.connect(bob).preMint(1, presaleMaxes[1]!, hexProofs[1]!, {
          value: mintCost,
        })
      ).to.be.revertedWith('Invalid Merkle Proof')

      await expect(
        ad.connect(owner).preMint(1, presaleMaxes[0]!, hexProofs[0]!, {
          value: mintCost,
        })
      ).to.be.revertedWith('Invalid Merkle Proof')

      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, {
          value: mintCost,
        })
      ).to.be.ok
    })

    it("Presale can't open on PublicSale", async () => {
      await ad.setPresale(false)
      await expect(
        ad
          .connect(bob)
          .preMint(1, presaleMaxes[1]!, hexProofs[1]!, { value: mintCost })
      ).to.be.revertedWith('Presale is not active.')
    })

    it('Whitelisted multi user set', async () => {
      addresses = [owner.address, bob.address, alis.address]
      presaleMaxes = [5, 5, 5]
      leaves = createLeaves(addresses, presaleMaxes)
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
      rootTree = tree.getRoot()
      await ad.setMerkleRoot(rootTree)

      hexProofs = leaves.map((x) => tree.getHexProof(x))

      expect(
        await ad
          .connect(owner)
          .preMint(1, presaleMaxes[0]!, hexProofs[0]!, { value: mintCost })
      ).to.be.ok
      expect(
        await bobs.preMint(1, presaleMaxes[1]!, hexProofs[1]!, {
          value: mintCost,
        })
      ).to.be.ok
      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, {
          value: mintCost,
        })
      ).to.be.ok
    })

    it(`Whitelisted user can purchase as many as they are allocated.`, async () => {
      const buyCost = (await ad.getCurrentCost()).mul(presaleMaxes[2]!)

      expect(
        await ads.preMint(presaleMaxes[2]!, presaleMaxes[2]!, hexProofs[2]!, {
          value: buyCost,
        })
      ).to.be.ok
      await expect(
        ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: buyCost })
      ).to.be.revertedWith('Already claimed max')
    })

    it('Whitelisted user can buy 3 + 2', async () => {
      mintCost = (await ad.getCurrentCost()).mul(3)
      expect(
        await ads.preMint(3, presaleMaxes[2]!, hexProofs[2]!, {
          value: mintCost,
        })
      ).to.be.ok
      expect(
        await ads.preMint(2, presaleMaxes[2]!, hexProofs[2]!, {
          value: mintCost,
        })
      ).to.be.ok
      await expect(
        ad
          .connect(alis)
          .preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: mintCost })
      ).to.be.revertedWith('Already claimed max')
    })

    it('Whitelisted user can not buy over WL', async () => {
      const amount = presaleMaxes[2]! + 1
      const cost = (await ad.getCurrentCost()).mul(amount)
      await expect(
        ad
          .connect(alis)
          .preMint(amount, presaleMaxes[2]!, hexProofs[2]!, { value: cost })
      ).to.be.revertedWith('Already claimed max')
    })

    it('Whitelisted fails to mints when paused', async () => {
      const cost = await ad.getCurrentCost()
      await ad.pause()

      await expect(
        ad.connect(alis).preMint(1, presaleMaxes[2]!, hexProofs[2]!, {
          value: cost,
        })
      ).to.be.revertedWith('Pausable: paused')
      await ad.unpause()
      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: cost })
      ).to.ok
    })

    it('Non WhiteList user block after Whitelisted user buy', async () => {
      const amount = presaleMaxes[2]!
      mintCost = (await ad.getCurrentCost()).mul(amount)
      expect(
        await ads.preMint(amount, presaleMaxes[2]!, hexProofs[2]!, {
          value: mintCost,
        })
      ).to.ok
      await expect(
        ad
          .connect(alis)
          .preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: mintCost })
      ).to.be.revertedWith('Already claimed max')
      await expect(
        ad
          .connect(bob)
          .preMint(1, presaleMaxes[1]!, hexProofs[1]!, { value: mintCost })
      ).to.be.revertedWith('Invalid Merkle Proof')
    })

    it('Pre Sale Price Boundary Check', async () => {
      const cost = ethers.utils.parseUnits(testConfig.price_pre.toString())
      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: cost })
      ).to.ok
      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, {
          value: cost.add(1),
        })
      ).to.ok
      await expect(
        ad
          .connect(alis)
          .preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: cost.sub(1) })
      ).to.be.revertedWith('Not enough funds')
    })

    it('Pre Sale setPrice Check', async () => {
      const cost = ethers.utils.parseUnits('0.001')
      expect(await ad.setPreCost(cost))
      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: cost })
      ).to.ok
      expect(
        await ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, {
          value: cost.add(1),
        })
      ).to.ok
      await expect(
        ads.preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: cost.sub(1) })
      ).to.be.revertedWith('Not enough funds')
    })

    it('Block over allocate Check', async () => {
      expect(
        await ads.preMint(5, presaleMaxes[2]!, hexProofs[2]!, {
          value: mintCost.mul(5),
        })
      ).to.be.ok
      expect(
        await ad
          .connect(alis)
          ['safeTransferFrom(address,address,uint256)'](
            alis.address,
            bob.address,
            201
          )
      ).to.be.ok
      expect(await ad.balanceOf(bob.address)).to.equal(1)
      expect(await ad.balanceOf(alis.address)).to.equal(4)
      await expect(
        ad
          .connect(alis)
          .preMint(1, presaleMaxes[2]!, hexProofs[2]!, { value: mintCost })
      ).to.be.revertedWith('Already claimed max')
    })
  })

  function createLeaves(
    _addresses: string[],
    _presaleMaxes: number[]
  ): Buffer[] {
    const leaves: Buffer[] = _addresses.map((address, i) => {
      // see https://ethereum.stackexchange.com/questions/127471/use-javascript-merkle-tree-to-generate-hex-proof-for-solidity-merkletree-validat
      const bufferAddress = Buffer.from(address.replace('0x', ''), 'hex')
      const bufferPresaleMax = Buffer.from(
        ethers.utils.defaultAbiCoder
          .encode(['uint256'], [_presaleMaxes[i]])
          .replace('0x', ''),
        'hex'
      )
      // console.log("bufferAddress : ", bufferAddress, ", bufferPresaleMax : ", bufferPresaleMax)
      // const leaf: Buffer = keccak256(address)
      // const leaf: Buffer = keccak256(address + _presaleMaxes[i])

      const leaf: Buffer = keccak256(
        Buffer.concat([bufferAddress, bufferPresaleMax])
      )
      // console.log("address : ", address, "_presaleMaxes[i] : ", _presaleMaxes[i], "leaf : ", leaf);

      return leaf
    })
    return leaves
  }
})
