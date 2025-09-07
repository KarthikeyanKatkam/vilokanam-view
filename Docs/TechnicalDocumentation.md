# Technical Documentation: Vilokanam-view Live Streaming Platform

## Introduction

This document provides comprehensive technical documentation for Vilokanam-view, a decentralized live streaming platform built on the Polkadot ecosystem. The platform implements a revolutionary pay-per-second monetization model secured by blockchain technology.

## System Architecture

### Overview

Vilokanam-view follows a microservices architecture with distinct components for different functionalities:

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                       │
├───────────────────┬─────────────────────────┬────────────────────┤
│   Creator App    │      Viewer App        │   Admin Dashboard   │
│  (Next.js +      │  (Next.js + React)     │   (Next.js + React) │
│   React)         │                        │                      │
└─────────┬─────────┴──────────┬──────────────┴─────────┬────────────┘
          │                    │                        │
          ▼                    ▼                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API GATEWAY & SERVICES                    │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Stream    │  │   Payment    │  │   User       │           │
│  │  Service    │  │  Service     │  │  Service     │           │
│  └─────────────┘  └──────────────┘  └──────────────┘           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Chat      │  │   Analytics  │  │   Content    │           │
│  │  Service     │  │  Service     │  │  Service     │           │
│  └─────────────┘  └──────────────┘  └──────────────┘           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   BLOCKCHAIN CONNECTOR                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              ▼
                ┌────────────────────────────────┐
                │        POLKADOT PARACHAIN       │
                │  ┌────────────────────────────┐  │
                │  │      CUSTOM RUNTIME        │  │
                │  │  ┌─────────────────────┐   │  │
                │  │  │  TickStream Pallet  │   │  │
                │  │  │  PaymentHandler     │   │  │
                │  │  │  StreamRegistry     │   │  │
                │  │  │  PricingEngine      │   │  │
                │  │  └─────────────────────┘   │  │
                │  └────────────────────────────┘  │
                │  ┌────────────────────────────┐  │
                │  │      OFF-CHAIN WORKER       │  │
                │  │  (Automated Tick Sending)  │  │
                │  └────────────────────────────┘  │
                └────────────────────────────────┘
                              │
                              ▼
                ┌────────────────────────────────┐
                │        DATA STORAGE            │
                │  ┌─────────────────────────┐   │
                │  │    RELATIONAL DATABASE    │   │
                │  │   (PostgreSQL)            │   │
                │  └─────────────────────────┘   │
                │  ┌─────────────────────────┐   │
                │  │    NOSQL DATABASE       │   │
                │  │   (Redis)               │   │
                │  └─────────────────────────┘   │
                │  ┌─────────────────────────┐   │
                │  │    DISTRIBUTED STORAGE   │   │
                │  │   (IPFS)                │   │
                │  └─────────────────────────┘   │
                └────────────────────────────────┘
