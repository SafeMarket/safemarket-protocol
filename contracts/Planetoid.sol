pragma solidity ^0.4.8;

contract Planetoid {
  bytes32 public recordHash;
  uint256 public recordsCount;
  bytes6 prefix = 0x0a5e08021258;
  bytes2 suffix = 0x1858;

  event DocumentAdd(bytes32 recordHash, address sender, bytes32 documentHash);

  function addDocument(bytes32 documentHash) {
    recordHash = sha256(prefix, uint32(now), msg.sender, documentHash, recordHash, suffix);
    recordsCount ++;
    DocumentAdd(recordHash, msg.sender, documentHash);
  }
}
