use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    Rdp,
    Ssh,
}

impl Protocol {
    pub fn as_str(&self) -> &'static str {
        match self {
            Protocol::Rdp => "rdp",
            Protocol::Ssh => "ssh",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ErasedService {
    pub id: Uuid,
    pub protocol: Protocol,
    pub host: String,
    pub port: i32,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Service {
    pub id: Uuid,
    pub protocol: Protocol,
    pub port: i32,
    pub host: String,
    pub status: Option<String>,
}

impl Service {
    pub fn is_active(&self) -> bool {
        self.status == Some("active".to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct Server<S> {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub services: Vec<S>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct Company<S> {
    pub id: Uuid,
    pub name: String,
    pub servers: Vec<Server<S>>,
}

// Упрощенная структура без компаний - просто список серверов
pub type LocalServers = Vec<Server<Service>>;
pub type LocalServersErased = Vec<Server<ErasedService>>;

pub type ErasedServiceCompanies = Vec<Company<ErasedService>>;
pub type InnerCompanyServices = Vec<Company<Service>>;

impl From<Company<Service>> for Company<ErasedService> {
    fn from(inner: Company<Service>) -> Self {
        let servers = inner
            .servers
            .into_iter()
            .map(|server| {
                let services = server
                    .services
                    .into_iter()
                    .map(|service| ErasedService {
                        id: service.id,
                        protocol: service.protocol,
                        host: service.host.clone(),
                        port: service.port,
                        status: service.status,
                    })
                    .collect();
                Server {
                    id: server.id,
                    name: server.name,
                    description: server.description,
                    services,
                }
            })
            .collect();
        Company {
            id: inner.id,
            name: inner.name,
            servers,
        }
    }
}

impl From<Server<Service>> for Server<ErasedService> {
    fn from(inner: Server<Service>) -> Self {
        let services = inner
            .services
            .into_iter()
            .map(|service| ErasedService {
                id: service.id,
                protocol: service.protocol,
                host: service.host.clone(),
                port: service.port,
                status: service.status,
            })
            .collect();
        Server {
            id: inner.id,
            name: inner.name,
            description: inner.description,
            services,
        }
    }
}
