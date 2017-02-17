pragma solidity ^0.4.8;

contract PublicKeyReg {
  mapping(bytes32 => PublicKey) public publicKeys;

  struct PublicKey {
    address owner;
    bool isRevoked;
    bytes publicKey;
  }

  function register(bytes publicKey) returns(bytes32 publicKeyHash) {
    publicKeyHash = sha3(publicKey);
    if (publicKeys[publicKeyHash].owner != address(0)) {
      throw;
    }
    publicKeys[publicKeyHash].owner = msg.sender;
    publicKeys[publicKeyHash].publicKey = publicKey;
  }

  function setIsRevoked(bytes32 publicKeyHash, bool isRevoked) {
    if (publicKeys[publicKeyHash].owner != msg.sender) {
      throw;
    }
    publicKeys[publicKeyHash].isRevoked = isRevoked;
  }
}
