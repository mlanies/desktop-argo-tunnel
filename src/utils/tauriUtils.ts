// Утилита для безопасного использования Tauri API

// Проверка доступности Tauri
function checkTauriAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  // В Tauri 2.0 проверяем наличие window.__TAURI_INTERNALS__ или window.__TAURI__
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
}

// Безопасный импорт Tauri API
export async function safeInvoke<T = any>(command: string, args?: any): Promise<T> {
  if (!checkTauriAvailable()) {
    const error = new Error(`Tauri not available in browser: ${command}`);
    console.error(error);
    throw error;
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke(command, args);
  } catch (error) {
    console.error(`Error invoking Tauri command ${command}:`, error);
    throw error;
  }
}

// Безопасный импорт Tauri events
export async function safeListen(
  event: string, 
  handler: (event: any) => void
): Promise<() => void> {
  if (!checkTauriAvailable()) {
    console.warn(`Tauri listen not available: ${event}`);
    return () => {}; // Возвращаем пустую функцию для отписки
  }
  
  try {
    const { listen } = await import('@tauri-apps/api/event');
    return await listen(event, handler);
  } catch (error) {
    console.error(`Error listening to Tauri event ${event}:`, error);
    return () => {};
  }
}

// Безопасный импорт Tauri emit
export async function safeEmit(event: string, payload?: any): Promise<void> {
  if (!checkTauriAvailable()) {
    console.warn(`Tauri emit not available: ${event}`);
    return;
  }
  
  try {
    const { emit } = await import('@tauri-apps/api/event');
    await emit(event, payload);
  } catch (error) {
    console.error(`Error emitting Tauri event ${event}:`, error);
  }
}

// Безопасный импорт Tauri webview window
export async function safeGetCurrentWebviewWindow() {
  if (!checkTauriAvailable()) {
    console.warn('Tauri webview window not available');
    return null;
  }
  
  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    return await getCurrentWebviewWindow();
  } catch (error) {
    console.error('Error getting Tauri webview window:', error);
    return null;
  }
}

// Проверка доступности Tauri
export function isTauriAvailable(): boolean {
  return checkTauriAvailable();
} 