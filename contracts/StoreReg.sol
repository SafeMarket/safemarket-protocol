pragma solidity ^0.4.8;

import "owned.sol";
import "Planetoid.sol";

contract StoreReg is owned {

  Planetoid public planetoid;

  function setPlanetoid(Planetoid _planetoid) onlyowner(msg.sender) {
    planetoid = _planetoid;
  }

  struct Store {
    address owner;
    bytes32 metaHash;
  }

  mapping(bytes32 => Store) public stores;

  modifier onlystoreowner(bytes32 storeId) {
    if (stores[storeId].owner != msg.sender) {
      throw;
    }
    _;
  }

  event Register(bytes32 storeId, address owner, bytes32 metaHash);
  event Unregister(bytes32 storeId);
  event SetMeta(bytes32 storeId, bytes32 metaHash);
  event SetOwner(bytes32 storeId, address owner);

  function register(bytes32 storeId, bytes meta) {
    if (stores[storeId].owner != 0) {
      throw;
    }
		validateStoreId(storeId);
    stores[storeId].owner = msg.sender;
    stores[storeId].metaHash = planetoid.addDocument(meta);
    Register(storeId, msg.sender, stores[storeId].metaHash);
  }

  function unregister(bytes32 storeId) onlystoreowner(storeId) {
    stores[storeId].owner = address(0);
    stores[storeId].metaHash = bytes32(0);
    Unregister(storeId);
  }

  function setOwner(bytes32 storeId, address owner) onlystoreowner(storeId) {
    stores[storeId].owner = owner;
    SetOwner(storeId, owner);
  }

  function setMeta(bytes32 storeId, bytes meta) onlystoreowner(storeId) {
    stores[storeId].metaHash = planetoid.addDocument(meta);
    SetMeta(storeId, stores[storeId].metaHash);
  }

  function validateStoreId(bytes32 storeId) constant {
    if (storeId == bytes32(0)) {
			throw;
		}
    for (uint256 i = 0; i < 32; i ++) {
			if (storeId[i] == 0) {
				break;
			}
			validateCharCode(uint256(storeId[i]));
		}
		for (uint256 j = i; j < 32; j ++) {
			if(storeId[j] != 0) {
				throw;
			}
		}
  }

  function validateCharCode(uint256 charCode) constant {
    if (charCode >= 97 && charCode <= 122) {
			// a-z
      return;
    }
    if (charCode >= 48 && charCode <= 57) {
			// 0-9
      return;
    }
    if (charCode == 95) {
			// _
      return;
    }
    throw;
	}

}
