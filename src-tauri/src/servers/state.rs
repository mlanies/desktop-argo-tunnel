use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;
use tracing::{debug, warn};
use uuid::Uuid;

use super::{
    credentials::{Credential, ServiceCredential},
    models::{ErasedServiceCompanies, InnerCompanyServices, Service},
};
use crate::activity::{ActivityState, event::{ActivityEventType, ActivitySeverity}};
use tauri::Manager;

const SERVERS_STORE: &str = "servers.json";
const EXPANDED_COMPANIES_KEY: &str = "expanded_companies";
const SERVERS_DATA_KEY: &str = "servers_data";

#[derive(Clone)]
pub struct ServersState {
    app: AppHandle,
    servers_data: Arc<Mutex<InnerCompanyServices>>,
    expanded_companies: Arc<Mutex<HashSet<Uuid>>>,
    credentials: Arc<Mutex<HashMap<Uuid, ServiceCredential>>>,
}

impl ServersState {
    pub fn new(app: AppHandle) -> anyhow::Result<Self> {
        let store = app.store(SERVERS_STORE)?;
        let expanded_companies: HashSet<Uuid> = store
            .get(EXPANDED_COMPANIES_KEY)
            .map(serde_json::from_value)
            .transpose()?
            .unwrap_or_default();

        // Загружаем сохраненные серверы из локального хранилища
        let servers_data: InnerCompanyServices = store
            .get(SERVERS_DATA_KEY)
            .map(serde_json::from_value)
            .transpose()?
            .unwrap_or_default();

        Ok(Self {
            app,
            expanded_companies: Arc::new(Mutex::new(expanded_companies)),
            servers_data: Arc::new(Mutex::new(servers_data)),
            credentials: Arc::default(),
        })
    }

    async fn save(&self) -> anyhow::Result<()> {
        let expanded_companies = self.expanded_companies.lock().await;
        let servers_data = self.servers_data.lock().await;
        let store = self.app.store(SERVERS_STORE)?;
        store.set(
            EXPANDED_COMPANIES_KEY,
            serde_json::to_value(HashSet::clone(&expanded_companies))?,
        );
        store.set(
            SERVERS_DATA_KEY,
            serde_json::to_value(InnerCompanyServices::clone(&servers_data))?,
        );
        store.save()?;

        Ok(())
    }

    pub async fn toggle_company_expansion(&self, company_id: Uuid) -> anyhow::Result<bool> {
        let changed = {
            let mut expanded_companies = self.expanded_companies.lock().await;
            if expanded_companies.contains(&company_id) {
                expanded_companies.remove(&company_id)
            } else {
                expanded_companies.insert(company_id)
            }
        };

        self.save().await?;
        Ok(changed)
    }

    pub async fn list_expanded_companies(&self) -> Vec<Uuid> {
        let expanded_companies = self.expanded_companies.lock().await;
        let data = self.servers_data.lock().await;
        let result = data
            .iter()
            .filter_map(|s| expanded_companies.get(&s.id))
            .copied()
            .collect();
        debug!("Expanded companies: {:?}", result);
        result
    }

    pub async fn get_data(&self) -> ErasedServiceCompanies {
        let data = self.servers_data.lock().await;
        data.clone().into_iter().map(|d| d.into()).collect()
    }

    pub async fn update(&self, data: InnerCompanyServices) -> anyhow::Result<bool> {
        let mut servers_data = self.servers_data.lock().await;
        let changed = *servers_data != data;
        if changed {
            debug!("Servers data changed, updating state");
            *servers_data = data;
            drop(servers_data);
        }
        if changed {
            let expanded_companies = self.list_expanded_companies().await;
            debug!("Preserving expanded companies: {:?}", expanded_companies);
            self.expanded_companies.lock().await.clear();
            self.expanded_companies
                .lock()
                .await
                .extend(expanded_companies);
            if let Err(e) = self.save().await {
                warn!("Failed to save expanded companies state: {}", e);
                return Err(e);
            }
        }

        Ok(changed)
    }

