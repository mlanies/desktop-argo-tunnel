use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum RemotesEvent {
    Connected(Uuid),
    Disconnected(Uuid),
    PromptCredentials(Uuid),
    ConnectedServices(Vec<Uuid>),
}
