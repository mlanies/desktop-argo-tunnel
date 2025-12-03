use std::fs;
use std::sync::RwLock;

use anyhow::anyhow;
use config::{Config, File, FileFormat};
use json_patch::{patch, Patch};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use ts_rs::TS;

use crate::util::{invoke, AppHandleExt, PanicLock};
use crate::activity::{ActivityState, event::{ActivityEventType, ActivitySeverity}};

pub const SETTINGS_CHANGE_EVENT: &str = "config_change";
const CONFIG_FILE: &str = "config.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Settings {
    pub remember_me: Option<bool>,
}

impl Settings {
    pub fn new(app: &AppHandle) -> anyhow::Result<Self> {
        let user_settings = app.path().config_dir()?.join(CONFIG_FILE);

        if !user_settings.try_exists().unwrap_or(false) {
            fs::write(&user_settings, "{}")?;
        }

        let settings: Settings = Config::builder()
            .add_source(File::from_str(
                include_str!("./base_config.json"),
                FileFormat::Json,
            ))
            .add_source(File::with_name(
                user_settings
                    .to_str()
                    .ok_or(anyhow!("invalid config path"))?,
            ))
            .build()
            .and_then(|s| s.try_deserialize())?;

        Ok(settings)
    }

    fn save(&self, app: &AppHandle) -> anyhow::Result<()> {
        let user_settings = app.path().config_dir()?.join(CONFIG_FILE);

        fs::write(&user_settings, serde_json::to_string(self)?)?;

        Ok(())
    }
}

pub type SettingsState = RwLock<Settings>;

pub fn setup(app: &AppHandle) -> anyhow::Result<()> {
    let settings = Settings::new(app)?;

    app.manage(SettingsState::new(settings));

    app.listen_async(crate::UI_READY_EVENT, |app, _| async move {
        let settings: Settings = app.state::<SettingsState>().readp().clone();
        app.emit(SETTINGS_CHANGE_EVENT, settings)
            .expect("send config change on init");
    });

    Ok(())
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, new_settings: Settings) -> Result<(), String> {
    async fn inner(app: AppHandle, new_settings: Settings) -> anyhow::Result<()> {
        let state = app.state::<SettingsState>();
        {
            let mut settings = state.write().unwrap();
            *settings = new_settings;
            settings.save(&app)?;
        } // Drop the guard here

        let settings_clone = {
            let settings = state.read().unwrap();
            (*settings).clone()
        }; // Drop the read guard here
        
        let remember_me = settings_clone.remember_me;
        app.emit(SETTINGS_CHANGE_EVENT, settings_clone)?;

        // Логируем обновление настроек
        if let Some(activity_state) = app.try_state::<ActivityState>() {
            let _ = activity_state
                .add_event(
                    ActivityEventType::SettingsUpdated,
                    "Настройки приложения обновлены".to_string(),
                    Some(serde_json::json!({
                        "remember_me": remember_me
                    })),
                    None,
                    None,
                    None,
                    ActivitySeverity::Info,
                )
                .await;
        }

        Ok(())
    }

    invoke!(inner, app, new_settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn patch_settings(app: AppHandle, patch_doc: Patch) -> Result<(), String> {
    async fn inner(app: AppHandle, patch_doc: Patch) -> anyhow::Result<()> {
        let state = app.state::<SettingsState>();
        {
            let mut settings = state.write().unwrap();
            let mut settings_doc = serde_json::to_value((*settings).clone())?;

            patch(&mut settings_doc, &patch_doc).map_err(anyhow::Error::new)?;

            *settings = serde_json::from_value(settings_doc)?;
            settings.save(&app)?;
        } // Drop the guard here

        let settings_clone = {
            let settings = state.read().unwrap();
            (*settings).clone()
        }; // Drop the read guard here
        
        app.emit(SETTINGS_CHANGE_EVENT, settings_clone)?;

        Ok(())
    }

    invoke!(inner, app, patch_doc).map_err(|e| e.to_string())
}

pub trait AppHandleSettigs {
    fn settings(&self) -> tauri::State<'_, crate::settings::SettingsState>;
}

impl AppHandleSettigs for AppHandle {
    fn settings(&self) -> tauri::State<'_, crate::settings::SettingsState> {
        self.state::<crate::settings::SettingsState>()
    }
}
