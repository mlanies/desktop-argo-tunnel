# Desktop Argo Tunnel Manager - Architecture

## Overview

Desktop Argo Tunnel Manager is a Tauri-based desktop application that provides a graphical interface for managing `cloudflared access` TCP tunnels. The application focuses on client-side tunnel management, allowing users to connect to remote services via the secure Cloudflare network.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Dashboard   │  │   Servers    │  │   Active     │       │
│  │              │  │  Management  │  │ Connections  │       │
│  │              │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Zustand Store (State)                  │       │
│  │  - tunnels: ActiveTunnel[]                       │       │
│  │  - servers: Server[]                             │       │
│  │  - recentConnections: RecentConnection[]         │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                             | IPC (Tauri Commands)
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust/Tauri)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐       │
│  │         Cloudflared Commands Module              │       │
│  │  - start_tcp_tunnel(hostname, port)              │       │
│  │  - stop_tcp_tunnel(id)                           │       │
│  │  - check_cloudflared_version()                   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │    TunnelState (Process Manager)                 │       │
│  │  - processes: HashMap<String, u32>               │       │
│  │    (tunnel_id -> PID)                            │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                             | Process Launch
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflared Binary                          │
│  cloudflared access tcp --hostname <host> --url <local>     │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend (React + TypeScript)

#### 1. **Dashboard**
- **Purpose**: System status overview and recent activity.
- **Features**:
  - Count of active tunnels
  - Recent connection history
  - Quick access to favorites
  - Statistics visualization

#### 2. **Server Management**
- **Purpose**: Management of remote servers and services.
- **Features**:
  - Hierarchical view (Company -> Server -> Service)
  - Service protocols: SSH, RDP, TCP
  - One-click connection
  - Favorites management
  - Connection status tracking

**Connection Process**:
```
User clicks "Connect" 
  -> Random port generation (10000-60000)
  -> startTcpTunnel(hostname, port) call
  -> Backend starts cloudflared process
  -> Tunnel saved in state
  -> Local port displayed to user
```

#### 3. **Active Connections**
- **Purpose**: Monitoring and management of running TCP tunnels.
- **Features**:
  - List of all active tunnels
  - Display: hostname, local port, PID, uptime
  - Stop tunnel
  - Copy local port to clipboard

#### 4. **Settings**
- **Purpose**: Application configuration.
- **Features**:
  - Language selection (EN/RU)
  - Theme selection (Dark/Light/System)
  - Cloudflared binary path
  - Auto-connection settings

### Backend (Rust + Tauri)

#### 1. **Cloudflared Command Module**
Location: `src-tauri/src/cloudflared/commands.rs`

**Functions**:
- `check_cloudflared_version()` - Check cloudflared installation
- `start_tcp_tunnel(hostname, port)` - Start TCP tunnel
- `stop_tcp_tunnel(id)` - Stop tunnel

**ActiveTunnel Structure**:
- `id` - Identifier (format: "{hostname}-{port}")
- `hostname` - Remote host
- `local_port` - Local listening port
- `pid` - Process ID

#### 2. **TunnelState (Process Manager)**
Location: `src-tauri/src/cloudflared/commands.rs`

**Purpose**: Tracking active cloudflared processes.

**Structure**: HashMap where key is tunnel_id, value is process PID.

**Lifecycle**:
1. `start_tcp_tunnel`: Start process -> Save PID
2. `stop_tcp_tunnel`: Find PID -> Terminate process -> Remove from map

### State Management (Zustand)

Location: `src/store.ts`

**State Structure**:
- `tunnels` - Active TCP tunnels
- `services_by_server_by_company` - Server hierarchy
- `activeTab` - Current UI tab
- `selectedServerId` / `selectedServiceId` - Selected items
- `recentConnections` - Recent connections
- `favorites` - Favorites
- `settings` - User settings

**Actions**:
- Tunnel management: `startTcpTunnel`, `stopTcpTunnel`
- Server management: `handleConnectService`, `handleDisconnectService`
- UI state: `setActiveTab`, `toggleFavorite`

## Data Flow

### Establishing Connection

```
1. User Interface
   └─> ServerManagement.tsx
       └─> handleToggleConnection()
           └─> Generate random port
           
2. Store Action
   └─> startTcpTunnel(hostname, localPort)
       └─> invoke('start_tcp_tunnel', { hostname, localPort })
       
3. Rust Backend
   └─> start_tcp_tunnel()
       └─> Start cloudflared via Command::spawn()
       └─> Save PID to TunnelState
       └─> Return ActiveTunnel
       
4. Frontend Update
   └─> Add tunnel to state.tunnels[]
   └─> Update UI (show local port)
```

