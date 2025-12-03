use serde::{Deserialize, Serialize};
use ts_rs::TS;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct KeePassContainer {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub modified_at: String,
    pub entry_count: usize,
    pub is_open: bool,
    pub is_locked: bool, // Новое поле для совместимости с frontend
    pub groups: Vec<KeePassGroup>,
    pub keyfile_attached: bool,
    pub history: Vec<ContainerHistory>,
    pub description: Option<String>,
    pub compression: bool,
    pub encryption: String,
    pub key_derivation: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct KeePassEntry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub group_id: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub modified_at: String,
    pub accessed_at: String,
    pub expires_at: Option<String>,
    pub custom_fields: std::collections::HashMap<String, String>,
    pub history: Vec<EntryHistory>,
    pub icon_id: Option<u32>,
    pub foreground_color: Option<String>,
    pub background_color: Option<String>,
    pub auto_type: Option<AutoType>,
    pub attachments: Vec<Attachment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct KeePassGroup {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub children: Vec<KeePassGroup>,
    pub created_at: String,
    pub modified_at: String,
    pub icon_id: Option<u32>,
    pub notes: Option<String>,
    pub is_expanded: bool,
    pub default_auto_type_sequence: Option<String>,
    pub enable_auto_type: Option<bool>,
    pub enable_searching: Option<bool>,
    pub last_top_visible_entry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SearchOptions {
    pub query: String,
    pub search_in_titles: bool,
    pub search_in_usernames: bool,
    pub search_in_passwords: bool,
    pub search_in_urls: bool,
    pub search_in_notes: bool,
    pub search_in_tags: bool,
    pub case_sensitive: bool,
    pub regex: bool,
    pub group_filter: Option<String>,
    pub exclude_expired: bool,
    pub exclude_recycled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ContainerStats {
    pub total_entries: usize,
    pub total_groups: usize,
    pub weak_passwords: usize,
    pub duplicate_passwords: usize,
    pub expired_entries: usize,
    pub last_backup: Option<String>,
    pub container_size: usize,
    pub last_modified: String,
    pub security_score: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ContainerHistory {
    pub timestamp: String,
    pub action: String,
    pub user: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct EntryHistory {
    pub timestamp: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub custom_fields: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AutoType {
    pub enabled: bool,
    pub default_sequence: Option<String>,
    pub associations: Vec<AutoTypeAssociation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AutoTypeAssociation {
    pub window: String,
    pub sequence: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub size: usize,
    pub content: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct KeyFile {
    pub id: String,
    pub name: String,
    pub path: String,
    pub content: Vec<u8>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BackupInfo {
    pub id: String,
    pub path: String,
    pub created_at: String,
    pub size: usize,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AuditEvent {
    pub timestamp: String,
    pub user_id: Option<String>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub details: Option<String>,
    pub ip_address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PasswordQuality {
    pub score: u8,
    pub length: usize,
    pub has_uppercase: bool,
    pub has_lowercase: bool,
    pub has_digits: bool,
    pub has_special: bool,
    pub entropy: f64,
    pub crack_time: Option<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportOptions {
    pub source_format: String,
    pub merge_existing: bool,
    pub create_backup: bool,
    pub import_history: bool,
    pub import_attachments: bool,
    pub group_mapping: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ExportOptions {
    pub format: String,
    pub include_history: bool,
    pub include_attachments: bool,
    pub encrypt: bool,
    pub password: Option<String>,
    pub keyfile: Option<Vec<u8>>,
} 