
pragma solidity ^0.4.8;

contract Safecomm {

  event ThreadCreation(bytes32 threadKeyHash);

  mapping(bytes32 => Thread) public threads;

  struct Thread {
    address[] participants;
    uint256 participantsCount;
    EncapsulatedThreadKey[] encapsulatedThreadKeys;
    uint256 encapsulatedThreadKeysCount;
    Descriptor[] descriptors;
    uint256 descriptorsCount;
  }

  struct EncapsulatedThreadKey {
    bytes32 encryptorPublicKeyHash;
    bytes32 encrypteePublicKeyHash;
    bytes32 encapsulatedThreadKey;
  }

  struct Descriptor {
    uint256 timestamp;
    address sender;
    bytes encapsulatedMultiaddress;
  }

  function threadsParticipants(bytes32 threadKeyHash, uint256 participantId) constant returns(address participant){
    return threads[threadKeyHash].participants[participantId];
  }

  function threadsEncapsulatedThreadKeys(bytes32 threadKeyHash, uint256 encapsulatedThreadKeyId) constant returns(
    bytes32 encryptorPublicKeyHash, bytes32 encrypteePublicKeyHash, bytes32 encapsulatedThreadKey
  ){
    return (
      threads[threadKeyHash].encapsulatedThreadKeys[encapsulatedThreadKeyId].encryptorPublicKeyHash,
      threads[threadKeyHash].encapsulatedThreadKeys[encapsulatedThreadKeyId].encrypteePublicKeyHash,
      threads[threadKeyHash].encapsulatedThreadKeys[encapsulatedThreadKeyId].encapsulatedThreadKey
    );
  }

  function threadsDescriptors(bytes32 threadKeyHash, uint256 descriptorId) constant returns(
    uint256 timestamp, address sender, bytes encapsulatedMultiaddress
  ){
    return (
      threads[threadKeyHash].descriptors[descriptorId].timestamp,
      threads[threadKeyHash].descriptors[descriptorId].sender,
      threads[threadKeyHash].descriptors[descriptorId].encapsulatedMultiaddress
    );
  }

  function createThread(bytes32 threadKeyHash, address[] participants) {
    if (threads[threadKeyHash].participants.length != 0) {
      throw;
    }
    if (msg.sender != participants[0]) {
      throw;
    }
    threads[threadKeyHash].participants = participants;
    threads[threadKeyHash].participantsCount = participants.length;
  }

  function createThread(bytes32 threadKeyHash, address[] participants, bytes32[3][] encapsulatedThreadKeys) {
    createThread(threadKeyHash, participants);
    for(uint i = 0; i < encapsulatedThreadKeys.length; i ++) {
      threads[threadKeyHash].encapsulatedThreadKeys.push(EncapsulatedThreadKey(
        encapsulatedThreadKeys[i][0], encapsulatedThreadKeys[i][1], encapsulatedThreadKeys[i][2]
      ));
    }
    threads[threadKeyHash].encapsulatedThreadKeysCount ++;
    ThreadCreation(threadKeyHash);
  }

  modifier onlyparticipant(bytes32 threadId, uint256 participantId) {
    if (threads[threadId].participants[participantId] != msg.sender) {
      throw;
    }
    _;
  }

  function addDescriptor(bytes32 threadId, uint256 participantId, bytes encapsulatedMultiaddress) onlyparticipant(threadId, participantId) {
    threads[threadId].descriptors.push(Descriptor(now, msg.sender, encapsulatedMultiaddress));
    threads[threadId].descriptorsCount ++;
  }

  function addParticipant(bytes32 threadId, uint256 participantId, address participant) onlyparticipant(threadId, participantId) {
    threads[threadId].participants.push(participant);
    threads[threadId].participantsCount ++;
  }

  function addEncapsulatedThreadKey(
    bytes32 threadKeyHash,
    uint256 participantId,
    bytes32 encryptorPublicKeyHash,
    bytes32 encrypteePublicKeyHash,
    bytes32 encapsulatedThreadKey
  ) onlyparticipant(threadKeyHash, participantId) {
    threads[threadKeyHash].encapsulatedThreadKeys.push(EncapsulatedThreadKey(
      encryptorPublicKeyHash, encrypteePublicKeyHash, encapsulatedThreadKey
    ));
    threads[threadKeyHash].encapsulatedThreadKeysCount ++;
  }

}
