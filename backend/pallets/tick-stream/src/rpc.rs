#![cfg_attr(not(feature = "std"), no_std)]

use codec::Codec;
use sp_runtime::traits::MaybeDisplay;
use sp_runtime::traits::MaybeFromStr;

sp_api::decl_runtime_apis! {
	/// The API to get tick count information.
	pub trait TickStreamApi<AccountId> 
	where
		AccountId: Codec + MaybeDisplay + MaybeFromStr,
	{
		/// Get the tick count for a stream.
		fn get_tick_count(stream_id: u128) -> u32;
	}
}