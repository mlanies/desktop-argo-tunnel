use std::{fs, path::PathBuf};

use cfg_if::cfg_if;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tokio::sync::mpsc::Receiver;
use uuid::Uuid;

use crate::servers::{Credential, Protocol};

pub enum RemoteHandle {
    Ssh(CommandChild),
    RdpMstsc(CommandChild),
    RdpMacApp(CommandChild),
    RdpXfreerdp(CommandChild),
}

impl RemoteHandle {
    pub async fn new(
        app: &AppHandle,
        service_id: Uuid,
        protocol: Protocol,
        url: &str,
        credential: &Credential,
    ) -> anyhow::Result<(Receiver<CommandEvent>, Self)> {
        let shell = app.shell();
        match (protocol, credential) {
            (
                Protocol::Rdp,
                Credential::RdpUserPassword {
                    login,
                    password,
                    domain,
                },
            ) => {
                let rdp_file = Self::rdp_file(app, service_id, login, password, domain, url)?;
                let _rdp_file_path = rdp_file
                    .as_path()
                    .to_str()
                    .ok_or(anyhow::anyhow!("invalid path"))?;

                cfg_if! {
                    if #[cfg(target_os = "windows")] {
                        let (rx, cmd) = shell.command("mstsc").args([_rdp_file_path]).spawn()?;

                        Ok((rx, Self::RdpMstsc(cmd)))
                    } else if #[cfg(target_os = "linux")] {
                        let (rx, cmd) = shell.command("xfreerdp").args([_rdp_file_path]).spawn()?;

                        Ok((rx, Self::RdpXfreerdp(cmd)))
                    } else if #[cfg(target_os = "macos")] {
                        let (rx, cmd) = shell.command("open").args(["-a", "Windows App", &url]).spawn()?;

                        Ok((rx, Self::RdpMacApp(cmd)))
                    }
                }
            }
            (Protocol::Ssh, Credential::SshKey { login, key }) => {
                let key_file = Self::ssh_key_file(app, service_id, key)?;
                let key_file_path = key_file
                    .as_path()
                    .to_str()
                    .ok_or(anyhow::anyhow!("invalid path"))?;

                let (rx, cmd) = shell
                    .command("ssh")
                    .args(["-i", key_file_path, &format!("{}@{}", login, url)])
                    .spawn()?;

                Ok((rx, Self::Ssh(cmd)))
            }
            (Protocol::Ssh, Credential::SshUserPassword { login, password }) => {
                let (rx, cmd) = shell
                    .command("sshpass")
                    .args(["-p", password, "ssh", &format!("{}@{}", login, url)])
                    .spawn()?;

                Ok((rx, Self::Ssh(cmd)))
            }
            _ => Err(anyhow::anyhow!("Unsupported protocol or credential type")),
        }
    }

    fn ssh_key_file(
        app: &AppHandle,
        service_id: Uuid,
        key: &str,
    ) -> anyhow::Result<std::path::PathBuf> {
        let mut path = app.path().app_local_data_dir()?;
        path.push(format!("{}.key", service_id));

        fs::write(&path, key)?;

        Ok(path)
    }

    fn rdp_file(
        app: &AppHandle,
        service_id: Uuid,
        login: &str,
        password: &str,
        domain: &str,
        url: &str,
    ) -> anyhow::Result<PathBuf> {
        let mut path = app.path().app_local_data_dir()?;
        path.push(format!("{}.rdp", service_id));

        fs::write(
            &path,
            format!(
                "full address:s:{}\n\
             username:s:{}\n\
             password:s:{}\n\
             domain:s:{}\n\
             screen mode id:i:2\n\
             use multimon:i:1\n\
             audiomode:i:0\n\
             redirectclipboard:i:1\n\
             redirectprinters:i:1\n\
             redirectsmartcards:i:1\n\
             redirectcomports:i:1\n\
             redirectusbdevices:i:1\n\
             disableconnectionsharing:i:1\n\
             authentication level:i:2\n\
             prompt for credentials:i:0\n\
             negotiate security layer:i:1\n\
             remoteapplicationmode:i:0\n\
             alternate shell:s:\n\
             shell working directory:s:\n\
             remoteapplicationprogram:s:\n\
             remoteapplicationname:s:\n\
             remoteapplicationcmdline:s:",
                url, login, password, domain
            ),
        )?;

        Ok(path)
    }

    pub fn stop(self) -> anyhow::Result<()> {
        match self {
            RemoteHandle::Ssh(child)
            | RemoteHandle::RdpMstsc(child)
            | RemoteHandle::RdpMacApp(child)
            | RemoteHandle::RdpXfreerdp(child) => child.kill()?,
        }
        Ok(())
    }
}
