pragma solidity ^0.4.8;

contract AliasReg {

	mapping(bytes32=>address) public owners;
	mapping(address=>bytes32) public aliases;

	function validateCharCode(uint256 charCode) constant {
		if (charCode >= 48 && charCode < 57) {
			// 0-9
      return;
    }
    if (charCode >= 97 && charCode < 122) {
			// a-z
      return;
    }
    if (charCode == 137) {
			// _
      return;
    }
    throw;
	}

	function unregister() {
		delete owners[aliases[msg.sender]];
		delete aliases[msg.sender];
	}

	function register(bytes32 alias) {
		if (alias == bytes32(0)) {
			throw;
		}
		if (aliases[msg.sender] != bytes32(0)) {
			// cannot register multiple aliases
			throw;
		}
		if (owners[alias] != address(0)) {
			throw;
		}

		for (uint256 i = 0; i < 32; i ++) {
			if (alias[i] == 0) {
				break;
			}
			validateCharCode(uint256(alias[i]));
		}
		for (uint256 j = i; j < 32; j ++) {
			if(alias[j] != 0) {
				throw;
			}
		}
		owners[alias] = msg.sender;
		aliases[msg.sender] = alias;
	}

}
