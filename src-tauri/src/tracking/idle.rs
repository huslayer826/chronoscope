pub const IDLE_THRESHOLD_SECONDS: u64 = 60;

#[cfg(windows)]
pub fn get_idle_seconds() -> u64 {
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    let mut last_input = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };

    let success = unsafe { GetLastInputInfo(&mut last_input) };

    if !success.as_bool() {
        return 0;
    }

    let tick_count = unsafe { GetTickCount() };
    tick_count.saturating_sub(last_input.dwTime) as u64 / 1000
}

#[cfg(not(windows))]
pub fn get_idle_seconds() -> u64 {
    0
}
