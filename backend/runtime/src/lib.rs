#![cfg_attr(not(feature = "std"), no_std)]
use sp_runtime::{
    generic, impl_opaque_keys,
    traits::{BlakeTwo256, IdentityLookup},
    OpaqueExtrinsic,
};
use sp_std::prelude::*;
use frame_support::{
    construct_runtime, parameter_types,
    weights::{constants::WEIGHT_REF_TIME_PER_SECOND, Weight},
};

impl_opaque_keys! { pub struct SessionKeys {} }

pub type AccountId = sp_runtime::AccountId32;
pub type Balance = u128;
pub type BlockNumber = u32;
pub type Index = u32;
pub type Hash = sp_core::H256;
pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
pub type Block = generic::Block<Header, OpaqueExtrinsic>;

parameter_types! {
    pub const BlockHashCount: BlockNumber = 2400;
    pub const TickThreshold: u32 = 60;
}

construct_runtime!(
    pub enum Runtime
    {
        System: frame_system,
        Balances: pallet_balances,
        TickStream: pallet_tick_stream,
    }
);

impl frame_system::Config for Runtime {
    type RuntimeCall = RuntimeCall;
    type RuntimeEvent = RuntimeEvent;
    type Block = Block;
    type AccountId = AccountId;
    type Lookup = IdentityLookup<AccountId>;
    type Index = Index;
    type BlockNumber = BlockNumber;
    type Hash = Hash;
    type Hashing = BlakeTwo256;
    type Header = Header;
    type RuntimeOrigin = RuntimeOrigin;
    type Nonce = Index;
    type RuntimeBlock = Block;
    type Version = ();
    type PalletInfo = PalletInfo;
    type AccountData = pallet_balances::AccountData<Balance>;
    type OnNewAccount = ();
    type OnKilledAccount = ();
    type DbWeight = ();
    type BaseCallFilter = frame_support::traits::Everything;
    type SystemWeightInfo = ();
    type BlockWeights = ();
    type BlockLength = ();
    type SS58Prefix = ();
    type OnSetCode = ();
    type MaxConsumers = frame_support::traits::ConstU32<16>;
}

impl pallet_balances::Config for Runtime {
    type Balance = Balance;
    type DustRemoval = ();
    type RuntimeEvent = RuntimeEvent;
    type ExistentialDeposit = frame_support::traits::ConstU128<500>;
    type AccountStore = System;
    type WeightInfo = ();
    type MaxLocks = ();
    type MaxReserves = ();
    type ReserveIdentifier = [u8; 8];
}

impl pallet_tick_stream::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type TickThreshold = TickThreshold;
}

pub const WASM_BINARY: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));