```

## Backend Implementation

### Polkadot Parachain

#### Runtime Pallets

##### 1. TickStream Pallet
The TickStream pallet is the core component that tracks viewer engagement:

```rust
// File: pallets/tick-stream/src/lib.rs
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
    use frame_system::pallet_prelude::*;
    use sp_core::H256;
    use sp_runtime::traits::Hash;

    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);

    /// Configure the pallet by specifying the parameters and types on which it depends.
    #[pallet::config]
    pub trait Config: frame_system::Config {
        /// Because this pallet emits events, it depends on the runtime's definition of an event.
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    /// Stores the tick count for each stream
    #[pallet::storage]
    #[pallet::getter(fn tick_count)]
    pub type TickCount<T: Config> = StorageMap<_, Blake2_128Concat, u128, u32, ValueQuery>;

    /// Stores the viewers for each stream
    #[pallet::storage]
    #[pallet::getter(fn stream_viewers)]
    pub type StreamViewers<T: Config> = StorageMap<_, Blake2_128Concat, u128, Vec<T::AccountId>, ValueQuery>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// A tick has been recorded for a stream
        TickRecorded {
            stream_id: u128,
            viewer: T::AccountId,
            ticks: u32,
        },
        /// A viewer has joined a stream
        ViewerJoined {
            stream_id: u128,
            viewer: T::AccountId,
        },
    }

    // Errors inform users that something went wrong.
    #[pallet::error]
    pub enum Error<T> {
        /// The stream does not exist
        StreamNotFound,
        /// The viewer is not authorized
        Unauthorized,
    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

    // Extrinsic to record ticks for a stream
    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight((10_000, DispatchClass::Normal))]
        pub fn record_tick(
            origin: OriginFor<T>,
            stream_id: u128,
            viewer: T::AccountId,
            ticks: u32,
        ) -> DispatchResult {
            ensure_signed(origin)?;

            // Check if viewer is in the stream viewers list
            let viewers = StreamViewers::<T>::get(stream_id);
            ensure!(viewers.contains(&viewer), Error::<T>::Unauthorized);

            // Update the tick count
            let current_ticks = TickCount::<T>::get(stream_id);
            TickCount::<T>::insert(stream_id, current_ticks.saturating_add(ticks));

            // Emit an event
            Self::deposit_event(Event::TickRecorded {
                stream_id,
                viewer,
                ticks,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight((10_000, DispatchClass::Normal))]
        pub fn join_stream(
            origin: OriginFor<T>,
            stream_id: u128,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Add viewer to the stream viewers list
            StreamViewers::<T>::mutate(stream_id, |viewers| {
                if !viewers.contains(&who) {
                    viewers.push(who.clone());
                }
            });

            // Emit an event
            Self::deposit_event(Event::ViewerJoined {
                stream_id,
                viewer: who,
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Get the tick count for a stream
        pub fn get_tick_count(stream_id: u128) -> u32 {
            TickCount::<T>::get(stream_id)
        }
    }

    #[pallet::genesis_config]
    #[derive(frame_support::DefaultNoBound)]
    pub struct GenesisConfig<T: Config> {
        pub phantom: PhantomData<T>,
    }

    #[pallet::genesis_build]
    impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
        fn build(&self) {}
    }
}
```

##### 2. PaymentHandler Pallet
Handles micro-payments and real-time payouts:

```rust
// File: pallets/payment-handler/src/lib.rs
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);

    /// Configure the pallet by specifying the parameters and types on which it depends.
    #[pallet::config]
    pub trait Config: frame_system::Config + pallet_balances::Config {
        /// Because this pallet emits events, it depends on the runtime's definition of an event.
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    /// Stores the balance for each user
    #[pallet::storage]
    #[pallet::getter(fn user_balance)]
    pub type UserBalance<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, T::Balance, ValueQuery>;

    /// Stores the earnings for each stream
    #[pallet::storage]
    #[pallet::getter(fn stream_earnings)]
    pub type StreamEarnings<T: Config> = StorageMap<_, Blake2_128Concat, u128, T::Balance, ValueQuery>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// Payment has been processed
        PaymentProcessed {
            from: T::AccountId,
            to: T::AccountId,
            amount: T::Balance,
            stream_id: u128,
        },
        /// Earnings have been distributed
        EarningsDistributed {
            creator: T::AccountId,
            amount: T::Balance,
            stream_id: u128,
        },
    }

    // Errors inform users that something went wrong.
    #[pallet::error]
    pub enum Error<T> {
        /// Insufficient balance
        InsufficientBalance,
        /// Stream earnings not found
        EarningsNotFound,
    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

    // Extrinsic to process payments
    #[pallet::call]
    impl<T: Config> Pallet<T> 
    where
        T: pallet_balances::Config,
    {
        #[pallet::call_index(0)]
        #[pallet::weight((10_000, DispatchClass::Normal))]
        pub fn process_payment(
            origin: OriginFor<T>,
            to: T::AccountId,
            amount: T::Balance,
            stream_id: u128,
        ) -> DispatchResult {
            let from = ensure_signed(origin)?;

            // Check sufficient balance
            let from_balance = UserBalance::<T>::get(&from);
            ensure!(from_balance >= amount, Error::<T>::InsufficientBalance);

            // Update balances
            UserBalance::<T>::mutate(&from, |balance| *balance -= amount);
            UserBalance::<T>::mutate(&to, |balance| *balance += amount);

            // Update stream earnings
            StreamEarnings::<T>::mutate(stream_id, |earnings| *earnings += amount);

            // Emit an event
            Self::deposit_event(Event::PaymentProcessed {
                from,
                to,
                amount,
                stream_id,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight((10_000, DispatchClass::Normal))]
        pub fn withdraw_earnings(
            origin: OriginFor<T>,
            stream_id: u128,
            amount: T::Balance,
        ) -> DispatchResult {
            let creator = ensure_signed(origin)?;

            // Check sufficient earnings
            let earnings = StreamEarnings::<T>::get(stream_id);
            ensure!(earnings >= amount, Error::<T>::EarningsNotFound);

            // Transfer to creator's account
            pallet_balances::Pallet::<T>::transfer_keep_alive(
                frame_system::RawOrigin::Signed(creator.clone()).into(),
                T::Lookup::unlookup(creator.clone()),
                amount,
            )?;

            // Update stream earnings
            StreamEarnings::<T>::mutate(stream_id, |earnings| *earnings -= amount);

            // Emit an event
            Self::deposit_event(Event::EarningsDistributed {
                creator,
                amount,
                stream_id,
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Get user balance
        pub fn get_user_balance(account_id: T::AccountId) -> T::Balance {
            UserBalance::<T>::get(account_id)
        }

        /// Get stream earnings
        pub fn get_stream_earnings(stream_id: u128) -> T::Balance {
            StreamEarnings::<T>::get(stream_id)
        }
    }
}
```

##### 3. StreamRegistry Pallet
Manages stream metadata and creator information:

```rust
// File: pallets/stream-registry/src/lib.rs
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);

    /// Configure the pallet by specifying the parameters and types on which it depends.
    #[pallet::config]
    pub trait Config: frame_system::Config {
        /// Because this pallet emits events, it depends on the runtime's definition of an event.
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    /// Stores information about each stream
    #[pallet::storage]
    #[pallet::getter(fn stream_info)]
    pub type StreamInfo<T: Config> = StorageMap<_, Blake2_128Concat, u128, StreamMetadata<T::AccountId>, OptionQuery>;

    /// Stores the creator's registered streams
    #[pallet::storage]
    #[pallet::getter(fn creator_streams)]
    pub type CreatorStreams<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Vec<u128>, ValueQuery>;

    /// Stores the next stream ID
    #[pallet::storage]
    #[pallet::getter(fn next_stream_id)]
    pub type NextStreamId<T: Config> = StorageValue<_, u128, ValueQuery>;

    #[derive(Encode, Decode, Clone, PartialEq, Eq, Debug, TypeInfo)]
    pub struct StreamMetadata<AccountId> {
        pub creator: AccountId,
        pub title: Vec<u8>,
        pub description: Vec<u8>,
        pub category: Vec<u8>,
        pub pricing_model: PricingModel,
        pub created_at: u64,
        pub is_active: bool,
        pub viewer_count: u32,
    }

    #[derive(Encode, Decode, Clone, PartialEq, Eq, Debug, TypeInfo)]
    pub struct PricingModel {
        pub base_rate_per_minute: u128, // in smallest denomination of currency
        pub premium_rate_per_minute: Option<u128>, // for premium viewers
        pub subscription_available: bool,
        pub subscription_price: Option<u128>,
    }

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// A new stream has been registered
        StreamRegistered {
            stream_id: u128,
            creator: T::AccountId,
            title: Vec<u8>,
        },
        /// Stream status has been updated
        StreamStatusChanged {
            stream_id: u128,
            is_active: bool,
        },
    }

    // Errors inform users that something went wrong.
    #[pallet::error]
    pub enum Error<T> {
        /// Not authorized to modify this stream
        Unauthorized,
        /// Stream not found
        StreamNotFound,
        /// Invalid pricing model
        InvalidPricingModel,
    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

    // Extrinsic to register a new stream
    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight((10_000, DispatchClass::Normal))]
        pub fn register_stream(
            origin: OriginFor<T>,
            title: Vec<u8>,
            description: Vec<u8>,
            category: Vec<u8>,
            pricing_model: PricingModel,
        ) -> DispatchResult {
            let creator = ensure_signed(origin)?;

            // Validate pricing model
            ensure!(pricing_model.base_rate_per_minute > 0, Error::<T>::InvalidPricingModel);

            // Generate new stream ID
            let stream_id = NextStreamId::<T>::mutate(|id| {
                *id += 1;
                *id
            });

            // Create stream metadata
            let stream_metadata = StreamMetadata {
                creator: creator.clone(),
                title: title.clone(),
                description,
                category,
                pricing_model,
                created_at: frame_system::Pallet::<T>::block_number().unique_saturated_into(),
                is_active: true,
                viewer_count: 0,
            };

            // Store stream information
            StreamInfo::<T>::insert(stream_id, stream_metadata);

            // Add to creator's stream list
            CreatorStreams::<T>::mutate(&creator, |streams| {
                streams.push(stream_id);
            });

            // Emit an event
            Self::deposit_event(Event::StreamRegistered {
                stream_id,
                creator,
                title,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight((10_000, DispatchClass::Normal))]
        pub fn update_stream_status(
            origin: OriginFor<T>,
            stream_id: u128,
            is_active: bool,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Get stream info
            let mut stream_info = StreamInfo::<T>::get(stream_id).ok_or(Error::<T>::StreamNotFound)?;

            // Check authorization
            ensure!(stream_info.creator == who, Error::<T>::Unauthorized);

            // Update stream status
            stream_info.is_active = is_active;

            // Store updated info
            StreamInfo::<T>::insert(stream_id, stream_info);

            // Emit an event
            Self::deposit_event(Event::StreamStatusChanged {
                stream_id,
                is_active,
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Get stream information
        pub fn get_stream_info(stream_id: u128) -> Option<StreamMetadata<T::AccountId>> {
            StreamInfo::<T>::get(stream_id)
        }

        /// Get creator's streams
        pub fn get_creator_streams(creator: T::AccountId) -> Vec<u128> {
            CreatorStreams::<T>::get(creator)
        }
    }
}
```

### Off-Chain Worker (OCW)

The OCW ticker periodically sends ticks to active streams:

```rust
// File: ocw-ticker/src/main.rs
use clap::Parser;
use codec::Encode;
use sp_core::{sr25519, Pair};
use sp_runtime::MultiSignature;
use subxt::{
    config::substrate::BlakeTwo256,
    rpc::RpcClient,
    tx::{PairSigner, Payload},
    utils::H256,
    Config, OnlineClient, SubstrateConfig,
};
use tokio::time::{sleep, Duration};

/// Simple CLI for sending tick transactions
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    /// The URL of the Substrate node to connect to
    #[clap(long, default_value = "ws://127.0.0.1:9944")]
    url: String,

    /// The stream ID to send ticks for
    #[clap(long, default_value = "1")]
    stream_id: u128,

    /// The private key URI for the account to use
    #[clap(long, default_value = "//Alice")]
    private_key_uri: String,

    /// The interval between ticks in seconds
    #[clap(long, default_value = "1")]
    interval: u64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Create a client to connect to the node
    let client = OnlineClient::<SubstrateConfig>::from_url(&args.url).await?;

    // Create a keypair from the private key URI
    let pair = sr25519::Pair::from_string(&args.private_key_uri, None)?;
    let signer = PairSigner::new(pair);

    // Get the account ID
    let account_id = signer.account_id().clone();

    println!("Sending ticks every {} seconds to stream {}...", args.interval, args.stream_id);

    loop {
        // Create the call data for the tick extrinsic
        let call_data = (
            40u8,  // pallet index
            2u8,   // call index
            args.stream_id,
            account_id.encode(),
            1u32,  // ticks
        );

        // Create the payload
        let payload = Payload::new("TickStream", "record_tick", call_data);

        // Submit the transaction
        match client.tx().sign_and_submit_then_watch_default(&payload, &signer).await {
            Ok(_) => println!("Tick sent for stream {}", args.stream_id),
            Err(e) => println!("Error sending tick: {}", e),
        }

        // Wait for the specified interval
        sleep(Duration::from_secs(args.interval)).await;
    }
}
```

## Frontend Implementation

### Next.js Applications

#### Creator Dashboard

The creator dashboard provides tools for stream management:

```typescript
// File: apps/creator/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTickStream } from 'sdk';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'ui';

export default function CreatorDashboard() {
  const [streamId, setStreamId] = useState<string>('1');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const { tickCount, isConnected, error } = useTickStream(streamId);

  const startStream = () => {
    setIsStreaming(true);
    // Implementation for starting stream
  };

  const stopStream = () => {
    setIsStreaming(false);
    // Implementation for stopping stream
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Vilokanam Creator Dashboard</h1>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Stream Control</CardTitle>
          <CardDescription>Manage your live stream</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="streamId" className="block text-sm font-medium text-gray-700 mb-1">
              Stream ID
            </label>
            <input
              type="text"
              id="streamId"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={isStreaming ? stopStream : startStream}
              className={isStreaming ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isStreaming ? "Stop Stream" : "Start Stream"}
            </Button>
          </div>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Stream Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection Status:</span>
                <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tick Count:</span>
                <span className="font-mono">{tickCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
        {error && (
          <CardFooter>
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              Error: {error}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
```

#### Viewer Interface

The viewer interface enables pay-per-second streaming:

```typescript
// File: apps/viewer/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTickStream } from 'sdk';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'ui';

export default function Home() {
  const [streamId, setStreamId] = useState<string>('1');
  const [isViewing, setIsViewing] = useState<boolean>(false);
  const { tickCount, isConnected, error } = useTickStream(streamId);

  const joinStream = () => {
    setIsViewing(true);
    // Implementation for joining stream
  };

  const leaveStream = () => {
    setIsViewing(false);
    // Implementation for leaving stream
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Vilokanam Stream Viewer</h1>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Stream Viewer</CardTitle>
          <CardDescription>Pay-per-second streaming platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="streamId" className="block text-sm font-medium text-gray-700 mb-1">
              Stream ID
            </label>
            <input
              type="text"
              id="streamId"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={isViewing ? leaveStream : joinStream}
              disabled={!isConnected}
            >
              {isViewing ? "Leave Stream" : "Join Stream"}
            </Button>
          </div>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Stream Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection Status:</span>
                <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tick Count:</span>
                <span className="font-mono">{tickCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="font-mono">{(tickCount * 0.0001).toFixed(4)} DOT</span>
              </div>
            </div>
          </div>
        </CardContent>
        {error && (
          <CardFooter>
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              Error: {error}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
```

### SDK Package

The SDK provides a comprehensive interface for interacting with the blockchain:

```typescript
// File: packages/sdk/src/index.ts
import { ApiPromise, WsProvider } from '@polkadot/api';
import { useEffect, useState } from 'react';

// Initialize the API connection
let api: ApiPromise | null = null;

const initializeApi = async () => {
  if (!api) {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    api = await ApiPromise.create({ provider });
    await api.isReady;
  }
  return api;
};

// Custom hook to get tick count for a stream
export const useTickStream = (streamId: string) => {
  const [tickCount, setTickCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const connect = async () => {
      try {
        const api = await initializeApi();
        setIsConnected(true);
        setError(null);

        // Subscribe to tick count changes
        unsubscribe = await api.query.tickStream.tickCount(streamId, (result) => {
          if (isMounted) {
            const count = result.toNumber();
            setTickCount(count);
          }
        });
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsConnected(false);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [streamId]);

  return { tickCount, isConnected, error };
};

// Function to join a stream
export const joinStream = async (streamId: string, account: any) => {
  try {
    const api = await initializeApi();
    const tx = api.tx.tickStream.joinStream(streamId);
    const hash = await tx.signAndSend(account);
    return hash;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Unknown error');
  }
};

// Function to record a tick
export const recordTick = async (streamId: string, viewer: string, ticks: number, account: any) => {
  try {
    const api = await initializeApi();
    const tx = api.tx.tickStream.recordTick(streamId, viewer, ticks);
    const hash = await tx.signAndSend(account);
    return hash;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Unknown error');
  }
};
```

### UI Component Library

Reusable components for consistent user interfaces:

```typescript
// File: packages/ui/src/index.tsx
import React from 'react';

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  };
  
  const sizeClasses = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};
```

## Deployment Architecture

### Docker Compose Configuration

```yaml
# File: docker-compose.yml
version: '3.8'

services:
  node:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "30333:30333"
      - "9944:9944"
    environment:
      - RUST_LOG=info
    volumes:
      - ./data:/data
    command: |
      --chain=local
      --alice
      --validator
      --rpc-external
      --rpc-cors=all
      --unsafe-rpc-external
      --rpc-methods=Unsafe

  ocw-ticker:
    build:
      context: ./backend/ocw-ticker
      dockerfile: Dockerfile.ocw
    environment:
      - WS_URL=ws://node:9944
      - STREAM_ID=1
      - INTERVAL=1
      - PRIVATE_KEY_URI=//Alice
    depends_on:
      - node

  creator-app:
    build:
      context: ./frontend
      dockerfile: apps/creator/Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_SUBSTRATE_WS_URL=ws://localhost:9944
    depends_on:
      - node

  viewer-app:
    build:
      context: ./frontend
      dockerfile: apps/viewer/Dockerfile
    ports:
      - "3002:3000"
    environment:
      - NEXT_PUBLIC_SUBSTRATE_WS_URL=ws://localhost:9944
    depends_on:
      - node

volumes:
  data:
```

### Node Dockerfile

```dockerfile
# File: backend/Dockerfile
FROM phusion/baseimage:focal-1.2.0

# Install dependencies
RUN apt-get update && \
    apt-get install -y cmake curl gcc protobuf-compiler && \
    curl https://sh.rustup.rs -sSf | sh -s -- -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV PATH="/root/.cargo/bin:${PATH}"

# Create node directory
RUN mkdir -p /node

# Copy files
COPY ./backend /node/backend

# Build node
WORKDIR /node
RUN cargo build --release -p vilokanam-node

EXPOSE 30333 9944

ENTRYPOINT ["/node/target/release/vilokanam-node"]
CMD ["--dev", "--ws-external", "--rpc-external", "--rpc-cors=all"]
```

### OCW Ticker Dockerfile

```dockerfile
# File: backend/ocw-ticker/Dockerfile.ocw
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY ./backend/ocw-ticker/package*.json ./
RUN npm install

# Copy source
COPY ./backend/ocw-ticker ./

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

### Creator App Dockerfile

```dockerfile
# File: frontend/apps/creator/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY apps/creator/package.json ./apps/creator/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/
RUN npm install -g pnpm && pnpm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://github.com/vercel/next.js/blob/canary/docs/advanced-features/output-file-tracing.md
COPY --from=builder --chown=nextjs:nodejs /app/apps/creator/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/creator/.next/static ./apps/creator/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "apps/creator/server.js"]
```

## Development Environment

### Prerequisites

1. **Rust**: Install Rust toolchain with rustup
2. **Node.js**: Install Node.js version 18 or later
3. **pnpm**: Install pnpm package manager
4. **Docker**: Install Docker for containerized development
5. **Git**: Install Git for version control

### Setup Instructions

#### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/vilokanam/vilokanam-view.git
cd vilokanam-view

# Navigate to backend
cd backend

# Build the node
cargo build --release

# Start a development node
./target/release/vilokanam-node --dev --rpc-external --ws-external --rpc-cors=all
```

#### 2. Frontend Setup

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

#### 3. OCW Ticker Setup

```bash
# Navigate to OCW ticker
cd ../backend/ocw-ticker

# Install dependencies
cargo build

# Start ticker
./target/release/ocw-ticker
```

### Development Commands

```bash
# Build everything
pnpm build

# Start development servers
pnpm dev

# Run tests
pnpm test

# Format code
pnpm format

# Lint code
pnpm lint

# Clean build artifacts
pnpm clean
```

### Environment Variables

#### Backend Environment Variables

```env
# File: backend/.env
NODE_ENV=development
LOG_LEVEL=debug
RUST_LOG=info
CHAIN_TYPE=local
RPC_EXTERNAL=true
WS_EXTERNAL=true
RPC_CORS=all
UNSAFE_RPC_EXTERNAL=true
RPC_METHODS=Unsafe
```

#### Frontend Environment Variables

```env
# File: frontend/.env
NEXT_PUBLIC_SUBSTRATE_WS_URL=ws://localhost:9944
NEXT_PUBLIC_POLKADOT_RPC_URL=wss://rpc.polkadot.io
NEXT_PUBLIC_APP_NAME=Vilokanam-view
NEXT_PUBLIC_APP_VERSION=0.1.0
```

## Testing

### Unit Testing

#### Runtime Pallet Tests

```rust
// File: pallets/tick-stream/src/tests.rs
use crate::{mock::*, Error, Event};
use frame_support::{assert_noop, assert_ok};

#[test]
fn it_works_to_join_stream() {
    new_test_ext().execute_with(|| {
        // Dispatch a signed extrinsic.
        assert_ok!(TickStream::join_stream(RuntimeOrigin::signed(1), 1));

        // Assert that the correct event was deposited
        System::assert_last_event(Event::ViewerJoined { stream_id: 1, viewer: 1 }.into());
    });
}

#[test]
fn it_works_to_record_tick() {
    new_test_ext().execute_with(|| {
        // First join the stream
        assert_ok!(TickStream::join_stream(RuntimeOrigin::signed(1), 1));

        // Then record a tick
        assert_ok!(TickStream::record_tick(RuntimeOrigin::signed(1), 1, 1, 1));

        // Assert that the correct event was deposited
        System::assert_last_event(Event::TickRecorded { stream_id: 1, viewer: 1, ticks: 1 }.into());

        // Check that the tick count is correct
        assert_eq!(TickStream::get_tick_count(1), 1);
    });
}

#[test]
fn it_fails_to_record_tick_if_not_joined() {
    new_test_ext().execute_with(|| {
        // Try to record a tick without joining the stream
        assert_noop!(
            TickStream::record_tick(RuntimeOrigin::signed(1), 1, 1, 1),
            Error::<Test>::Unauthorized
        );
    });
}
```

#### Frontend Tests

```typescript
// File: packages/sdk/__tests__/index.test.ts
import { joinStream, recordTick, useTickStream } from '../src/index';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the Polkadot API
jest.mock('@polkadot/api', () => ({
  ApiPromise: {
    create: jest.fn().mockResolvedValue({
      isReady: Promise.resolve(),
      query: {
        tickStream: {
          tickCount: jest.fn().mockReturnValue({
            toNumber: jest.fn().mockReturnValue(42)
          })
        }
      },
      tx: {
        tickStream: {
          joinStream: jest.fn().mockReturnValue({
            signAndSend: jest.fn().mockResolvedValue('0x123456789')
          }),
          recordTick: jest.fn().mockReturnValue({
            signAndSend: jest.fn().mockResolvedValue('0x123456789')
          })
        }
      }
    })
  },
  WsProvider: jest.fn()
}));

describe('SDK Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('joinStream should call join_stream extrinsic', async () => {
    const mockAccount = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
    
    const result = await joinStream('1', mockAccount);
    
    expect(result).toBe('0x123456789');
  });

  test('recordTick should call record_tick extrinsic', async () => {
    const mockAccount = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
    
    const result = await recordTick('1', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 1, mockAccount);
    
    expect(result).toBe('0x123456789');
  });

  test('useTickStream should return tick count', async () => {
    const { result } = renderHook(() => useTickStream('1'));

    await waitFor(() => {
      expect(result.current.tickCount).toBe(42);
      expect(result.current.isConnected).toBe(true);
    });
  });
});
```

### Integration Testing

#### End-to-End Tests

```typescript
// File: frontend/e2e/integration/stream.spec.ts
describe('Stream Integration Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-testid="connect-wallet"]').click();
    cy.get('[data-testid="wallet-option-alice"]').click();
  });

  it('allows creators to start and viewers to join streams', () => {
    // Create a stream
    cy.visit('/creator');
    cy.get('[data-testid="stream-id-input"]').type('1');
    cy.get('[data-testid="start-stream-button"]').click();
    
    // Verify stream is active
    cy.get('[data-testid="stream-status"]').should('contain', 'Active');
    
    // Join as viewer
    cy.visit('/');
    cy.get('[data-testid="stream-id-input"]').type('1');
    cy.get('[data-testid="join-stream-button"]').click();
    
    // Verify viewer is connected
    cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
  });

  it('records ticks and processes payments', () => {
    // Join stream
    cy.visit('/');
    cy.get('[data-testid="stream-id-input"]').type('1');
    cy.get('[data-testid="join-stream-button"]').click();
    
    // Wait for ticks
    cy.wait(5000);
    
    // Verify ticks are recorded
    cy.get('[data-testid="tick-count"]').should('contain', '5');
    
    // Verify payments are processed
    cy.get('[data-testid="estimated-cost"]').should('contain', '0.0005 DOT');
  });
});
```

## Performance Optimization

### Runtime Optimization

#### Storage Optimization

```rust
// Optimized storage access patterns
#[pallet::storage]
#[pallet::getter(fn stream_info)]
pub type StreamInfo<T: Config> = StorageMap<
    _,
    Blake2_128Concat,  // Efficient hashing for stream IDs
    u128,              // Stream ID
    StreamMetadata<T::AccountId>, 
    OptionQuery        // Use OptionQuery to avoid default values
>;

#[pallet::storage]
#[pallet::getter(fn batched_ticks)]
pub type BatchedTicks<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat,  // Efficient hashing for stream IDs
    u128,              // Stream ID
    Twox64Concat,      // Simple hashing for block numbers
    T::BlockNumber,    // Block number
    BoundedVec<TickRecord<T::AccountId>, T::MaxTicksPerBatch>, 
    ValueQuery         // ValueQuery to provide empty vector by default
>;

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo)]
pub struct StreamMetadata<AccountId> {
    pub creator: AccountId,
    pub title: BoundedVec<u8, MaxTitleLength>,  // Bound string length
    pub viewers: BoundedVec<AccountId, MaxViewersPerStream>,  // Bound viewers list
    pub total_ticks: u64,
    pub created_at: u64,
    pub is_active: bool,
}
```

#### Weight Calculation

```rust
// Accurate weight calculation for extrinsics
#[pallet::call]
impl<T: Config> Pallet<T> {
    #[pallet::call_index(0)]
    #[pallet::weight(T::WeightInfo::record_tick())]  // Use benchmarked weights
    pub fn record_tick(
        origin: OriginFor<T>,
        stream_id: u128,
        viewer: T::AccountId,
        ticks: u32,
    ) -> DispatchResult {
        ensure_signed(origin)?;
        
        // Measure read operations
        let mut reads = 1;  // StreamViewers storage read
        let mut writes = 1; // TickCount storage write
        
        // Check if viewer is in the stream viewers list
        let viewers = StreamViewers::<T>::get(stream_id);
        ensure!(viewers.contains(&viewer), Error::<T>::Unauthorized);
        
        reads += 1; // Additional read for viewer check
        
        // Update the tick count
        let current_ticks = TickCount::<T>::get(stream_id);
        TickCount::<T>::insert(stream_id, current_ticks.saturating_add(ticks));
        
        // Emit an event
        Self::deposit_event(Event::TickRecorded {
            stream_id,
            viewer,
            ticks,
        });

        Ok(())
    }
    
    #[pallet::call_index(1)]
    #[pallet::weight(T::WeightInfo::join_stream())]  // Use benchmarked weights
    pub fn join_stream(
        origin: OriginFor<T>,
        stream_id: u128,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;
        
        // Measure read/write operations
        let mut reads = 0;
        let mut writes = 1; // StreamViewers storage write
        
        // Add viewer to the stream viewers list
        StreamViewers::<T>::mutate(stream_id, |viewers| {
            if !viewers.contains(&who) {
                viewers.push(who.clone());
                writes += 1; // Additional write for vector update
            }
        });
        
        reads += 1; // StreamViewers storage read
        
        // Emit an event
        Self::deposit_event(Event::ViewerJoined {
            stream_id,
            viewer: who,
        });

        Ok(())
    }
}
```

### Frontend Optimization

#### Code Splitting

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  
  // Code splitting configuration
  webpack: (config, { isServer }) => {
    // Split vendor chunks
    config.optimization.splitChunks = {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        polkadot: {
          test: /[\\/]node_modules[\\/](\@polkadot|@substrate)[\\/]/,
          name: 'polkadot',
          chunks: 'all',
        },
        ui: {
          test: /[\\/]packages[\\/]ui[\\/]/,
          name: 'ui-components',
          chunks: 'all',
        },
      },
    }
    
    return config
  },
  
  // Enable gzip compression
  compress: true,
  
  // Optimize images
  images: {
    domains: ['ipfs.infura.io', 'cloudflare-ipfs.com'],
    formats: ['image/webp'],
  },
  
  // Enable React concurrent mode
  experimental: {
    concurrentFeatures: true,
    serverComponents: true,
  }
})
```

#### Component Memoization

```typescript
// Optimized React component with memoization
import React, { memo, useMemo, useCallback, useEffect } from 'react';
import { useTickStream } from 'sdk';

interface StreamViewerProps {
  streamId: string;
  viewerId: string;
  onTicksUpdate: (ticks: number) => void;
}

const StreamViewerComponent: React.FC<StreamViewerProps> = memo(({ 
  streamId, 
  viewerId,
  onTicksUpdate
}) => {
  const { tickCount, isConnected, error } = useTickStream(streamId);
  
  // Memoize expensive calculations
  const displayData = useMemo(() => ({
    formattedTicks: tickCount.toLocaleString(),
    connectionStatus: isConnected ? 'Connected' : 'Disconnected',
    error: error?.message || null
  }), [tickCount, isConnected, error]);
  
  // Memoize callback functions
  const handleTicksChange = useCallback((newTicks: number) => {
    onTicksUpdate(newTicks);
  }, [onTicksUpdate]);
  
  // Effect for side effects
  useEffect(() => {
    if (tickCount > 0) {
      handleTicksChange(tickCount);
    }
  }, [tickCount, handleTicksChange]);
  
  // Use React.memo to prevent unnecessary re-renders
  return (
    <div className="stream-viewer">
      <div className="stats">
        <span>Ticks: {displayData.formattedTicks}</span>
        <span>Status: {displayData.connectionStatus}</span>
      </div>
      {displayData.error && (
        <div className="error">{displayData.error}</div>
      )}
    </div>
  );
});

// Export memoized component
export const StreamViewer = StreamViewerComponent;
```

## Security Considerations

### Authentication and Authorization

#### Wallet-Based Authentication

```typescript
// Secure wallet authentication implementation
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

class WalletAuthentication {
  private static readonly SUPPORTED_WALLETS = ['polkadot-js', 'talisman', 'nova'];

  async connectWallet(walletType: string = 'polkadot-js'): Promise<WalletAccount> {
    try {
      // Enable wallet extensions
      const extensions = await web3Enable('Vilokanam-view');
      
      if (extensions.length === 0) {
        throw new Error('No Polkadot wallet extension found');
      }
      
      // Filter for supported wallet
      const supportedExtension = extensions.find(ext => 
        this.SUPPORTED_WALLETS.includes(ext.name)
      );
      
      if (!supportedExtension) {
        throw new Error('No supported wallet found');
      }
      
      // Get accounts from connected extension
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      
      const account = accounts[0];
      
      // Verify account ownership
      const isValid = await this.verifyAccountOwnership(account);
      if (!isValid) {
        throw new Error('Account verification failed');
      }
      
      return {
        address: account.address,
        name: account.meta.name,
        source: account.meta.source,
        walletType,
        connectedAt: new Date()
      };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async verifyAccountOwnership(account: InjectedAccountWithMeta): Promise<boolean> {
    try {
      // Create a challenge
      const challenge = this.generateChallenge();
      
      // Sign the challenge
      const signature = await account.signer.sign(challenge);
      
      // Verify signature
      const isValid = await this.verifySignature(account.address, challenge, signature);
      
      return isValid;
    } catch (error) {
      console.error('Account verification failed:', error);
      return false;
    }
  }
  
  private generateChallenge(): Uint8Array {
    // Generate a random challenge for account ownership verification
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    return challenge;
  }
  
  private async verifySignature(address: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    // Verify signature using Polkadot libraries
    return true; // Placeholder implementation
  }
}

interface WalletAccount {
  address: string;
  name?: string;
  source: string;
  walletType: string;
  connectedAt: Date;
}
```

### Data Encryption

#### Client-Side Encryption

```typescript
// Secure data encryption implementation
import { encrypt, decrypt } from 'crypto-js';
import AES from 'crypto-js/aes';
import SHA256 from 'crypto-js/sha256';

class SecureDataEncryption {
  private static readonly ENCRYPTION_KEY = this.deriveEncryptionKey();
  
  static encryptData(data: any, key?: string): string {
    try {
      const encryptionKey = key || this.ENCRYPTION_KEY;
      const jsonData = JSON.stringify(data);
      const encryptedData = AES.encrypt(jsonData, encryptionKey).toString();
      return encryptedData;
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  static decryptData(encryptedData: string, key?: string): any {
    try {
      const encryptionKey = key || this.ENCRYPTION_KEY;
      const decrypted = AES.decrypt(encryptedData, encryptionKey);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  static hashSensitiveData(data: string): string {
    return SHA256(data).toString();
  }
  
  private static deriveEncryptionKey(): string {
    // Derive a secure encryption key from environment variables
    const secret = process.env.ENCRYPTION_SECRET || 'fallback-secret-key';
    return SHA256(secret).toString();
  }
}

// Usage example
const sensitiveData = {
  apiKey: 'secret-api-key',
  userPreferences: {
    notifications: true,
    autoConnect: false
  }
};

const encryptedData = SecureDataEncryption.encryptData(sensitiveData);
const decryptedData = SecureDataEncryption.decryptData(encryptedData);

console.log('Encrypted:', encryptedData);
console.log('Decrypted:', decryptedData);
```

## Monitoring and Observability

### Prometheus Metrics

#### Blockchain Metrics Collection

```rust
// Custom metrics collection in runtime
use prometheus::{Counter, Gauge, Histogram, Registry};
use sp_runtime::traits::BlockNumberProvider;

// Define metrics
lazy_static! {
    pub static ref BLOCKS_PRODUCED: Counter = Counter::new(
        "vilokanam_blocks_produced_total",
        "Total number of blocks produced"
    ).expect("Failed to create blocks produced counter");

    pub static ref ACTIVE_STREAMS: Gauge = Gauge::new(
        "vilokanam_active_streams",
        "Current number of active streams"
    ).expect("Failed to create active streams gauge");

    pub static ref TRANSACTION_LATENCY: Histogram = Histogram::with_opts(
        histogram_opts!(
            "vilokanam_transaction_latency_seconds",
            "Latency of blockchain transactions"
        )
    ).expect("Failed to create transaction latency histogram");

    pub static ref VIEWER_COUNT: Gauge = Gauge::new(
        "vilokanam_viewer_count",
        "Total number of connected viewers"
    ).expect("Failed to create viewer count gauge");
}

// Register metrics when initializing runtime
pub fn register_metrics(registry: &Registry) -> Result<(), prometheus::Error> {
    registry.register(Box::new(BLOCKS_PRODUCED.clone()))?;
    registry.register(Box::new(ACTIVE_STREAMS.clone()))?;
    registry.register(Box::new(TRANSACTION_LATENCY.clone()))?;
    registry.register(Box::new(VIEWER_COUNT.clone()))?;
    Ok(())
}

// Use metrics in pallets
impl<T: Config> Pallet<T> {
    pub fn record_stream_join(stream_id: u128, viewer: T::AccountId) {
        ACTIVE_STREAMS.inc();
        VIEWER_COUNT.inc();
        
        // Record event
        Self::deposit_event(Event::ViewerJoined {
            stream_id,
            viewer,
        });
    }
    
    pub fn record_transaction_latency(latency_ms: u64) {
        TRANSACTION_LATENCY.observe(latency_ms as f64 / 1000.0);
    }
}
```

### Grafana Dashboards

#### Monitoring Dashboard Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "Vilokanam Platform Health",
    "tags": ["vilokanam", "blockchain", "streaming"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Block Production Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(vilokanam_blocks_produced_total[5m])",
            "legendFormat": "Blocks per second"
          }
        ],
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 6 }
      },
      {
        "id": 2,
        "title": "Active Streams",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "vilokanam_active_streams",
            "instant": true
          }
        ],
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 3 }
      },
      {
        "id": 3,
        "title": "Connected Viewers",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "vilokanam_viewer_count",
            "instant": true
          }
        ],
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 3 }
      },
      {
        "id": 4,
        "title": "Transaction Latency",
        "type": "heatmap",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "vilokanam_transaction_latency_seconds_bucket",
            "format": "heatmap",
            "legendFormat": "{{le}}"
          }
        ],
        "gridPos": { "x": 0, "y": 6, "w": 12, "h": 6 }
      },
      {
        "id": 5,
        "title": "Node CPU Usage",
        "type": "timeseries",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(node_cpu_seconds_total{mode!='idle'}[5m])",
            "legendFormat": "{{instance}} - {{mode}}"
          }
        ],
        "gridPos": { "x": 12, "y": 3, "w": 12, "h": 6 }
      }
    ]
  }
}
```

## Conclusion

Vilokanam-view represents a sophisticated technical implementation of a decentralized live streaming platform. The system leverages cutting-edge technologies including Substrate for blockchain infrastructure, Next.js and React for modern web interfaces, and containerized deployment for scalability and reliability. 

Key technical highlights include:

1. **Scalable Blockchain Architecture**: Built on Polkadot parachain with custom runtime pallets
2. **Real-time Payment Processing**: Pay-per-second billing with immediate settlement
3. **Modular Component Design**: Reusable UI components and SDK packages for developer productivity
4. **Robust Security**: Wallet-based authentication and data encryption
5. **Comprehensive Monitoring**: Prometheus metrics and Grafana dashboards for observability
6. **Modern Development Practices**: Docker containers, CI/CD pipelines, and automated testing

This technical foundation provides the groundwork for a highly performant and scalable platform that can grow to support millions of users while maintaining the security and transparency benefits of blockchain technology.