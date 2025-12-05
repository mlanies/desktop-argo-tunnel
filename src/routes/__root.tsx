import {
  createRootRoute,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { emit, Event, listen, UnlistenFn } from "@tauri-apps/api/event";
import * as log from "@tauri-apps/plugin-log";
import { useEffect } from "react";
import { ServersEvent } from "../generated/ts-rs/ServersEvent";
import { useStore } from '../store';
import "./__root.css";
import { RemotesEvent } from "../generated/ts-rs/RemotesEvent";
import { NotificationProvider } from '../components/NotificationSystem';
import CommandPalette from '../components/CommandPalette/CommandPalette';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import CloudflaredCheckModal from '../components/CloudflaredCheckModal';
import CloudflaredUpdateModal from '../components/CloudflaredUpdateModal';


export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
});

function RootComponent() {
  const {
    handleServicesByServersByCompanyChange,
    handleExpandedCompaniesChange,
    handleUpdateViewServiceCredential,
    handleConnectedServicesChange,
    handleConnectService,
    handleDisconnectService,
    installCloudflared,
    isInstallingCloudflared,
    checkForCloudflaredUpdate,
    cloudflaredVersion,
    cloudflaredLatestVersion,
    updateCloudflared,
    isUpdatingCloudflared,
    tunnels,
  } = useStore();

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCloudflaredModal, setShowCloudflaredModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn[] = [];

    const handleTauriServersEvent = async (event: Event<ServersEvent>) => {
      if (event.payload === "Empty") {
        handleServicesByServersByCompanyChange([]);
      } else if ("Updated" in event.payload) {
        console.info("Received updated servers event", event.payload.Updated);
        handleServicesByServersByCompanyChange(event.payload.Updated);
      } else if ("Expanded" in event.payload) {
        console.info("Received expanded servers event", event.payload.Expanded);
        handleExpandedCompaniesChange(event.payload.Expanded);
      } else if ("ServiceCredential" in event.payload) {
        console.info(
          "Received service credential event",
          event.payload.ServiceCredential,
        );
        handleUpdateViewServiceCredential(
          event.payload.ServiceCredential.service,
          event.payload.ServiceCredential.remember,
          event.payload.ServiceCredential.credential,
        );
      }
    };

    const handleTauriRemotesEvent = async (event: Event<RemotesEvent>) => {
      if ("ConnectedServices" in event.payload) {
        handleConnectedServicesChange(event.payload.ConnectedServices);
      } else if ("Connected" in event.payload) {
        handleConnectService(event.payload.Connected);
      } else if ("Disconnected" in event.payload) {
        handleDisconnectService(event.payload.Disconnected);
      } else if ("PromptCredentials" in event.payload) {
        handleUpdateViewServiceCredential(
          event.payload.PromptCredentials,
          false,
          null,
        );
      }
    };

    (async () => {
      unlisten.push(
        await listen<ServersEvent>("servers_event", handleTauriServersEvent),
      );

      unlisten.push(
        await listen<RemotesEvent>("remote_event", handleTauriRemotesEvent),
      );

      setTimeout(() => {
        log.debug("emit 'ui-ready'");
        emit("ui-ready");
      }, 1500);
    })();

    return () => {
      unlisten.forEach((unlisten) => unlisten());
    };
  }, []);

  // Global Cmd+K / Ctrl+K hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check cloudflared installation on startup
  useEffect(() => {
    const checkCloudflared = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('check_cloudflared_version');
        
        // Check for updates
        await checkForCloudflaredUpdate();
      } catch (error) {
        console.error('Cloudflared not found:', error);
        setShowCloudflaredModal(true);
      }
    };

    checkCloudflared();
  }, [checkForCloudflaredUpdate]);

  // Show update modal when update is available
  useEffect(() => {
    if (cloudflaredVersion && cloudflaredLatestVersion && cloudflaredVersion !== cloudflaredLatestVersion) {
      setShowUpdateModal(true);
    }
  }, [cloudflaredVersion, cloudflaredLatestVersion]);

  return (
    <NotificationProvider>
      <main className="font-work-sans bg-twogc-black text-twogc-white rounded-3xl border border-white margin-0 flex flex-col overflow-hidden h-screen w-full px-5">
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </main>
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
      />
      {showCloudflaredModal && (
        <CloudflaredCheckModal
          onRetry={async () => {
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('check_cloudflared_version');
              setShowCloudflaredModal(false);
            } catch (error) {
              console.error('Cloudflared still not found');
            }
          }}
          onClose={() => setShowCloudflaredModal(false)}
          onInstall={installCloudflared}
          isInstalling={isInstallingCloudflared}
        />
      )}
      {showUpdateModal && cloudflaredVersion && cloudflaredLatestVersion && (
        <CloudflaredUpdateModal
          currentVersion={cloudflaredVersion}
          latestVersion={cloudflaredLatestVersion}
          onUpdate={async () => {
            try {
              await updateCloudflared();
              setShowUpdateModal(false);
            } catch (error) {
              console.error('Update failed:', error);
            }
          }}
          onClose={() => setShowUpdateModal(false)}
          isUpdating={isUpdatingCloudflared}
          activeTunnelsCount={tunnels.length}
        />
      )}
      <Toaster />
    </NotificationProvider>
  );
}
