// log
import store from '../store'
import web3 from 'web3'

const fetchDataRequest = () => {
  return {
    type: 'CHECK_DATA_REQUEST',
  }
}

const fetchDataSuccess = (payload) => {
  return {
    type: 'CHECK_DATA_SUCCESS',
    payload: payload,
  }
}

const fetchDataFailed = (payload) => {
  return {
    type: 'CHECK_DATA_FAILED',
    payload: payload,
  }
}

export const fetchData = () => {
  return async (dispatch) => {
    dispatch(fetchDataRequest())
    try {
      let totalSupply = await store
        .getState()
        .blockchain.smartContract.methods.totalSupply()
        .call()

      const cost = await store
        .getState()
        .blockchain.smartContract.methods.getCurrentCost()
        .call()
      const display_cost = web3.utils.fromWei(cost, 'ether')

      const presale = await store
        .getState()
        .blockchain.smartContract.methods.onlyAllowlisted()
        .call()

      const paused = await store
        .getState()
        .blockchain.smartContract.methods.paused()
        .call()

      const mintable = !paused

      // const publicSaleWithoutProof = await store
      //   .getState()
      //   .blockchain.smartContract.methods.publicSaleWithoutProof()
      //   .call()
      const publicSaleWithoutProof = !presale

      //AL保有者が1個ミント済みかの判定に使用。
      const address = await store.getState().blockchain.account

      const alreadyMinted = await store
        .getState()
        .blockchain.smartContract.methods.balanceOf(address)
        .call()

      dispatch(
        fetchDataSuccess({
          totalSupply,
          cost,
          display_cost,
          presale,
          mintable,
          publicSaleWithoutProof,
          alreadyMinted,
        })
      )
    } catch (err) {
      console.log(err)
      dispatch(fetchDataFailed('Could not load data from contract.'))
    }
  }
}
