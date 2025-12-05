pub mod commands;

use tauri::{AppHandle, Manager, Runtime};

pub fn setup<R: Runtime>(app: &AppHandle<R>) -> anyhow::Result<()> {
    app.manage(commands::TunnelState::new());
    Ok(())
}
