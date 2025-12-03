use tauri::{AppHandle, Manager, Emitter};
use tracing::debug;
use uuid::Uuid;

use crate::activity::{ActivityState, event::{ActivityEventType, ActivitySeverity, ActivityFilter}};
use crate::util::invoke;

const ACTIVITY_EVENT: &str = "activity_event";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ActivityEventPayload {
    EventAdded,
    StatsUpdated,
    EventsCleared,
}

/// Добавить событие активности
#[tauri::command]
pub async fn activity_add_event(
    app: AppHandle,
    event_type: ActivityEventType,
    description: String,
    details: Option<String>,
    service_id: Option<String>,
    user_id: Option<String>,
    ip_address: Option<String>,
    severity: ActivitySeverity,
) -> Result<(), String> {
    async fn inner(
        app: AppHandle,
        event_type: ActivityEventType,
        description: String,
        details: Option<String>,
        service_id: Option<String>,
        user_id: Option<String>,
        ip_address: Option<String>,
        severity: ActivitySeverity,
    ) -> anyhow::Result<()> {
        debug!("activity_add_event called: {:?}", event_type);
        
        let activity_state = app.state::<ActivityState>();
        
        // Convert service_id from String to Uuid if provided
        let service_id_uuid = service_id.and_then(|s| s.parse::<Uuid>().ok());
        
        // Convert details from String to Value if provided
        let details_value = details.map(|d| serde_json::Value::String(d));
        
        activity_state
            .add_event(
                event_type,
                description,
                details_value,
                service_id_uuid,
                user_id,
                ip_address,
                severity,
            )
            .await?;

        // Уведомляем UI о новом событии
        app.emit(ACTIVITY_EVENT, ActivityEventPayload::EventAdded)?;
        
        Ok(())
    }

    invoke!(inner, app, event_type, description, details, service_id, user_id, ip_address, severity).map_err(|e| e.to_string())
}

/// Получить события активности
#[tauri::command]
pub async fn activity_get_events(
    app: AppHandle,
    filter: Option<ActivityFilter>,
) -> Result<Vec<crate::activity::event::ActivityEvent>, String> {
    let activity_state = app.state::<ActivityState>();
    
    activity_state
        .get_events(filter)
        .await
        .map_err(|e| e.to_string())
}

/// Получить статистику активности
#[tauri::command]
pub async fn activity_get_stats(
    app: AppHandle,
) -> Result<crate::activity::event::ActivityStats, String> {
    let activity_state = app.state::<ActivityState>();
    
    activity_state
        .get_stats()
        .await
        .map_err(|e| e.to_string())
}

/// Получить данные для графика
#[tauri::command]
pub async fn activity_get_chart_data(
    app: AppHandle,
    hours: u32,
) -> Result<Vec<(chrono::DateTime<chrono::Utc>, u64)>, String> {
    let activity_state = app.state::<ActivityState>();
    
    activity_state
        .get_chart_data(hours)
        .await
        .map_err(|e| e.to_string())
}

/// Очистить старые события
#[tauri::command]
pub async fn activity_cleanup_old_events(app: AppHandle) -> Result<usize, String> {
    async fn inner(app: AppHandle) -> anyhow::Result<usize> {
        debug!("activity_cleanup_old_events called");
        
        let activity_state = app.state::<ActivityState>();
        let removed_count = activity_state.cleanup_old_events().await?;
        
        // Уведомляем UI об обновлении статистики
        app.emit(ACTIVITY_EVENT, ActivityEventPayload::StatsUpdated)?;
        
        Ok(removed_count)
    }

    invoke!(inner, app).map_err(|e| e.to_string())
}

/// Экспортировать события активности
#[tauri::command]
pub async fn activity_export_events(
    app: AppHandle,
    filter: Option<ActivityFilter>,
) -> Result<String, String> {
    let activity_state = app.state::<ActivityState>();
    
    let events = activity_state
        .get_events(filter)
        .await
        .map_err(|e| e.to_string())?;

    // Конвертируем в JSON
    serde_json::to_string_pretty(&events)
        .map_err(|e| e.to_string())
} 