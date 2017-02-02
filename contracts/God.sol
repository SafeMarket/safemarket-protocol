pragma solidity ^0.4.8;

import "executor.sol";
import "owned.sol";

contract God is executor{

  mapping (bytes32 => bytes) public codes;

  function registerCode(bytes code) {
    bytes32 codeHash = sha3(code);
    codes[codeHash] = code;
  }

  event Creation(
    address indexed sender,
    bytes32 indexed codeHash,
    address addr
  );

  function execute(address addr, uint[] calldataLengths, bytes calldatas) {
    if(!owned(addr).isOwner(msg.sender)){
      throw;
    }
    _execute(addr, calldataLengths, calldatas);
  }

  function create(bytes32 codeHash) returns(address addr){
    bytes memory code = codes[codeHash];
    if (code.length == 0) {
      throw;
    }
    assembly{
      addr := create(0, add(code,0x20), mload(code))
      jumpi(invalidJumpLabel, iszero(extcodesize(addr)))
    }
    Creation(msg.sender, codeHash, addr);
  }

  function createAndExecute(bytes32 codeHash, uint[] calldataLengths, bytes calldatas) returns(address addr){
    addr = create(codeHash);
    _execute(addr, calldataLengths, calldatas);
  }

}
