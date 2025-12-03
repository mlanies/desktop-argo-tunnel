use tauri::command;
use std::process::Command;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::State;

// Store for active child processes
pub struct TunnelState {
    pub processes: Mutex<HashMap<String, u32>>, // Map ID to PID
}

impl TunnelState {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActiveTunnel {
    pub id: String,
    pub hostname: String,
    pub local_port: u16,
    pub pid: u32,
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
pub async fn start_tcp_tunnel(
    state: State<'_, TunnelState>,
    hostname: String,
    local_port: u16,
) -> Result<ActiveTunnel, String> {
    // cloudflared access tcp --hostname <hostname> --url localhost:<port>
    let child = Command::new("cloudflared")
        .args(&[
            "access",
            "tcp",
            "--hostname",
            &hostname,
            "--url",
            &format!("localhost:{}", local_port),
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    let pid = child.id();
    let id = format!("{}-{}", hostname, local_port);

    state.processes.lock().unwrap().insert(id.clone(), pid);

    Ok(ActiveTunnel {
        id,
        hostname,
        local_port,
        pid,
    })
}

#[command]
pub async fn stop_tcp_tunnel(
    state: State<'_, TunnelState>,
    id: String,
) -> Result<String, String> {
    let mut processes = state.processes.lock().unwrap();
    
    if let Some(pid) = processes.remove(&id) {
        // Kill the process
        // Note: This is a simple kill. In a real app, we might want to be more graceful or handle cross-platform differences better.
        // On Unix, Command::new("kill").arg(pid.to_string())...
        // On Windows, taskkill...
        
        #[cfg(target_os = "windows")]
        let _ = Command::new("taskkill")
            .args(&["/F", "/PID", &pid.to_string()])
            .output();

        #[cfg(not(target_os = "windows"))]
        let _ = Command::new("kill")
            .arg(pid.to_string())
            .output();
            
        Ok(format!("Tunnel {} stopped", id))
    } else {
        Err(format!("Tunnel {} not found", id))
    }
}
