use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq)]
#[ts(export)]
pub enum ActivityEventType {
    /// Аутентификация пользователя
    UserLogin,
    /// Выход пользователя
    UserLogout,
    /// Обновление токена
    TokenRefresh,
    /// Подключение к Relay серверу
    RelayConnected,
    /// Отключение от Relay сервера
    RelayDisconnected,
    /// Аутентификация в Relay
    RelayAuthenticated,
    /// Создание туннеля через Relay
    RelayTunnelCreated,
    /// Закрытие туннеля Relay
    RelayTunnelClosed,
    /// Подключение к RDP сервису
    RdpServiceConnected,
    /// Отключение от RDP сервиса
    RdpServiceDisconnected,
    /// Подключение к SSH сервису
    SshServiceConnected,
    /// Отключение от SSH сервиса
    SshServiceDisconnected,
    /// Ошибка подключения к сервису
    ServiceConnectionError,
    /// Запрос учетных данных
    CredentialsRequested,
    /// Сохранение учетных данных
    CredentialsSaved,
    /// Обновление учетных данных
    CredentialsUpdated,
    /// Удаление учетных данных
    CredentialsDeleted,
    /// Импорт KeePass контейнера
    KeePassContainerImported,
    /// Экспорт KeePass контейнера
    KeePassContainerExported,
    /// Тестирование KeePass контейнера
    KeePassContainerTested,
    /// Обновление настроек приложения
    SettingsUpdated,
    /// Обновление профиля пользователя
    UserProfileUpdated,
    /// Синхронизация с сервером
    ServerSyncCompleted,
    /// Ошибка синхронизации
    ServerSyncFailed,
    /// Очистка старых событий
    ActivityLogCleaned,
    /// Экспорт журнала активности
    ActivityLogExported,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ActivityEvent {
    /// Уникальный идентификатор события
    pub id: String,
    /// Тип события
    pub event_type: ActivityEventType,
    /// Временная метка события
    pub timestamp: String,
    /// Описание события
    pub description: String,
    /// Дополнительные данные события
    pub details: Option<String>,
    /// Идентификатор сервиса (если применимо)
    pub service_id: Option<Uuid>,
    /// Идентификатор пользователя
    pub user_id: Option<String>,
    /// IP адрес (если применимо)
    pub ip_address: Option<String>,
    /// Уровень важности события
    pub severity: ActivitySeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq)]
#[ts(export)]
pub enum ActivitySeverity {
    Info,
    Warning,
    Error,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ActivityStats {
    /// Общее количество событий
    pub total_events: u64,
    /// Количество событий по типам
    pub events_by_type: std::collections::HashMap<String, u64>,
    /// Количество событий по уровням важности
    pub events_by_severity: std::collections::HashMap<String, u64>,
    /// Количество событий за последние 24 часа
    pub events_last_24h: u64,
    /// Количество событий за последние 7 дней
    pub events_last_7d: u64,
    /// Количество событий за последние 30 дней
    pub events_last_30d: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ActivityFilter {
    /// Фильтр по типу события
    pub event_type: Option<ActivityEventType>,
    /// Фильтр по уровню важности
    pub severity: Option<ActivitySeverity>,
    /// Фильтр по сервису
    pub service_id: Option<Uuid>,
    /// Начальная дата
    pub start_date: Option<String>,
    /// Конечная дата
    pub end_date: Option<String>,
    /// Лимит результатов
    pub limit: Option<u32>,
    /// Смещение для пагинации
    pub offset: Option<u32>,
} 