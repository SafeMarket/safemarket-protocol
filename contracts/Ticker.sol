pragma solidity ^0.4.8;

import "owned.sol";

contract Ticker is owned {
	mapping(bytes32 => uint256) public prices;

	function setPrice(bytes32 currency, uint256 price) onlyowner(msg.sender) {
		prices[currency] = price;
	}

	function convert(uint256 amount, bytes32 currencyFrom, bytes32 currencyTo) constant returns(uint256) {
		if(prices[currencyFrom] == 0 || prices[currencyTo] == 0) {
			throw;
		}	

		return ((amount*prices[currencyFrom])/prices[currencyTo]);
	}
}
