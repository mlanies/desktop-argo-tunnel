
use event::ServersEvent;
use tauri::{AppHandle, Emitter, Event, Manager};
use tracing::{debug, warn};
use uuid::Uuid;

pub use credentials::Credential;
pub use models::*;
pub use state::ServersState;

use crate::util::{invoke, AppHandleExt};

mod credentials;
mod event;
mod models;
mod state;

const SERVERS_EVENT: &str = "servers_event";
const UPDATE_SECONDS: u64 = 20;

#[tauri::command]
pub async fn toggle_company_expansion(app: AppHandle, company_id: Uuid) -> Result<bool, String> {
    async fn inner(app: AppHandle, company_id: Uuid) -> anyhow::Result<bool> {
        let servers_state = app.state::<ServersState>();
        if servers_state.toggle_company_expansion(company_id).await? {
            app.emit(
                SERVERS_EVENT,
                ServersEvent::Expanded(servers_state.list_expanded_companies().await),
            )?;
        }
        Ok(true)
    }

    invoke!(inner, app, company_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_service_credential(app: AppHandle, service_id: Uuid) -> Result<(), String> {
    async fn inner(app: AppHandle, service_id: Uuid) -> anyhow::Result<()> {
        let servers_state = app.state::<ServersState>();
        let credential = servers_state
            .load_service_credential(service_id)
            .await
            .ok()
            .flatten();
        let remember = servers_state.is_remembered(service_id).await.unwrap_or(false);

        app.emit(
            SERVERS_EVENT,
            ServersEvent::ServiceCredential {
                service: service_id,
                remember,
                credential,
            },
        )?;

        Ok(())
    }

    invoke!(inner, app, service_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_service(app: AppHandle, service_id: Uuid) -> Result<Option<Service>, String> {
    async fn inner(app: AppHandle, service_id: Uuid) -> anyhow::Result<Option<Service>> {
        let servers_state = app.state::<ServersState>();
        Ok(servers_state.get_service(service_id).await)
    }
    
    invoke!(inner, app, service_id).map_err(|e| e.to_string())
}

// CRUD операции для локального управления серверами
#[tauri::command]
pub async fn add_server(
    app: AppHandle,
    name: String,
    description: Option<String>,
) -> Result<Uuid, String> {
    async fn inner(app: AppHandle, name: String, description: Option<String>) -> anyhow::Result<Uuid> {
        let servers_state = app.state::<ServersState>();
        let mut data = servers_state.get_servers_data_mut().await;
        
        let server_id = Uuid::new_v4();
        
        let new_server = models::Server {
            id: server_id,
            name,
            description,
            services: vec![],
        };
        
        // Ищем существующую компанию "Local Servers" или создаем новую
        const LOCAL_SERVERS_NAME: &str = "Local Servers";
        if let Some(company) = data.iter_mut().find(|c| c.name == LOCAL_SERVERS_NAME) {
            // Добавляем сервер в существующую компанию
            company.servers.push(new_server);
        } else {
            // Создаем новую компанию
            let company_id = Uuid::new_v4();
            let new_company = models::Company {
                id: company_id,
                name: LOCAL_SERVERS_NAME.to_string(),
                servers: vec![new_server],
            };
            data.push(new_company);
        }
        
        drop(data);
        
        servers_state.save_servers().await?;
        
        // Обновляем UI через событие
        let servers_state = app.state::<ServersState>();
        let updated_data = servers_state.get_data().await;
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(updated_data),
        )?;
        
        Ok(server_id)
    }
    
    invoke!(inner, app, name, description).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_server(
    app: AppHandle,
    server_id: Uuid,
    name: String,
    description: Option<String>,
) -> Result<(), String> {
    async fn inner(app: AppHandle, server_id: Uuid, name: String, description: Option<String>) -> anyhow::Result<()> {
        let servers_state = app.state::<ServersState>();
        let mut data = servers_state.get_servers_data_mut().await;
        
        for company in data.iter_mut() {
            if let Some(server) = company.servers.iter_mut().find(|s| s.id == server_id) {
                server.name = name;
                server.description = description;
                break;
            }
        }
        
        drop(data);
        servers_state.save_servers().await?;
        
        let servers_state = app.state::<ServersState>();
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(servers_state.get_data().await),
        )?;
        
        Ok(())
    }
    
    invoke!(inner, app, server_id, name, description).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_server(app: AppHandle, server_id: Uuid) -> Result<(), String> {
    async fn inner(app: AppHandle, server_id: Uuid) -> anyhow::Result<()> {
        let servers_state = app.state::<ServersState>();
        let mut data = servers_state.get_servers_data_mut().await;
        
        for company in data.iter_mut() {
            company.servers.retain(|s| s.id != server_id);
        }
        data.retain(|c| !c.servers.is_empty());
        
        drop(data);
        servers_state.save_servers().await?;
        
        let servers_state = app.state::<ServersState>();
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(servers_state.get_data().await),
        )?;
        
        Ok(())
    }
    
    invoke!(inner, app, server_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_service(
    app: AppHandle,
    server_id: Uuid,
    protocol: models::Protocol,
    host: String,
    port: i32,
) -> Result<Uuid, String> {
    async fn inner(app: AppHandle, server_id: Uuid, protocol: models::Protocol, host: String, port: i32) -> anyhow::Result<Uuid> {
        let servers_state = app.state::<ServersState>();
        let mut data = servers_state.get_servers_data_mut().await;
        
        let service_id = Uuid::new_v4();
        let new_service = models::Service {
            id: service_id,
            protocol,
            port,
            host,
            status: Some("active".to_string()),
        };
        
        for company in data.iter_mut() {
            if let Some(server) = company.servers.iter_mut().find(|s| s.id == server_id) {
                server.services.push(new_service);
                break;
            }
        }
        
        drop(data);
        servers_state.save_servers().await?;
        
        let servers_state = app.state::<ServersState>();
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(servers_state.get_data().await),
        )?;
        
        Ok(service_id)
    }
    
    invoke!(inner, app, server_id, protocol, host, port).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_service(
    app: AppHandle,
    service_id: Uuid,
    protocol: models::Protocol,
    host: String,
    port: i32,
) -> Result<(), String> {
    async fn inner(app: AppHandle, service_id: Uuid, protocol: models::Protocol, host: String, port: i32) -> anyhow::Result<()> {
        let servers_state = app.state::<ServersState>();
        let mut data = servers_state.get_servers_data_mut().await;
        
        let mut found = false;
        for company in data.iter_mut() {
            for server in company.servers.iter_mut() {
                if let Some(service) = server.services.iter_mut().find(|s| s.id == service_id) {
                    service.protocol = protocol;
                    service.host = host.clone();
                    service.port = port;
                    found = true;
                    break;
                }
            }
            if found {
                break;
            }
        }
        
        drop(data);
        servers_state.save_servers().await?;
        
        let servers_state = app.state::<ServersState>();
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(servers_state.get_data().await),
        )?;
        
        Ok(())
    }
    
    invoke!(inner, app, service_id, protocol, host, port).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_service(app: AppHandle, service_id: Uuid) -> Result<(), String> {
    async fn inner(app: AppHandle, service_id: Uuid) -> anyhow::Result<()> {
        let servers_state = app.state::<ServersState>();
        let mut data = servers_state.get_servers_data_mut().await;
        
        for company in data.iter_mut() {
            for server in company.servers.iter_mut() {
                server.services.retain(|s| s.id != service_id);
            }
        }
        
        drop(data);
        servers_state.save_servers().await?;
        
        let servers_state = app.state::<ServersState>();
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(servers_state.get_data().await),
        )?;
        
        Ok(())
    }
    
    invoke!(inner, app, service_id).map_err(|e| e.to_string())
}

async fn on_ui_ready(app: AppHandle, _event: Event) {
    async fn inner(app: AppHandle) -> anyhow::Result<()> {
        let servers_state = app.state::<ServersState>();
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Updated(servers_state.get_data().await),
        )?;
        app.emit(
            SERVERS_EVENT,
            ServersEvent::Expanded(servers_state.list_expanded_companies().await),
        )?;
        Ok(())
    }

    invoke!(inner, app).map_err(|e| e.to_string()).unwrap_or_else(|e| {
        eprintln!("Error in on_ui_ready: {}", e);
    });
}

pub fn setup(app: &AppHandle) -> anyhow::Result<()> {
    app.manage(state::ServersState::new(app.clone())?);

    app.listen_async(crate::UI_READY_EVENT, on_ui_ready);

    Ok(())
}
