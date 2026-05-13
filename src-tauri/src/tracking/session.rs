use std::sync::atomic::{AtomicBool, Ordering};

static IS_LOCKED: AtomicBool = AtomicBool::new(false);

pub fn is_locked() -> bool {
    IS_LOCKED.load(Ordering::Relaxed)
}

#[cfg(windows)]
pub fn refresh_lock_state() -> bool {
    use windows::core::PWSTR;
    use windows::Win32::System::RemoteDesktop::{
        WTSFreeMemory, WTSQuerySessionInformationW, WTSConnectState, WTS_CONNECTSTATE_CLASS,
        WTS_CURRENT_SERVER_HANDLE, WTS_CURRENT_SESSION, WTSActive,
    };

    // Polling WTSConnectState keeps the tracker independent from a Tauri window HWND,
    // which makes startup simpler than WTSRegisterSessionNotification in Tauri v2.
    let mut buffer = PWSTR::null();
    let mut bytes_returned = 0u32;
    let success = unsafe {
        WTSQuerySessionInformationW(
            WTS_CURRENT_SERVER_HANDLE,
            WTS_CURRENT_SESSION,
            WTSConnectState,
            &mut buffer,
            &mut bytes_returned,
        )
    };

    if !success.as_bool() || buffer.is_null() || bytes_returned == 0 {
        IS_LOCKED.store(false, Ordering::Relaxed);
        return false;
    }

    let state = unsafe { *(buffer.0 as *const WTS_CONNECTSTATE_CLASS) };
    unsafe {
        WTSFreeMemory(buffer.0 as _);
    }

    let locked = state != WTSActive;
    IS_LOCKED.store(locked, Ordering::Relaxed);
    locked
}

#[cfg(not(windows))]
pub fn refresh_lock_state() -> bool {
    IS_LOCKED.store(false, Ordering::Relaxed);
    false
}
