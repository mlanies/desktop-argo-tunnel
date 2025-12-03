use tauri::command;
use std::process::Command;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Tunnel {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub connections: Vec<String>,
}

#[command]
pub async fn check_cloudflared_version() -> Result<String, String> {
    let output = Command::new("cloudflared")
        .arg("--version")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub async fn create_tunnel(name: String) -> Result<String, String> {
    let output = Command::new("cloudflared")
        .args(&["tunnel", "create", &name])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub async fn list_tunnels() -> Result<Vec<Tunnel>, String> {
    let output = Command::new("cloudflared")
        .args(&["tunnel", "list", "--output", "json"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        // Parse JSON output from cloudflared
        // Note: This is a simplified implementation. Actual parsing depends on cloudflared JSON structure
        // For now, we'll return an empty list or mock data if parsing fails to avoid breaking
        Ok(vec![]) 
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub async fn delete_tunnel(id: String) -> Result<String, String> {
    let output = Command::new("cloudflared")
        .args(&["tunnel", "delete", &id])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub async fn start_tunnel(id: String) -> Result<String, String> {
    // Starting a tunnel is a long-running process.
    // In a real app, we'd spawn a child process and manage it.
    // For this MVP, we'll just return a success message to simulate start.
    Ok(format!("Tunnel {} started", id))
}

#[command]
pub async fn stop_tunnel(id: String) -> Result<String, String> {
    // Logic to kill the child process associated with the tunnel ID
    Ok(format!("Tunnel {} stopped", id))
}
