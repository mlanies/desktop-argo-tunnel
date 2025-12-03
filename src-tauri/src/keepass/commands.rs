use tauri::{AppHandle, Manager};
use crate::keepass::{models::*, state::KeePassState};

/// Найти .kdbx файлы в директории
#[tauri::command]
pub async fn find_kdbx_files(app: AppHandle) -> Result<Vec<String>, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.find_kdbx_files().await
}

/// Загрузить контейнеры в backend state
#[tauri::command]
pub async fn load_containers(app: AppHandle) -> Result<Vec<KeePassContainer>, String> {
    let keepass_state = app.state::<KeePassState>();
    let containers = keepass_state.load_containers().await?;
    
    // Добавляем логирование для отслеживания статуса блокировки
    for container in &containers {
        println!("[DEBUG] Loading container {}, is_locked: {:?}", container.name, container.is_locked);
    }
    
    Ok(containers)
}

/// Создать новый KeePass контейнер
#[tauri::command]
pub async fn create_container(
    app: AppHandle, 
    name: String, 
    password: String, 
    keyfile: Option<Vec<u8>>
) -> Result<KeePassContainer, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.create_container(name, password, keyfile).await
}

/// Открыть KeePass контейнер
#[tauri::command]
pub async fn open_container(
    app: AppHandle, 
    path: String, 
    password: String, 
    keyfile: Option<Vec<u8>>
) -> Result<Vec<KeePassEntry>, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.open_container(path, password, keyfile).await
}

/// Сохранить KeePass контейнер
#[tauri::command]
pub async fn save_container(
    app: AppHandle, 
    container_id: String, 
    password: String
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.save_container(container_id, password).await
}

/// Удаляет контейнер
#[tauri::command]
pub async fn delete_container(
    app: AppHandle,
    container_id: String
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.delete_container(container_id).await
}

/// Переименовать KeePass контейнер
#[tauri::command]
pub async fn rename_container(app: AppHandle, container_id: String, new_name: String) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.rename_container(container_id, new_name).await
}

/// Изменить пароль KeePass контейнера
#[tauri::command]
pub async fn change_container_password(app: AppHandle, container_id: String, current_password: String, new_password: String) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.change_container_password(container_id, current_password, new_password).await
}

/// Добавить запись в контейнер
#[tauri::command]
pub async fn add_entry(
    app: AppHandle, 
    container_id: String, 
    entry: KeePassEntry
) -> Result<(), String> {
    println!("[DEBUG] Creating entry: {:?}", entry);
    let keepass_state = app.state::<KeePassState>();
    keepass_state.add_entry(container_id, entry).await
}

/// Обновить запись в контейнере
#[tauri::command]
pub async fn update_entry(
    app: AppHandle, 
    container_id: String, 
    entry: KeePassEntry
) -> Result<(), String> {
    println!("[DEBUG] Updating entry: {:?}", entry);
    let keepass_state = app.state::<KeePassState>();
    keepass_state.update_entry(container_id, entry).await
}

/// Удалить запись из контейнера
#[tauri::command]
pub async fn delete_entry(
    app: AppHandle, 
    container_id: String, 
    entry_id: String
) -> Result<(), String> {
    println!("[DEBUG] Deleting entry: {:?}", entry_id);
    let keepass_state = app.state::<KeePassState>();
    keepass_state.delete_entry(container_id, entry_id).await
}

/// Поиск записей в контейнере
#[tauri::command]
pub async fn search_entries(
    app: AppHandle, 
    container_id: String, 
    options: SearchOptions
) -> Result<Vec<KeePassEntry>, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.search_entries(container_id, options).await
}

/// Получить статистику контейнера
#[tauri::command]
pub async fn get_container_stats(
    app: AppHandle, 
    container_id: String
) -> Result<ContainerStats, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.get_container_stats(container_id).await
}

/// Создать резервную копию контейнера
#[tauri::command]
pub async fn create_backup(
    app: AppHandle, 
    container_id: String
) -> Result<BackupInfo, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.create_backup(container_id).await
}

/// Получить список резервных копий
#[tauri::command]
pub async fn list_backups(
    app: AppHandle, 
    container_id: String
) -> Result<Vec<BackupInfo>, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.list_backups(container_id).await
}

/// Восстановить из резервной копии
#[tauri::command]
pub async fn restore_backup(
    app: AppHandle, 
    container_id: String, 
    backup_path: String
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.restore_backup(container_id, backup_path).await
}

