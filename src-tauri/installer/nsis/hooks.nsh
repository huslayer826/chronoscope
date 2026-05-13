!macro NSIS_HOOK_POSTINSTALL
  ; Default-on "Start with Windows" behavior for the per-user NSIS installer.
  ; This writes HKCU only, so the installer never needs administrator privileges.
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ChronoScope" '"$INSTDIR\${MAINBINARYNAME}.exe"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ChronoScope"
!macroend
