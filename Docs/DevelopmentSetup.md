# Vilokanam-view Development Setup

This document provides instructions for setting up a development environment for the Vilokanam-view streaming platform.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- Rust toolchain
- Docker and Docker Compose
- Git
- pnpm (package manager)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vilokanam-view
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
pnpm install

# Build all packages
pnpm build
```

### 3. Start Development Services

```bash
# Start all development services
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Blockchain node
- Signaling server
- Media server
- API server

### 4. Start Frontend Applications

In separate terminals:

```bash
# Start viewer application
cd frontend/apps/viewer
pnpm dev

# Start creator application
cd frontend/apps/creator
pnpm dev
```

### 5. Start Blockchain Node (Alternative)

If you prefer to run the blockchain node directly:

```bash
cd backend
cargo build --release
./target/release/vilokanam-node --dev
```

## Development Workflow

### Code Structure

- `/backend` - Substrate blockchain implementation
- `/frontend` - Next.js applications
  - `/apps/viewer` - Viewer application
  - `/apps/creator` - Creator dashboard
  - `/packages/ui` - Shared UI components
  - `/packages/sdk` - Blockchain SDK
- `/Docs` - Documentation

### Making Changes

1. **Frontend Changes**
   - Modify files in `/frontend/apps/` directories
   - Changes will hot-reload automatically
   - Run `pnpm build` to compile changes

2. **Backend Changes**
   - Modify files in `/backend/` directory
   - Rebuild with `cargo build`
   - Restart services with `docker-compose restart`

3. **Documentation**
   - Update files in `/Docs/` directory
   - No build step required

### Testing

```bash
# Run frontend tests
cd frontend
pnpm test

# Run blockchain tests
cd backend
cargo test
```

### Linting

```bash
# Lint frontend code
cd frontend
pnpm lint

# Lint blockchain code
cd backend
cargo fmt
cargo clippy
```

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Cache store |
| Blockchain | 9944 | Substrate node (WebSocket) |
| Signaling | 8080 | WebRTC signaling server |
| Media Server | 3000, 20000-21000 | WebRTC media server |
| API Server | 3001 | REST API |
| Viewer App | 3000 | Next.js viewer application |
| Creator App | 3001 | Next.js creator application |

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Check if services are already running
   - Modify ports in docker-compose.dev.yml

2. **Build Failures**
   - Ensure all prerequisites are installed
   - Check Rust toolchain version
   - Clear build cache with `cargo clean`

3. **Connection Issues**
   - Verify all services are running
   - Check Docker network configuration
   - Ensure firewall settings allow connections

### Useful Commands

```bash
# View running services
docker-compose ps

# View service logs
docker-compose logs <service-name>

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart <service-name>
```

## Next Steps

After setting up the development environment:

1. Review the implementation roadmap in `/Docs/`
2. Start with WebRTC streaming implementation
3. Add community features
4. Implement content discovery
5. Test with multiple users

For detailed implementation guides, refer to:
- [WebRTC Streaming Implementation](./Docs/WebRTCStreamingImplementation.md)
- [Community & Social Features](./Docs/CommunityAndSocialFeatures.md)
- [Complete Streaming Platform Roadmap](./Docs/CompleteStreamingPlatformRoadmap.md)