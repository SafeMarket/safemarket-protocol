pragma solidity ^0.4.8;

import "owned.sol";

contract kv is owned{

    mapping(bytes32 => address) public get_address;

    function set_address(bytes32 key, address value) onlyowner(msg.sender){
      get_address[key] = value;
    }

    mapping(bytes32 => bool) public get_bool;

    function set_bool(bytes32 key, bool value) onlyowner(msg.sender){
      get_bool[key] = value;
    }

    mapping(bytes32 => bytes) public get_bytes;

    function set_bytes(bytes32 key, bytes value) onlyowner(msg.sender){
      get_bytes[key] = value;
    }

    mapping(bytes32 => bytes32) public get_bytes32;

    function set_bytes32(bytes32 key, bytes32 value) onlyowner(msg.sender){
      get_bytes32[key] = value;
    }

    mapping(bytes32 => uint256) public get_uint256;

    function set_uint256(bytes32 key, uint256 value) onlyowner(msg.sender){
      get_uint256[key] = value;
    }

    function increment_uint256(bytes32 key, uint256 value) onlyowner(msg.sender){
      //TODO: Overflow protection
      get_uint256[key] = get_uint256[key] + value;
    }

    function decrement_uint256(bytes32 key, uint256 value) onlyowner(msg.sender){
      //TODO: Underflow protection
      get_uint256[key] = get_uint256[key] - value;
    }

}
