pub mod commands;

use tauri::{AppHandle, Runtime};

pub fn setup<R: Runtime>(_app: &AppHandle<R>) -> anyhow::Result<()> {
    Ok(())
}
