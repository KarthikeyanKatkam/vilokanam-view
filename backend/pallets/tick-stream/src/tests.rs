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