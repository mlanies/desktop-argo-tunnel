use tauri::AppHandle;
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tokio::sync::mpsc::Receiver;

use crate::servers::Service;

pub struct Access {
    pub url: String,
    cmd: CommandChild,
}

impl Access {
    pub fn new(
        app: &AppHandle,
        service: &Service,
        bind_port: u16,
    ) -> anyhow::Result<(Receiver<CommandEvent>, Self)> {
        let target = format!("{}:{}", service.host, service.port);
        let url = format!("localhost:{}", bind_port);
        
        // Используем cloudflared tunnel для прямого подключения
        // cloudflared tunnel --url tcp://host:port --local-port local_port
        let (rx, cmd) = app
            .shell()
            .sidecar("cloudflared")?
            .args([
                "tunnel",
                "--url",
                &format!("tcp://{}", target),
                "--local-port",
                &bind_port.to_string(),
            ])
            .spawn()?;

        Ok((rx, Self { url, cmd }))
    }

    pub fn stop(self) -> anyhow::Result<()> {
        self.cmd.kill()?;
        Ok(())
    }
}
