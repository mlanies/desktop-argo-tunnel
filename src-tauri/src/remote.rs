mod cloudflared;
mod event;
mod handle;
mod state;

use event::RemotesEvent;
use state::RemotesState;
use tauri::{AppHandle, Emitter, Manager};
use tracing::debug;
use uuid::Uuid;

use crate::servers::ServersState;
use crate::util::invoke;

const REMOTE_EVENT: &str = "remote_event";

#[tauri::command]
pub async fn connect_service(app: AppHandle, service_id: Uuid) -> Result<(), String> {
    async fn inner(app: AppHandle, service_id: Uuid) -> anyhow::Result<()> {
        debug!("connect_service called for service {service_id}");
        let remotes_state = app.state::<RemotesState>();
        let servers_state = app.state::<ServersState>();
        let service = servers_state
            .get_service(service_id)
            .await
            .ok_or(anyhow::anyhow!("service not found"))?;
        let credentials = servers_state.load_service_credential(service_id).await?;

        if let Some(credentials) = credentials {
            debug!("credentials found for service {service_id}");
            remotes_state
                .connect_service(app.app_handle(), &service, &credentials)
                .await?;
            debug!("service {service_id} connected");
            app.emit(REMOTE_EVENT, RemotesEvent::Connected(service_id))?;
        } else {
            debug!("no credentials found for service {service_id}");
            app.emit(REMOTE_EVENT, RemotesEvent::PromptCredentials(service_id))?;
        }

        Ok(())
    }

    invoke!(inner, app, service_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_rdp_service_with_credentials(
    app: AppHandle,
    service_id: Uuid,
    login: String,
    password: String,
    domain: String,
    remember: bool,
) -> Result<(), String> {
    async fn inner(
        app: AppHandle,
        service_id: Uuid,
        login: String,
        password: String,
        domain: String,
        remember: bool,
    ) -> anyhow::Result<()> {
        let remotes_state = app.state::<RemotesState>();
        let servers_state = app.state::<ServersState>();
        let service = servers_state
            .get_service(service_id)
            .await
            .ok_or(anyhow::anyhow!("service not found"))?;

        servers_state
            .update_rdp_service_credentials(service_id, login, password, domain, remember)
            .await?;
        let credentials = servers_state
            .load_service_credential(service_id)
            .await?
            .unwrap();

        remotes_state
            .connect_service(app.app_handle(), &service, &credentials)
            .await?;
        debug!("service {service_id} connected");
        app.emit(REMOTE_EVENT, RemotesEvent::Connected(service_id))?;

        Ok(())
    }

    invoke!(inner, app, service_id, login, password, domain, remember).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_ssh_service_with_credentials(
    app: AppHandle,
    service_id: Uuid,
    login: String,
    password: String,
    key: String,
    remember: bool,
) -> Result<(), String> {
    async fn inner(
        app: AppHandle,
        service_id: Uuid,
        login: String,
        password: String,
        key: String,
        remember: bool,
    ) -> anyhow::Result<()> {
        let remotes_state = app.state::<RemotesState>();
        let servers_state = app.state::<ServersState>();
        let service = servers_state
            .get_service(service_id)
            .await
            .ok_or(anyhow::anyhow!("service not found"))?;

        servers_state
            .update_ssh_service_credentials(service_id, login, password, key, remember)
            .await?;

        let credentials = servers_state
            .load_service_credential(service_id)
            .await?
            .unwrap();

        remotes_state
            .connect_service(app.app_handle(), &service, &credentials)
            .await?;
        debug!("service {service_id} connected");
        app.emit(REMOTE_EVENT, RemotesEvent::Connected(service_id))?;

        Ok(())
    }

    invoke!(inner, app, service_id, login, password, key, remember).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_service(app: AppHandle, service_id: Uuid) -> Result<(), String> {
    async fn inner(app: AppHandle, service_id: Uuid) -> anyhow::Result<()> {
        debug!("disconnect_service called for service {service_id}");
        let remotes_state = app.state::<RemotesState>();

        remotes_state.disconnect_service(&service_id).await?;
        debug!("service {service_id} disconnected");
        app.emit(REMOTE_EVENT, RemotesEvent::Disconnected(service_id))?;

        Ok(())
    }

    invoke!(inner, app, service_id).map_err(|e| e.to_string())
}

pub fn setup(app: &AppHandle) -> anyhow::Result<()> {
    app.manage(RemotesState::new(app)?);

    Ok(())
}
