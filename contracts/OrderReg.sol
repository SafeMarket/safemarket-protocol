pragma solidity ^0.4.8;

//TODO: Overflow and underflow checks

import "owned.sol";
import "Filestore.sol";

contract OrderReg is owned {

  event Creation(uint256 id);

  enum Status{
    Processing,
    Cancelled,
    Shipped
  }

  Filestore public filestore;

  uint256 public affiliateFeeMicroperun;
  uint256 public storePrefund;

  mapping(bytes4 => uint256) public prices;

	function setPrice(bytes4 currency, uint256 price) onlyowner(msg.sender) {
		prices[currency] = price;
	}

  function setFilestore(Filestore _filestore) onlyowner(msg.sender) {
    filestore = _filestore;
  }

  function setAffiliateFeeMicroperun(uint256 _affiliateFeeMicroperun) onlyowner(msg.sender) {
    affiliateFeeMicroperun = _affiliateFeeMicroperun;
  }

  function setStorePrefund(uint256 _storePrefund) onlyowner(msg.sender) {
    storePrefund = _storePrefund;
  }

  struct Order {
    Status status;
    bytes32 buyerStrippedPublicKey;
    uint256 createdAt;
    uint256 cancelledAt;
    uint256 shippedAt;
    address buyer;
    address store;
    address affiliate;
    bytes4 currency;
    uint256 prebufferCURR;
    uint256 value;
    bytes32 encapsulatedMetaHash;
  }

  struct Message {
    bytes32 messageHash;
    address sender;
    uint256 timestamp;
  }

  mapping(bytes32 => Order) public orders;
  mapping(bytes32 => Message[]) public messages;

  function create (
    bytes32 orderId,
    bytes32 buyerStrippedPublicKey,
    address store,
    address affiliate,
    bytes4 currency,
    uint256 prebufferCURR,
    bytes encapsulatedMeta
  ) payable {

    if (orders[orderId].createdAt != 0) {
      throw;
    }

    if (msg.value < storePrefund) {
      throw;
    }

    orders[orderId].buyerStrippedPublicKey = buyerStrippedPublicKey;
    orders[orderId].createdAt = now;
    orders[orderId].buyer = msg.sender;
    orders[orderId].store = store;
    orders[orderId].affiliate = affiliate;
    orders[orderId].currency = currency;
    orders[orderId].prebufferCURR = prebufferCURR;
    orders[orderId].value = msg.value - storePrefund;
    orders[orderId].encapsulatedMetaHash = filestore.addFile(encapsulatedMeta);


    _send(store, storePrefund);
  }

  event Send(address addr, uint256 value);

  function _send(address addr, uint256 value) internal {
    if(!addr.send(value)) { throw; }
    Send(addr, value);
  }

  function cancel(bytes32 orderId) {
    if (orders[orderId].status != Status.Processing) {
      throw;
    }

    if (
      msg.sender != orders[orderId].buyer &&
      msg.sender != orders[orderId].store
    ) {
      throw;
    }

    orders[orderId].cancelledAt = now;
    orders[orderId].status = Status.Cancelled;
  }

  function markAsShipped(bytes32 orderId, address payoutAddress) {

    if (orders[orderId].status != Status.Processing) {
      throw;
    }

    if (msg.sender != orders[orderId].store) {
      throw;
    }

    orders[orderId].shippedAt = now;
    orders[orderId].status = Status.Shipped;

    uint256 storePayout = orders[orderId].prebufferCURR * prices[orders[orderId].currency];
    if (storePayout > orders[orderId].value) {
      storePayout = orders[orderId].value;
    }
    if (orders[orderId].affiliate != address(0)) {
      uint256 affiliatePayout = (storePayout * affiliateFeeMicroperun) / 1000000;
      storePayout = storePayout - affiliatePayout;
      _send(orders[orderId].affiliate, affiliatePayout);
    } else {
      throw;
    }

    _send(payoutAddress, storePayout);
    _send(orders[orderId].buyer, orders[orderId].value - storePayout - affiliatePayout);
  }

}
