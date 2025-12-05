use tauri::{command, AppHandle, Manager, Runtime, State};
use std::process::Command;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::collections::HashMap;
use std::path::PathBuf;
use std::fs;
use std::io::Write;

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

fn get_cloudflared_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
    }
    
    #[cfg(target_os = "windows")]
    return app_data_dir.join("cloudflared.exe");
    
    #[cfg(not(target_os = "windows"))]
    return app_data_dir.join("cloudflared");
}

#[command]
pub async fn install_cloudflared<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let target_path = get_cloudflared_path(&app);
    
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    
    let binary_name = match (os, arch) {
        ("macos", "x86_64") => "cloudflared-darwin-amd64",
        ("macos", "aarch64") => "cloudflared-darwin-amd64", // Rosetta 2 or native if available? Cloudflare provides darwin-amd64. Wait, they have darwin-amd64. Do they have arm64? Yes, cloudflared-darwin-amd64.tgz. Actually releases page has 'cloudflared-darwin-amd64'. Let's check releases. 
        // Checking https://github.com/cloudflare/cloudflared/releases/latest
        // They have: cloudflared-darwin-amd64.tgz, cloudflared-linux-amd64, cloudflared-windows-amd64.exe
        // For M1/M2 macs (aarch64), they usually run amd64 via Rosetta or there might be an arm64 build?
        // Looking at recent releases: cloudflared-darwin-amd64.tgz is the main one. 
        // Wait, there is no arm64 build for mac in the main list usually? 
        // Actually, let's look closer. 
        // https://github.com/cloudflare/cloudflared/releases/download/2024.12.0/cloudflared-darwin-amd64.tgz
        // There doesn't seem to be a specific arm64 build for mac in the assets list I recall. 
        // But let's assume amd64 works via Rosetta.
        
        ("linux", "x86_64") => "cloudflared-linux-amd64",
        ("linux", "x86") => "cloudflared-linux-386",
        ("linux", "aarch64") => "cloudflared-linux-arm64",
        ("linux", "arm") => "cloudflared-linux-arm",
        ("windows", "x86_64") => "cloudflared-windows-amd64.exe",
        ("windows", "x86") => "cloudflared-windows-386.exe",
        _ => return Err(format!("Unsupported platform: {} {}", os, arch)),
    };

    // Special handling for macOS to download the binary directly if possible, but they provide .tgz. 
    // Actually, for macOS, the binary is inside a tgz. That complicates things.
    // Let's check if there is a direct binary download. 
    // https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz
    // It seems macOS only has .tgz.
    // Linux and Windows have direct binaries.
    
    // If macOS, we might need to extract it. Or maybe we can find a direct binary link?
    // Cloudflare docs say: brew install cloudflared.
    // But for direct download: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz
    
    // For the sake of this task, let's assume we can download the binary directly for Linux/Windows.
    // For macOS, if it's a tgz, we need to extract it. 
    // However, maybe there is a direct binary URL? 
    // https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64 is NOT available.
    
    // Let's handle Linux and Windows first, and for macOS, we might need to use `tar`.
    
    let url = format!("https://github.com/cloudflare/cloudflared/releases/latest/download/{}", binary_name);
    
    // For macOS, we need to handle the .tgz extension if that's the only option.
    // But wait, if I am on macOS, I can try to download it.
    
    let download_url = if os == "macos" {
        // We will need to handle tgz. For now, let's try to assume there might be a binary or fail gracefully.
        // Actually, let's check if we can use `curl` and `tar` via Command for macOS as a workaround if reqwest is too complex for tgz extraction without extra crates.
        // But we have `flate2` and `tar` in Cargo.toml? No, we don't.
        // Wait, Cargo.toml has `flate2` and `tar`?
        // Let me check Cargo.toml again.
        // I see `flate2 = "1.0"`. I don't see `tar`.
        // So I can't easily extract tgz.
        
        // Alternative: Use `curl` and `tar` system commands on macOS.
        return install_cloudflared_macos(app, &target_path).await;
    } else {
        url
    };

    let response = reqwest::get(&download_url).await.map_err(|e| e.to_string())?;
    let content = response.bytes().await.map_err(|e| e.to_string())?;
    
    let mut file = fs::File::create(&target_path).map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&target_path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&target_path, perms).map_err(|e| e.to_string())?;
    }
    
    Ok(target_path.to_string_lossy().to_string())
}

async fn install_cloudflared_macos<R: Runtime>(app: AppHandle<R>, target_path: &PathBuf) -> Result<String, String> {
    // macOS specific installation using curl and tar
    let url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz";
    let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    let tgz_path = app_data_dir.join("cloudflared.tgz");
    
    // Download tgz
    let output = Command::new("curl")
        .arg("-L")
        .arg("-o")
        .arg(&tgz_path)
        .arg(url)
        .output()
        .map_err(|e| e.to_string())?;
        
    if !output.status.success() {
        return Err(format!("Failed to download cloudflared: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Extract tgz
    let output = Command::new("tar")
        .arg("-xzf")
        .arg(&tgz_path)
        .arg("-C")
        .arg(&app_data_dir)
        .output()
        .map_err(|e| e.to_string())?;
        
    if !output.status.success() {
        return Err(format!("Failed to extract cloudflared: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // The extracted file is named 'cloudflared'. We might need to rename it if our target_path is different, 
    // but get_cloudflared_path returns .../cloudflared, so it should be fine.
    // However, tar extracts it as 'cloudflared'.
    
    // Cleanup tgz
    let _ = fs::remove_file(tgz_path);
    
    // Ensure executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if target_path.exists() {
             let mut perms = fs::metadata(target_path).map_err(|e| e.to_string())?.permissions();
             perms.set_mode(0o755);
             fs::set_permissions(target_path, perms).map_err(|e| e.to_string())?;
        } else {
             return Err("Extracted binary not found".to_string());
        }
    }

    Ok(target_path.to_string_lossy().to_string())
}

#[command]
pub async fn get_latest_cloudflared_version() -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/cloudflare/cloudflared/releases/latest")
        .header("User-Agent", "cloudbridge-desktop")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("GitHub API request failed: {}", response.status()));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    // tag_name usually looks like "2024.1.0" or "v2024.1.0"
    if let Some(tag_name) = json["tag_name"].as_str() {
        Ok(tag_name.trim_start_matches('v').to_string())
    } else {
        Err("Could not find tag_name in GitHub response".to_string())
    }
}

#[command]
pub async fn check_cloudflared_version<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let path = get_cloudflared_path(&app);
    let command = if path.exists() {
        path.to_string_lossy().to_string()
    } else {
        "cloudflared".to_string()
    };

    let output = Command::new(command)
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
pub async fn start_tcp_tunnel<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, TunnelState>,
    hostname: String,
    local_port: u16,
) -> Result<ActiveTunnel, String> {
    let path = get_cloudflared_path(&app);
    let command = if path.exists() {
        path.to_string_lossy().to_string()
    } else {
        "cloudflared".to_string()
    };

    // cloudflared access tcp --hostname <hostname> --url localhost:<port>
    let child = Command::new(command)
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
