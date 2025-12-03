# User Guide

## Introduction

This guide provides comprehensive instructions for using the Desktop Argo Tunnel Manager. The application is designed to streamline your workflow by providing a graphical interface for powerful `cloudflared` capabilities.

## Installation

1.  Download the latest release for your operating system.
2.  Install the application following the standard procedure for your platform.
3.  Launch the application.

## Dashboard Overview

Upon launching the application, you are presented with the **Dashboard**. This central hub provides:

-   **Statistics**: View total servers, active connections, and recent activity at a glance.
-   **Quick Actions**: Create new tunnels or add servers directly from the dashboard.
-   **Recent Connections**: Quickly reconnect to your most frequently used services.

## Managing Tunnels

The application replaces the need for CLI commands like `cloudflared tunnel create` and `cloudflared tunnel run`.

### Creating a Tunnel

1.  Navigate to the **Tunnels** tab in the sidebar.
2.  Click **Create Tunnel**.
3.  Follow the **Tunnel Wizard**:
    -   **Authentication**: Log in to your Cloudflare account via the secure browser window.
    -   **Configuration**: Name your tunnel and define ingress rules.
    -   **Routing**: Configure DNS hostnames and routing rules.
4.  The tunnel will be created and started automatically.

### Monitoring Tunnels

-   View real-time status (Active/Inactive) for all your tunnels.
-   Access detailed logs for troubleshooting without leaving the app.
-   Monitor connection metrics and uptime.

## Connecting to Services

### Adding a Server

1.  Go to the **Servers** tab.
2.  Click **Add Server**.
3.  Enter a friendly name and description for your server.
4.  Add services (SSH, RDP, TCP) by specifying the host and port.

### Establishing a Connection

1.  Select a server from the list.
2.  Click the **Connect** button next to the desired service.
3.  The application handles the `cloudflared access` handshake automatically.
4.  For SSH and RDP, the default system client will be launched with the correct parameters.

## Settings

Customize your experience in the **Settings** tab:

-   **Language**: Switch between English and Russian.
-   **Theme**: Toggle between Dark and Light modes (system default supported).
-   **Cloudflared**: Configure the path to the `cloudflared` binary if using a custom version.

## Troubleshooting

If you encounter issues:

1.  Check the **Logs** section for error messages from the `cloudflared` process.
2.  Ensure your internet connection is stable.
3.  Verify that your Cloudflare credentials are valid.
