# Vilokanam-view Project Structure

This document outlines the complete project structure for the Vilokanam-view streaming platform.

## Root Directory

```
vilokanam-view/
├── backend/                 # Substrate blockchain backend
├── frontend/                # Next.js frontend applications
├── signaling-server/        # WebRTC signaling server
├── Docs/                    # Documentation
├── docker-compose.yml       # Production Docker configuration
├── docker-compose.dev.yml   # Development Docker configuration
├── setup-dev.sh             # Development setup script (Linux/Mac)
├── setup-dev.bat            # Development setup script (Windows)
├── run-tests.sh             # Test runner script (Linux/Mac)
├── run-tests.bat            # Test runner script (Windows)
├── package.json             # Root package configuration
├── README.md                # Main project documentation
└── .gitignore               # Git ignore patterns
```

## Backend Directory

```
backend/
├── node/                    # Node implementation
├── pallets/                 # Custom FRAME pallets
│   └── tick-stream/         # Pay-per-second tracking pallet
├── runtime/                 # Runtime configuration
├── ocw-ticker/              # Off-chain worker for ticks
├── api/                     # REST API server
│   ├── package.json         # API package configuration
│   ├── index.js             # API server entry point
│   └── Dockerfile           # API Docker configuration
├── Cargo.toml               # Rust workspace configuration
├── Cargo.lock               # Rust dependency lock file
├── Dockerfile               # Blockchain node Docker configuration
└── README.md                # Backend documentation
```

## Frontend Directory

```
frontend/
├── apps/                    # Application packages
│   ├── viewer/              # Viewer application
│   │   ├── app/             # Next.js app router
│   │   │   ├── page.tsx     # Home page
│   │   │   ├── layout.tsx   # Root layout
│   │   │   ├── streams/     # Streams pages
│   │   │   │   ├── page.tsx # Streams listing
│   │   │   │   └── [id]/    # Individual stream
│   │   │   │       └── page.tsx
│   │   │   └── categories/  # Categories pages
│   │   │       └── page.tsx
│   │   ├── package.json     # Viewer app package
│   │   └── ...              # Other Next.js files
│   └── creator/             # Creator dashboard
│       ├── app/             # Next.js app router
│       │   ├── page.tsx     # Home redirect
│       │   ├── layout.tsx   # Root layout
│       │   └── dashboard/   # Dashboard pages
│       │       └── page.tsx # Creator dashboard
│       ├── package.json     # Creator app package
│       └── ...              # Other Next.js files
├── packages/                # Shared packages
│   ├── ui/                  # UI component library
│   │   ├── src/             # Component source
│   │   │   ├── index.tsx    # Component exports
│   │   │   ├── components/  # Streaming components
│   │   │   │   ├── WebRTCBroadcaster.tsx
│   │   │   │   ├── WebRTCViewer.tsx
│   │   │   │   └── __tests__/ # Component tests
│   │   │   └── __tests__/   # UI library tests
│   │   ├── package.json     # UI package configuration
│   │   └── ...              # Other package files
│   └── sdk/                 # Software Development Kit
│       ├── src/             # SDK source
│       │   ├── index.ts     # SDK exports
│       │   ├── api.ts       # API service functions
│       │   ├── streaming.ts # Streaming service functions
│       │   ├── signaling.ts # Signaling client
│       │   └── __tests__/   # SDK tests
│       ├── package.json     # SDK package configuration
│       └── ...              # Other package files
├── package.json             # Frontend workspace configuration
├── pnpm-workspace.yaml      # pnpm workspace configuration
└── ...                      # Other frontend files
```

## Signaling Server Directory

```
signaling-server/
├── package.json             # Signaling server package
├── index.js                 # Signaling server entry point
├── Dockerfile               # Signaling server Docker configuration
└── ...                      # Other server files
```

## Documentation Directory

```
Docs/
├── CompleteStreamingPlatformRoadmap.md  # 12-month implementation plan
├── WebRTCStreamingImplementation.md     # Technical WebRTC details
├── CommunityAndSocialFeatures.md        # Social features implementation
├── CompletePlatformSummary.md           # Executive platform overview
├── DevelopmentSetup.md                  # Development environment setup
├── ImplementationSummary.md             # Implementation progress summary
├── DevelopmentSummary.md                # Development progress summary
└── README.md                            # Documentation overview
```

## Key Files and Their Purposes

### Core Streaming Components
- `frontend/packages/ui/src/components/WebRTCBroadcaster.tsx` - Creator streaming component
- `frontend/packages/ui/src/components/WebRTCViewer.tsx` - Viewer streaming component
- `signaling-server/index.js` - WebSocket signaling server
- `backend/api/index.js` - REST API server

### Blockchain Integration
- `backend/pallets/tick-stream/src/lib.rs` - Pay-per-second tracking pallet
- `frontend/packages/sdk/src/index.ts` - SDK with blockchain functions
- `frontend/packages/sdk/src/streaming.ts` - Streaming service functions

### Frontend Applications
- `frontend/apps/viewer/app/page.tsx` - Viewer home page
- `frontend/apps/viewer/app/streams/page.tsx` - Streams listing
- `frontend/apps/viewer/app/streams/[id]/page.tsx` - Individual stream view
- `frontend/apps/creator/app/dashboard/page.tsx` - Creator dashboard

### Configuration Files
- `docker-compose.dev.yml` - Development services configuration
- `docker-compose.yml` - Production services configuration
- `frontend/.env.local` - Environment variables
- `setup-dev.sh/bat` - Development setup scripts

This structure provides a modular, scalable architecture that separates concerns while maintaining close integration between components.