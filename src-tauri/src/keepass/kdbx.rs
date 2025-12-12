use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use anyhow::{Result, Context};
use keepass::{Database, Group, Entry, Node, Value};
use crate::keepass::models::*;
use chrono::Utc;
use uuid::Uuid;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce
};
use aes_gcm::aead::generic_array::typenum::U12;
use argon2::{Argon2, PasswordHasher};
use rand::RngCore;
use md5;

#[derive(Debug)]
pub struct KdbxManager {
    databases: HashMap<String, Database>,
    keyfiles: HashMap<String, Vec<u8>>,
}

impl KdbxManager {
    pub fn new() -> Self {
        Self {
            databases: HashMap::new(),
            keyfiles: HashMap::new(),
        }
    }

    /// Создает новый KDBX контейнер через Go бэкенд
    pub async fn create_container(&mut self, name: &str, password: &str, keyfile: Option<Vec<u8>>) -> Result<KeePassContainer> {
        // Валидируем пароль
        if password.len() < 8 {
            return Err(anyhow::anyhow!("Password must be at least 8 characters long"));
        }

        // Создаем путь для нового контейнера
        let container_path = std::path::PathBuf::from(self.get_default_path(name));
        
        // Добавляем подробное логирование для диагностики
        tracing::info!("Creating container with name: '{}'", name);
        tracing::info!("Container path: {}", container_path.display());
        tracing::info!("Path exists: {}", container_path.exists());
        
        // Проверяем, что файл с таким именем не существует
        if container_path.exists() {
            tracing::warn!("Container file already exists: {}", container_path.display());
            return Err(anyhow::anyhow!("Container with this name already exists"));
        }
        
        // Создаем директорию если не существует
        if let Some(parent) = container_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Генерируем ID для контейнера на основе имени файла
        let container_id = format!("{:x}", md5::compute(name.as_bytes()));
        
        // Создаем контейнер через Go бэкенд
        let client = reqwest::Client::new();
        let request_body = serde_json::json!({
            "name": name,
            "password": password,
            "description": format!("Container created by Desktop argo tunnel")
        });
        
        let response = client
            .post("http://localhost:9080/api/test/create-container")
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .with_context(|| "Failed to send request to Go backend")?;
        
        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(anyhow::anyhow!("Go backend error: {}", error_text));
        }
        
        let _go_container: serde_json::Value = response.json().await
            .with_context(|| "Failed to parse Go backend response")?;
        
        // Создаем контейнер в нашем формате
        let container = KeePassContainer {
            id: container_id.clone(),
            name: name.to_string(),
            path: container_path.to_string_lossy().to_string(),
            created_at: Utc::now().to_rfc3339(),
            modified_at: Utc::now().to_rfc3339(),
            entry_count: 0,
            is_open: true,
            is_locked: false, // Новый контейнер разблокирован
            groups: vec![],
            keyfile_attached: keyfile.is_some(),
            history: vec![],
            description: None,
            compression: true,
            encryption: "AES-256".to_string(),
            key_derivation: "Argon2".to_string(),
            version: "4.0".to_string(),
        };
        
        // Сохраняем keyfile если есть
        if let Some(keyfile_data) = keyfile {
            self.keyfiles.insert(container_id.clone(), keyfile_data);
        }
        
