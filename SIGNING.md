# Windows Code Signing

ChronoScope can be distributed without a code signing certificate, but Windows
SmartScreen will warn users because the executable has no publisher reputation.
Users can still install it by selecting **More info** and then **Run anyway**.

## Authenticode Signing Later

When a code signing certificate is available, configure the Windows build job
with either a certificate thumbprint or a custom `signtool.exe` command.

Example `signtool.exe` command for a certificate stored in the Windows
certificate store:

```powershell
signtool.exe sign `
  /fd SHA256 `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  /sha1 <CERTIFICATE_THUMBPRINT> `
  "%1"
```

For a PFX certificate, import the PFX into the CI runner or expose it as a
GitHub Actions secret, then sign the generated `.exe` and `.msi` files after
`npm run tauri build`.

## Updater Signing

Tauri updater signatures are separate from Authenticode signatures. Generate an
updater keypair with the Tauri signer, commit the public key to
the GitHub Actions repository variable `TAURI_UPDATER_PUBLIC_KEY`, and store the
private key in GitHub Actions as `TAURI_SIGNING_PRIVATE_KEY`. Store the optional
password as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

The committed `src-tauri/tauri.conf.json` file uses the placeholder
`REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY`; the release workflow replaces it at
build time so the public key does not need to be edited manually on every
machine.
