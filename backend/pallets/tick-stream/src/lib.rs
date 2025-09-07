#![cfg_attr(not(feature = "std"), no_std)]
pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;
    use sp_runtime::traits::{AtLeast32BitUnsigned, One, Zero};
    use sp_std::prelude::*;

    type BalanceOf<T> =
        <<T as Config>::Currency as frame_support::traits::Currency<<T as frame_system::Config>::AccountId>>::Balance;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: frame_support::traits::Currency<Self::AccountId>;
        #[pallet::constant]
        type TickThreshold: Get<u32>;
    }

    #[pallet::storage]
    #[pallet::getter(fn streams)]
    pub type Streams<T: Config> = StorageMap<_, Blake2_128Concat, u128, Stream<T>>;

    #[pallet::storage]
    #[pallet::getter(fn balances)]
    pub type Balances<T: Config> =
        StorageDoubleMap<_, Blake2_128Concat, u128, Blake2_128Concat, T::AccountId, BalanceOf<T>>;

    #[derive(Encode, Decode, TypeInfo, MaxEncodedLen, Clone, PartialEq, RuntimeDebug)]
    pub struct Stream<T: Config> {
        pub creator: T::AccountId,
        pub price_per_second: BalanceOf<T>,
        pub last_tick: u32,
    }

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        StreamCreated { stream_id: u128, creator: T::AccountId, price: BalanceOf<T> },
        TickProcessed { stream_id: u128, viewer: T::AccountId, ticks: u32 },
        Withdrawn { stream_id: u128, amount: BalanceOf<T> },
    }

    #[pallet::error]
    pub enum Error<T> {
        StreamNotFound,
        InsufficientBalance,
        TickTooEarly,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(Weight::from_parts(10_000, 0))]
        pub fn create_stream(
            origin: OriginFor<T>,
            stream_id: u128,
            price_per_second: BalanceOf<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            ensure!(!<Streams<T>>::contains_key(stream_id), Error::<T>::StreamNotFound);
            <Streams<T>>::insert(
                stream_id,
                Stream {
                    creator: who.clone(),
                    price_per_second,
                    last_tick: 0u32,
                },
            );
            Self::deposit_event(Event::StreamCreated { stream_id, creator: who, price: price_per_second });
            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(Weight::from_parts(10_000, 0))]
        pub fn join_stream(
            origin: OriginFor<T>,
            stream_id: u128,
            max_seconds: u32,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            let stream = <Streams<T>>::get(stream_id).ok_or(Error::<T>::StreamNotFound)?;
            let amount = stream.price_per_second * BalanceOf::<T>::from(max_seconds);
            T::Currency::reserve(&who, amount)?;
            <Balances<T>>::insert(stream_id, &who, amount);
            Ok(())
        }

        #[pallet::call_index(2)]
        #[pallet::weight(Weight::from_parts(5_000, 0))]
        pub fn tick(
            origin: OriginFor<T>,
            stream_id: u128,
            viewer: T::AccountId,
            ticks: u32,
        ) -> DispatchResult {
            ensure_none(origin)?;
            let mut stream = <Streams<T>>::get(stream_id).ok_or(Error::<T>::StreamNotFound)?;
            let reserved = <Balances<T>>::get(stream_id, &viewer).ok_or(Error::<T>::InsufficientBalance)?;
            let cost = stream.price_per_second * BalanceOf::<T>::from(ticks);
            ensure!(reserved >= cost, Error::<T>::InsufficientBalance);
            <Balances<T>>::insert(stream_id, &viewer, reserved - cost);
            T::Currency::transfer(&viewer, &stream.creator, cost, KeepAlive)?;
            stream.last_tick += ticks;
            <Streams<T>>::insert(stream_id, stream);
            Self::deposit_event(Event::TickProcessed { stream_id, viewer, ticks });
            Ok(())
        }

        #[pallet::validate_unsigned]
        impl<T: Config> ValidateUnsigned for Pallet<T> {
            type Call = Call<T>;
            fn validate_unsigned(_source: TransactionSource, call: &Self::Call) -> TransactionValidity {
                match call {
                    Call::tick { .. } => ValidTransaction::with_tag_prefix("vilokanam")
                        .priority(100)
                        .and_provides("tick")
                        .longevity(5)
                        .propagate(true)
                        .build(),
                    _ => InvalidTransaction::Call.into(),
                }
            }
        }
    }
}