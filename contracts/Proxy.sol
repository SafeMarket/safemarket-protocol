pragma solidity ^0.4.8;

import "executor.sol";
import "owned.sol";
import "kv.sol";

contract Proxy is kv, executor{
  function execute(address addr, uint[] calldataLengths, bytes calldatas) onlyowner(msg.sender) {
    _execute(addr, calldataLengths, calldatas);
  }
}
