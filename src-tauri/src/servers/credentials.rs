use anyhow::{bail, Context};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::debug;
use ts_rs::TS;
use uuid::Uuid;

use crate::KEYRING_SERVICE;

use super::models::{Protocol, Service};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum Credential {
    RdpUserPassword {
        login: String,
        password: String,
        domain: String,
    },
    SshUserPassword {
        login: String,
        password: String,
    },
    SshKey {
        login: String,
        key: String,
    },
}

impl Credential {
    pub fn is_empty(&self) -> bool {
        match self {
            Credential::RdpUserPassword { login, .. }
            | Credential::SshUserPassword { login, .. }
            | Credential::SshKey { login, .. } => login.is_empty(),
        }
    }

    fn empty_rdp() -> Self {
        Credential::RdpUserPassword {
            login: String::default(),
            password: String::default(),
            domain: String::default(),
        }
    }

    fn empty_ssh_user_password() -> Self {
        Credential::SshUserPassword {
            login: String::default(),
            password: String::default(),
        }
    }

    fn from_json(value: Value) -> anyhow::Result<Self> {
        serde_json::from_value(value).context("Failed to deserialize credential from JSON")
    }

    fn to_json(&self) -> Value {
        json!(self)
    }

    fn get_secret(entry: &Entry) -> anyhow::Result<Self> {
        let secret_bytes = entry.get_password()?;
        let secret_str = String::from_utf8(secret_bytes.into_bytes())
            .context("Failed to convert secret to UTF-8 string")?;
        let value: Value =
            serde_json::from_str(&secret_str).context("Failed to parse secret as JSON")?;
        Self::from_json(value)
    }

    fn set_secret(&self, entry: &Entry) -> anyhow::Result<()> {
        let json_value = self.to_json();
        let secret_str =
            serde_json::to_string(&json_value).context("Failed to serialize credential to JSON")?;
        entry
            .set_password(&secret_str)
            .context("Failed to store credential in keyring")?;
        Ok(())
    }

    fn save(&self, entry: &Entry) -> anyhow::Result<()> {
        self.set_secret(entry)
    }

    pub fn update_rdp(
        &mut self,
        login: String,
        password: String,
        domain: String,
    ) -> anyhow::Result<()> {
        *self = Self::RdpUserPassword {
            login,
            password,
            domain,
        };
        Ok(())
    }

    pub fn update_ssh(
        &mut self,
        login: String,
        password: String,
        key: String,
    ) -> anyhow::Result<()> {
        if !key.is_empty() && !password.is_empty() {
            bail!("either `key` or `password` must be used, not both")
        }

        *self = if !key.is_empty() {
            Self::SshKey { key, login }
        } else {
            Self::SshUserPassword { login, password }
        };

        Ok(())
    }
}

#[derive(Debug)]
pub struct ServiceCredential {
    pub id: Uuid,
    pub credential: Credential,
    pub remember: bool,
    secret: Option<Entry>,
}

impl ServiceCredential {
    pub fn new(service: &Service) -> anyhow::Result<Self> {
        let entry = Entry::new(KEYRING_SERVICE, &service.id.to_string())
            .ok()
            .filter(|e| e.get_password().is_ok());

        let credential = if let Some(entry) = entry.as_ref() {
            match Credential::get_secret(entry) {
                Ok(cred) => cred,
                Err(_) => match service.protocol {
                    Protocol::Rdp => Credential::empty_rdp(),
                    Protocol::Ssh => Credential::empty_ssh_user_password(),
                },
            }
        } else {
            match service.protocol {
                Protocol::Rdp => Credential::empty_rdp(),
                Protocol::Ssh => Credential::empty_ssh_user_password(),
            }
        };

        Ok(Self {
            id: service.id,
            remember: entry.is_some(),
            secret: entry,
            credential,
        })
    }

    pub fn remember(&mut self) -> anyhow::Result<()> {
        let entry = Entry::new(KEYRING_SERVICE, &self.id.to_string())?;
        self.credential.save(&entry)?;
        debug!("saved credential");
        self.remember = true;
        self.secret = Some(entry);
        Ok(())
    }

    pub fn forget(&mut self) -> anyhow::Result<()> {
        if let Some(entry) = self.secret.take() {
            entry.delete_credential()?;
            debug!("deleted credential");
        }
        self.remember = false;
        Ok(())
    }
}