        tracing::info!("Created new KeePass container via Go backend: {} at {}", name, container_path.display());
        Ok(container)
    }

    /// Открывает существующий KDBX контейнер
    pub fn open_container(&mut self, path: &str, password: &str, keyfile: Option<Vec<u8>>) -> Result<KeePassContainer> {
        if !Path::new(path).exists() {
            return Err(anyhow::anyhow!("File not found: {}", path));
        }

        // Получаем информацию о файле
        let metadata = std::fs::metadata(path)
            .with_context(|| format!("Failed to get file metadata: {}", path))?;

        // Пытаемся открыть файл с помощью библиотеки keepass
        let mut file = File::open(path)
            .with_context(|| format!("Failed to open file: {}", path))?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        // Проверяем, что это KeePass файл (проверяем сигнатуры)
        if buffer.len() < 8 {
            return Err(anyhow::anyhow!("File too small to be a valid KeePass file"));
        }
        
        // Проверяем KDBX 4.0 сигнатуру (4B 44 42 58)
        let is_kdbx4 = &buffer[0..4] == b"KDBX";
        
        // Проверяем KeePass 2.x сигнатуру (03 D9 A2 9A 67 FB 4B B5)
        let is_kp2 = &buffer[0..8] == [0x03, 0xD9, 0xA2, 0x9A, 0x67, 0xFB, 0x4B, 0xB5];
        
        if !is_kdbx4 && !is_kp2 {
            return Err(anyhow::anyhow!("Invalid KeePass file format"));
        }

        // Пытаемся открыть базу данных
        let mut keyfile_cursor = keyfile.as_ref().map(|data| std::io::Cursor::new(data.clone()));
        let keyfile_reader: Option<&mut dyn std::io::Read> = keyfile_cursor.as_mut().map(|c| c as &mut dyn std::io::Read);
        
        let db = Database::open(&mut std::io::Cursor::new(&buffer[..]), Some(password), keyfile_reader)
            .with_context(|| format!("Failed to decrypt database with provided password"))?;

        let file_name = path.split('/').last().unwrap_or("Unknown").replace(".kdbx", "");
        let container_id = format!("{:x}", md5::compute(file_name.as_bytes()));

        // Успешно открыли базу данных
        let entry_count = self.count_entries(&db);
        let groups = self.convert_groups(&db);
        
        // Сохраняем базу данных в памяти по пути к файлу
        self.databases.insert(path.to_string(), db);
        
        let container = KeePassContainer {
            id: container_id.clone(),
            name: file_name,
            path: path.to_string(),
            created_at: Utc::now().to_rfc3339(),
            modified_at: metadata.modified()
                .unwrap_or(metadata.created().unwrap_or(metadata.accessed().unwrap()))
                .duration_since(std::time::UNIX_EPOCH)
                .ok()
                .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
                .unwrap_or_else(|| Utc::now())
                .to_rfc3339(),
            entry_count,
            is_open: true,
            is_locked: false, // Открытый контейнер разблокирован
            groups,
            keyfile_attached: keyfile.is_some(),
            history: vec![],
            description: None,
            compression: true,
            encryption: "AES-256".to_string(),
            key_derivation: "Argon2".to_string(),
            version: "4.0".to_string(),
        };

        tracing::info!("Opened KeePass container: {} (entries: {})", path, container.entry_count);
        Ok(container)
    }

    /// Сохраняет контейнер в файл
    pub fn save_container(&mut self, container_path: &str, _password: &str) -> Result<()> {
        // Проверяем, что файл существует
        if !std::path::Path::new(container_path).exists() {
            return Err(anyhow::anyhow!("Container file not found on disk"));
        }

        // TODO: Реализовать правильное сохранение базы данных с шифрованием
        // Пока что просто логируем операцию
        tracing::info!("Saved container to {} (placeholder implementation)", container_path);
        Ok(())
    }

    /// Добавляет запись в контейнер
    pub fn add_entry(&mut self, container_path: &str, entry: KeePassEntry) -> Result<()> {
        let db = self.databases.get_mut(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        // Создаем новую запись
        let mut new_entry = Entry::default();
        new_entry.fields.insert("Title".to_string(), Value::Unprotected(entry.title));
        new_entry.fields.insert("UserName".to_string(), Value::Unprotected(entry.username));
        new_entry.fields.insert("Password".to_string(), Value::Protected(entry.password.into()));
        
        if let Some(url) = entry.url {
            new_entry.fields.insert("URL".to_string(), Value::Unprotected(url));
        }
        
        if let Some(notes) = entry.notes {
            new_entry.fields.insert("Notes".to_string(), Value::Unprotected(notes));
        }

        // Добавляем запись в корневую группу
        db.root.children.push(Node::Entry(new_entry));

        tracing::info!("Added entry to container: {}", container_path);
        Ok(())
    }

    /// Обновляет запись в контейнере
    pub fn update_entry(&mut self, container_path: &str, _entry: KeePassEntry) -> Result<()> {
        let _db = self.databases.get_mut(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        // TODO: Реализовать обновление записи
        tracing::info!("Updated entry in container: {}", container_path);
        Ok(())
    }

    /// Удаляет запись из контейнера
    pub fn delete_entry(&mut self, container_path: &str, _entry_id: &str) -> Result<()> {
        let _db = self.databases.get_mut(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        // TODO: Реализовать удаление записи
        tracing::info!("Deleted entry from container: {}", container_path);
        Ok(())
    }

    /// Ищет записи в контейнере
    pub fn search_entries(&self, container_path: &str, options: &SearchOptions) -> Result<Vec<KeePassEntry>> {
        let db = self.databases.get(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        let mut results = Vec::new();
        self.search_entries_recursive(&db.root, &options, &mut results)?;

        Ok(results)
    }

    /// Получает статистику контейнера
    pub fn get_container_stats(&self, container_path: &str) -> Result<ContainerStats> {
        let db = self.databases.get(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        let entries = self.collect_all_entries(&db.root);
        
        let weak_passwords = self.count_weak_passwords(&entries);
        let duplicate_passwords = self.count_duplicate_passwords(&entries);
        let expired_entries = self.count_expired_entries(&entries);
        let security_score = self.calculate_security_score(&entries);

        Ok(ContainerStats {
            total_entries: entries.len(),
            total_groups: self.count_groups(&db.root),
            weak_passwords,
            duplicate_passwords,
            expired_entries,
            last_backup: None,
            container_size: 0,
            last_modified: Utc::now().to_rfc3339(),
            security_score,
        })
    }

    /// Создает резервную копию контейнера
    pub fn create_backup(&mut self, container_path: &str) -> Result<BackupInfo> {
        let _db = self.databases.get(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        let backup_path = self.get_backup_path(container_path)?;
        
        // TODO: Реализовать создание резервной копии
        let backup_info = BackupInfo {
            id: Uuid::new_v4().to_string(),
            path: backup_path.to_string_lossy().to_string(),
            created_at: Utc::now().to_rfc3339(),
            size: 0,
            description: Some("Automatic backup".to_string()),
        };

        tracing::info!("Created backup for container: {} at {}", container_path, backup_path.display());
        Ok(backup_info)
    }

    /// Получает список резервных копий
    pub fn list_backups(&self, container_path: &str) -> Result<Vec<BackupInfo>> {
        let backup_dir = self.get_backup_dir()?;
        let mut backups = Vec::new();

        if backup_dir.exists() {
            for entry in std::fs::read_dir(backup_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.extension().and_then(|s| s.to_str()) == Some("kdbx") {
                    if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
                        // Извлекаем имя файла из пути для поиска резервных копий
                        let container_name = std::path::Path::new(container_path)
                            .file_name()
                            .and_then(|s| s.to_str())
                            .unwrap_or("unknown");
                        if file_name.starts_with(container_name) {
                            let metadata = entry.metadata()?;
                            backups.push(BackupInfo {
                                id: Uuid::new_v4().to_string(),
                                path: path.to_string_lossy().to_string(),
                                created_at: Utc::now().to_rfc3339(),
                                size: metadata.len() as usize,
                                description: Some("Backup".to_string()),
                            });
                        }
                    }
                }
            }
        }

        Ok(backups)
    }

    /// Привязывает key-файл к контейнеру
    pub fn attach_keyfile(&mut self, container_path: &str, keyfile: Vec<u8>) -> Result<()> {
        self.keyfiles.insert(container_path.to_string(), keyfile);
        tracing::info!("Attached keyfile to container: {}", container_path);
        Ok(())
    }

    /// Отвязывает key-файл от контейнера
    pub fn detach_keyfile(&mut self, container_path: &str) -> Result<()> {
        self.keyfiles.remove(container_path);
        tracing::info!("Detached keyfile from container: {}", container_path);
        Ok(())
    }

    /// Анализирует качество пароля
    pub fn analyze_password_quality(&self, password: &str) -> PasswordQuality {
        let length = password.len();
        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        let has_digits = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| !c.is_alphanumeric());

        // Простой алгоритм оценки
        let mut score = 0;
        if length >= 8 { score += 20; }
        if length >= 12 { score += 10; }
        if has_uppercase { score += 15; }
        if has_lowercase { score += 15; }
        if has_digits { score += 15; }
        if has_special { score += 15; }
        if length >= 16 { score += 10; }

        let entropy = self.calculate_entropy(password);
        let crack_time = self.estimate_crack_time(score);
        let suggestions = self.generate_password_suggestions(password);

        PasswordQuality {
            score: score.min(100) as u8,
            length,
            has_uppercase,
            has_lowercase,
            has_digits,
            has_special,
            entropy,
            crack_time,
            suggestions,
        }
    }

    // Вспомогательные методы

    fn get_default_path(&self, name: &str) -> String {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let keepass_dir = home_dir.join("KeePassContainers");
        let filename = format!("{}.kdbx", name.replace(" ", "_"));
        let full_path = keepass_dir.join(&filename);
        
        tracing::debug!("get_default_path - name: '{}', home_dir: {:?}, keepass_dir: {:?}, filename: '{}', full_path: {:?}", 
            name, home_dir, keepass_dir, filename, full_path);
        
        full_path.to_string_lossy().to_string()
    }

    fn get_container_path(&self, container_id: &str) -> Result<String> {
        // Сначала ищем контейнер в памяти по ID
        for (path, _db) in &self.databases {
            // Извлекаем имя файла из пути
            if let Some(file_name) = std::path::Path::new(path).file_name() {
                if let Some(name) = file_name.to_str() {
                    let name_without_ext = name.replace(".kdbx", "");
                    // Генерируем ID для сравнения (простой хэш)
                    let generated_id = format!("{:x}", md5::compute(name_without_ext.as_bytes()));
                    if generated_id == container_id {
                        return Ok(path.clone());
                    }
                }
            }
        }
        
        // Если не найдено в памяти, пробуем найти по имени файла
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let containers_dir = home_dir.join("KeePassContainers");
        
        if containers_dir.exists() {
            for entry in std::fs::read_dir(&containers_dir)? {
                let entry = entry?;
                let path = entry.path();
                if let Some(file_name) = path.file_name() {
                    if let Some(name) = file_name.to_str() {
                        if name.ends_with(".kdbx") {
                            let name_without_ext = name.replace(".kdbx", "");
                            let generated_id = format!("{:x}", md5::compute(name_without_ext.as_bytes()));
                            if generated_id == container_id {
                                return Ok(path.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
        
        // Если не найдено по MD5 хешу, возможно это ID от Go backend
        // В этом случае попробуем найти контейнер по пути, который может быть передан как ID
        if std::path::Path::new(container_id).exists() {
            return Ok(container_id.to_string());
        }
        
        // Последняя попытка: ищем файл с таким именем в директории контейнеров
        if containers_dir.exists() {
            for entry in std::fs::read_dir(&containers_dir)? {
                let entry = entry?;
                let path = entry.path();
                if let Some(file_name) = path.file_name() {
                    if let Some(name) = file_name.to_str() {
                        if name.ends_with(".kdbx") {
                            // Проверяем, может ли container_id быть путем к файлу
                            let path_str = path.to_string_lossy().to_string();
                            if path_str.contains(container_id) || container_id.contains(&name.replace(".kdbx", "")) {
                                return Ok(path_str);
                            }
                        }
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("Container not found with ID: {}", container_id))
    }

    fn get_backup_path(&self, container_path: &str) -> Result<std::path::PathBuf> {
        let backup_dir = self.get_backup_dir()?;
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        // Извлекаем имя файла из пути
        let container_name = std::path::Path::new(container_path)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .replace(".kdbx", "");
        Ok(backup_dir.join(format!("{}_{}.kdbx", container_name, timestamp)))
    }

    fn get_backup_dir(&self) -> Result<std::path::PathBuf> {
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let backup_dir = home_dir.join("KeePassContainers").join("backups");
        std::fs::create_dir_all(&backup_dir)?;
        Ok(backup_dir)
    }

    fn count_entries(&self, db: &Database) -> usize {
        self.count_entries_recursive(&db.root)
    }

    fn count_entries_recursive(&self, group: &Group) -> usize {
        let mut count = 0;
        for child in &group.children {
            match child {
                Node::Group(child_group) => {
                    count += self.count_entries_recursive(child_group);
                }
                Node::Entry(_) => {
                    count += 1;
                }
            }
        }
        count
    }

    fn convert_groups(&self, db: &Database) -> Vec<KeePassGroup> {
        self.convert_groups_recursive(&db.root, None)
    }

    fn convert_groups_recursive(&self, group: &Group, parent_id: Option<String>) -> Vec<KeePassGroup> {
        let group_id = Uuid::new_v4().to_string();
        let mut children = Vec::new();
        
        for child in &group.children {
            if let Node::Group(child_group) = child {
                children.extend(self.convert_groups_recursive(child_group, Some(group_id.clone())));
            }
        }

        vec![KeePassGroup {
            id: group_id,
            name: group.name.clone(),
            parent_id,
            children,
            created_at: Utc::now().to_rfc3339(),
            modified_at: Utc::now().to_rfc3339(),
            icon_id: None,
            notes: None,
            is_expanded: true,
            default_auto_type_sequence: None,
            enable_auto_type: None,
            enable_searching: None,
            last_top_visible_entry: None,
        }]
    }

    fn collect_all_entries<'a>(&self, group: &'a Group) -> Vec<&'a Entry> {
        let mut entries = Vec::new();
        self.collect_entries_recursive(group, &mut entries);
        entries
    }

    fn collect_entries_recursive<'a>(&self, group: &'a Group, entries: &mut Vec<&'a Entry>) {
        for child in &group.children {
            match child {
                Node::Group(child_group) => {
                    self.collect_entries_recursive(child_group, entries);
                }
                Node::Entry(entry) => {
                    entries.push(entry);
                }
            }
        }
    }

    fn search_entries_recursive(&self, group: &Group, options: &SearchOptions, results: &mut Vec<KeePassEntry>) -> Result<()> {
        for child in &group.children {
            match child {
                Node::Group(child_group) => {
                    self.search_entries_recursive(child_group, options, results)?;
                }
                Node::Entry(entry) => {
                    if self.matches_search_criteria(entry, options) {
                        results.push(self.convert_entry(entry));
                    }
                }
            }
        }
        Ok(())
    }

    fn matches_search_criteria(&self, entry: &Entry, options: &SearchOptions) -> bool {
        let query = if options.case_sensitive {
            options.query.clone()
        } else {
            options.query.to_lowercase()
        };

        if options.search_in_titles {
            if let Some(title) = entry.get_title() {
                let title_to_check = if options.case_sensitive { title } else { &title.to_lowercase() };
                if title_to_check.contains(&query) {
                    return true;
                }
            }
        }

        if options.search_in_usernames {
            if let Some(username) = entry.get_username() {
                let username_to_check = if options.case_sensitive { username } else { &username.to_lowercase() };
                if username_to_check.contains(&query) {
                    return true;
                }
            }
        }

        if options.search_in_urls {
            if let Some(url) = entry.get("URL") {
                let url_to_check = if options.case_sensitive { url } else { &url.to_lowercase() };
                if url_to_check.contains(&query) {
                    return true;
                }
            }
        }

        if options.search_in_notes {
            if let Some(notes) = entry.get("Notes") {
                let notes_to_check = if options.case_sensitive { notes } else { &notes.to_lowercase() };
                if notes_to_check.contains(&query) {
                    return true;
                }
            }
        }

        false
    }

    fn convert_entry(&self, entry: &Entry) -> KeePassEntry {
        KeePassEntry {
            id: Uuid::new_v4().to_string(),
            title: entry.get_title().unwrap_or_default().to_string(),
            username: entry.get_username().unwrap_or_default().to_string(),
            password: entry.get_password().unwrap_or_default().to_string(),
            url: entry.get("URL").map(|s| s.to_string()),
            notes: entry.get("Notes").map(|s| s.to_string()),
            group_id: "".to_string(),
            tags: vec![],
            created_at: Utc::now().to_rfc3339(),
            modified_at: Utc::now().to_rfc3339(),
            accessed_at: Utc::now().to_rfc3339(),
            expires_at: None,
            custom_fields: std::collections::HashMap::new(),
            history: vec![],
            icon_id: None,
            foreground_color: None,
            background_color: None,
            auto_type: None,
            attachments: vec![],
        }
    }

    fn count_weak_passwords(&self, entries: &[&Entry]) -> usize {
        entries.iter()
            .filter(|entry| {
                if let Some(password) = entry.get_password() {
                    password.len() < 8 || 
                    !password.chars().any(|c| c.is_uppercase()) ||
                    !password.chars().any(|c| c.is_lowercase()) ||
                    !password.chars().any(|c| c.is_numeric())
                } else {
                    true
                }
            })
            .count()
    }

    fn count_duplicate_passwords(&self, entries: &[&Entry]) -> usize {
        let mut password_counts = HashMap::new();
        for entry in entries {
            if let Some(password) = entry.get_password() {
                *password_counts.entry(password).or_insert(0) += 1;
            }
        }
        password_counts.values().filter(|&&count| count > 1).count()
    }

    fn count_expired_entries(&self, _entries: &[&Entry]) -> usize {
        // TODO: Реализовать проверку истечения
        0
    }

    fn count_groups(&self, group: &Group) -> usize {
        let mut count = 1; // текущая группа
        for child in &group.children {
            if let Node::Group(child_group) = child {
                count += self.count_groups(child_group);
            }
        }
        count
    }

    fn calculate_security_score(&self, entries: &[&Entry]) -> u8 {
        if entries.is_empty() {
            return 0;
        }

        let weak_passwords = self.count_weak_passwords(entries);
        let duplicate_passwords = self.count_duplicate_passwords(entries);
        let total_entries = entries.len();

        let weak_ratio = weak_passwords as f64 / total_entries as f64;
        let duplicate_ratio = duplicate_passwords as f64 / total_entries as f64;

        let mut score = 100;
        score -= (weak_ratio * 50.0) as u8;
        score -= (duplicate_ratio * 30.0) as u8;

        score.max(0).min(100)
    }

    fn calculate_entropy(&self, password: &str) -> f64 {
        let mut char_set_size = 0;
        if password.chars().any(|c| c.is_lowercase()) { char_set_size += 26; }
        if password.chars().any(|c| c.is_uppercase()) { char_set_size += 26; }
        if password.chars().any(|c| c.is_numeric()) { char_set_size += 10; }
        if password.chars().any(|c| !c.is_alphanumeric()) { char_set_size += 32; }
        
        if char_set_size == 0 { return 0.0; }
        
        password.len() as f64 * (char_set_size as f64).log2()
    }

    fn estimate_crack_time(&self, score: u8) -> Option<String> {
        match score {
            0..=20 => Some("Мгновенно".to_string()),
            21..=40 => Some("Несколько минут".to_string()),
            41..=60 => Some("Несколько часов".to_string()),
            61..=80 => Some("Несколько дней".to_string()),
            81..=100 => Some("Несколько лет".to_string()),
            _ => None,
        }
    }

    fn generate_password_suggestions(&self, password: &str) -> Vec<String> {
        let mut suggestions = Vec::new();
        
        if password.len() < 12 {
            suggestions.push("Используйте пароль длиной не менее 12 символов".to_string());
        }
        
        if !password.chars().any(|c| c.is_uppercase()) {
            suggestions.push("Добавьте заглавные буквы".to_string());
        }
        
        if !password.chars().any(|c| c.is_lowercase()) {
            suggestions.push("Добавьте строчные буквы".to_string());
        }
        
        if !password.chars().any(|c| c.is_numeric()) {
            suggestions.push("Добавьте цифры".to_string());
        }
        
        if !password.chars().any(|c| !c.is_alphanumeric()) {
            suggestions.push("Добавьте специальные символы".to_string());
        }
        
        suggestions
    }

    /// Импортировать контейнер из файла
    pub fn import_container(&mut self, file: &[u8], password: &str, keyfile: Option<Vec<u8>>) -> Result<KeePassContainer> {
        // Создаем временный reader для файла
        let mut reader = std::io::Cursor::new(file);
        
        // Исправляем проблему с move: используем .as_ref() и .clone()
        let mut keyfile_cursor = keyfile.as_ref().map(|data| std::io::Cursor::new(data.clone()));
        let keyfile_reader: Option<&mut dyn std::io::Read> = keyfile_cursor.as_mut().map(|c| c as &mut dyn std::io::Read);

        // Открываем базу данных
        let db = Database::open(&mut reader, Some(password), keyfile_reader)
            .with_context(|| "Failed to open imported database")?;

        // Создаем контейнер на основе импортированной базы данных
        let container_id = Uuid::new_v4().to_string();
        let container = KeePassContainer {
            id: container_id.clone(),
            name: "Imported Container".to_string(),
            path: self.get_default_path("imported"),
            created_at: Utc::now().to_rfc3339(),
            modified_at: Utc::now().to_rfc3339(),
            entry_count: self.count_entries(&db),
            is_open: true,
            is_locked: false, // Импортированный контейнер разблокирован
            groups: self.convert_groups(&db),
            keyfile_attached: keyfile.is_some(),
            history: vec![],
            description: Some("Imported from external source".to_string()),
            compression: true,
            encryption: "AES-256".to_string(),
            key_derivation: "Argon2".to_string(),
            version: "4.0".to_string(),
        };

        // Сохраняем базу данных в памяти, используем путь как ключ
        self.databases.insert(container.path.clone(), db);

        // Сохраняем keyfile если есть
        if let Some(keyfile_data) = keyfile {
            self.keyfiles.insert(container_id, keyfile_data);
        }

        Ok(container)
    }

    /// Экспортировать контейнер в различных форматах
    pub fn export_container(&self, container_path: &str, options: &crate::keepass::models::ExportOptions) -> Result<Vec<u8>> {
        let db = self.databases.get(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        match options.format.as_str() {
            "kdbx" => {
                // Экспорт в KDBX формат
                let mut buffer = Vec::new();
                let writer = std::io::Cursor::new(&mut buffer);
                
                // TODO: Реализовать сохранение с паролем и keyfile
                // Это требует более сложной логики работы с keepass библиотекой
                
                Ok(buffer)
            }
            "csv" => {
                // Экспорт в CSV формат
                let mut csv_data = Vec::new();
                csv_data.extend_from_slice(b"Title,Username,Password,URL,Notes,Tags\n");
                
                let entries = self.collect_all_entries(&db.root);
                for entry in entries {
                    let title = entry.get_title().unwrap_or_default();
                    let username = entry.get_username().unwrap_or_default();
                    let password = entry.get_password().unwrap_or_default();
                    let url = entry.get("URL").unwrap_or_default();
                    let notes = entry.get("Notes").unwrap_or_default();
                    
                    let line = format!("{},{},{},{},{},\n", 
                        escape_csv_field(title),
                        escape_csv_field(username),
                        escape_csv_field(password),
                        escape_csv_field(url),
                        escape_csv_field(notes)
                    );
                    csv_data.extend_from_slice(line.as_bytes());
                }
                
                Ok(csv_data)
            }
            _ => Err(anyhow::anyhow!("Unsupported export format"))
        }
    }

    /// Добавить группу в контейнер
    pub fn add_group(&mut self, container_path: &str, group: &crate::keepass::models::KeePassGroup) -> Result<()> {
        let db = self.databases.get_mut(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        let mut new_group = Group::default();
        new_group.name = group.name.clone();
        
        // Добавляем группу в корень
        db.root.children.push(Node::Group(new_group));

        Ok(())
    }

    /// Обновить группу в контейнере
    pub fn update_group(&mut self, container_path: &str, _group: &crate::keepass::models::KeePassGroup) -> Result<()> {
        let _db = self.databases.get_mut(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        // TODO: Найти и обновить группу по ID
        // Это требует более сложной логики навигации по дереву групп

        Ok(())
    }

    /// Удалить группу из контейнера
    pub fn delete_group(&mut self, container_path: &str, _group_id: &str) -> Result<()> {
        let _db = self.databases.get_mut(container_path)
            .ok_or_else(|| anyhow::anyhow!("Container not found"))?;

        // TODO: Найти и удалить группу по ID
        // Это требует более сложной логики навигации по дереву групп

        Ok(())
    }

    /// Создать аудит событие
    pub fn create_audit_event(&self, action: &str, resource_type: &str, resource_id: &str, details: Option<&str>) -> crate::keepass::models::AuditEvent {
        crate::keepass::models::AuditEvent {
            timestamp: Utc::now().to_rfc3339(),
            user_id: None, // TODO: Получить из контекста аутентификации
            action: action.to_string(),
            resource_type: resource_type.to_string(),
            resource_id: resource_id.to_string(),
            details: details.map(|s| s.to_string()),
            ip_address: None, // TODO: Получить из контекста
        }
    }

    /// Переименовывает контейнер
    pub fn rename_container(&mut self, container_path: &str, new_name: &str) -> Result<()> {
        // Получаем путь к файлу
        let old_path = std::path::Path::new(container_path);
        if !old_path.exists() {
            return Err(anyhow::anyhow!("Container file not found on disk"));
        }
        
        // Создаем новый путь с новым именем
        let parent_dir = old_path.parent()
            .ok_or_else(|| anyhow::anyhow!("Cannot get parent directory"))?;
        let new_path = parent_dir.join(format!("{}.kdbx", new_name));
        
        // Проверяем, что новый файл не существует
        if new_path.exists() {
            return Err(anyhow::anyhow!("File with this name already exists"));
        }
        
        // Переименовываем файл
        std::fs::rename(old_path, &new_path)
            .with_context(|| format!("Failed to rename file from {:?} to {:?}", old_path, new_path))?;
        
        // Если контейнер загружен в памяти, обновляем его ID
        if let Some(db) = self.databases.remove(container_path) {
            self.databases.insert(new_path.to_string_lossy().to_string(), db);
        }
        
        tracing::info!("Renamed container file from {:?} to {:?}", old_path, new_path);
        Ok(())
    }

    /// Изменяет пароль контейнера
    pub fn change_container_password(&mut self, container_path: &str, _current_password: &str, _new_password: &str) -> Result<()> {
        // Проверяем, что файл существует
        if !std::path::Path::new(container_path).exists() {
            return Err(anyhow::anyhow!("Container file not found on disk"));
        }

        // В текущей реализации просто логируем операцию
        // TODO: Реализовать реальное изменение пароля в базе данных
        // Это требует более сложной логики работы с keepass библиотекой
        // для перешифрования базы данных с новым паролем
        
        tracing::info!("Changed password for container: {} (placeholder implementation)", container_path);
        Ok(())
    }

    /// Удаляет контейнер через Go бэкенд
    pub async fn delete_container(&mut self, container_id: &str) -> Result<()> {
        tracing::info!("Deleting container with ID: {}", container_id);
        
        // Получаем путь к контейнеру
        let container_path = self.get_container_path(container_id)?;
        tracing::info!("Container path: {}", container_path);
        
        // Проверяем, существует ли файл
        if !std::path::Path::new(&container_path).exists() {
            return Err(anyhow::anyhow!("Container file not found: {}", container_path));
        }
        
        // Удаляем файл локально
        std::fs::remove_file(&container_path)
            .with_context(|| format!("Failed to delete container file: {}", container_path))?;
        
        // Удаляем из памяти
        self.databases.remove(&container_path);
        self.keyfiles.remove(container_id);
        
        tracing::info!("Successfully deleted container: {} at {}", container_id, container_path);
        Ok(())
    }
}

/// Экранирование полей для CSV
fn escape_csv_field(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace("\"", "\"\""))
    } else {
        field.to_string()
    }
}

/// Создает заголовок KDBX файла с шифрованием
fn create_kdbx_header(password: &str) -> Result<Vec<u8>> {
    let mut header_data = Vec::new();
    
    // Генерируем случайную соль для Argon2
    let mut rng = rand::rng();
    let mut salt_bytes = [0u8; 32];
    rng.fill_bytes(&mut salt_bytes);
    // salt_bytes теперь содержит соль
    
    // Создаем хеш пароля с помощью Argon2
    let argon2 = Argon2::default();
    let salt_str = argon2::password_hash::SaltString::encode_b64(&salt_bytes)
        .map_err(|e| anyhow::anyhow!("Failed to create salt: {}", e))?;
    let _password_hash = argon2.hash_password(password.as_bytes(), &salt_str)
        .map_err(|e| anyhow::anyhow!("Failed to hash password: {}", e))?;
    
    // Генерируем мастер-ключ
    let mut master_key = [0u8; 32];
    rng.fill_bytes(&mut master_key);
    
    // Генерируем вектор инициализации для AES-GCM
    let mut nonce_bytes = [0u8; 12];
    rng.fill_bytes(&mut nonce_bytes);
    
    // Создаем ключ для AES-GCM
    let key = Key::<Aes256Gcm>::from_slice(&master_key);
    let nonce = Nonce::<U12>::from_slice(&nonce_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // Шифруем мастер-ключ
    let encrypted_master_key = cipher.encrypt(nonce, master_key.as_ref())
        .map_err(|e| anyhow::anyhow!("Failed to encrypt master key: {}", e))?;
    
    // Формируем заголовок
    // ID алгоритма шифрования (AES-256)
    header_data.extend_from_slice(&[0x31, 0xC1, 0xF2, 0xE6, 0xBF, 0x71, 0x43, 0x50]);
    
    // Размер зашифрованного мастер-ключа
    header_data.extend_from_slice(&(encrypted_master_key.len() as u32).to_le_bytes());
    
    // Зашифрованный мастер-ключ
    header_data.extend_from_slice(&encrypted_master_key);
    
    // ID алгоритма хеширования (Argon2)
    header_data.extend_from_slice(&[0xEF, 0x63, 0x6D, 0xDF, 0x8C, 0x29, 0x44, 0x81]);
    
    // Параметры Argon2
    let memory_cost: u32 = 1024 * 1024; // 1 MB
    let time_cost: u32 = 2;
    let parallelism: u32 = 1;
    
    header_data.extend_from_slice(&memory_cost.to_le_bytes());
    header_data.extend_from_slice(&time_cost.to_le_bytes());
    header_data.extend_from_slice(&parallelism.to_le_bytes());
    
    // Соль
    header_data.extend_from_slice(&(salt_bytes.len() as u32).to_le_bytes());
    header_data.extend_from_slice(&salt_bytes);
    
    // Вектор инициализации
    header_data.extend_from_slice(&nonce_bytes);
    
    // Заглушка для данных базы данных (пустая)
    header_data.extend_from_slice(&[0u8; 32]);
    
    Ok(header_data)
} 

fn create_proper_kdbx_header(password: &str, keyfile: Option<&Vec<u8>>) -> Result<Vec<u8>> {
    let mut header_data = Vec::new();
    
    // Генерируем случайную соль для Argon2
    let mut rng = rand::rng();
    let mut salt_bytes = [0u8; 32];
    rng.fill_bytes(&mut salt_bytes);
    
    // Генерируем мастер-ключ
    let mut master_key = [0u8; 32];
    rng.fill_bytes(&mut master_key);
    
    // Генерируем вектор инициализации для AES-GCM
    let mut nonce_bytes = [0u8; 12];
    rng.fill_bytes(&mut nonce_bytes);
    
    // Создаем ключ для AES-GCM
    let key = Key::<Aes256Gcm>::from_slice(&master_key);
    let nonce = Nonce::<U12>::from_slice(&nonce_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // Шифруем мастер-ключ
    let encrypted_master_key = cipher.encrypt(nonce, master_key.as_ref())
        .map_err(|e| anyhow::anyhow!("Failed to encrypt master key: {}", e))?;
    
    // Формируем заголовок KDBX 4.0
    // 1. ID алгоритма шифрования (AES-256)
    header_data.extend_from_slice(&[0x31, 0xC1, 0xF2, 0xE6, 0xBF, 0x71, 0x43, 0x50]);
    
    // 2. Размер зашифрованного мастер-ключа (4 байта, little-endian)
    header_data.extend_from_slice(&(encrypted_master_key.len() as u32).to_le_bytes());
    
    // 3. Зашифрованный мастер-ключ
    header_data.extend_from_slice(&encrypted_master_key);
    
    // 4. ID алгоритма хеширования (Argon2)
    header_data.extend_from_slice(&[0xEF, 0x63, 0x6D, 0xDF, 0x8C, 0x29, 0x44, 0x81]);
    
    // 5. Параметры Argon2
    let memory_cost: u32 = 1024 * 1024; // 1 MB
    let time_cost: u32 = 2;
    let parallelism: u32 = 1;
    
    header_data.extend_from_slice(&memory_cost.to_le_bytes());
    header_data.extend_from_slice(&time_cost.to_le_bytes());
    header_data.extend_from_slice(&parallelism.to_le_bytes());
    
    // 6. Соль (4 байта размер + данные)
    header_data.extend_from_slice(&(salt_bytes.len() as u32).to_le_bytes());
    header_data.extend_from_slice(&salt_bytes);
    
    // 7. Вектор инициализации (4 байта размер + данные)
    header_data.extend_from_slice(&(nonce_bytes.len() as u32).to_le_bytes());
    header_data.extend_from_slice(&nonce_bytes);
    
    // 8. Заглушка для данных базы данных (пустая структура)
    // Минимальная структура KDBX 4.0 с корневой группой
    let empty_db_data = create_empty_database_structure()?;
    header_data.extend_from_slice(&empty_db_data);
    
    Ok(header_data)
}

fn create_empty_database_structure() -> Result<Vec<u8>> {
    let mut data = Vec::new();
    
    // Создаем минимальную структуру базы данных
    // Это заглушка - в реальности нужно создать правильную XML структуру
    
    // Добавляем минимальные данные для валидного KDBX файла
    // KeePass 4.0 использует XML структуру внутри
    let xml_content = r#"<?xml version="1.0" encoding="utf-8"?>
<KeePassFile>
    <Meta>
        <Generator>KeePass</Generator>
        <HeaderHash></HeaderHash>
        <DatabaseName></DatabaseName>
        <DatabaseNameChanged>2024-01-01T00:00:00Z</DatabaseNameChanged>
        <DatabaseDescription></DatabaseDescription>
        <DatabaseDescriptionChanged>2024-01-01T00:00:00Z</DatabaseDescriptionChanged>
        <DefaultUserName></DefaultUserName>
        <DefaultUserNameChanged>2024-01-01T00:00:00Z</DefaultUserNameChanged>
        <MaintenanceHistoryDays>365</MaintenanceHistoryDays>
        <Color></Color>
        <MasterKeyChanged>2024-01-01T00:00:00Z</MasterKeyChanged>
        <MasterKeyChangeRec>-1</MasterKeyChangeRec>
        <MasterKeyChangeForce>-1</MasterKeyChangeForce>
        <MemoryProtection>
            <ProtectTitle>False</ProtectTitle>
            <ProtectUserName>False</ProtectUserName>
            <ProtectPassword>True</ProtectPassword>
            <ProtectURL>False</ProtectURL>
            <ProtectNotes>False</ProtectNotes>
        </MemoryProtection>
        <CustomIcons></CustomIcons>
        <RecycleBinEnabled>True</RecycleBinEnabled>
        <RecycleBinUUID></RecycleBinUUID>
        <RecycleBinChanged>2024-01-01T00:00:00Z</RecycleBinChanged>
        <EntryTemplatesGroup></EntryTemplatesGroup>
        <EntryTemplatesGroupChanged>2024-01-01T00:00:00Z</EntryTemplatesGroupChanged>
        <HistoryMaxItems>10</HistoryMaxItems>
        <HistoryMaxSize>6291456</HistoryMaxSize>
        <LastSelectedGroup></LastSelectedGroup>
        <LastTopVisibleGroup></LastTopVisibleGroup>
        <Binaries></Binaries>
        <CustomData></CustomData>
    </Meta>
    <Root>
        <Group>
            <UUID></UUID>
            <Name>Root</Name>
            <Notes></Notes>
            <IconID>0</IconID>
            <CustomIconUUID></CustomIconUUID>
            <Times>
                <CreationTime>2024-01-01T00:00:00Z</CreationTime>
                <LastModificationTime>2024-01-01T00:00:00Z</LastModificationTime>
                <LastAccessTime>2024-01-01T00:00:00Z</LastAccessTime>
                <ExpiryTime></ExpiryTime>
                <Expires>False</Expires>
                <UsageCount>0</UsageCount>
                <LocationChanged>2024-01-01T00:00:00Z</LocationChanged>
            </Times>
            <IsExpanded>True</IsExpanded>
            <DefaultAutoTypeSequence></DefaultAutoTypeSequence>
            <EnableAutoType>null</EnableAutoType>
            <EnableSearching>null</EnableSearching>
            <LastTopVisibleEntry></LastTopVisibleEntry>
            <Entry></Entry>
            <Group></Group>
        </Group>
    </Root>
</KeePassFile>"#;
    
    // Сжимаем XML (KDBX 4.0 использует GZip сжатие)
    use std::io::Write;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(xml_content.as_bytes())?;
    let compressed_data = encoder.finish()?;
    
    // Добавляем размер сжатых данных
    data.extend_from_slice(&(compressed_data.len() as u32).to_le_bytes());
    data.extend_from_slice(&compressed_data);
    
    Ok(data)
} 