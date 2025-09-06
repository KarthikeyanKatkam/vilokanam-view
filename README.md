# vilokanam-view

<p align="center">
  <img src="./docs/logo-vilokanam-view.png" alt="vilokanam-view logo" width="120"/>
</p>

<p align="center">
  <strong>Official viewer-facing UI for Vilokanam</strong><br/>
  Real-time pay-per-second streaming player & wallet gateway<br/>
  Plug-and-play React / Next.js component pack
</p>

<p align="center">
  <a href="#quick-start">⚡ Quick Start</a> •
  <a href="#features">✨ Features</a> •
  <a href="#vilokanamview-props">📖 Props</a> •
  <a href="#customization">🎨 Customization</a> •
  <a href="#license">📝 License</a>
</p>

---

## 🎯 What & Why

**`vilokanam-view`** is a **zero-config React component library** that renders:

- ⚡ Low-latency WebRTC video/audio player  
- 💰 Neon 1-second payment counter  
- 🔐 One-click Polkadot wallet connection  
- 🔓 Automatic fund-lock / unlock  
- 🧾 Creator withdraw button  

Embed it anywhere and **start earning every second**.

---

## ⚡ Quick Start

### 📦 Installation

```bash
npm i vilokanam-view   # or yarn / pnpm
⚛️ React / Next.js
tsx
Copy code
import { VilokanamView } from 'vilokanam-view';
import 'vilokanam-view/dist/index.css'; // theme css

export default function Page() {
  return (
    <VilokanamView
      streamId="0x123abc"
      pricePerSecond={100000000n} // 0.0001 DOT (planck)
      maxLockSeconds={3600}
      theme="neon"
    />
  );
}
That’s it — the viewer can watch, pay per second, and withdraw without leaving your page.

📦 CDN (No Bundler)
html
Copy code
<script type="module">
  import { VilokanamView } from 'https://cdn.vilokanam.io/vilokanam-view.es.js';
  VilokanamView.mount(document.getElementById('player'), {
    streamId: '0x123abc',
    pricePerSecond: 100000000n,
    theme: 'neon'
  });
</script>

<div id="player" style="width:100%;height:600px;"></div>
✨ Features
WebRTC E2E content delivery

Pay-per-second live metering

Polkadot extension wallet integration

Real-time lock/unlock with OCW validation

Easily themed with CSS vars

Works standalone or inside SPA frameworks

📖 VilokanamView Props
Prop	Type	Default	Description
streamId	HexString	required	Vilokanam stream identifier
pricePerSecond	bigint (planck)	required	Cost per 1-second tick
maxLockSeconds	number	3600	Max funds to pre-lock
theme	"neon" | "dark" | "minimal"	"neon"	UI skin
rpcUrl	string	wss://rpc.vilokanam.io	Optional custom RPC
className	string	""	Wrapper CSS class
onTick	(tick: number) => void	undefined	Every-second callback
onWithdraw	(amount: bigint) => void	undefined	After successful withdraw
onError	(e: Error) => void	console.error	Error handler

🧩 Static Methods
ts
Copy code
VilokanamView.mount(domNode: Element, props: Props): void   // for vanilla JS
VilokanamView.unmount(domNode: Element): void
🎨 Customization
CSS Variables
Override defaults by declaring:

css
Copy code
:root {
  --vilokanam-glow: #00E5FF;
  --vilokanam-bg: #0A0A0F;
  --vilokanam-surface: #131313;
  --vilokanam-text: #FFFFFF;
  --vilokanam-font: 'Inter', sans-serif;
  --vilokanam-radius: 12px;
}
Custom Class Overrides
css
Copy code
.my-player .vilokanam-counter {
  font-size: 2rem;
  text-shadow: 0 0 8px #ff00ff;
}
🔧 Advanced Usage
Programmatic Controls
tsx
Copy code
const ref = useRef<VilokanamViewRef>(null);

<VilokanamView
  ref={ref}
  streamId="0x123"
  pricePerSecond={100000000n}
/>

// later...
ref.current?.withdraw();         // instant withdraw
ref.current?.leave();            // stop & unlock
ref.current?.lockedBalance();    // returns bigint
Hooks API
ts
Copy code
import { useVilokanam, useTicker } from 'vilokanam-view';

const { join, leave, locked } = useVilokanam(streamId);
const tick = useTicker(streamId); // 0,1,2,...
📱 Browser Support
Chrome / Edge 90+

Firefox 88+

Safari 14.1+

iOS Safari 14.1+

Android Chrome 90+

Requires: BigInt + WebRTC support

🧪 Testing
bash
Copy code
npm test              # unit (jest + jsdom)
npm run test:e2e      # cypress headless
npm run test:watch    # TDD mode
🏗️ Build from Source
bash
Copy code
git clone https://github.com/vilokanam/vilokanam-view.git
cd vilokanam-view
npm i
npm run build         # rollup → dist/
npm run storybook     # visual dev env on :6006
Output (dist/)
pgsql
Copy code
dist/
├── index.js         (CommonJS)
├── index.es.js      (ES Module)
├── index.d.ts       (TypeScript)
└── *.css            (themes)
🚀 Publishing (Maintainers)
bash
Copy code
npm version patch|minor|major
npm run build
npm publish
📺 Examples
Check the /example folder — a full Next.js page that embeds the component.

bash
Copy code
cd example
npm i
npm run dev
# → http://localhost:3000
🔐 Security
All wallet ops use @polkadot/extension-dapp (user-approved)

No private keys stored

Burner key in IndexedDB (exportable)

OCW ticks validated by runtime (no fake streams)

Content is WebRTC E2E; server relays only

🤝 Contributing
This repository is All Rights Reserved; external PRs require signed NDA.

For bugs or security issues, email: security@vilokanam.io

📝 License
© 2025 Vilokanam – All Rights Reserved.
No commercial use, redistribution, or derivative works without explicit written permission.

📬 Contact
Twitter: @vilokanam

Email: builders@vilokanam.io

<p align="center"> Made with ❤️ + Rust + React + Polkadot </p> ```
