pragma solidity ^0.4.8;

import "owned.sol";
import "kv.sol";
import "Ticker.sol";

contract OrderReg is owned {

  enum STATUS {
    PROCESSING,
    CANCELLED,
    SHIPPED,
    DISPUTED,
    DISPUTE_RESOLVED,
    FINALIZED
  }

  function STATUS_IDS() constant public returns(
    uint256 PROCESSING,
    uint256 CANCELLED,
    uint256 SHIPPED,
    uint256 DISPUTED,
    uint256 DISPUTE_RESOLVED,
    uint256 FINALIZED
  ) {
    return (
      uint256(STATUS.PROCESSING),
      uint256(STATUS.CANCELLED),
      uint256(STATUS.SHIPPED),
      uint256(STATUS.DISPUTED),
      uint256(STATUS.DISPUTE_RESOLVED),
      uint256(STATUS.FINALIZED)
    );
  }

  Ticker ticker;
  bytes32 WEI = 'WEI';
  uint256 MICRO = 10**6;

  function setTicker(Ticker _ticker) public onlyowner(msg.sender) {
    ticker = _ticker;
  }

  struct StoreInfo {
    bytes32 currency;
    uint256 bufferMicroperun;
    uint256 disputeSeconds;
    uint256 affiliateFeeMicroperun;
  }

  struct CartInfo {
    uint256 transportId;
    uint256 transportPrice;
    uint256 prebufferCURR;
  }

  struct PayoutInfo {
    bool isStorePayedOut;
    bool isBuyerPayedOut;
    uint256 storePayoutMicroperun;
    uint256 storePayoutWEI;
    uint256 arbitratorPayoutWEI;
  }

  struct Order {
    uint256 createdAt;
    uint256 shippedAt;
    address buyer;
    kv store;
    kv arbitrator;
    address affiliate;
    STATUS status;
    uint256 storePayoutMicroperun; // what percent of prebuffer gets sent to store (arbitrator can decrease)
    uint256 receivedWEI;
    uint256 updatesCount;
    uint256 productsCount;
  }

  struct Product {
    uint256 id;
    uint256 price;
    uint256 quantity;
  }

  struct Update {
    STATUS status;
    address sender;
    uint256 timestamp;
  }

  mapping(uint256 => Order) public orders;
  mapping(uint256 => Product[]) public ordersProducts;
  mapping(uint256 => Update[]) public ordersUpdates;
  mapping(uint256 => StoreInfo) public ordersStoreInfo;
  mapping(uint256 => CartInfo) public ordersCartInfo;
  mapping(uint256 => PayoutInfo) public ordersPayoutInfo;

  function ordersProducts(uint256 orderId, uint256 productIndex) constant returns(uint256 id, uint256 price, uint256 quantity){
    Product product = ordersProducts[orderId][productIndex];
    return (product.id, product.price, product.quantity);
  }

  function ordersUpdates(uint256 orderId, uint256 updateIndex) constant returns(uint256 status, address sender, uint256 timestamp){
    Update update = ordersUpdates[orderId][updateIndex];
    return (uint256(update.status), update.sender, update.timestamp);
  }

  uint256 public ordersCount;

  function create(
    kv store,
    kv arbitrator,
    address affiliate,
    uint256[] productIds,
    uint256[] productQuantities,
    uint256 transportId
  ) payable returns(uint256 orderId) {

    orderId = ordersCount;
    ordersCount += 1;

    Order order = orders[orderId];
    StoreInfo storeInfo = ordersStoreInfo[orderId];
    CartInfo cartInfo = ordersCartInfo[orderId];

    if (!store.get_bool('isOpen')) {
      throw;
    }

    order.createdAt = now;
    order.status = STATUS.PROCESSING;
    order.storePayoutMicroperun = 1 * MICRO;

    order.buyer = msg.sender;
    order.store = store;
    order.arbitrator = arbitrator;
    order.affiliate = affiliate;
    order.productsCount = productIds.length;

    storeInfo.currency = store.get_bytes32('currency');
    storeInfo.bufferMicroperun = kv(store).get_uint256('bufferMicroperun');
    storeInfo.affiliateFeeMicroperun = kv(store).get_uint256('affiliateFeeMicroperun');

    cartInfo.transportId = transportId;
    cartInfo.transportPrice = kv(store).get_uint256(sha3('transports_price', transportId));

    for(var i = 0; i < productIds.length; i ++) {
      uint256 productId = productIds[i];
      if(order.store.get_bool(sha3('products_isArchived', productId))) {
        throw;
      }
      uint256 productQuantity = productQuantities[i];
      uint256 productPrice = order.store.get_uint256(sha3('products_price', productId));

      ordersProducts[orderId].push(Product(productId, productPrice, productQuantity));
      order.store.decrement_uint256(sha3('products_quantity', productId), productQuantity);

      cartInfo.prebufferCURR +=  productQuantity * productPrice;
    }

    // this is before transport has been added
    if(cartInfo.prebufferCURR < order.store.get_uint256('minProductsTotal')) {
      throw;
    }

    cartInfo.prebufferCURR += cartInfo.transportPrice;

    uint256 prebufferWEI = cartInfo.prebufferCURR * ticker.prices(storeInfo.currency);
    uint256 bufferWEI = (prebufferWEI * order.store.get_uint256('bufferMicroperun')) / MICRO;

    order.receivedWEI = msg.value;

    if(order.receivedWEI < (prebufferWEI + bufferWEI)) {
      throw;
    }
  }


  function _setStatus(uint256 orderId, STATUS status) internal {
    Order order = orders[orderId];
    orders[orderId].status = status;
    orders[orderId].updatesCount += 1;
    ordersUpdates[orderId].push(Update(status, msg.sender, now));
  }

  function setStatusAsCancelled(uint256 orderId) {
    Order order = orders[orderId];
    if (msg.sender == address(order.store)) {
      _setStatus(orderId, STATUS.CANCELLED);
      return;
    }
    if (msg.sender == order.buyer) {
      if (order.status != STATUS.PROCESSING) {
        throw;
      }
      _setStatus(orderId, STATUS.CANCELLED);
      return;
    }
    throw;
  }

  function setStatusAsShipped(uint256 orderId) {
    Order order = orders[orderId];
    if (order.status != STATUS.PROCESSING) {
      throw;
    }
    if (msg.sender != address(order.store)) {
      throw;
    }
    _setStatus(orderId, STATUS.SHIPPED);
    order.shippedAt = now;
  }

  function setStatusAsDisputed(uint256 orderId) {
    Order order = orders[orderId];
    if (order.status != STATUS.SHIPPED) {
      throw;
    }
    if (msg.sender != order.buyer) {
      throw;
    }
    // TODO: overflow protection
    if (now > (order.shippedAt + ordersStoreInfo[orderId].disputeSeconds)) {
      // in case of no arbitrator, disputeSeconds will be 0
      throw;
    }
    _setStatus(orderId, STATUS.DISPUTED);
  }

  function setStatusAsDisputeResolved(uint256 orderId, uint256 storePayoutMicroperun) {
    Order order = orders[orderId];
    if (order.status != STATUS.DISPUTED) {
      throw;
    }
    if (msg.sender != address(order.arbitrator)) {
      throw;
    }
    if (storePayoutMicroperun > (1 * MICRO)) {
      throw;
    }
    order.storePayoutMicroperun = storePayoutMicroperun;
    _setStatus(orderId, STATUS.DISPUTE_RESOLVED);

  }

  function setStatusAsFinalized(uint256 orderId) {
    Order order = orders[orderId];
    if (order.status == STATUS.PROCESSING) {
      throw;
    }
    if (order.status == STATUS.DISPUTED) {
      throw;
    }
    if (now < (order.shippedAt + ordersStoreInfo[orderId].disputeSeconds)) {
      throw;
    }
    if (
      msg.sender != address(order.store)
      && msg.sender != address(order.arbitrator)
      && msg.sender != order.buyer
    ) {
      throw;
    }

    //TODO: overflow checks
    ordersPayoutInfo[orderId].storePayoutWEI = ordersCartInfo[orderId].prebufferCURR * ticker.prices(ordersStoreInfo[orderId].currency) * order.storePayoutMicroperun / MICRO;
    _setStatus(orderId, STATUS.FINALIZED);
  }

  function withdrawAsStore(uint256 orderId) {
    Order order = orders[orderId];
    if (order.status != STATUS.FINALIZED) {
      throw;
    }
    if (msg.sender != address(order.store)) {
      throw;
    }
    if (ordersPayoutInfo[orderId].isStorePayedOut) {
      throw;
    }
    address storePayoutAddress = order.store.get_address('payout');
    if (!storePayoutAddress.send(ordersPayoutInfo[orderId].storePayoutWEI)) {
      throw;
    }
  }

  function withdrawAsBuyer(uint256 orderId) {
    Order order = orders[orderId];
    if (order.status != STATUS.FINALIZED) {
      throw;
    }
    if (msg.sender != address(order.store)) {
      throw;
    }
    if (ordersPayoutInfo[orderId].isBuyerPayedOut) {
      throw;
    }
    if (!order.buyer.send(order.receivedWEI - ordersPayoutInfo[orderId].storePayoutWEI)) {
      throw;
    }
  }
}