### Terminating Connection

```
1. User Interface
   └─> ActiveConnections.tsx or ServerManagement.tsx
       └─> handleStopTunnel(id)
       
2. Store Action
   └─> stopTcpTunnel(id)
       └─> invoke('stop_tcp_tunnel', { id })
       
3. Rust Backend
   └─> stop_tcp_tunnel()
       └─> Find PID in TunnelState
       └─> Terminate process (platform dependent)
           - Unix: kill <pid>
           - Windows: taskkill /F /PID <pid>
       └─> Remove from TunnelState
       
4. Frontend Update
   └─> Remove tunnel from state.tunnels[]
   └─> Update UI
```

## File Structure

```
desktop-argo-tunnel/
├── src/                           # Frontend
│   ├── components/
│   │   ├── Dashboard/
│   │   │   └── Dashboard.tsx      # Main dashboard
│   │   ├── Servers/
│   │   │   └── ServerManagement.tsx  # Server management
│   │   ├── Tunnels/
│   │   │   └── ActiveConnections.tsx # Active tunnels list
│   │   ├── Settings/
│   │   │   └── Settings.tsx       # Application settings
│   │   ├── Navigation/
│   │   │   ├── Sidebar.tsx        # Main navigation
│   │   │   └── NavItem.tsx
│   │   ├── CommandPalette/
│   │       └── CommandPalette.tsx # Cmd+K search
│   ├── routes/
│   │   ├── __root.tsx             # Root layout
│   │   └── index.tsx              # Main route
│   ├── i18n/
│   │   └── locales/
│   │       ├── en.json            # English translations
│   │       └── ru.json            # Russian translations
│   ├── store.ts                   # Zustand state management
│   └── main.tsx                   # Entry point
│
├── src-tauri/                     # Backend
│   ├── src/
│   │   ├── cloudflared/
│   │   │   ├── mod.rs             # Module definition
│   │   │   └── commands.rs        # Tauri commands
│   │   ├── lib.rs                 # Main library
│   │   └── main.rs                # Entry point
│   ├── Cargo.toml                 # Rust dependencies
│   └── tauri.conf.json            # Tauri configuration
│
└── docs/
    ├── ARCHITECTURE.md            # This file
    └── screenshots/               # UI Screenshots
```

## Key Technologies

### Frontend
- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Zustand** - State Management
- **TanStack Router** - Routing
- **i18next** - Internationalization
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Rust** - Systems Programming Language
- **Tauri 2.0** - Desktop Framework
- **Serde** - Serialization
- **Tokio** - Async runtime (implicitly via Tauri)

### External Dependencies
- **cloudflared** - Cloudflare tunnel binary
- **OS Process Management** - Native process management

## Security

1. **Process Isolation**: Each tunnel runs as a separate `cloudflared` process
2. **Local Storage**: All data stored locally, no cloud synchronization
3. **Credential Storage**: Uses native secure OS storage (keychain)
4. **IPC Security**: Protected Tauri IPC layer between frontend and backend
5. **No Elevated Privileges**: Application runs with user privileges

## Limitations and Roadmap

### Current Limitations
1. **No Process Persistence**: Active tunnels are lost when application restarts
2. **Random Port Only**: Cannot specify custom local port
3. **No Log Streaming**: Cannot view cloudflared logs in real-time
4. **No Tunnel Configuration**: Cannot manage ingress rules

### Planned Improvements
1. **Process Recovery**: Discovery and reconnection to existing cloudflared processes
2. **Custom Port Selection**: Ability to manually specify local port
3. **Log Viewing**: Streaming and display of cloudflared output
4. **Configuration Editor**: Management of tunnel configuration files
5. **Auto-Reconnection**: Tunnel restart on failure
6. **Tunnel Metrics**: Throughput, latency, connection count

## Performance Characteristics

- **Startup Time**: ~1-2 seconds (Tauri overhead)
- **Memory Usage**: ~50-100 MB (base application + active tunnels)
- **Process Overhead**: ~10-20 MB per active tunnel (cloudflared process)
- **Port Range**: 10000-60000 (50,000 possible ports)
- **Max Concurrent Tunnels**: Limited by available ports and system resources
