use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration, Timelike};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;
use cfg_if::cfg_if;

use super::event::{ActivityEvent, ActivityEventType, ActivitySeverity, ActivityStats, ActivityFilter};

pub struct ActivityState {
    events: Arc<Mutex<Vec<ActivityEvent>>>,
    max_events: usize,
}

impl ActivityState {
    pub fn new(max_events: usize) -> Self {
        Self {
            events: Arc::new(Mutex::new(Vec::new())),
            max_events,
        }
    }

    /// Добавить новое событие активности
    pub async fn add_event(
        &self,
        event_type: ActivityEventType,
        description: String,
        details: Option<Value>,
        service_id: Option<Uuid>,
        user_id: Option<String>,
        ip_address: Option<String>,
        severity: ActivitySeverity,
    ) -> anyhow::Result<()> {
        let event = ActivityEvent {
            id: Uuid::new_v4().to_string(),
            event_type: event_type.clone(),
            timestamp: Utc::now().to_rfc3339(),
            description,
            details: details.map(|v| serde_json::to_string(&v).unwrap_or_default()),
            service_id,
            user_id,
            ip_address,
            severity,
        };

        let mut events = self.events.lock().await;
        
        // Добавляем событие в начало списка
        events.insert(0, event.clone());
        
        // Ограничиваем количество событий
        if events.len() > self.max_events {
            events.truncate(self.max_events);
        }

        info!("Activity event added: {:?}", event.event_type);
        Ok(())
    }

    /// Получить события с фильтрацией
    pub async fn get_events(&self, filter: Option<ActivityFilter>) -> anyhow::Result<Vec<ActivityEvent>> {
        let events = self.events.lock().await;
        
        if let Some(filter) = filter {
            let filtered_events: Vec<ActivityEvent> = events
                .iter()
                .filter(|event| {
                    // Фильтр по типу события
                    if let Some(ref event_type) = filter.event_type {
                        if event.event_type != *event_type {
                            return false;
                        }
                    }

                    // Фильтр по уровню важности
                    if let Some(ref severity) = filter.severity {
                        if event.severity != *severity {
                            return false;
                        }
                    }

                    // Фильтр по сервису
                    if let Some(ref service_id) = filter.service_id {
                        if event.service_id != Some(*service_id) {
                            return false;
                        }
                    }

                    // Фильтр по дате
                    if let Some(ref start_date) = filter.start_date {
                        if let Ok(start_time) = DateTime::parse_from_rfc3339(start_date) {
                            if let Ok(event_time) = DateTime::parse_from_rfc3339(&event.timestamp) {
                                if event_time.with_timezone(&Utc) < start_time.with_timezone(&Utc) {
                                    return false;
                                }
                            }
                        }
                    }

                    if let Some(ref end_date) = filter.end_date {
                        if let Ok(end_time) = DateTime::parse_from_rfc3339(end_date) {
                            if let Ok(event_time) = DateTime::parse_from_rfc3339(&event.timestamp) {
                                if event_time.with_timezone(&Utc) > end_time.with_timezone(&Utc) {
                                    return false;
                                }
                            }
                        }
                    }

                    true
                })
                .cloned()
                .collect();

            let mut result = filtered_events;
            
            // Применяем пагинацию
            if let Some(offset) = filter.offset {
                if offset as usize >= result.len() {
                    return Ok(Vec::new());
                }
                result = result[offset as usize..].to_vec();
            }

            if let Some(limit) = filter.limit {
                if (limit as usize) < result.len() {
                    result.truncate(limit as usize);
                }
            }

            Ok(result)
        } else {
            Ok(events.clone())
        }
    }

    /// Получить статистику активности
    pub async fn get_stats(&self) -> anyhow::Result<ActivityStats> {
        let events = self.events.lock().await;
        let now = Utc::now();
        
        let mut events_by_type: HashMap<String, u64> = HashMap::new();
        let mut events_by_severity: HashMap<String, u64> = HashMap::new();
        let mut events_last_24h = 0u64;
        let mut events_last_7d = 0u64;
        let mut events_last_30d = 0u64;

        for event in events.iter() {
            // Подсчет по типам
            let type_key = format!("{:?}", event.event_type);
            *events_by_type.entry(type_key).or_insert(0) += 1;

            // Подсчет по уровням важности
            let severity_key = format!("{:?}", event.severity);
            *events_by_severity.entry(severity_key).or_insert(0) += 1;

            // Подсчет по временным периодам
            if let Ok(event_time) = DateTime::parse_from_rfc3339(&event.timestamp) {
                let age = now - event_time.with_timezone(&Utc);
                if age <= Duration::hours(24) {
                    events_last_24h += 1;
                }
                if age <= Duration::days(7) {
                    events_last_7d += 1;
                }
                if age <= Duration::days(30) {
                    events_last_30d += 1;
                }
            }
        }

        Ok(ActivityStats {
            total_events: events.len() as u64,
            events_by_type,
            events_by_severity,
            events_last_24h,
            events_last_7d,
            events_last_30d,
        })
    }

    /// Очистить старые события (старше 30 дней)
    pub async fn cleanup_old_events(&self) -> anyhow::Result<usize> {
        let mut events = self.events.lock().await;
        let initial_count = events.len();
        events.clear();
        Ok(initial_count)
    }

    /// Получить события для графика (группированные по времени)
    pub async fn get_chart_data(&self, hours: u32) -> anyhow::Result<Vec<(DateTime<Utc>, u64)>> {
        let events = self.events.lock().await;
        let now = Utc::now();
        let cutoff = now - Duration::hours(hours as i64);
        
        let mut hourly_counts: HashMap<DateTime<Utc>, u64> = HashMap::new();
        
        // Инициализируем все часы в диапазоне
        let mut current = cutoff;
        while current <= now {
            hourly_counts.insert(current, 0);
            current += Duration::hours(1);
        }
        
        // Подсчитываем события по часам
        for event in events.iter() {
            if let Ok(event_time) = DateTime::parse_from_rfc3339(&event.timestamp) {
                let event_utc = event_time.with_timezone(&Utc);
                if event_utc >= cutoff {
                    let hour = event_utc
                        .date_naive()
                        .and_hms_opt(event_utc.hour(), 0, 0)
                        .unwrap()
                        .and_utc();
                    *hourly_counts.entry(hour).or_insert(0) += 1;
                }
            }
        }
        
        // Сортируем по времени
        let mut result: Vec<(DateTime<Utc>, u64)> = hourly_counts.into_iter().collect();
        result.sort_by_key(|(time, _)| *time);
        
        Ok(result)
    }

    pub async fn save_to_file(&self, app: &AppHandle) -> anyhow::Result<()> {
        let events = self.events.lock().await;
        let json = serde_json::to_string(&*events)?;
        let path = Self::get_log_path(app)?;
        fs::write(&path, json)?;
        Ok(())
    }

    pub async fn load_from_file(&self, app: &AppHandle) -> anyhow::Result<()> {
        let path = Self::get_log_path(app)?;
        if let Ok(data) = fs::read_to_string(&path) {
            let events: Vec<ActivityEvent> = serde_json::from_str(&data)?;
            let mut lock = self.events.lock().await;
            *lock = events;
        }
        Ok(())
    }

    fn get_log_path(app: &AppHandle) -> anyhow::Result<PathBuf> {
        let filename = if cfg!(target_os = "windows") {
            "activity_log_windows.json"
        } else if cfg!(target_os = "macos") {
            "activity_log_macos.json"
        } else {
            "activity_log.json"
        };
        let mut path = app.path().app_data_dir()?;
        path.push(filename);
        Ok(path)
    }
} 