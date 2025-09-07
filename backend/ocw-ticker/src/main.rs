use anyhow::Result;
use parity_scale_codec::Encode;
use reqwest::Client;
use serde_json::json;
use std::time::Duration;
use tokio::time::interval;

const NODE_RPC: &str = "http://localhost:9944";

/// hard-code Alice SS58 -> AccountId32 bytes
fn alice_account_id() -> [u8; 32] {
    hex::decode("d43593c715fdd31c61141abd04a99fd9022df873e99644ca1c6e5a5b6d1a8f95")
        .unwrap()
        .try_into()
        .unwrap()
}

/// SCALE encode: pallet_index = 40, call_index = 2, (stream_id, viewer, ticks)
fn encode_tick(stream_id: u128, viewer: [u8; 32], ticks: u32) -> Vec<u8> {
    let mut v = Vec::new();
    v.push(40u8); // pallet
    v.push(2u8);  // call
    v.extend_from_slice(&stream_id.to_le_bytes());
    v.extend_from_slice(&viewer);
    v.extend_from_slice(&ticks.to_le_bytes());
    v
}

#[tokio::main]
async fn main() -> Result<()> {
    let client = Client::new();
    let viewer = alice_account_id();
    let stream_id = 1u128;

    println!("🕒 OCW ticker running → 1 tick / sec to stream {}", stream_id);
    let mut intv = interval(Duration::from_millis(1000));

    loop {
        intv.tick().await;
        let call_data = encode_tick(stream_id, viewer, 1);
        let hex_call = hex::encode(call_data);

        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "author_submitExtrinsic",
            "params": [&hex_call],
        });

        if let Err(e) = client.post(NODE_RPC).json(&payload).send().await {
            eprintln!("tick failed: {}", e);
        } else {
            print!(".");
        }
    }
}