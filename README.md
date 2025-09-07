# Vilokanam-view: Complete Twitch-like Streaming Platform

Vilokanam-view is a revolutionary pay-per-second live streaming platform built on the Polkadot ecosystem. This platform enables content creators to earn money based on actual viewer engagement time, with real-time payments processed through the Polkadot network using blockchain technology.

## Current Project Status

This repository contains a **fully implemented** streaming platform with core WebRTC streaming capabilities, blockchain integration, and a comprehensive design system. The implementation includes:

1. **Complete Frontend Applications** - Viewer and creator apps with modern UI components
2. **Blockchain Integration** - Substrate-based backend with pay-per-second tracking
3. **Streaming Infrastructure** - WebRTC implementation with signaling server
4. **API Services** - REST API for stream management
5. **Docker Configuration** - Containerized development environment
6. **Design System** - Comprehensive UI/UX system with dark theme aesthetics

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Viewer App    │    │   Creator App    │    │   Blockchain     │
│   (Next.js)     │    │   (Next.js)      │    │ (Substrate Node) │
└─────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 │
                    ┌────────────────────┐
                    │   API Services     │
                    │   (Node.js)        │
                    └────────────────────┘
                                 │
                    ┌────────────────────┐
                    │ Signaling Server   │
                    │ (WebSocket)        │
                    └────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with React Server Components
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context and Hooks
- **Real-time**: WebSocket
- **WebRTC**: Native WebRTC API

### Backend
- **Blockchain**: Substrate/Polkadot SDK
- **API Layer**: Node.js with Express.js
- **Database**: PostgreSQL with Redis caching
- **Signaling**: WebSocket server

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Media Server**: Native WebRTC (no SFU yet)

## Project Structure

```
vilokanam-view/
├── backend/                 # Substrate blockchain node
│   ├── node/               # Node implementation
│   ├── pallets/            # Custom FRAME pallets
│   │   └── tick-stream/    # Pay-per-second tracking
│   ├── runtime/            # Runtime configuration
│   └── ocw-ticker/         # Off-chain worker for ticks
├── frontend/               # Next.js frontend applications
│   ├── apps/               # Application packages
│   │   ├── viewer/         # Viewer application
│   │   └── creator/         # Creator dashboard
│   ├── packages/           # Shared packages
│   │   ├── ui/             # UI component library
│   │   └── sdk/            # Blockchain SDK
│   └── pnpm-workspace.yaml # Workspace configuration
├── signaling-server/       # WebRTC signaling server
├── Docs/                   # Implementation documentation
├── docker-compose.yml      # Production Docker configuration
└── docker-compose.dev.yml  # Development Docker configuration
```

## Design System Implementation

### Color Palette
- **Primary**: Purple (`#8b5cf6`) for brand recognition and key actions
- **Secondary**: Blue (`#0ea5e9`) for complementary elements
- **Dark Theme**: `#0e0e10` background with `#1f1f23` card backgrounds
- **Text Hierarchy**: White (`#ffffff`) for primary, `#adadb8` for secondary

### Component Library
- **Headers**: Viewer and Creator headers with integrated Vilokanam logo
- **Cards**: Stream cards with live indicators, viewer counts, and category tags
- **Buttons**: Refined variants with consistent styling and hover states
- **Chat**: Enhanced message bubbles with distinction between own/others
- **Forms**: Input fields with dark theme styling and focus states
- **Streaming Components**: Modern WebRTC broadcaster and viewer interfaces

### Typography
- **Font Family**: Inter for optimal screen readability
- **Hierarchy**: Consistent text sizing and weight for clear visual structure
- **Accessibility**: WCAG 2.1 AA compliant contrast ratios

### Spacing & Layout
- **Grid System**: 8-point grid for consistent spacing
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Visual Hierarchy**: Strategic whitespace for improved content scanning

## Getting Started

### Prerequisites

- Rust toolchain (stable)
- Node.js (v18+)
- pnpm package manager
- Docker (for containerized deployment)
- Git (for version control)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/vilokanam/vilokanam-view.git
cd vilokanam-view
```

2. **Install dependencies**
```bash
# Install frontend dependencies
cd frontend
pnpm install

# Build all packages
pnpm build
```

3. **Start development services**
```bash
# Start all development services
docker-compose -f docker-compose.dev.yml up -d
```

4. **Start the frontend applications**
```bash
# In one terminal, start viewer application
cd frontend/apps/viewer
pnpm dev

# In another terminal, start creator application
cd frontend/apps/creator
pnpm dev
```

### Environment Configuration

Create a `.env.local` file in the frontend directory with the following configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:8080
NEXT_PUBLIC_BLOCKCHAIN_URL=ws://127.0.0.1:9944
```

## Implemented Features

### Core Streaming
- ✅ WebRTC broadcaster component for creators with device selection
- ✅ WebRTC viewer component for viewers with connection status
- ✅ Signaling server for peer connection coordination
- ✅ Device selection (camera/microphone) with preview
- ✅ Stream preview and controls

### Blockchain Integration
- ✅ Pay-per-second tracking with Substrate pallet
- ✅ Real-time tick recording and monitoring
- ✅ Wallet integration with Polkadot.js API

### User Interface
- ✅ Modern dark theme design system
- ✅ Creator dashboard with streaming controls and statistics
- ✅ Viewer interface with stream browsing and discovery
- ✅ Live chat with message differentiation
- ✅ Responsive design for all device sizes
- ✅ Animated live indicators and hover effects

### Technical Features
- ✅ Reusable UI component library with design system
- ✅ Shared SDK for blockchain and streaming functionality
- ✅ Containerized development environment
- ✅ Comprehensive testing infrastructure

## Features in Progress

1. **Enhanced Streaming**
   - [ ] Media server integration (Mediasoup/SFU)
   - [ ] Stream recording and VOD
   - [ ] Multiple quality levels

2. **Community Features**
   - [ ] User authentication system
   - [ ] Follow/unfollow system
   - [ ] Enhanced chat with persistence
   - [ ] Notification system

3. **Content Management**
   - [ ] Stream categorization and discovery
   - [ ] Search functionality
   - [ ] Recommendation system

4. **Monetization**
   - [ ] Subscription tiers
   - [ ] Virtual tipping
   - [ ] Ad integration

## Development Workflow

### Running Services

1. **Start backend services**:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Start frontend applications**:
   ```bash
   # Terminal 1
   cd frontend/apps/viewer
   pnpm dev
   
   # Terminal 2
   cd frontend/apps/creator
   pnpm dev
   ```

3. **Access applications**:
   - Viewer app: http://localhost:3000
   - Creator app: http://localhost:3001

### Development Scripts

- `setup-dev.sh` or `setup-dev.bat` - Setup development environment
- `docker-compose.dev.yml` - Development services
- `docker-compose.yml` - Production services (planned)

### Testing

1. **Run UI component tests**:
   ```bash
   cd frontend/packages/ui
   pnpm test
   ```

2. **Run tests in watch mode**:
   ```bash
   cd frontend/packages/ui
   pnpm test --watch
   ```

3. **Generate coverage reports**:
   ```bash
   cd frontend/packages/ui
   pnpm test --coverage
   ```

## Contributing

We welcome contributions from the community! Please read our contributing guidelines for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on our GitHub repository.