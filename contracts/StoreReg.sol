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

  modifier onlystoreowner(bytes32 alias) {
    if (stores[alias].owner != msg.sender) {
      throw;
    }
    _;
  }

  event Register(bytes32 alias, address owner, bytes32 metaHash);
  event Unregister(bytes32 alias);
  event SetMeta(bytes32 alias, bytes32 metaHash);
  event SetOwner(bytes32 alias, address owner);

  function register(bytes32 alias, bytes meta) {
    if (stores[alias].owner != 0) {
      throw;
    }
		validateAlias(alias);
    stores[alias].owner = msg.sender;
    stores[alias].metaHash = planetoid.addDocument(meta);
    Register(alias, msg.sender, stores[alias].metaHash);
  }

  function unregister(bytes32 alias) onlystoreowner(alias) {
    stores[alias].owner = address(0);
    stores[alias].metaHash = bytes32(0);
    Unregister(alias);
  }

  function setOwner(bytes32 alias, address owner) onlystoreowner(alias) {
    stores[alias].owner = owner;
    SetOwner(alias, owner);
  }

  function setMeta(bytes32 alias, bytes meta) onlystoreowner(alias) {
    stores[alias].metaHash = planetoid.addDocument(meta);
    SetMeta(alias, stores[alias].metaHash);
  }

  function validateAlias(bytes32 alias) constant {
    if (alias == bytes32(0)) {
			throw;
		}
    for (uint256 i = 0; i < 32; i ++) {
			if (alias[i] == 0) {
				break;
			}
			validateCharCode(uint256(alias[i]));
		}
		for (uint256 j = i; j < 32; j ++) {
			if(alias[j] != 0) {
				throw;
			}
		}
  }

  function validateCharCode(uint256 charCode) constant {
		if (charCode >= 48 && charCode < 57) {
			// 0-9
      return;
    }
    if (charCode >= 97 && charCode < 122) {
			// a-z
      return;
    }
    if (charCode == 137) {
			// _
      return;
    }
    throw;
	}

}