/// Привязать key-файл к контейнеру
#[tauri::command]
pub async fn attach_keyfile(
    app: AppHandle, 
    container_id: String, 
    keyfile: Vec<u8>
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.attach_keyfile(container_id, keyfile).await
}

/// Отвязать key-файл от контейнера
#[tauri::command]
pub async fn detach_keyfile(
    app: AppHandle, 
    container_id: String
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.detach_keyfile(container_id).await
}

/// Импортировать контейнер
#[tauri::command]
pub async fn import_container(
    app: AppHandle, 
    file: Vec<u8>, 
    password: String, 
    keyfile: Option<Vec<u8>>
) -> Result<KeePassContainer, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.import_container(file, password, keyfile).await
}

/// Экспортировать контейнер
#[tauri::command]
pub async fn export_container(
    app: AppHandle, 
    container_id: String, 
    options: ExportOptions
) -> Result<Vec<u8>, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.export_container(container_id, options).await
}

/// Получить качество пароля
#[tauri::command]
pub async fn get_password_quality(
    app: AppHandle, 
    password: String
) -> Result<PasswordQuality, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.get_password_quality(password).await
}

/// Добавить группу в контейнер
#[tauri::command]
pub async fn add_group(
    app: AppHandle, 
    container_id: String, 
    group: KeePassGroup
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.add_group(container_id, group).await
}

/// Обновить группу в контейнере
#[tauri::command]
pub async fn update_group(
    app: AppHandle, 
    container_id: String, 
    group: KeePassGroup
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.update_group(container_id, group).await
}

/// Удалить группу из контейнера
#[tauri::command]
pub async fn delete_group(
    app: AppHandle, 
    container_id: String, 
    group_id: String
) -> Result<(), String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.delete_group(container_id, group_id).await
}

/// Получить аудит событий
#[tauri::command]
pub async fn get_audit_events(
    app: AppHandle,
    _container_id: Option<String>,
    _limit: Option<usize>
) -> Result<Vec<crate::keepass::models::AuditEvent>, String> {
    let _keepass_state = app.state::<KeePassState>();
    
    // TODO: Реализовать получение аудита из базы данных
    // Пока возвращаем пустой список
    Ok(vec![])
}

/// Создать аудит событие
#[tauri::command]
pub async fn create_audit_event(
    app: AppHandle,
    action: String,
    resource_type: String,
    resource_id: String,
    details: Option<String>
) -> Result<crate::keepass::models::AuditEvent, String> {
    let keepass_state = app.state::<KeePassState>();
    let kdbx_manager = keepass_state.kdbx_manager.read().await;
    let _event = kdbx_manager.create_audit_event(&action, &resource_type, &resource_id, details.as_deref());
    tracing::info!("Audit event created: {} {} {}", action, resource_type, resource_id);

    Ok(crate::keepass::models::AuditEvent {
        timestamp: chrono::Utc::now().to_rfc3339(),
        action,
        resource_type,
        resource_id,
        details,
        user_id: None,
        ip_address: None,
    })
}

/// Получить статистику безопасности контейнера
#[tauri::command]
pub async fn get_security_stats(
    app: AppHandle,
    container_id: String
) -> Result<crate::keepass::models::ContainerStats, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.get_container_stats(container_id).await
}

/// Проверить качество пароля
#[tauri::command]
pub async fn check_password_quality(
    app: AppHandle,
    password: String
) -> Result<crate::keepass::models::PasswordQuality, String> {
    let keepass_state = app.state::<KeePassState>();
    keepass_state.get_password_quality(password).await
} 

/// Закрыть KeePass контейнер
#[tauri::command]
pub async fn close_container(
    app: AppHandle, 
    container_id: String
) -> Result<(), String> {
    println!("[DEBUG] Closing container: {}", container_id);
    let keepass_state = app.state::<KeePassState>();
    keepass_state.close_container(container_id).await
}

/// Заблокировать контейнер
#[tauri::command]
pub async fn lock_container(
    app: AppHandle, 
    container_id: String
) -> Result<(), String> {
    println!("[DEBUG] Locking container, setting is_locked to true: {}", container_id);
    let keepass_state = app.state::<KeePassState>();
    keepass_state.lock_container(container_id).await
}

/// Разблокировать контейнер
#[tauri::command]
pub async fn unlock_container(
    app: AppHandle, 
    container_id: String
) -> Result<(), String> {
    println!("[DEBUG] Unlocking container, setting is_locked to false: {}", container_id);
    let keepass_state = app.state::<KeePassState>();
    keepass_state.unlock_container(container_id).await
} 