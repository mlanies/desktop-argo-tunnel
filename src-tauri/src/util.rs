use std::{
    hash::{DefaultHasher, Hash, Hasher},
    sync::{Mutex, MutexGuard, RwLock, RwLockReadGuard, RwLockWriteGuard},
};

use tauri::{AppHandle, Event, Listener, Manager};
use serde::{Deserialize, Serialize};

pub trait AppHandleExt {
    fn listen_async<H, F>(&self, event: &str, handler: H)
    where
        H: Fn(AppHandle, Event) -> F + Send + Copy + 'static,
        F: std::future::Future<Output = ()> + Send;
}

impl AppHandleExt for AppHandle {
    fn listen_async<H, F>(&self, event: &str, handler: H)
    where
        H: Fn(AppHandle, Event) -> F + Send + Copy + 'static,
        F: std::future::Future<Output = ()> + Send,
    {
        let app = self.clone();

        app.clone().listen(event, move |event| {
            let handle = app.state::<tokio::runtime::Handle>();
            let app = app.clone();

            handle.spawn(async move {
                handler(app, event).await;
            });
        });
    }
}

pub fn make_reqwest() -> reqwest::Client {
    reqwest::ClientBuilder::new()
        .redirect(reqwest::redirect::Policy::none())
        .danger_accept_invalid_certs(true)
        .build()
        .expect("cannot create reqwest client")
}

macro_rules! invoke {
    ($func:expr, $($arg:expr),*) => {
        $func($($arg),*).await
    };
}

pub(crate) use invoke;

pub trait PanicLock<T> {
    fn readp(&self) -> RwLockReadGuard<'_, T>;
    fn writep(&self) -> RwLockWriteGuard<'_, T>;
}

impl<T> PanicLock<T> for RwLock<T> {
    fn readp(&self) -> RwLockReadGuard<'_, T> {
        self.read().expect("cannot acquire lock")
    }

    fn writep(&self) -> RwLockWriteGuard<'_, T> {
        self.write().expect("cannot acquire lock")
    }
}

pub trait PanicMutex<T> {
    #[allow(unused)]
    fn lockp(&self) -> MutexGuard<'_, T>;
}

impl<T> PanicMutex<T> for Mutex<T> {
    fn lockp(&self) -> MutexGuard<'_, T> {
        self.lock().expect("cannot acquire lock")
    }
}

pub fn hash<T: Hash>(value: &T) -> u64 {
    let mut hasher = DefaultHasher::new();
    value.hash(&mut hasher);
    hasher.finish()
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PlatformInfo {
    pub os: String,
    pub is_macos: bool,
    pub is_windows: bool,
    pub is_linux: bool,
}

#[tauri::command]
pub fn get_platform_info() -> PlatformInfo {
    let os = std::env::consts::OS.to_string();
    let is_macos = cfg!(target_os = "macos");
    let is_windows = cfg!(target_os = "windows");
    let is_linux = cfg!(target_os = "linux");
    
    PlatformInfo {
        os,
        is_macos,
        is_windows,
        is_linux,
    }
}
