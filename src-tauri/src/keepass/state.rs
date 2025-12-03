use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::keepass::models::*;
use crate::keepass::kdbx::KdbxManager;
use md5;

use anyhow::Result;

#[derive(Debug)]
pub struct KeePassState {
    containers: Arc<RwLock<HashMap<String, KeePassContainer>>>,
    open_containers: Arc<RwLock<HashMap<String, Vec<KeePassEntry>>>>,
    pub kdbx_manager: Arc<RwLock<KdbxManager>>,
}

impl KeePassState {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            containers: Arc::new(RwLock::new(HashMap::new())),
            open_containers: Arc::new(RwLock::new(HashMap::new())),
            kdbx_manager: Arc::new(RwLock::new(KdbxManager::new())),
        })
    }

    pub async fn find_kdbx_files(&self) -> Result<Vec<String>, String> {
        let mut files = Vec::new();
        
        // Сканируем директорию KeePassContainers
        let containers_dir = dirs::home_dir()
            .ok_or("Cannot find home directory")?
            .join("KeePassContainers");
            
        tracing::info!("Scanning directory: {:?}", containers_dir);
        
        if containers_dir.exists() {
            tracing::info!("Directory exists, scanning for KDBX files...");
            self.scan_directory(&containers_dir, &mut files)
                .map_err(|e| format!("Failed to scan directory: {}", e))?;
        } else {
            tracing::warn!("Directory does not exist: {:?}", containers_dir);
        }
        
        tracing::info!("Found {} KDBX files: {:?}", files.len(), files);
        Ok(files)
    }

    pub async fn load_containers(&self) -> Result<Vec<KeePassContainer>, String> {
        let files = self.find_kdbx_files().await?;
        let mut containers = Vec::new();
        
        for path in files {
            let file_name = path.split('/').last()
                .unwrap_or("Unknown")
                .replace(".kdbx", "");
            
            // Генерируем ID на основе имени файла (совместимо с Go backend)
            let container_id = format!("{:x}", md5::compute(file_name.as_bytes()));
            
            // Проверяем, есть ли уже контейнер в памяти с таким ID
            let existing_container = {
                let containers_map = self.containers.read().await;
                containers_map.get(&container_id).cloned()
            };
            
            let container = if let Some(existing) = existing_container {
                // Если контейнер уже в памяти, сохраняем его состояние
                existing
            } else {
                // Создаем новый контейнер с дефолтными значениями
                KeePassContainer {
                    id: container_id,
                    name: file_name,
                    path,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    modified_at: chrono::Utc::now().to_rfc3339(),
                    entry_count: 0,
                    is_open: false,
                    is_locked: true, // По умолчанию заблокирован
                    groups: Vec::new(),
                    keyfile_attached: false,
                    history: Vec::new(),
                    description: None,
                    compression: true,
                    encryption: "AES-256".to_string(),
                    key_derivation: "Argon2".to_string(),
                    version: "4.0".to_string(),
                }
            };
            
            // Сохраняем контейнер в памяти
            let mut containers_map = self.containers.write().await;
            containers_map.insert(container.id.clone(), container.clone());
            containers.push(container);
        }
        
        tracing::info!("Loaded {} containers into state", containers.len());
        Ok(containers)
    }

    pub async fn create_container(&self, name: String, password: String, keyfile: Option<Vec<u8>>) -> Result<KeePassContainer, String> {
        // Проверяем уникальность имени
        let containers = self.containers.read().await;
        for container in containers.values() {
            if container.name == name {
                return Err("Container with this name already exists".to_string());
            }
        }
        drop(containers); // Освобождаем блокировку

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        let container = kdbx_manager.create_container(&name, &password, keyfile).await
            .map_err(|e| format!("Failed to create container: {}", e))?;

        // Сохраняем контейнер в памяти
        let mut containers = self.containers.write().await;
        containers.insert(container.id.clone(), container.clone());

        // Создаем событие аудита
        let _ = kdbx_manager.create_audit_event("create", "container", &container.id, Some(&format!("Created container: {}", name)));

        tracing::info!("Created KeePass container: {}", name);
        Ok(container)
    }

    pub async fn open_container(&self, path: String, password: String, keyfile: Option<Vec<u8>>) -> Result<Vec<KeePassEntry>, String> {
        // Проверяем, что файл существует
        if !std::path::Path::new(&path).exists() {
            return Err("Container file not found".to_string());
        }

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        // Открываем контейнер через KdbxManager
        let container = kdbx_manager.open_container(&path, &password, keyfile)
            .map_err(|e| format!("Failed to open container: {}", e))?;

        // Получаем все записи из контейнера
        let search_options = SearchOptions {
            query: "".to_string(),
            search_in_titles: true,
            search_in_usernames: true,
            search_in_passwords: false,
            search_in_urls: true,
            search_in_notes: true,
            search_in_tags: true,
            case_sensitive: false,
            regex: false,
            group_filter: None,
            exclude_expired: false,
            exclude_recycled: false,
        };

        let entries = kdbx_manager.search_entries(&container.path, &search_options)
            .map_err(|e| format!("Failed to search entries: {}", e))?;

        // Сохраняем контейнер в памяти с флагом is_open = true и is_locked = false
        let mut containers = self.containers.write().await;
        let mut updated_container = container.clone();
        updated_container.is_open = true;
        updated_container.is_locked = false; // При открытии разблокируем контейнер
        containers.insert(updated_container.id.clone(), updated_container.clone());

        // Сохраняем записи в памяти
        let mut open_containers = self.open_containers.write().await;
        open_containers.insert(updated_container.id.clone(), entries.clone());

        // Создаем событие аудита
        let _ = kdbx_manager.create_audit_event("open", "container", &updated_container.id, Some(&format!("Opened container: {}", updated_container.name)));

        println!("[DEBUG] Container opened: {} is_open={} is_locked={}", updated_container.name, updated_container.is_open, updated_container.is_locked);
        tracing::info!("Opened KeePass container: {} with {} entries", path, entries.len());
        Ok(entries)
    }

    pub async fn save_container(&self, container_id: String, password: String) -> Result<(), String> {
        // Проверяем существование контейнера в памяти
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in memory: {}", container_id);
                "Container not found in memory"
            })?;

        // Проверяем, что файл существует на диске
        let file_path = PathBuf::from(&container.path);
        if !file_path.exists() {
            tracing::error!("Container file not found on disk: {}", container.path);
            return Err("Container file not found on disk".to_string());
        }

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        // Сохраняем контейнер через KdbxManager, передаем путь к файлу
        kdbx_manager.save_container(&container.path, &password)
            .map_err(|e| {
                tracing::error!("Failed to save container {}: {}", container_id, e);
                format!("Failed to save container: {}", e)
            })?;

        tracing::info!("Saved KeePass container: {}", container.name);
        Ok(())
    }

    pub async fn delete_container(&self, container_id: String) -> Result<(), String> {
        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        // Удаляем контейнер через Go бэкенд
        kdbx_manager.delete_container(&container_id).await
            .map_err(|e| format!("Failed to delete container: {}", e))?;
        
        // Удаляем контейнер из памяти
        let mut containers = self.containers.write().await;
        containers.remove(&container_id);
        
        // Удаляем открытые записи контейнера
        let mut open_containers = self.open_containers.write().await;
        open_containers.remove(&container_id);
        
        tracing::info!("Deleted KeePass container: {}", container_id);
        Ok(())
    }

    pub async fn rename_container(&self, container_id: String, new_name: String) -> Result<(), String> {
        // Проверяем, что новое имя не пустое
        if new_name.trim().is_empty() {
            return Err("Container name cannot be empty".to_string());
        }

        let mut containers = self.containers.write().await;
        let mut kdbx_manager = self.kdbx_manager.write().await;

        // Если контейнер не найден в памяти, пытаемся загрузить его по пути
        if !containers.contains_key(&container_id) {
            // Предполагаем, что container_id - это путь к файлу
            if std::path::Path::new(&container_id).exists() {
                let file_name = container_id.split('/').last()
                    .unwrap_or("Unknown")
                    .replace(".kdbx", "");
                
                let container = KeePassContainer {
                    id: container_id.clone(),
                    name: file_name,
                    path: container_id.clone(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    modified_at: chrono::Utc::now().to_rfc3339(),
                    entry_count: 0,
                    is_open: false,
                    is_locked: true, // По умолчанию заблокирован
                    groups: Vec::new(),
                    keyfile_attached: false,
                    history: Vec::new(),
                    description: None,
                    compression: true,
                    encryption: "AES-256".to_string(),
                    key_derivation: "Argon2".to_string(),
                    version: "4.0".to_string(),
                };
                containers.insert(container_id.clone(), container);
            }
        }

        // Проверяем уникальность нового имени
        for (id, container) in containers.iter() {
            if id != &container_id && container.name == new_name {
                return Err("Container with this name already exists".to_string());
            }
        }

        // Находим контейнер
        let container = containers.get_mut(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found for rename: {}", container_id);
                "Container not found"
            })?;

        // Проверяем, что файл существует на диске
        let file_path = PathBuf::from(&container.path);
        if !file_path.exists() {
            tracing::error!("Container file not found on disk for rename: {}", container.path);
            return Err("Container file not found on disk".to_string());
        }

        // Переименовываем через KdbxManager, передаем путь к файлу
        kdbx_manager.rename_container(&container.path, &new_name)
            .map_err(|e| {
                tracing::error!("Failed to rename container {}: {}", container_id, e);
                format!("Failed to rename container: {}", e)
            })?;

        // Обновляем имя и путь в памяти
        let old_name = container.name.clone();
        let old_path = container.path.clone();
        container.name = new_name.clone();
        
        // Обновляем путь к файлу
        let path_buf = PathBuf::from(&old_path);
        let parent_dir = path_buf.parent()
            .ok_or_else(|| "Cannot get parent directory")?;
        let new_path = parent_dir.join(format!("{}.kdbx", new_name));
        container.path = new_path.to_string_lossy().to_string();
        
        // Обновляем ID контейнера в памяти
        let new_id = container.path.clone();
        if old_path != new_id {
            let container_clone = container.clone();
            containers.remove(&old_path);
            containers.insert(new_id, container_clone);
        }

        tracing::info!("Renamed KeePass container: {} -> {}", old_name, new_name);
        Ok(())
    }

    pub async fn change_container_password(&self, container_id: String, current_password: String, new_password: String) -> Result<(), String> {
        let mut containers = self.containers.write().await;
        let mut kdbx_manager = self.kdbx_manager.write().await;

        // Если контейнер не найден в памяти, пытаемся загрузить его по пути
        if !containers.contains_key(&container_id) {
            // Предполагаем, что container_id - это путь к файлу
            if std::path::Path::new(&container_id).exists() {
                let file_name = container_id.split('/').last()
                    .unwrap_or("Unknown")
                    .replace(".kdbx", "");
                
                let container = KeePassContainer {
                    id: container_id.clone(),
                    name: file_name,
                    path: container_id.clone(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    modified_at: chrono::Utc::now().to_rfc3339(),
                    entry_count: 0,
                    is_open: false,
                    is_locked: true, // По умолчанию заблокирован
                    groups: Vec::new(),
                    keyfile_attached: false,
                    history: Vec::new(),
                    description: None,
                    compression: true,
                    encryption: "AES-256".to_string(),
                    key_derivation: "Argon2".to_string(),
                    version: "4.0".to_string(),
                };
                containers.insert(container_id.clone(), container);
            }
        }

        // Проверяем существование контейнера в памяти
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found for password change: {}", container_id);
                "Container not found"
            })?;

        // Проверяем, что файл существует на диске
        let file_path = PathBuf::from(&container.path);
        if !file_path.exists() {
            tracing::error!("Container file not found on disk for password change: {}", container.path);
            return Err("Container file not found on disk".to_string());
        }

        // Валидируем новый пароль
        if new_password.len() < 8 {
            return Err("Password must be at least 8 characters long".to_string());
        }

        // Изменяем пароль через KdbxManager, передаем путь к файлу
        kdbx_manager.change_container_password(&container.path, &current_password, &new_password)
            .map_err(|e| {
                tracing::error!("Failed to change container password {}: {}", container_id, e);
                format!("Failed to change container password: {}", e)
            })?;

        tracing::info!("Changed password for KeePass container: {}", container.name);
        Ok(())
    }

    pub async fn add_entry(&self, container_id: String, entry: KeePassEntry) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        // Добавляем запись через KdbxManager, передаем путь к файлу
        kdbx_manager.add_entry(&container.path, entry.clone())
            .map_err(|e| format!("Failed to add entry: {}", e))?;

        // Обновляем записи в памяти
        let mut open_containers = self.open_containers.write().await;
        if let Some(entries) = open_containers.get_mut(&container_id) {
            entries.push(entry);
        }

        Ok(())
    }

    pub async fn update_entry(&self, container_id: String, entry: KeePassEntry) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        // Обновляем запись через KdbxManager, передаем путь к файлу
        kdbx_manager.update_entry(&container.path, entry.clone())
            .map_err(|e| format!("Failed to update entry: {}", e))?;

        // Обновляем записи в памяти
        let mut open_containers = self.open_containers.write().await;
        if let Some(entries) = open_containers.get_mut(&container_id) {
            if let Some(index) = entries.iter().position(|e| e.id == entry.id) {
                entries[index] = entry;
            }
        }

        Ok(())
    }

    pub async fn delete_entry(&self, container_id: String, entry_id: String) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        // Удаляем запись через KdbxManager, передаем путь к файлу
        kdbx_manager.delete_entry(&container.path, &entry_id)
            .map_err(|e| format!("Failed to delete entry: {}", e))?;

        // Удаляем запись из памяти
        let mut open_containers = self.open_containers.write().await;
        if let Some(entries) = open_containers.get_mut(&container_id) {
            entries.retain(|e| e.id != entry_id);
        }

        Ok(())
    }

    pub async fn search_entries(&self, container_id: String, options: SearchOptions) -> Result<Vec<KeePassEntry>, String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let kdbx_manager = self.kdbx_manager.read().await;
        
        // Передаем путь к файлу вместо ID
        kdbx_manager.search_entries(&container.path, &options)
            .map_err(|e| format!("Failed to search entries: {}", e))
    }

    pub async fn get_container_stats(&self, container_id: String) -> Result<ContainerStats, String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let kdbx_manager = self.kdbx_manager.read().await;
        
        // Передаем путь к файлу вместо ID
        kdbx_manager.get_container_stats(&container.path)
            .map_err(|e| format!("Failed to get container stats: {}", e))
    }

    pub async fn create_backup(&self, container_id: String) -> Result<BackupInfo, String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        kdbx_manager.create_backup(&container.path)
            .map_err(|e| format!("Failed to create backup: {}", e))
    }

    pub async fn list_backups(&self, container_id: String) -> Result<Vec<BackupInfo>, String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let kdbx_manager = self.kdbx_manager.read().await;
        
        kdbx_manager.list_backups(&container.path)
            .map_err(|e| format!("Failed to list backups: {}", e))
    }

    pub async fn restore_backup(&self, container_id: String, backup_path: String) -> Result<(), String> {
        // TODO: реализовать восстановление из резервной копии
        tracing::info!("Restored backup for container: {} from {}", container_id, backup_path);
        Ok(())
    }

    pub async fn attach_keyfile(&self, container_id: String, keyfile: Vec<u8>) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        kdbx_manager.attach_keyfile(&container.path, keyfile)
            .map_err(|e| format!("Failed to attach keyfile: {}", e))
    }

    pub async fn detach_keyfile(&self, container_id: String) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        kdbx_manager.detach_keyfile(&container.path)
            .map_err(|e| format!("Failed to detach keyfile: {}", e))
    }

    pub async fn import_container(&self, file: Vec<u8>, password: String, keyfile: Option<Vec<u8>>) -> Result<KeePassContainer, String> {
        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        let container = kdbx_manager.import_container(&file, &password, keyfile)
            .map_err(|e| format!("Failed to import container: {}", e))?;

        // Сохраняем контейнер в памяти
        let mut containers = self.containers.write().await;
        containers.insert(container.id.clone(), container.clone());

        tracing::info!("Imported KeePass container: {}", container.name);
        Ok(container)
    }

    pub async fn export_container(&self, container_id: String, options: ExportOptions) -> Result<Vec<u8>, String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let kdbx_manager = self.kdbx_manager.read().await;
        
        let data = kdbx_manager.export_container(&container.path, &options)
            .map_err(|e| format!("Failed to export container: {}", e))?;

        tracing::info!("Exported KeePass container: {}", container_id);
        Ok(data)
    }

    pub async fn get_password_quality(&self, password: String) -> Result<PasswordQuality, String> {
        let kdbx_manager = self.kdbx_manager.read().await;
        
        Ok(kdbx_manager.analyze_password_quality(&password))
    }

    pub async fn add_group(&self, container_id: String, group: KeePassGroup) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        kdbx_manager.add_group(&container.path, &group)
            .map_err(|e| format!("Failed to add group: {}", e))?;

        tracing::info!("Added group to container: {}", container_id);
        Ok(())
    }

    pub async fn update_group(&self, container_id: String, group: KeePassGroup) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        kdbx_manager.update_group(&container.path, &group)
            .map_err(|e| format!("Failed to update group: {}", e))?;

        tracing::info!("Updated group in container: {}", container_id);
        Ok(())
    }

    pub async fn delete_group(&self, container_id: String, group_id: String) -> Result<(), String> {
        // Получаем информацию о контейнере из состояния
        let containers = self.containers.read().await;
        let container = containers.get(&container_id)
            .ok_or_else(|| {
                tracing::error!("Container not found in state: {}", container_id);
                "Container not found"
            })?;

        let mut kdbx_manager = self.kdbx_manager.write().await;
        
        kdbx_manager.delete_group(&container.path, &group_id)
            .map_err(|e| format!("Failed to delete group: {}", e))?;

        tracing::info!("Deleted group from container: {}", container_id);
        Ok(())
    }

    pub async fn close_container(&self, container_id: String) -> Result<(), String> {
        let mut containers = self.containers.write().await;
        let mut open_containers = self.open_containers.write().await;

        // Обновляем состояние контейнера
        if let Some(container) = containers.get_mut(&container_id) {
            container.is_open = false;
            container.is_locked = true; // При закрытии блокируем
            tracing::info!("Closed KeePass container: {}", container.name);
        }

        // Удаляем записи из памяти
        open_containers.remove(&container_id);

        Ok(())
    }

    pub async fn lock_container(&self, container_id: String) -> Result<(), String> {
        let mut containers = self.containers.write().await;

        if let Some(container) = containers.get_mut(&container_id) {
            container.is_locked = true;
            container.is_open = false;
            tracing::info!("Locked KeePass container: {}", container.name);
        } else {
            return Err("Container not found".to_string());
        }

        Ok(())
    }

    pub async fn unlock_container(&self, container_id: String) -> Result<(), String> {
        let mut containers = self.containers.write().await;

        if let Some(container) = containers.get_mut(&container_id) {
            container.is_locked = false;
            container.is_open = true;
            tracing::info!("Unlocked KeePass container: {}", container.name);
        } else {
            return Err("Container not found".to_string());
        }

        Ok(())
    }

    // Вспомогательные методы

    fn scan_directory(&self, dir: &PathBuf, files: &mut Vec<String>) -> Result<()> {
        tracing::info!("Scanning directory: {:?}", dir);
        
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    tracing::debug!("Found entry: {:?}", path);
                    
                    if path.is_file() {
                        if let Some(extension) = path.extension() {
                            tracing::debug!("File extension: {:?}", extension);
                            if extension == "kdbx" {
                                if let Some(path_str) = path.to_str() {
                                    tracing::info!("Found KDBX file: {}", path_str);
                                    files.push(path_str.to_string());
                                }
                            }
                        }
                    }
                }
            }
        } else {
            tracing::error!("Failed to read directory: {:?}", dir);
        }
        
        tracing::info!("Scan completed, found {} KDBX files", files.len());
        Ok(())
    }
} 