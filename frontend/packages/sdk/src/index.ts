import { ApiPromise, WsProvider } from '@polkadot/api';
import { u128, u32, AccountId32 } from '@polkadot/types';

export type TickStream = {
  creator: AccountId32;
  pricePerSecond: u128;
  lastTick: u32;
};

export class VilokanamSDK {
  private api: ApiPromise;

  constructor(ws: string = 'ws://127.0.0.1:9944') {
    const provider = new WsProvider(ws);
    this.api = new ApiPromise({ provider });
  }

  async connect() {
    await this.api.isReady;
    return this;
  }

  async createStream(pricePerSecond: bigint) {
    const tx = this.api.tx.tickStream.createStream(Date.now(), pricePerSecond);
    return tx;
  }

  async joinStream(streamId: number, maxSeconds: number) {
    const tx = this.api.tx.tickStream.joinStream(streamId, maxSeconds);
    return tx;
  }

  async tick(streamId: number, viewer: string, ticks: number) {
    const tx = this.api.tx.tickStream.tick(streamId, viewer, ticks);
    return tx;
  }

  onTick(callback: (event: any) => void) {
    return this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        if (event.section === 'tickStream' && event.method === 'TickProcessed') {
          callback(event.data);
        }
      });
    });
  }

  async lockedBalance(streamId: number, address: string) {
    const raw = await this.api.query.tickStream.balances(streamId, address);
    return raw.toBigInt();
  }
}