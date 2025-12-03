use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use super::{credentials::Credential, models::ErasedServiceCompanies};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum ServersEvent {
    Updated(ErasedServiceCompanies),
    Expanded(Vec<Uuid>),
    ServiceCredential {
        service: Uuid,
        remember: bool,
        credential: Option<Credential>,
    },
    Empty,
}
