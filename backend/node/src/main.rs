use clap::Parser;
use sc_cli::{CliConfiguration, SubstrateCli};
use sc_service::{PartialComponents, TaskManager};
use vilokanam_runtime::{opaque::Block, RuntimeApi};
use std::sync::Arc;

type FullClient = sc_service::TFullClient<Block, RuntimeApi, ()>;
type FullBackend = sc_service::TFullBackend<Block>;

#[derive(Debug, Parser)]
#[command(name = "vilokanam-node")]
#[command(about = "Dev node for Vilokanam pay-per-second", long_about = None)]
struct Cli {}

impl SubstrateCli for Cli {
    fn impl_name() -> String { "Vilokanam Node".into() }
    fn impl_version() -> String { env!("CARGO_PKG_VERSION").into() }
    fn description() -> String { "Dev node".into() }
    fn author() -> String { "Vilokanam".into() }
    fn support_url() -> String { "https://github.com/vilokanam/vilokanam".into() }
    fn copyright_start_year() -> i32 { 2025 }
    fn load_spec(&self, _id: &str) -> Result<Box<dyn sc_service::ChainSpec>, String> {
        Ok(Box::new(chain_spec::development_config()))
    }
}

mod chain_spec {
    use vilokanam_runtime::{AccountId, RuntimeGenesisConfig, WASM_BINARY};
    use sp_core::{sr25519, Pair};
    use sp_runtime::traits::{IdentifyAccount, Verify};
    type Signature = sp_runtime::MultiSignature;
    type AccountPublic = <Signature as Verify>::Signer;

    fn get_account_id_from_seed<TPublic: sp_core::Public>(seed: &str) -> AccountId
    where
        AccountPublic: From<<TPublic::Pair as Pair>::Public>,
    {
        AccountPublic::from(get_from_seed::<TPublic>(seed)).into_account()
    }

    fn get_from_seed<TPublic: sp_core::Public>(seed: &str) -> <TPublic::Pair as Pair>::Public
    where
        AccountPublic: From<<TPublic::Pair as Pair>::Public>,
    {
        sp_core::Pair::from_string(&format!("//{}", seed), None)
            .expect("static values are valid; qed")
            .public()
    }

    pub fn development_config() -> sc_service::GenericChainSpec<RuntimeGenesisConfig> {
        sc_service::GenericChainSpec::builder(
            WASM_BINARY.expect("WASM not available"),
            Default::default(),
        )
        .with_name("Vilokanam Dev")
        .with_id("vilokanam_dev")
        .with_chain_type(sc_service::ChainType::Development)
        .with_genesis_config_patch(serde_json::json!({
            "balances": {
                "balances": [
                    [get_account_id_from_seed::<sr25519::Public>("Alice"), 1_000_000_000_000_000_000],
                    [get_account_id_from_seed::<sr25519::Public>("Bob"), 1_000_000_000_000_000_000],
                ]
            }
        }))
        .build()
    }
}

fn main() -> sc_cli::Result<()> {
    let cli = Cli::parse();
    let runner = cli.create_runner(&cli)?;
    runner.run_node_until_exit(|config| async move {
        sc_service::new_full::<Block, RuntimeApi, _>(
            config,
            |config| {
                let PartialComponents {
                    client,
                    backend,
                    task_manager,
                    import_queue,
                    keystore_container,
                    select_chain,
                    transaction_pool,
                    other: (),
                    ..
                } = sc_service::new_partial::<Block, RuntimeApi, ()>(
                    config,
                    |client| {
                        let pool = sc_transaction_pool::BasicPool::new_full(
                            config.transaction_pool.clone(),
                            config.role.is_authority().into(),
                            config.prometheus_registry(),
                            client.clone(),
                        );
                        Ok((pool, ()))
                    },
                    sc_consensus_grandpa::block_import::<_, _, _>,
                    sc_consensus_grandpa::link_half::<_, _, _>,
                )?;
                Ok(sc_service::PartialComponents {
                    client,
                    backend,
                    task_manager,
                    import_queue,
                    keystore_container,
                    select_chain,
                    transaction_pool,
                    other: (),
                })
            },
            |config, client, tx_pool, task_manager, _| {
                let (grandpa_block_import, grandpa_link) = sc_consensus_grandpa::block_import(
                    client.clone(),
                    &(client.clone(), config.select_chain.clone()),
                    &task_manager.spawn_essential_handle(),
                    config.prometheus_registry(),
                )?;
                let aura_block_import = sc_consensus_aura::AuraBlockImport::<_, _, _, sp_consensus_aura::sr25519::AuthorityPair>::new(
                    grandpa_block_import.clone(),
                    client.clone(),
                );
                let import_queue = sc_consensus_aura::import_queue::<sp_consensus_aura::sr25519::AuthorityPair, _, _, _, _, _>(
                    sc_consensus_aura::slot_duration(&*client)?,
                    aura_block_import.clone(),
                    None,
                    Some(Box::new(grandpa_block_import)),
                    client.clone(),
                    &task_manager.spawn_essential_handle(),
                    config.prometheus_registry(),
                    sc_service::TelemetryHandle::new(),
                )?;

                let slot_duration = sc_consensus_aura::slot_duration(&*client)?;
                let aura = sc_consensus_aura::start_aura::<sp_consensus_aura::sr25519::AuthorityPair, _, _, _, _, _, _, _, _, _, _>(
                    slot_duration,
                    client.clone(),
                    None,
                    tx_pool,
                    &task_manager.spawn_essential_handle(),
                    config.prometheus_registry(),
                    sc_service::TelemetryHandle::new(),
                    grandpa_link,
                    client,
                    move |_, ()| async move {
                        Ok((slot_duration, ()))
                    },
                )?;
                task_manager.spawn_essential_handle().spawn_blocking("aura", Some("block-authoring"), aura);
                Ok(import_queue)
            },
        )
        .map(|full| full.task_manager)
    })
}