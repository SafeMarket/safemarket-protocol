pragma solidity ^0.4.8;

contract executor{
  function _execute(address addr, uint[] calldataLengths, bytes calldatas) internal {

    uint calldataIndex = 0;
    bytes memory calldata = new bytes(calldataLengths[0]);
    uint start = 0;
    uint end = calldataLengths[0] - 1;


    for( uint i = 0; i < calldatas.length; i ++ ) {
      calldata[i - start] = calldatas[i];

      if (i == end) {
        if (!addr.call(calldata)) {
          throw;
        }
        calldataIndex ++;
        if (calldataIndex < calldataLengths.length) {
          calldata = new bytes(calldataLengths[calldataIndex]);
          start = i + 1;
          end = start + calldataLengths[calldataIndex] - 1;
        }
      }
    }

  }
}
