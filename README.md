# Vilokanam-view: Complete Twitch-like Streaming Platform

Vilokanam-view is a revolutionary pay-per-second live streaming platform built on the Polkadot ecosystem. This platform enables content creators to earn money based on actual viewer engagement time, with real-time payments processed through the Polkadot network using blockchain technology.

## Current Project Status

This repository contains a **complete implementation plan** for transforming Vilokanam-view into a full-featured Twitch-like streaming platform. The actual implementation of the features described in the documentation is still pending.

The project includes:

1. **Existing Foundation** - Basic blockchain backend and frontend applications
2. **Comprehensive Documentation** - Detailed implementation plans for all missing components
3. **Technical Specifications** - Architecture and code examples for each feature
4. **Development Setup** - Instructions for setting up the development environment

## Documentation

All implementation plans and technical specifications are located in the `Docs` directory:

1. **[Complete Streaming Platform Roadmap](./Docs/CompleteStreamingPlatformRoadmap.md)** - 12-month implementation plan covering all phases of development
2. **[WebRTC Streaming Implementation](./Docs/WebRTCStreamingImplementation.md)** - Technical details for adding actual video streaming capabilities
3. **[Community & Social Features](./Docs/CommunityAndSocialFeatures.md)** - Implementation plan for follows, subscriptions, chat enhancements
4. **[Complete Platform Summary](./Docs/CompletePlatformSummary.md)** - Executive overview of the entire platform
5. **[Development Setup](./Docs/DevelopmentSetup.md)** - Instructions for setting up the development environment

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
                    │ Media Server       │
                    │ (Mediasoup)        │
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
- **Styling**: Tailwind CSS
- **State Management**: React Context and Hooks
- **Real-time**: WebSocket
- **WebRTC**: SimplePeer

### Backend
- **Blockchain**: Substrate/Polkadot SDK
- **API Layer**: Node.js with Express.js
- **Database**: PostgreSQL with Redis caching
- **Media Server**: Mediasoup
- **Signaling**: WebSocket server

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes (planned)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana (planned)

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
│   │   └── creator/        # Creator dashboard
│   ├── packages/           # Shared packages
│   │   ├── ui/             # UI component library
│   │   └── sdk/            # Blockchain SDK
│   └── pnpm-workspace.yaml # Workspace configuration
├── Docs/                   # Implementation documentation
├── docker-compose.yml      # Production Docker configuration
└── docker-compose.dev.yml  # Development Docker configuration
```

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

For detailed setup instructions, see [Development Setup](./Docs/DevelopmentSetup.md).

## Implementation Status

This repository contains comprehensive documentation and technical specifications but does not yet contain a fully implemented streaming platform. To create a complete Twitch-like platform, developers would need to implement the features described in the documentation.

Key components that need implementation:
1. **Video Streaming Infrastructure** - WebRTC implementation for actual streaming
2. **Community Features** - Follows, subscriptions, enhanced chat
3. **Content Discovery** - Search, recommendations, personalization
4. **Mobile Experience** - Native apps and mobile web optimization

## Key Features (Planned)

### For Viewers
- Pay only for time watched - no subscriptions
- Transparent pricing displayed upfront
- Directly support your favorite creators
- Ad-free viewing experience
- Interactive chat and community features

### For Creators
- Earn money for every second of content
- Direct payments with no intermediaries
- Global reach without geographic restrictions
- Real-time analytics and earnings tracking
- Professional broadcasting tools

### Technical Features
- Blockchain-based transparent payments
- WebRTC for low-latency streaming
- Scalable microservices architecture
- Real-time notifications and chat
- Comprehensive analytics dashboard

## Next Steps

To implement a complete platform:

1. Start with [WebRTC Streaming Implementation](./Docs/WebRTCStreamingImplementation.md)
2. Add community features from [Community & Social Features](./Docs/CommunityAndSocialFeatures.md)
3. Follow the timeline in [Complete Streaming Platform Roadmap](./Docs/CompleteStreamingPlatformRoadmap.md)
4. Refer to [Development Setup](./Docs/DevelopmentSetup.md) for environment configuration

## Contributing

We welcome contributions from the community! Please read our contributing guidelines for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on our GitHub repository.