pragma solidity ^0.4.8;

contract Planetoid {
  bytes32 public recordHash;
  uint256 public recordsCount;
  bytes6 prefix = 0x0a7e08021278; //ipfs prefix for unixfs file of 120 bytes
  bytes2 suffix = 0x1878; //ipfs suffix for unixfs file of 120 bytes

  event DocumentAdd(address sender, bytes4 tag, uint64 value, bytes32 documentHash);

  function addDocument(bytes4 tag, bytes32 documentHash) payable {
    uint64 value = uint64(msg.value);
    recordHash = sha256(
      prefix,
      uint32(now),
      tx.origin,
      msg.sender,
      tag,
      value,
      documentHash,
      recordHash,
      suffix
    );
    recordsCount ++;
    DocumentAdd(msg.sender, tag, value, documentHash);
  }
}
