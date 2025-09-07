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