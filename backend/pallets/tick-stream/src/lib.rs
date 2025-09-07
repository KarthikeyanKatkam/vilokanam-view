#![cfg_attr(not(feature = "std"), no_std)]

/// Edit this file to define custom logic or remove it if it is not needed.
/// Learn more about FRAME and the core library of Substrate FRAME pallets:
/// <https://docs.substrate.io/reference/frame-pallets/>
pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

/// Runtime API for the tick stream pallet
#[cfg(feature = "std")]
pub mod rpc;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
	use frame_system::pallet_prelude::*;
	use sp_core::H256;
	use sp_runtime::traits::Hash;

	#[pallet::pallet]
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
		pub _phantom: PhantomData<T>,
	}

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {}
	}
}