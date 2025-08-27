# Secure Local Storage with React Native MMKV

This document describes the secure local storage implementation using [`react-native-mmkv`](https://github.com/mrousavy/react-native-mmkv), with **AES-256 encryption**, **cryptographic key generation**, and **OS keychain/keystore**–backed key storage.

---

## Security Measures

### 1) AES-256 Encryption

- All user data is encrypted at rest with **AES-256** via MMKV’s native encryption.
- Transparent to callers; no application-layer crypto handling required beyond supplying the key.

### 2) Secure Key Management

- A unique **256-bit key** is generated at first run.
- Stored in **iOS Keychain** / **Android Keystore** using `react-native-keychain`.
- Prefer **hardware-backed** storage (`SECURE_HARDWARE`), fall back to `SECURE_SOFTWARE` when necessary.
- Optional gating with **biometrics or device passcode** using:

  - `ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE`.

### 3) Cryptographic Key Generation

- Primary source: `expo-crypto` → `getRandomBytesAsync(32)` (256 bits).
- Fallback: Web Crypto API (if available).
- If no secure randomness is available, initialization fails rather than producing weak keys.

### 4) Secure Reset Controls

- `clearData()` → clears encrypted data, **keeps** key (common logout).
- `completeReset()` → clears encrypted data **and** deletes the key from Keychain/Keystore; all prior data becomes **irrecoverable** (by design) and a new key is generated.

### 5) Operational Safety

- Key is **never stored in plain text** nor in unencrypted MMKV/AsyncStorage.
- Key retrieval is done only at boot/init and not logged.
- Avatar cache stored under app sandbox; metadata persisted in encrypted MMKV.

---

## Security Implementation Details

**Key creation & storage (hardware-backed if possible)**

```ts
await Keychain.setInternetCredentials(
  ENCRYPTION_KEY_SERVICE,
  ENCRYPTION_KEY_ACCOUNT,
  encryptionKey,
  {
    accessControl:
      Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  },
);
```

**Key generation (256-bit, CSPRNG)**

```ts
const bytes = await Crypto.getRandomBytesAsync(32);
const keyHex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
  "",
);
```

**Encrypted MMKV instance**

```ts
this.storage = new MMKV({ id: "encrypted-storage", encryptionKey: keyHex });
```

**Complete reset (secure wipe)**

- Clears MMKV, deletes credentials from Keychain/Keystore, reinitializes with a new key.

---

## Benefits

- **Fast**: MMKV offers low-latency reads/writes for key-value use cases.
- **Secure**: AES-256 at rest; keys isolated in Keychain/Keystore (hardware-backed where available).
- **Resilient**: Restored backups without their original key entry cannot decrypt stored data.
- **Controllable**: Clear vs. full reset flows for user-driven lifecycle control.

---

# Threat Model

This section outlines what the design **protects against**, **assumes**, and **does not** protect against. Use it to align expectations and audits.

## Assets Protected

- User data stored in MMKV (profile JSON, avatar cache metadata, settings).
- The **encryption key** that unlocks the MMKV database.

## Trust Boundaries & Assumptions

- OS Keychain (iOS) / Keystore (Android) provide confidentiality and integrity for stored secrets.
- Device has a lock screen configured (PIN/passcode/biometric) for strongest guarantees.
- App runs in the standard sandbox (non-rooted/non-jailbroken devices yield best guarantees).
- Build is a **release** build with debugging disabled and obfuscation/minification enabled as appropriate.

## Attacker Capabilities & Scenarios

| Scenario                      | Example                                         | Mitigation                                                                                     | Residual Risk                                                                            |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Offline device theft**      | Attacker steals phone and dumps app files       | Data at rest is AES-256 encrypted; key is in Keychain/Keystore (hardware-backed when possible) | If device is rooted/jailbroken or attacker has secure enclave exploits, risk increases   |
| **Backup exposure**           | App data included in iTunes/ADB backup          | Encrypted data is useless without the keychain/keystore entry; keys are not in app sandbox     | If backups include keychain (enterprise/MDM or platform-specific flows), evaluate policy |
| **App sandbox file scraping** | Malware or analyst reads app files              | AES-256 encryption; key not stored with data                                                   | Active malware with escalated privileges may defeat OS isolation                         |
| **Reverse engineering**       | Decompile APK/IPA to extract secrets            | No hardcoded keys; generation at runtime; key in Keychain/Keystore                             | Code and strings still visible; use ProGuard/R8, iOS bitcode/strip symbols as applicable |
| **Memory scraping (runtime)** | Compromised device tries to read process memory | Key exposure minimized by retrieving on init; no plaintext persistence                         | Secrets exist in memory while app is running; advanced attackers may snapshot RAM        |
| **Shoulder surfing/UX leak**  | App switcher screenshots, logs                  | Avoid logging secrets; use sensitive flag on screens if appropriate                            | Some UI states may still appear in recent apps unless secured                            |
| **IPC/intent sniffing**       | Data passed to other apps                       | No sensitive data is shared via intents                                                        | Developer discipline needed: don’t pass secrets via deep links/intents                   |

## Not in Scope / Out of Protection

- **Rooted/jailbroken devices**: OS security guarantees may be bypassed.
- **Active, on-device malware** with high privileges.
- **Supply chain compromises** (e.g., malicious libraries) beyond standard due diligence.
- **Network transport security** (this doc covers local storage; use TLS + cert pinning where applicable).

## Defense-in-Depth Recommendations

1. **Enforce device auth on key access (optional)**
   Keep or tighten:

   ```ts
   accessControl: Keychain.ACCESS_CONTROL
     .BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE;
   ```

   - Pros: User authentication required before releasing the key.
   - Cons: Can impact UX; consider caching window with OS protections if needed.

2. **Root/Jailbreak heuristics (optional)**
   Detect high-risk devices and degrade features or show warnings.

3. **Secure UI & Logs**

   - Avoid logging sensitive data.
   - Mark sensitive screens to prevent OS-generated snapshots (Android: `FLAG_SECURE`; iOS: blur on background).

4. **Build Hardening**

   - Android: enable R8/ProGuard, shrink/obfuscate, remove debug, enable App Integrity/Play Integrity API.
   - iOS: disable debug symbols in release; enable bitcode/strip symbols (as applicable to your toolchain).

5. **Key Rotation Strategy (advanced)**

   - Option A: **Full wipe** via `completeReset()` (current implementation).
   - Option B: **In-place re-encryption** (requires a migration routine that reads/decrypts with old key, re-encrypts with new key).

6. **Incident Response**

   - If compromise suspected: trigger `completeReset()` on next launch and re-authenticate the user.
   - Consider server-side invalidation of tokens tied to local state.

7. **Testing & Verification**

   - Validate that storage is unreadable off-device (adb/idevice backups).
   - Confirm hardware-backed path on representative devices (Keychain/Keystore reports).
   - Ensure biometric/passcode prompts behave as expected across cold/warm starts.

## Configuration Knobs

- **Stricter Access Control**

  ```ts
  accessControl: Keychain.ACCESS_CONTROL
    .BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE;
  // Or BIOMETRY_ANY, or DEVICE_PASSCODE, based on UX needs
  ```

- **Security Level Preference**

  ```ts
  securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE;
  // Fallback to SECURE_SOFTWARE handled in code
  ```

- **Key Lifecycle**

  - `clearData()` → standard logout.
  - `completeReset()` → security event / user-requested wipe.
