pragma solidity ^0.4.8;

contract owned {

  mapping(address => bool) public isOwner;

  function owned() {
    isOwner[msg.sender] = true;
  }

  function setOwner(address owner, bool _isOwner) onlyowner(msg.sender){
    isOwner[owner] = _isOwner;
  }

  modifier onlyowner(address owner) {
    if (!isOwner[owner]) {
      throw;
    }
    _;
  }
}
