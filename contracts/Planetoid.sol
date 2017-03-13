pragma solidity ^0.4.8;

contract Planetoid{

  bytes32 public rootRecordHash;
  mapping(bytes32 => bytes) public documents;
  mapping(bytes32 => bytes) public records;

  event DocumentAdd();

  function addDocument(bytes document) payable returns (bytes32){
    if (document.length > 4294967295) { // (2 ** 32) - 1
      throw;
    }

    bytes4 _timestamp = bytes4(now);
    // "timestamp" is an assembly keyword
    bytes20 sender = bytes20(msg.sender);
    bytes4 gigawei = bytes4(msg.value / 1000000000); // (gigawei)
    bytes4 documentLength = bytes4(document.length);
    bytes32 documentHash = sha3(document);
    bytes32 previousRecordHash = rootRecordHash;

    bytes memory record = new bytes(96);
    assembly {
        mstore(add(record, 32), _timestamp)
        mstore(add(record, 36), sender)
        mstore(add(record, 56), gigawei)
        mstore(add(record, 60), documentLength)
        mstore(add(record, 64), documentHash)
        mstore(add(record, 96), previousRecordHash)
    }
    bytes32 recordHash = sha3(record);

    records[recordHash] = record;
    documents[documentHash] = document;
    rootRecordHash = recordHash;

    return recordHash;
  }

}
