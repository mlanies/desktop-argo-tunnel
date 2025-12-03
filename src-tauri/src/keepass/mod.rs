pub mod commands;
pub mod models;
pub mod state;
pub mod kdbx;

use tauri::Manager;

pub fn setup(app: &tauri::AppHandle) -> anyhow::Result<()> {
    app.manage(state::KeePassState::new()?);
    app.manage(kdbx::KdbxManager::new());
    Ok(())
} 