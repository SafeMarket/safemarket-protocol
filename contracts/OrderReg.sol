pragma solidity ^0.4.8;

//TODO: Overflow and underflow checks

import "owned.sol";
import "Planetoid.sol";

contract OrderReg is owned {

  event Creation(uint256 id);

  enum Status{
    Processing,
    Cancelled,
    Shipped
  }

  Planetoid public planetoid;

  uint256 public affiliateFeeMicroperun;
  uint256 public storePrefund;

  mapping(bytes32 => uint256) public prices;

	function setPrice(bytes4 currency, uint256 price) {
		prices[sha3(msg.sender, currency)] = price;
	}

  function setPlanetoid(Planetoid _planetoid) onlyowner(msg.sender) {
    planetoid = _planetoid;
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
    uint256 cancelledAt;
    uint256 shippedAt;
    address buyer;
    address store;
    address affiliate;
    bytes32 priceId;
    uint256 prebufferCURR;
    uint256 value;
    bytes32 encapsulatedMetaHash;
    mapping(uint256 => bytes32) spemHashes;
    uint256 spemHashesCount;
  }

  mapping(bytes32 => Order) public orders;
  function ordersSpemHashes(bytes32 orderId, uint256 spemHashesIndex) constant returns (bytes32) {
    return orders[orderId].spemHashes[spemHashesIndex];
  }

  function create (
    bytes32 orderId,
    bytes32 buyerStrippedPublicKey,
    address store,
    address affiliate,
    bytes32 priceId,
    uint256 prebufferCURR,
    bytes encapsulatedMeta
  ) payable {

    if (orders[orderId].buyer != 0) {
      throw;
    }

    if (msg.value < storePrefund) {
      throw;
    }

    orders[orderId].buyerStrippedPublicKey = buyerStrippedPublicKey;
    orders[orderId].buyer = msg.sender;
    orders[orderId].store = store;
    orders[orderId].affiliate = affiliate;
    orders[orderId].priceId = priceId;
    orders[orderId].prebufferCURR = prebufferCURR;
    orders[orderId].value = msg.value;
    orders[orderId].encapsulatedMetaHash = planetoid.addDocument(encapsulatedMeta);


    _send(orderId, store, storePrefund);
  }

  event Send(address addr, uint256 value);

  function _send(bytes32 orderId, address addr, uint256 value) internal {
    if (orders[orderId].value < value) { value = orders[orderId].value; }
    orders[orderId].value -= value;
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

    uint256 storePayout = orders[orderId].prebufferCURR * prices[orders[orderId].priceId];
    if (storePayout > orders[orderId].value) {
      storePayout = orders[orderId].value;
    }
    if (orders[orderId].affiliate != address(0)) {
      uint256 affiliatePayout = (storePayout * affiliateFeeMicroperun) / 1000000;
      storePayout = storePayout - affiliatePayout;
      _send(orderId, orders[orderId].affiliate, affiliatePayout);
    } else {
      throw;
    }

    _send(orderId, payoutAddress, storePayout);
    _send(orderId, orders[orderId].buyer, orders[orderId].value - storePayout - affiliatePayout);
  }

  function addMessage(bytes32 orderId, bytes encapsulatedMessage) returns (bytes32 spemHash) {
    if (msg.sender == orders[orderId].store) {
      uint256 gasRefund = msg.gas / 2;
      if (gasRefund < orders[orderId].value) {
        // TODO: underflow protection
        orders[orderId].value -= gasRefund;
        _send(orderId, tx.origin, gasRefund);
      }
    } else if (msg.sender != orders[orderId].buyer) {
      throw;
    }

    bytes20 sender = bytes20(msg.sender);
    // spem := senderPrepenededEncapsulatedMessage
    bytes memory spem = new bytes(encapsulatedMessage.length + 20);
    assembly {
      mstore(add(spem, 32), sender)
    }
    for (uint i = 0; i <= (encapsulatedMessage.length / 32); ++i) {
      assembly {
        mstore(
          add(spem, add(52, mul(i, 32))),
          mload(add(encapsulatedMessage, add(32, mul(i, 32))))
        )
      }
    }
    spemHash = planetoid.addDocument(spem);
    orders[orderId].spemHashes[orders[orderId].spemHashesCount++] = spemHash;
    return spemHash;
  }
}
