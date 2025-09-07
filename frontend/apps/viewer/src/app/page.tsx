'use client';
import { useEffect, useState } from 'react';
import { VilokanamSDK } from '@vilokanam/sdk';
import { Button, Card } from '@vilokanam/ui';

export default function Home() {
  const [sdk, setSdk] = useState<VilokanamSDK | null>(null);
  const [tick, setTick] = useState(0);
  const [locked, setLocked] = useState<bigint>(0n);
  const [price] = useState<bigint>(100000000n); // 0.0001 DOT

  useEffect(() => {
    new VilokanamSDK().connect().then(setSdk);
  }, []);

  useEffect(() => {
    if (!sdk) return;
    const unsub = sdk.onTick(() => setTick((t) => t + 1));
    return () => unsub.then((u) => u());
  }, [sdk]);

  const join = async () => {
    if (!sdk) return;
    const tx = await sdk.joinStream(1, 3600);
    await tx.signAndSend(/* Alice */);
    const bal = await sdk.lockedBalance(1, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
    setLocked(bal);
  };

  const spent = BigInt(tick) * price;

  return (
    <main className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="text-3xl font-bold mb-6">Vilokanam Viewer</h1>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl">Spent</span>
          <span className="text-3xl font-mono text-vil-glow">
            {(Number(spent) / 1e10).toFixed(4)} DOT
          </span>
        </div>
        <Button onClick={join}>Lock 0.36 DOT (1 h)</Button>
      </Card>
    </main>
  );
}