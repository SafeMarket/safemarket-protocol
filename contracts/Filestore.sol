pragma solidity ^0.4.8;

import "owned.sol";

contract Filestore is owned{

  mapping(bytes32 => bytes) public files;

  function addFile(bytes file) returns (bytes32 fileHash){
    fileHash = sha3(file);
    files[fileHash] = file;
  }

  function end() onlyowner(msg.sender) {
    suicide(msg.sender);
  }

}
