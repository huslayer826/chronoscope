use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct ActiveWindowInfo {
    pub hwnd: isize,
    pub process_id: u32,
    pub process_name: String,
    pub executable_path: String,
    pub window_title: String,
    pub timestamp: i64,
}

#[cfg(windows)]
mod platform {
    use super::ActiveWindowInfo;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};
    use windows::core::PWSTR;
    use windows::Win32::Foundation::{CloseHandle, BOOL, HANDLE, HWND};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };

    pub fn get_active_window() -> Option<ActiveWindowInfo> {
        let hwnd = foreground_window()?;
        let process_id = window_process_id(hwnd)?;
        let process = ProcessHandle::open(process_id)?;
        let executable_path = query_process_path(process.handle())?;
        let process_name = process_name_from_path(&executable_path)?;
        let window_title = window_title(hwnd)?;
        let timestamp = unix_timestamp()?;

        Some(ActiveWindowInfo {
            hwnd: hwnd.0 as isize,
            process_id,
            process_name,
            executable_path,
            window_title,
            timestamp,
        })
    }

    fn foreground_window() -> Option<HWND> {
        let hwnd = unsafe { GetForegroundWindow() };

        if hwnd.0.is_null() {
            None
        } else {
            Some(hwnd)
        }
    }

    fn window_process_id(hwnd: HWND) -> Option<u32> {
        let mut process_id = 0;
        unsafe {
            GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        }

        if process_id == 0 {
            None
        } else {
            Some(process_id)
        }
    }

    struct ProcessHandle(HANDLE);

    impl ProcessHandle {
        fn open(process_id: u32) -> Option<Self> {
            let handle = unsafe {
                OpenProcess(
                    PROCESS_QUERY_LIMITED_INFORMATION,
                    BOOL(0),
                    process_id,
                )
            }
            .ok()?;

            if handle.0.is_null() {
                None
            } else {
                Some(Self(handle))
            }
        }

        fn handle(&self) -> HANDLE {
            self.0
        }
    }

    impl Drop for ProcessHandle {
        fn drop(&mut self) {
            let _ = unsafe { CloseHandle(self.0) };
        }
    }

    fn query_process_path(process: HANDLE) -> Option<String> {
        let mut buffer = vec![0u16; 32_768];
        let mut size = buffer.len() as u32;

        unsafe {
            QueryFullProcessImageNameW(
                process,
                PROCESS_NAME_WIN32,
                PWSTR(buffer.as_mut_ptr()),
                &mut size,
            )
        }
        .ok()?;

        if size == 0 {
            return None;
        }

        Some(utf16_to_string(&buffer[..size as usize]))
    }

    fn window_title(hwnd: HWND) -> Option<String> {
        let mut buffer = vec![0u16; 512];
        let len = unsafe {
            GetWindowTextW(
                hwnd,
                PWSTR(buffer.as_mut_ptr()),
                buffer.len() as i32,
            )
        };

        if len <= 0 {
            return Some(String::new());
        }

        Some(utf16_to_string(&buffer[..len as usize]))
    }

    fn process_name_from_path(executable_path: &str) -> Option<String> {
        Path::new(executable_path)
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .filter(|name| !name.is_empty())
    }

    fn utf16_to_string(value: &[u16]) -> String {
        OsString::from_wide(value).to_string_lossy().into_owned()
    }

    fn unix_timestamp() -> Option<i64> {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .ok()
            .map(|duration| duration.as_secs() as i64)
    }
}

#[cfg(windows)]
pub use platform::get_active_window;

#[cfg(not(windows))]
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    None
}