    pub async fn get_service(&self, id: Uuid) -> Option<Service> {
        let servers_data = self.servers_data.lock().await;
        servers_data
            .iter()
            .find_map(|c| {
                c.servers
                    .iter()
                    .find_map(|s| s.services.iter().find(|s| s.id == id))
            })
            .cloned()
    }

    pub async fn load_service_credential(&self, id: Uuid) -> anyhow::Result<Option<Credential>> {
        debug!("loading credential for service {id}");
        let mut credentials = self.credentials.lock().await;
        if let Some(cred) = credentials
            .get(&id)
            .filter(|cred| !cred.credential.is_empty())
        {
            debug!("found credential for service {id}");
            return Ok(Some(cred.credential.clone()));
        }

        let service = self
            .get_service(id)
            .await
            .ok_or(anyhow::anyhow!("no service with id: {id}"))?;

        let cred = ServiceCredential::new(&service)?;

        let view_credential = if cred.credential.is_empty() {
            debug!("empty credential for service {id}");
            None
        } else {
            debug!("credential for service {id} loaded");
            Some(cred.credential.clone())
        };

        credentials.insert(id, cred);

        Ok(view_credential)
    }

    pub async fn is_remembered(&self, id: Uuid) -> anyhow::Result<bool> {
        let credentials = self.credentials.lock().await;
        let cred = credentials
            .get(&id)
            .ok_or(anyhow::anyhow!("no credentials"))?;
        Ok(cred.remember)
    }

    pub async fn update_rdp_service_credentials(
        &self,
        id: Uuid,
        login: String,
        password: String,
        domain: String,
        remember: bool,
    ) -> anyhow::Result<Credential> {
        let mut credentials = self.credentials.lock().await;
        let cred = credentials
            .get_mut(&id)
            .ok_or(anyhow::anyhow!("no credentials"))?;
        cred.credential.update_rdp(login, password, domain)?;
        if remember {
            cred.remember()?;
        } else {
            cred.forget()?;
        }

        // Логируем обновление учетных данных
        if let Some(activity_state) = self.app.try_state::<ActivityState>() {
            let _ = activity_state
                .add_event(
                    ActivityEventType::CredentialsUpdated,
                    format!("Учетные данные RDP для сервиса {} обновлены", id),
                    Some(serde_json::json!({
                        "service_id": id,
                        "remember": remember,
                        "protocol": "rdp"
                    })),
                    Some(id),
                    None,
                    None,
                    ActivitySeverity::Info,
                )
                .await;
        }

        Ok(cred.credential.clone())
    }

    pub async fn update_ssh_service_credentials(
        &self,
        id: Uuid,
        login: String,
        password: String,
        key: String,
        remember: bool,
    ) -> anyhow::Result<Credential> {
        let mut credentials = self.credentials.lock().await;
        let cred = credentials
            .get_mut(&id)
            .ok_or(anyhow::anyhow!("no credentials"))?;
        cred.credential.update_ssh(login, password, key)?;
        if remember {
            cred.remember()?;
        } else {
            cred.forget()?;
        }

        // Логируем обновление учетных данных
        if let Some(activity_state) = self.app.try_state::<ActivityState>() {
            let _ = activity_state
                .add_event(
                    ActivityEventType::CredentialsUpdated,
                    format!("Учетные данные SSH для сервиса {} обновлены", id),
                    Some(serde_json::json!({
                        "service_id": id,
                        "remember": remember,
                        "protocol": "ssh"
                    })),
                    Some(id),
                    None,
                    None,
                    ActivitySeverity::Info,
                )
                .await;
        }

        Ok(cred.credential.clone())
    }

    pub async fn save_servers(&self) -> anyhow::Result<()> {
        self.save().await
    }

    pub async fn get_servers_data_mut(&self) -> tokio::sync::MutexGuard<'_, InnerCompanyServices> {
        self.servers_data.lock().await
    }
}
