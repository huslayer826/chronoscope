use futures_util::StreamExt;
use once_cell::sync::OnceCell;
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_hdr_async;
use tokio_tungstenite::tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tokio_tungstenite::tungstenite::http::StatusCode;
use tokio_tungstenite::tungstenite::Message;

pub type BrowserStateHandle = Arc<RwLock<BrowserState>>;

static BROWSER_STATE: OnceCell<BrowserStateHandle> = OnceCell::new();

#[derive(Debug, Default, Clone)]
pub struct BrowserState {
    pub chrome: Option<TabInfo>,
    pub edge: Option<TabInfo>,
    pub brave: Option<TabInfo>,
    pub firefox: Option<TabInfo>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TabInfo {
    pub browser: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub tab_id: Option<i64>,
    pub window_id: Option<i64>,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
struct ExtensionMessage {
    #[serde(rename = "type")]
    message_type: String,
    browser: String,
    url: Option<String>,
    title: Option<String>,
    tab_id: Option<i64>,
    window_id: Option<i64>,
    timestamp: i64,
}

pub fn create_browser_state() -> BrowserStateHandle {
    let state = Arc::new(RwLock::new(BrowserState::default()));
    let _ = BROWSER_STATE.set(state.clone());
    state
}

pub fn start_server(state: BrowserStateHandle) {
    tokio::spawn(async move {
        let listener = match TcpListener::bind("127.0.0.1:8765").await {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("[WS] Failed to bind 127.0.0.1:8765: {error}");
                return;
            }
        };

        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let state = state.clone();
                    tokio::spawn(async move {
                        handle_connection(stream, addr, state).await;
                    });
                }
                Err(error) => eprintln!("[WS] Failed to accept connection: {error}"),
            }
        }
    });
}

pub fn get_active_tab_for_browser(process_name: &str) -> Option<TabInfo> {
    let state = BROWSER_STATE.get()?;
    let state = state.read().ok()?;

    match normalize_process_name(process_name).as_deref()? {
        "chrome" => state.chrome.clone(),
        "edge" => state.edge.clone(),
        "brave" => state.brave.clone(),
        "firefox" => state.firefox.clone(),
        _ => None,
    }
}

async fn handle_connection(stream: TcpStream, addr: SocketAddr, state: BrowserStateHandle) {
    let callback = |request: &Request, response: Response| -> Result<Response, ErrorResponse> {
        if request.uri().path() == "/extension" {
            Ok(response)
        } else {
            Err(not_found_response())
        }
    };

    let Ok(mut websocket) = accept_hdr_async(stream, callback).await else {
        return;
    };

    println!("[WS] Extension connected");

    while let Some(message) = websocket.next().await {
        match message {
            Ok(Message::Text(text)) => handle_text_message(&text, &state),
            Ok(Message::Close(_)) => break,
            Ok(_) => {}
            Err(error) => {
                eprintln!("[WS] Connection error from {addr}: {error}");
                break;
            }
        }
    }

    println!("[WS] Extension disconnected");
}

fn handle_text_message(text: &str, state: &BrowserStateHandle) {
    let Ok(message) = serde_json::from_str::<ExtensionMessage>(text) else {
        eprintln!("[WS] Ignoring malformed extension message");
        return;
    };

    match message.message_type.as_str() {
        "tab_active" => set_browser_tab(state, message),
        "browser_unfocused" => clear_browser_tab(state, &message.browser),
        _ => eprintln!("[WS] Ignoring unknown extension message: {}", message.message_type),
    }
}

fn set_browser_tab(state: &BrowserStateHandle, message: ExtensionMessage) {
    let Some(browser) = normalize_browser_name(&message.browser) else {
        return;
    };

    let tab_info = TabInfo {
        browser: browser.clone(),
        url: message.url.filter(|url| !url.trim().is_empty()),
        title: message.title.filter(|title| !title.trim().is_empty()),
        tab_id: message.tab_id,
        window_id: message.window_id,
        timestamp: message.timestamp,
    };

    let Ok(mut state) = state.write() else {
        eprintln!("[WS] Browser state lock is poisoned");
        return;
    };

    match browser.as_str() {
        "chrome" => state.chrome = Some(tab_info),
        "edge" => state.edge = Some(tab_info),
        "brave" => state.brave = Some(tab_info),
        "firefox" => state.firefox = Some(tab_info),
        _ => {}
    }
}

fn clear_browser_tab(state: &BrowserStateHandle, browser: &str) {
    let Some(browser) = normalize_browser_name(browser) else {
        return;
    };

    let Ok(mut state) = state.write() else {
        eprintln!("[WS] Browser state lock is poisoned");
        return;
    };

    match browser.as_str() {
        "chrome" => state.chrome = None,
        "edge" => state.edge = None,
        "brave" => state.brave = None,
        "firefox" => state.firefox = None,
        _ => {}
    }
}

fn normalize_process_name(process_name: &str) -> Option<String> {
    match process_name.to_ascii_lowercase().as_str() {
        "chrome.exe" => Some("chrome".to_string()),
        "msedge.exe" => Some("edge".to_string()),
        "brave.exe" => Some("brave".to_string()),
        "firefox.exe" => Some("firefox".to_string()),
        _ => None,
    }
}

fn normalize_browser_name(browser: &str) -> Option<String> {
    match browser.to_ascii_lowercase().as_str() {
        "chrome" => Some("chrome".to_string()),
        "edge" => Some("edge".to_string()),
        "brave" => Some("brave".to_string()),
        "firefox" => Some("firefox".to_string()),
        _ => None,
    }
}

fn not_found_response() -> ErrorResponse {
    ErrorResponse::builder()
        .status(StatusCode::NOT_FOUND)
        .body(Some("Not Found".to_string()))
        .unwrap_or_else(|_| ErrorResponse::new(Some("Not Found".to_string())))
}
