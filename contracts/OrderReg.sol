pragma solidity ^0.4.8;

import "owned.sol";
import "kv.sol";
import "Ticker.sol";

contract OrderReg is owned {

  event Creation(
    uint256 id,
    address indexed buyer,
    address indexed store,
    address indexed arbitrator,
    address affiliate
  );

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

// in order to prevent stack depth issues, OrderInfo is split into OrderInfoA and OrderInfoB

  struct OrderInfoA {
    uint256 createdAt;
    uint256 shippedAt;
    address buyer;
    address store;
    address arbitrator;
    address affiliate;
    STATUS status;
    uint256 receivedWEI;
    uint256 updatesCount;
    uint256 productsCount;
  }

  struct OrderInfoB {
    bytes32 currency;
    uint256 bufferMicroperun;
    uint256 disputeSeconds;
    uint256 affiliateFeeMicroperun;
    uint256 transportId;
    uint256 transportPrice;
    bytes32 metaMultihash;
    uint256 prebufferCURR;
    bool isStorePayedOut;
    bool isBuyerPayedOut;
    uint256 storePayoutMicroperun;
    uint256 storePayoutWEI;
    uint256 arbitratorPayoutWEI;
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

  mapping(uint256 => OrderInfoA) public orderInfoAs;
  mapping(uint256 => OrderInfoB) public orderInfoBs;
  mapping(uint256 => Product[]) public ordersProducts;
  mapping(uint256 => Update[]) public ordersUpdates;
  mapping(address => uint256[]) public ordersByBuyer;
  mapping(address => uint256) public ordersByBuyerCount;
  mapping(address => uint256[]) public ordersByStore;
  mapping(address => uint256) public ordersByStoreCount;
  mapping(address => uint256[]) public ordersByArbitrator;
  mapping(address => uint256) public ordersByArbitratorCount;
  mapping(address => uint256[]) public ordersByAffiliate;
  mapping(address => uint256) public ordersByAffiliateCount;

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
    address store,
    uint256 arbitratorId,
    address affiliate,
    uint256[] productIds,
    uint256[] productQuantities,
    uint256 transportId
  ) payable returns(uint256 orderId) {

    orderId = ordersCount;
    ordersCount += 1;

    ordersByBuyer[msg.sender].push(orderId);
    ordersByBuyerCount[msg.sender] += 1;

    ordersByStore[store].push(orderId);
    ordersByStoreCount[store] += 1;


    if (arbitratorId != uint256(-1)) {
      orderInfoAs[orderId].arbitrator = kv(store).get_address(sha3('approvedArbitrators', arbitratorId));
      ordersByArbitrator[orderInfoAs[orderId].arbitrator].push(orderId);
      ordersByArbitratorCount[orderInfoAs[orderId].arbitrator] += 1;
    }

    if (affiliate != address(0)) {
      ordersByAffiliate[affiliate].push(orderId);
      ordersByAffiliateCount[affiliate] += 1;
    }

    if (!kv(store).get_bool('isOpen')) {
      throw;
    }

    orderInfoAs[orderId].createdAt = now;
    orderInfoAs[orderId].status = STATUS.PROCESSING;

    orderInfoAs[orderId].buyer = msg.sender;
    orderInfoAs[orderId].store = store;
    orderInfoAs[orderId].affiliate = affiliate;
    orderInfoAs[orderId].productsCount = productIds.length;

    orderInfoBs[orderId].currency = kv(store).get_bytes32('currency');
    orderInfoBs[orderId].disputeSeconds = kv(store).get_uint256('disputeSeconds');
    orderInfoBs[orderId].bufferMicroperun = kv(store).get_uint256('bufferMicroperun');
    orderInfoBs[orderId].affiliateFeeMicroperun = kv(store).get_uint256('affiliateFeeMicroperun');
    orderInfoBs[orderId].transportId = transportId;
    orderInfoBs[orderId].transportPrice = kv(store).get_uint256(sha3('transports_price', transportId));
    orderInfoBs[orderId].metaMultihash = kv(store).get_bytes32('metaMultihash');

    for(var i = 0; i < productIds.length; i ++) {
      uint256 productId = productIds[i];
      if(kv(orderInfoAs[orderId].store).get_bool(sha3('products_isArchived', productId))) {
        throw;
      }
      uint256 productQuantity = productQuantities[i];
      uint256 productPrice = kv(orderInfoAs[orderId].store).get_uint256(sha3('products_price', productId));

      ordersProducts[orderId].push(Product(productId, productPrice, productQuantity));
      kv(orderInfoAs[orderId].store).decrement_uint256(sha3('products_quantity', productId), productQuantity);

      orderInfoBs[orderId].prebufferCURR +=  productQuantity * productPrice;
    }

    // this is before transport has been added
    if(orderInfoBs[orderId].prebufferCURR < kv(orderInfoAs[orderId].store).get_uint256('minProductsTotal')) {
      throw;
    }

    orderInfoBs[orderId].prebufferCURR += orderInfoBs[orderId].transportPrice;

    uint256 prebufferWEI = orderInfoBs[orderId].prebufferCURR * ticker.prices(orderInfoBs[orderId].currency);
    uint256 bufferWEI = (prebufferWEI * kv(orderInfoAs[orderId].store).get_uint256('bufferMicroperun')) / MICRO;

    orderInfoAs[orderId].receivedWEI = msg.value;

    if(orderInfoAs[orderId].receivedWEI < (prebufferWEI + bufferWEI)) {
      throw;
    }

    Creation(orderId, msg.sender, store, orderInfoAs[orderId].arbitrator, affiliate);
  }


  function _setStatus(uint256 orderId, STATUS status) internal {
    orderInfoAs[orderId].status = status;
    orderInfoAs[orderId].updatesCount += 1;
    ordersUpdates[orderId].push(Update(status, msg.sender, now));
  }

  function _finalize(uint256 orderId) internal {
    orderInfoBs[orderId].storePayoutWEI = orderInfoBs[orderId].prebufferCURR * ticker.prices(orderInfoBs[orderId].currency) * orderInfoBs[orderId].storePayoutMicroperun / MICRO;
    _setStatus(orderId, STATUS.FINALIZED);
  }


  function setStatusToCancelled(uint256 orderId) {
    if (orderInfoAs[orderId].status != STATUS.PROCESSING) {
      throw;
    }
    if (
      orderInfoAs[orderId].buyer != msg.sender
      && orderInfoAs[orderId].store != msg.sender
    ) {
      throw;
    }
    _setStatus(orderId, STATUS.CANCELLED);
    _finalize(orderId);
  }

  function setStatusToShipped(uint256 orderId) {
    if (orderInfoAs[orderId].status != STATUS.PROCESSING) {
      throw;
    }
    if (orderInfoAs[orderId].store != msg.sender) {
      throw;
    }
    _setStatus(orderId, STATUS.SHIPPED);
    orderInfoAs[orderId].shippedAt = now;
    orderInfoBs[orderId].storePayoutMicroperun = 1 * MICRO;
    if (orderInfoAs[orderId].arbitrator == address(0)) {
      _finalize(orderId);
    }
  }

  function setStatusToDisputed(uint256 orderId) {
    if (orderInfoAs[orderId].status != STATUS.SHIPPED) {
      throw;
    }
    if (orderInfoAs[orderId].buyer != msg.sender) {
      throw;
    }
    if (orderInfoAs[orderId].arbitrator == address(0)) {
      throw;
    }
    // TODO: overflow protection
    if (now > (orderInfoAs[orderId].shippedAt + orderInfoBs[orderId].disputeSeconds)) {
      throw;
    }
    _setStatus(orderId, STATUS.DISPUTED);
  }

  function setStatusToDisputeResolved(uint256 orderId, uint256 storePayoutMicroperun) {
    if (orderInfoAs[orderId].status != STATUS.DISPUTED) {
      throw;
    }
    if (orderInfoAs[orderId].arbitrator != msg.sender) {
      throw;
    }
    if (storePayoutMicroperun > (1 * MICRO)) {
      throw;
    }
    orderInfoBs[orderId].storePayoutMicroperun = storePayoutMicroperun;
    _setStatus(orderId, STATUS.DISPUTE_RESOLVED);

  }

  function setStatusToFinalized(uint256 orderId) {
    if (orderInfoAs[orderId].status != STATUS.SHIPPED) {
      throw;
    }
    if (now < (orderInfoAs[orderId].shippedAt + orderInfoBs[orderId].disputeSeconds)) {
      throw;
    }
    _finalize(orderId);
  }

  function payoutStore(uint256 orderId) {
    if (orderInfoAs[orderId].status != STATUS.FINALIZED) {
      throw;
    }
    if (orderInfoBs[orderId].isStorePayedOut) {
      throw;
    }
    address storePayoutAddress = kv(orderInfoAs[orderId].store).get_address('coinbase');
    if (storePayoutAddress == address(0)) {
      throw;
    }
    if (!storePayoutAddress.send(orderInfoBs[orderId].storePayoutWEI)) {
      throw;
    }
  }

  function payoutBuyer(uint256 orderId) {
    if (orderInfoAs[orderId].status != STATUS.FINALIZED) {
      throw;
    }
    if (orderInfoAs[orderId].store != msg.sender) {
      throw;
    }
    if (orderInfoBs[orderId].isBuyerPayedOut) {
      throw;
    }
    if (!orderInfoAs[orderId].buyer.send(orderInfoAs[orderId].receivedWEI - orderInfoBs[orderId].storePayoutWEI)) {
      throw;
    }
  }
}
