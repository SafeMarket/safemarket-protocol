module.exports = `

package safemarket;
syntax = "proto3";

message Store {
  required bytes version = 1;
  required bytes publicKey = 2;
  required bytes name = 3;
  required bytes isOpen = 4;
  required bytes base = 5;
  required bytes info = 6;
  required bytes priceSetter = 7;
  required bytes currency = 8;
  required bytes minProductsTotal = 9;
  repeated StoreProduct products = 10;
  repeated StoreTransport transports = 11;
  required bytes contact = 12;
  required bytes tagline = 13;
  required bytes bufferMicroperun = 14;
}

message StoreProduct {
  required bytes name = 1;
  required bytes price = 2;
  required bytes info = 3;
  repeated bytes imageMultihashes = 4;
}

message StoreTransport {
  required bytes name = 1;
  required bytes to = 2;
  required bytes price = 3;
  required bytes info = 4;
}

message Order {
  required bytes version = 1;
  required bytes storeMetaHash = 2;
  required bytes transportId = 3;
  repeated OrderProduct products = 4;
  required bytes info = 5;
}

message OrderProduct {
  required bytes id = 1;
  required bytes quantity = 2;
}

`
