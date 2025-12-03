use std::{
    collections::{hash_map::Entry, HashMap},
    sync::Arc,
};

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::servers::{Credential, Service};

use super::{cloudflared::Access, handle::RemoteHandle};

const REMOTES_STORE: &str = "remotes.json";
const SERVICE_PORTS_KEY: &str = "service_ports";

pub struct RemotesState {
    app: AppHandle,
    service_ports: Arc<Mutex<HashMap<Uuid, u16>>>,
    service_access: Arc<Mutex<HashMap<Uuid, Access>>>,
    service_handle: Arc<Mutex<HashMap<Uuid, RemoteHandle>>>,
}

impl RemotesState {
    pub fn new(app: &AppHandle) -> anyhow::Result<Self> {
        let store = app.store(REMOTES_STORE)?;
        let service_ports: HashMap<Uuid, u16> = store
            .get(SERVICE_PORTS_KEY)
            .map(serde_json::from_value)
            .transpose()?
            .unwrap_or_default();

        Ok(Self {
            app: app.clone(),
            service_ports: Arc::new(Mutex::new(service_ports)),
            service_access: Arc::default(),
            service_handle: Arc::default(),
        })
    }

    async fn save(&self) -> anyhow::Result<()> {
        let service_ports = self.service_ports.lock().await;
        let store = self.app.store(REMOTES_STORE)?;
        store.set(
            SERVICE_PORTS_KEY,
            serde_json::to_value(HashMap::clone(&service_ports))?,
        );

        Ok(())
    }

    async fn available_port() -> anyhow::Result<u16> {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
        let port = listener.local_addr()?.port();
        Ok(port)
    }

    async fn service_access(&self, app: &AppHandle, service: &Service) -> anyhow::Result<String> {
        match self.service_access.lock().await.entry(service.id) {
            Entry::Occupied(occupied_entry) => Ok(occupied_entry.get().url.clone()),
            Entry::Vacant(vacant_entry) => {
                let port = match self.service_ports.lock().await.entry(service.id) {
                    Entry::Occupied(entry) => *entry.get(),
                    Entry::Vacant(entry) => {
                        let port = Self::available_port().await?;
                        entry.insert(port);
                        port
                    }
                };

                self.save().await?;

                let (mut rx, access) = Access::new(app, service, port)?;

                let app1 = app.clone();
                let service_id = service.id;
                // TODO: handle logging etc.
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stderr(items) => {
                                error!(name: "Access", "stderr: {}", String::from_utf8(items).unwrap());
                            }
                            CommandEvent::Stdout(items) => {
                                info!(name: "Access", "stdout: {}", String::from_utf8(items).unwrap());
                            }
                            CommandEvent::Error(err) => {
                                error!(name: "Access", "error: {}", err);
                            }
                            CommandEvent::Terminated(terminated_payload) => {
                                error!(name: "Access", "terminated: {:?}", terminated_payload);
                                let state = app1.state::<RemotesState>();
                                state.disconnect_service(&service_id).await.unwrap();
                            }
                            e => {
                                warn!(name: "Access", "unexpected event: {e:?}");
                            }
                        }
                    }
                });

                let url = access.url.clone();
                vacant_entry.insert(access);
                Ok(url)
            }
        }
    }

    pub async fn connect_service(
        &self,
        app: &AppHandle,
        service: &Service,
        credentials: &Credential,
    ) -> anyhow::Result<()> {
        let url = self.service_access(app, service).await?;

        let (mut rx, handle) =
            RemoteHandle::new(app, service.id, service.protocol, &url, credentials).await?;

        let app1 = app.clone();
        let service_id = service.id;
        // TODO: handle logging etc.
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stderr(items) => {
                        error!(
                            name: "RemoteHandle", "stderr: {}",
                            String::from_utf8(items).unwrap()
                        );
                    }
                    CommandEvent::Stdout(items) => {
                        info!(
                            name: "RemoteHandle", "stdout: {}",
                            String::from_utf8(items).unwrap()
                        );
                    }
                    CommandEvent::Error(err) => {
                        error!(name: "RemoteHandle", "error: {}", err);
                    }
                    CommandEvent::Terminated(terminated_payload) => {
                        error!(name: "RemoteHandle", "terminated: {:?}", terminated_payload);
                        let state = app1.state::<RemotesState>();
                        state.disconnect_service(&service_id).await.unwrap();
                    }
                    e => {
                        error!(name: "RemoteHandle", "unexpected event: {e:?}");
                    }
                }
            }
        });

        if let Some(prev) = self.service_handle.lock().await.insert(service.id, handle) {
            prev.stop()?;
        }

        Ok(())
    }

    pub async fn disconnect_service(&self, service_id: &Uuid) -> anyhow::Result<()> {
        if let Some(handle) = self.service_handle.lock().await.remove(service_id) {
            handle.stop()?;
        }

        if let Some(access) = self.service_access.lock().await.remove(service_id) {
            access.stop()?;
        }

        Ok(())
    }
}
