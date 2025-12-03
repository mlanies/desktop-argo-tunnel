pub mod commands;
pub mod event;
pub mod state;

pub use state::ActivityState;

use tauri::{AppHandle, Manager};
use tracing::info;

pub fn setup(app: &AppHandle) -> anyhow::Result<()> {
    info!("Setting up activity module");
    
    // Инициализируем состояние активности
    let activity_state = ActivityState::new(10000); // Максимум 10000 событий
    app.manage(activity_state);
    
    info!("Activity module setup completed");
    Ok(())
} 