# OTA Hot Update — Universal Implementation Guide

> **Purpose:** This document is a self-contained guide for implementing Strapi-backed OTA (Over-The-Air) hot updates in **any** React Native project. An AI agent (or developer) can read this and implement the full feature — UI, logic, API, CI scripts — from scratch.
>
> **Fill in the configuration values in §1** (CMS URL/host, tenant slug, entry file, toolchain, app version source) **and the CMS field mapping in §1b**. Everything else is provided.

---

## ⚠️ RULES FOR AI AGENTS — READ BEFORE WRITING ANY CODE

> **This guide is often pasted into an AI prompt without being read by the user first.** Many values below are placeholders, and some project setups change how the feature must work. You MUST NOT fill gaps with guesses.

### Rule 1 — Investigate first, implement second

Before creating or modifying **any** file, complete the **Pre-flight Investigation** (below) and report the findings to the user.

### Rule 2 — STOP and ASK the user when anything is missing or conflicting

If **any** of the following is true, **stop, list every open question in one message, and wait for the user's answers.** Do not implement "a reasonable default" and do not continue with a partial implementation.

| # | Situation | What to ask the user |
|---|---|---|
| 1 | **Any** §1 value (`PROJECT_TYPE`, `CMS_URL`, `CMS_URL_DOMAIN`, `TENANT_SLUG`, `ENTRY_FILE`, `APP_VERSION_SOURCE`) is still a placeholder (`___` or an unselected `a \| b` choice), **even if you think you can find it in the project** | The value for each environment (dev/staging/prod) and where it should be stored. You may show what you found in the project as a suggestion (file + value), but only use it after the user confirms |
| 2 | The project has **no clear env/config pattern**, or **several conflicting** ones | Which pattern to follow for the new values |
| 3 | §1b CMS field mapping still contains `___` placeholders, or the user has not confirmed the defaults match their CMS | Their real endpoint names, field names and a **sample JSON response** for each endpoint (see §1b "If the mapping is unknown") |
| 4 | The CMS endpoints / collections in §1b **do not exist yet** | Whether they want to create them. If yes, give them the step-by-step schema from §17 and wait until they confirm and share a sample response |
| 5 | The CMS is **not Strapi**, or is **Strapi v5** | Confirm the CMS + version; explain that types, parsing and the upload script must be adapted (§17 "Strapi v5") |
| 6 | `expo-updates` (or another OTA solution: CodePush, `react-native-code-push`, EAS Update, Hot Updater, etc.) is installed | Whether to remove/disable it. **Never remove it on your own** — it may be in active use |
| 7 | Hermes is disabled (app uses JSC) | Enable Hermes, or ship plain JS bundles without `hermesc`? |
| 8 | `rn-fetch-blob` and `react-native-blob-util` would both end up installed | Which one to keep |
| 9 | The project already has a store-version / force-update check, an app-update modal, or a foreground (`AppState`) tracker | Replace, reuse, or keep both? |
| 10 | `APP_VERSION_SOURCE` is filled but the project has several version values that disagree (e.g. `app.json`, `package.json`, native files) | Confirm the filled source is the one used for the store build |
| 11 | CI provider is not GitHub Actions, or the branch(es)/tenant(s) that should publish OTA bundles are unknown | Their CI provider, trigger branch(es), and tenant name per branch |
| 12 | Any step in this guide would **delete, overwrite or significantly restructure** existing project code (AppDelegate, MainApplication, app root, existing services) | Show the planned change and get approval first |

> When asking, be specific: quote what you found (file + value), what is missing, and offer the default from this guide as a suggestion the user can accept.

### Rule 3 — Never invent values

Never invent URLs, hostnames, tenant slugs, tokens, endpoint names or CMS field names. A placeholder that stays a placeholder (`YOUR_CMS_URL_HERE`, `___`) in committed code is a bug.

### Pre-flight Investigation (do this first, report results to the user)

```
[ ] Toolchain: Expo (managed / prebuild) or bare RN CLI? RN version?
[ ] JS engine: Hermes enabled?
[ ] Existing OTA libs: expo-updates / CodePush / EAS Update / other?
[ ] Existing blob/download libs: rn-fetch-blob / react-native-blob-util?
[ ] Existing version-check / force-update / AppState logic?
[ ] All §1 values filled in by the user (no `___` / unselected choices left)? If not → ask
[ ] Env/config pattern used by the project (see §1) — where the §1 values will be stored
[ ] Filled values consistent with the project (e.g. APP_VERSION_SOURCE matches the store build version)
[ ] HTTP client in use (fetch / axios / apisauce / ky ...)
[ ] i18n system in use (§12)
[ ] Web target? (needs §9 stub)
[ ] Package manager (yarn v1 / berry / npm / pnpm) and CI provider
[ ] CMS field mapping (§1b) filled and confirmed by the user?
```

Only after every item is resolved (found in the project **or** answered by the user) may you start the Quick Start Checklist.

---

## Quick Start Checklist

```
[ ] 0a. Pre-flight investigation done + all open questions answered by the user (Rules above)
[ ] 0b. Verify prerequisites (§0)
[ ] 1. Fill in configuration (§1) and CMS field mapping (§1b)
[ ] 2. Install dependencies (§3)
[ ] 3. Native setup for react-native-ota-hot-update (§4)
[ ] 4. Add TypeScript types (§5)
[ ] 5. Add platform helpers (§6)
[ ] 6. Add UpdateService (§7)
[ ] 7. Add useUpdateVersion hook + web stub (§8–§9)
[ ] 8. Add UpdatingComponent UI (§10)
[ ] 9. Mount overlay in root app (§11)
[ ] 10. Add i18n strings (§12)
[ ] 11. Add bundle export + hotupdate scripts (§13–§15)
[ ] 12. Ensure dist/ is in .gitignore (§13)
[ ] 13. Add CI workflow (§16)
[ ] 14. Test on device in release mode (§18)
```

---

## §0. Prerequisites — Verify Before Starting

> **AI agents:** for every row that is "not met", **STOP and ask the user** (see Rule 2). Do not fix it on your own.

| Requirement | How to check | If not met |
|---|---|---|
| **Strapi v4** | Check the CMS `package.json` (`@strapi/strapi` 4.x), or call any endpoint and confirm the response shape is `{ data: [{ id, attributes: {...} }] }` | This guide's types, parsing (`attributes`, `bundle.data.attributes.url`) and multipart upload (`files.bundle`) are **Strapi v4 only**. Ask the user, then see §17 "Strapi v5". |
| **Hermes enabled** | Expo: `jsEngine` is not set to `"jsc"` in `app.json`. Bare: `hermesEnabled=true` in `android/gradle.properties`, `:hermes_enabled => true` (or not disabled) in `ios/Podfile` | OTA bundles are Hermes bytecode (`.hbc`). A JSC app will crash loading them. Ask the user: enable Hermes, or skip the `hermesc` step in §13 and ship plain JS bundles? |
| **No `expo-updates` / other OTA lib** | `expo-updates`, `react-native-code-push` or similar not in `package.json` | They also override the bundle URL and conflict with this library. **Ask the user** whether to remove/disable it. Never remove it without approval. |
| **Not Expo Go** | Project uses a dev client / EAS Build / bare native folders | The library has native code and does not run in Expo Go. |
| **CLI tools** | `curl`, `jq`, `zip` available on the machine/CI runner that uploads bundles | Install them (preinstalled on GitHub `ubuntu-latest`). |

---

## §1. Configuration — Fill These In

> **The user fills in this block before handing the guide to an AI.**
> **AI agents:** if any value below is still a placeholder (`___`) or an unselected choice (`expo | react-native-cli`), **STOP and ask the user** (Rule 2, row 1). Do not take the value from the project on your own; you may only suggest what you found and wait for confirmation.

```
PROJECT_TYPE     = expo | react-native-cli     # Which toolchain?
CMS_URL          = https://_______________     # Strapi base URL (for app reads)
CMS_URL_DOMAIN   = _______________             # Strapi host only, no https:// (for CI uploads)
TENANT_SLUG      = _______________             # Your tenant name in Strapi
ENTRY_FILE       = index.tsx | index.js        # Metro entry file
```

> Each project differentiates by **tenant slug**, not by CMS URL. Multiple apps can share the same Strapi instance. `CMS_URL` is the full URL used by the app at runtime. `CMS_URL_DOMAIN` is the host-only value used by CI upload scripts. They are usually the same host; keep them separate only if reads go through a different host (e.g. a CDN) than uploads.

### Where to store these values — IMPORTANT: investigate the project first

> **DO NOT guess or hardcode env values.** Before writing any config code, you MUST deeply investigate how the target project manages environment configuration. Every project does it differently, and getting this wrong will break the entire feature.

**Step-by-step investigation (do ALL of these before writing code):**

1. **Find env files:** Search the project root for `.env`, `.env.*`, `env/`, `.env.local`, `.env.development`, `.env.production`, or any `*.env` files. Read their contents to understand the format (KEY=VALUE, JSON, etc.).

2. **Find config modules:** Search for files named `config.ts`, `config.js`, `config/index.ts`, `environment.ts`, `env.ts`, or similar. Read them to understand how env values are loaded and exported at runtime.

3. **Check package.json for env libraries:**
   - `react-native-config` → reads `.env` files, accessed via `Config.KEY`
   - `react-native-dotenv` → reads `.env` files, accessed via `import { KEY } from '@env'`
   - `expo-constants` → reads `app.json` / `app.config.ts`, accessed via `Constants.expoConfig.extra`
   - `react-native-ultimate-config` → reads `.env` with code generation
   - If none of these exist, the project likely uses a custom config module or hardcoded values

4. **Trace an existing env value:** Pick any API URL or config value you can find in the source code (e.g., `API_URL`, `BASE_URL`). Trace it from where it's **defined** (env file, JSON, etc.) → how it's **loaded** (library, import, build step) → how it's **accessed** in runtime code (e.g., `Config.API_URL`). This is the exact pattern you must follow for `CMS_URL`, `CMS_URL_DOMAIN`, and `slug`.

5. **Check for build-time env switching:** Look for scripts in `package.json` that copy/switch env files per environment (e.g., `preEnv`, `prebuild`, `configure`, `setup`). Some projects generate a config file from env before building.

**Common patterns (for reference, NOT as a default — always verify against the actual project):**

| Pattern | Where config lives | How to read at runtime |
|---|---|---|
| `.env` files | `.env`, `.env.myapp`, `.env.otherapp` | `react-native-config` → `Config.CMS_URL` |
| JSON per tenant | `config/<tenant>.json` | Build script copies to runtime config |
| `app.json` / `app.config.ts` | `app.json` → `extra.env.*` | `Constants.expoConfig?.extra?.env?.CMS_URL` |
| Hardcoded config file | `app/config/index.ts` | `import Config from "@/config"` |

**After investigation**, add `CMS_URL`, `CMS_URL_DOMAIN`, and `slug` following the **exact same pattern** that existing env values use. Do not invent a new pattern.

**For CI scripts** (`hotupdate.sh`, `release.sh`): the scripts need to read `CMS_URL_DOMAIN` and `version` from the tenant's config. The script takes a **tenant name** as argument (e.g. `yarn hotupdate myapp`). Adapt the read commands in the scripts to match however the project stores these values (see §14 and §15 for placeholder examples).

### APP_VERSION_SOURCE — where the CI script reads the app version

> This is **NOT an env variable** to declare in the project. It is a note for the AI/developer to know where to find the native app version so the CI script (`release.sh`) can read it at build time.

The `release.sh` script needs the native app **marketing version** (e.g. `1.2.0`) to set `targetVersion` when uploading a bundle to Strapi. This version must match what users have installed, so it must come from the same source of truth as the native build.

**Investigate where the project defines its version**, then fill in below:

```
APP_VERSION_SOURCE = _______________
# Example: "app.json → expo.version"
# Example: "config/$tenant.json → version field"
# Example: "package.json → version field"
```

The AI will read this description and write the corresponding shell command in `release.sh` (§15) to replace the `__READ_APP_VERSION_HERE__` placeholder.

> **If any §1 value (including `APP_VERSION_SOURCE`) is still `___` → STOP and ask the user (Rule 2, row 1).** The investigation above is for deciding **where/how** to store the values the user provided, not for choosing the values yourself.

---

## §1b. CMS Schema & Field Mapping — Fill These In

The code in §5, §7, §8 and §15 reads specific endpoints and fields from the CMS. **Your CMS may use different names.** Fill in the "Your value" column below. The "Suggested default" column is a proven schema you can create as-is if you are starting from scratch (full setup steps in §17).

### Endpoints

| Key | Purpose | Suggested default | Your value |
|---|---|---|---|
| `EP_TENANT` | Collection holding per-app settings (min store version, store URLs) | `/api/tenants` | `___` |
| `EP_BUNDLE_IOS` | Collection holding iOS OTA bundles | `/api/ios-bundles` | `___` |
| `EP_BUNDLE_ANDROID` | Collection holding Android OTA bundles | `/api/android-bundles` | `___` |

### Tenant fields (`EP_TENANT`)

| Key | Type | Purpose | Suggested default | Your value |
|---|---|---|---|---|
| `F_TENANT_NAME` | Short text | Identifier the app filters by (= `TENANT_SLUG`) | `name` | `___` |
| `F_IOS_MIN_VERSION` | Short text (semver) | Minimum required iOS native version, e.g. `"1.2.0"` | `iosVersion` | `___` |
| `F_ANDROID_MIN_VERSION` | Short text (semver) | Minimum required Android native version | `androidVersion` | `___` |
| `F_IOS_STORE_URL` | Short text | App Store URL | `iosUrl` | `___` |
| `F_ANDROID_STORE_URL` | Short text | Play Store URL | `androidUrl` | `___` |

### Bundle fields (`EP_BUNDLE_IOS` / `EP_BUNDLE_ANDROID`)

| Key | Type | Purpose | Suggested default | Your value |
|---|---|---|---|---|
| `F_BUNDLE_VERSION` | Auto-increment integer | Bundle version compared with `HotUpdate.getCurrentVersion()` | `id` (Strapi record id) | `___` |
| `F_TARGET_VERSION` | Short text | Native app version this bundle is built for (exact match) | `targetVersion` | `___` |
| `F_STATUS` | Boolean | `true` = active, `false` = disabled | `status` | `___` |
| `F_REQUIRED` | Boolean | `true` = user cannot skip | `required` | `___` |
| `F_NOTE` | Text | Release note (optional) | `note` | `___` |
| `F_BUNDLE_FILE` | Media (single file) | The uploaded Hermes zip | `bundle` | `___` |
| `F_BUNDLE_FILE_URL` | (path) | Path to the download URL inside the response item | `attributes.bundle.data.attributes.url` (Strapi v4) | `___` |
| `F_TENANT_RELATION` | Relation → tenant | Which app/tenant this bundle belongs to | `tenant` (filtered by `tenant.name`) | `___` |

### Reference responses (suggested default schema, Strapi v4)

Use these to compare against the user's real responses.

`GET {CMS_URL}/api/tenants?filters[name][$eq]=myapp`

```json
{
  "data": [
    {
      "id": 3,
      "attributes": {
        "name": "myapp",
        "iosVersion": "1.2.0",
        "androidVersion": "1.2.0",
        "iosUrl": "https://apps.apple.com/app/id0000000000",
        "androidUrl": "https://play.google.com/store/apps/details?id=com.example.myapp"
      }
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

`GET {CMS_URL}/api/ios-bundles?populate[bundle]=*&filters[targetVersion][$eq]=1.2.0&filters[tenant][name][$eq]=myapp&filters[status][$eq]=true&sort=id:desc&pagination[pageSize]=1`

```json
{
  "data": [
    {
      "id": 42,
      "attributes": {
        "note": "release myapp ios bundle",
        "targetVersion": "1.2.0",
        "status": true,
        "required": true,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z",
        "bundle": {
          "data": {
            "id": 101,
            "attributes": {
              "name": "hermes.ios.hbc.zip",
              "url": "https://cms.example.com/uploads/hermes_ios_hbc_abc123.zip",
              "size": 1234.56,
              "mime": "application/zip"
            }
          }
        }
      }
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 1, "pageCount": 1, "total": 1 } }
}
```

> Strapi may return the media `url` as a **relative path** (`/uploads/...`) when using the local upload provider. In that case prefix it with `CMS_URL` before downloading.

### How the AI must use this mapping

1. **All `Your value` cells filled** → use those names everywhere the guide uses the suggested defaults (types §5, query strings §7, parsing in §8, `jq` paths and JSON keys in §15).
2. **User says "use the defaults"** → use the suggested defaults, but still ask for (or fetch, if a public URL is given) **one real response per endpoint** and verify it matches the reference responses above before writing parsing code.
3. **Cells still `___` and the user has not answered** → **STOP and ask** (Rule 2). See below.

### If the mapping is unknown — what to ask the user

Send the user one message like this (adapt it):

> To implement OTA updates I need to know how your CMS exposes update data. Please choose one:
>
> **A. You already have these endpoints.** Share:
> 1. The endpoint paths for app settings and for iOS/Android bundles
> 2. A sample JSON response for each (copy it from the browser or `curl`, with any secrets removed)
> 3. Which field is the minimum store version, store URL, bundle version, target app version, active flag, required flag and file URL
>
> **B. You don't have them yet.** I can walk you through creating them in Strapi using the suggested schema (tenant collection + `ios-bundles` + `android-bundles`, see §17). After you create them and upload one test bundle, send me a sample response from each endpoint so I can confirm the shape.
>
> **C. You use a different CMS or your own API.** Tell me which one and share sample responses; I'll adapt the types, service and upload script.

Do not write the service, types, hook parsing or upload script until the user has answered.

---

## §2. Architecture

Two-layer update strategy:

1. **Store version check** — Calls Strapi tenant to compare the installed native app version against the minimum required version. If behind → prompt user to go to App Store / Play Store.
2. **OTA bundle check** — If native version is OK, fetch the latest Hermes bytecode bundle from Strapi. If newer than what's installed → download zip → install → auto-restart.

```
App comes to foreground (release build only)
  │
  ├─ GET /api/tenants → compare native version
  │    ├─ app < store min → Prompt: "Go to store"
  │    └─ app >= store min ─┐
  │                         │
  └─────────────────────────┤
                            │
  GET /api/{platform}-bundles → compare bundle version
       ├─ server > local (first install) → Silent download + restart
       ├─ server > local (existing)      → Prompt → Download → Restart
       └─ server <= local                → Do nothing
```

---

## §3. Dependencies

> **Before installing**, check your `package.json` — skip any package that already exists in the project.

```bash
yarn add react-native-ota-hot-update react-native-blob-util compare-versions react-native-device-info
```

| Package | Purpose | Skip if you already have |
|---|---|---|
| `react-native-ota-hot-update` | OTA bundle download, install, restart | — (required) |
| `react-native-blob-util` | File download manager (passed to HotUpdate) | `rn-fetch-blob` (but do NOT have both — causes duplicate symbol errors on iOS) |
| `compare-versions` | Semver comparison for store version check | Any semver comparison utility |
| `react-native-device-info` | Gets native app marketing version | `expo-application`, `expo-constants`, or any other way to get the app version |

After install, **rebuild native apps** (iOS `pod install` + Xcode build, Android Gradle build) to link native modules.

---

## §4. Native Setup — react-native-ota-hot-update

Reference: [`react-native-ota-hot-update`](https://github.com/vantuan88291/react-native-ota-hot-update)

### 4.1 Expo Projects

Add the plugin to `app.json`:

```json
{
  "plugins": [
    "react-native-ota-hot-update"
  ]
}
```

Then run `npx expo prebuild --clean` to regenerate native projects. The plugin handles all native configuration automatically.

> **Important:** This library requires native code. It will NOT work with Expo Go. You must use a custom dev client (`npx expo run:ios` / `npx expo run:android`) or EAS Build.

### 4.2 Bare React Native CLI Projects

Autolinking handles most setup. Run `cd ios && pod install` after `yarn add`.

#### iOS — AppDelegate

**Objective-C (React Native < 0.77) — `AppDelegate.mm`:**

```objc
#import "OtaHotUpdate.h"

- (NSURL *)bundleURL {
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
  #else
    return [OtaHotUpdate getBundle];
  #endif
}
```

**Swift (React Native >= 0.77) — `AppDelegate.swift`:**

```swift
import react_native_ota_hot_update

override func bundleURL() -> URL? {
  #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
  #else
    OtaHotUpdate.getBundle()
  #endif
}
```

#### Android — MainApplication

**Kotlin (React Native < 0.82) — `MainApplication.kt`:**

```kotlin
import com.otahotupdate.OtaHotUpdate

override val reactNativeHost: ReactNativeHost =
  object : DefaultReactNativeHost(this) {
    override fun getJSBundleFile(): String? {
      return OtaHotUpdate.bundleJS(this@MainApplication)
    }
  }
```

**Kotlin (React Native >= 0.82) — `MainApplication.kt`:**

```kotlin
import com.otahotupdate.OtaHotUpdate

override val reactHost: ReactHost by lazy {
  getDefaultReactHost(
    context = applicationContext,
    packageList = PackageList(this).packages,
    jsBundleFilePath = OtaHotUpdate.bundleJS(applicationContext)
  )
}
```

**Java — `MainApplication.java`:**

```java
import com.otahotupdate.OtaHotUpdate;

@Nullable
@Override
protected String getJSBundleFile() {
  return OtaHotUpdate.getBundleJS(this);
}
```

> Depending on the project's Kotlin/JDK version, the Java call may need to be `OtaHotUpdate.Companion.getBundleJS(this)`. Use Android Studio autocomplete to confirm the exact form.

> **Crash auto-rollback:** `bundleJS(context)` enables the built-in crash handler by default (if the app crashes within ~2s of startup on an OTA bundle, the library restores the previous bundle and restarts). Only pass `false` as the second argument (`OtaHotUpdate.bundleJS(this@MainApplication, false)`) if you explicitly want to disable it.

#### Android — AndroidManifest.xml

Required by the library's download/unzip flow:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<application ... android:requestLegacyExternalStorage="true" >
```

### 4.3 Optional: iOS Background Download

To continue downloading when the app is backgrounded:

**Objective-C — `AppDelegate.h` / `AppDelegate.mm`:**

```objc
// AppDelegate.h
@property (nonatomic, assign) UIBackgroundTaskIdentifier taskIdentifier;

// AppDelegate.mm
- (void)applicationWillResignActive:(UIApplication *)application {
  if (self.taskIdentifier != UIBackgroundTaskInvalid) {
    [application endBackgroundTask:self.taskIdentifier];
    self.taskIdentifier = UIBackgroundTaskInvalid;
  }
  __weak AppDelegate *weakSelf = self;
  self.taskIdentifier = [application beginBackgroundTaskWithName:nil expirationHandler:^{
    if (weakSelf) {
      [application endBackgroundTask:weakSelf.taskIdentifier];
      weakSelf.taskIdentifier = UIBackgroundTaskInvalid;
    }
  }];
}
```

**Swift (RN >= 0.77):**

```swift
class AppDelegate: RCTAppDelegate {
  var taskIdentifier: UIBackgroundTaskIdentifier = .invalid

  public override func applicationDidEnterBackground(_ application: UIApplication) {
    if taskIdentifier != .invalid {
      application.endBackgroundTask(taskIdentifier)
      taskIdentifier = .invalid
    }
    taskIdentifier = application.beginBackgroundTask(withName: "OTAUpdate") { [weak self] in
      if let strongSelf = self {
        application.endBackgroundTask(strongSelf.taskIdentifier)
        strongSelf.taskIdentifier = .invalid
      }
    }
  }

  public override func applicationWillEnterForeground(_ application: UIApplication) {
    if taskIdentifier != .invalid {
      application.endBackgroundTask(taskIdentifier)
      taskIdentifier = .invalid
    }
  }
}
```

### 4.4 Verify

After setup, **clean build** a release version on a real device and confirm the app launches correctly before proceeding.

---

## §5. TypeScript Types

Create `update.types.ts` (or add to your existing API types file):

> **Field names:** the code below uses the **suggested defaults** from §1b. If the user's mapping differs, replace every field name and nesting path in these types accordingly. If §1b is not filled/confirmed yet, STOP and ask (Rule 2).

```ts
// update.types.ts

export interface UpdateApiResult<T = any> {
  kind: "ok" | "bad-data" | "bad request"
  data: T
}

/**
 * Strapi tenant response — contains minimum app versions and store URLs.
 */
export interface DataUpdate {
  data: {
    id: number
    attributes: {
      name: string
      iosVersion: string        // e.g. "1.2.0" — minimum required iOS version
      androidVersion: string    // e.g. "1.2.0" — minimum required Android version
      iosUrl: string            // App Store URL
      androidUrl: string        // Play Store URL
      [key: string]: any        // other tenant fields (ignored by update logic)
    }
  }[]
}

/**
 * Strapi bundle response — contains OTA bundle metadata.
 * `id` is used as the bundle version number by react-native-ota-hot-update.
 */
export interface DataUpdateBundle {
  data: {
    id: number // This IS the bundle version — compared with HotUpdate.getCurrentVersion()
    attributes: {
      note: string
      targetVersion: string     // Must match native app marketing version exactly
      status: boolean           // true = active, false = disabled
      required: boolean         // true = user cannot skip the update
      createdAt: string
      updatedAt: string
      bundle: {
        data: {
          id: number
          attributes: {
            name: string
            url: string         // Download URL for the Hermes bytecode zip
            size: number
            mime: string        // "application/zip"
            [key: string]: any
          }
        }
      }
    }
  }[]
}
```

---

## §6. Platform & Version Helpers

Create `utils/platform.ts` (or add to your utils):

```ts
// utils/platform.ts
import { Platform } from "react-native"

export const ios = Platform.OS === "ios"
export const isWeb = Platform.OS === "web"
```

**Getting the native app version — choose based on your project type:**

### Option A: react-native-device-info (works everywhere)

```ts
// utils/platform.ts (continued)
import DeviceInfo from "react-native-device-info"
export const appVersion = DeviceInfo.getVersion() // e.g. "1.2.0"
```

### Option B: expo-application (Expo projects)

```ts
// utils/platform.ts (continued)
import * as Application from "expo-application"
export const appVersion = Application.nativeApplicationVersion ?? "0.0.0"
```

### Option C: expo-constants (Expo projects, legacy)

```ts
// utils/platform.ts (continued)
import Constants from "expo-constants"
export const appVersion = Constants.expoConfig?.version ?? "0.0.0"
```

Pick whichever matches your project. The rest of this guide uses `appVersion`.

---

## §7. Update Service (HTTP Client Agnostic)

This service uses **`fetch`** (available in all RN environments). No axios/apisauce dependency needed.

> **Field names:** the code below uses the **suggested defaults** from §1b. If the user's mapping differs, replace the endpoint paths and `filters[...]` field names accordingly. If §1b is not filled/confirmed yet, STOP and ask (Rule 2).

Create `services/updateService.ts`:

```ts
// services/updateService.ts
import type { UpdateApiResult, DataUpdate, DataUpdateBundle } from "./update.types"
import { ios, isWeb, appVersion } from "../utils/platform"

// ──────────────────────────────────────────────
// IMPORTANT: DO NOT hardcode values here.
// You MUST first investigate how this project
// manages env/config (see §1 for full guide).
//
// Find an existing env value (e.g. API_URL) in
// the codebase and trace how it's defined, loaded,
// and accessed. Then follow the EXACT same pattern
// for CMS_URL and TENANT_SLUG.
//
// Common patterns (verify against the project):
//
//   react-native-config (.env):
//     import Config from "react-native-config"
//     const CMS_URL = Config.CMS_URL
//
//   Custom config module:
//     import Config from "@/config"
//     const CMS_URL = Config.CMS_URL
//
//   Expo (app.json / app.config.ts):
//     import Constants from "expo-constants"
//     const CMS_URL = Constants.expoConfig?.extra?.env?.CMS_URL
// ──────────────────────────────────────────────
const CMS_URL = "YOUR_CMS_URL_HERE"       // <-- REPLACE following the project's env pattern
const TENANT_SLUG = "YOUR_SLUG_HERE"      // <-- REPLACE following the project's env pattern
// ──────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<UpdateApiResult<T>> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      return { kind: "bad-data", data: null as T }
    }
    const data = await res.json()
    return { kind: "ok", data }
  } catch {
    return { kind: "bad-data", data: null as T }
  }
}

export const updateService = {
  /**
   * Check minimum native app version + store URLs from Strapi tenant.
   */
  async requestUpdateStore(): Promise<UpdateApiResult<DataUpdate>> {
    const url =
      `${CMS_URL}/api/tenants` +
      `?filters[name][$eq]=${encodeURIComponent(TENANT_SLUG)}` +
      `&fields[0]=name&fields[1]=iosVersion&fields[2]=androidVersion` +
      `&fields[3]=iosUrl&fields[4]=androidUrl`
    return fetchJson<DataUpdate>(url)
  },

  /**
   * Fetch latest active OTA bundle metadata for the current platform + native version.
   * Filtered by targetVersion (must match native app version exactly), tenant and status.
   * Sorted by id:desc and limited to 1 so the only result is the latest active bundle.
   */
  async requestUpdateBundle(): Promise<UpdateApiResult<DataUpdateBundle>> {
    if (isWeb) {
      return { kind: "bad request", data: null as never }
    }
    const endpoint = ios ? "ios-bundles" : "android-bundles"
    const url =
      `${CMS_URL}/api/${endpoint}` +
      `?populate[bundle]=*` +
      `&filters[targetVersion][$eq]=${encodeURIComponent(appVersion)}` +
      `&filters[tenant][name][$eq]=${encodeURIComponent(TENANT_SLUG)}` +
      `&filters[status][$eq]=true` +
      `&sort=id:desc` +
      `&pagination[pageSize]=1`
    return fetchJson<DataUpdateBundle>(url)
  },
}
```

> **If your project already uses axios/apisauce/ky/etc.:** Replace `fetchJson` with your HTTP client. The contract is simple: return `{ kind: "ok", data: strapiJson }` on success, `{ kind: "bad-data", data: ... }` on failure.

---

## §8. Hook: useUpdateVersion

This is the core logic. It handles: version checks, download, progress tracking, error/retry, and foreground-only triggering.

> **Field names:** the code below uses the **suggested defaults** from §1b. If the user's mapping differs, replace every `attributes.*` access (min versions, store URLs, `status`, `required`, file URL path, bundle version) accordingly. If §1b is not filled/confirmed yet, STOP and ask (Rule 2).

Create `components/update-component/useUpdateVersion.ts`:

```ts
// components/update-component/useUpdateVersion.ts
import { compareVersions, validate } from "compare-versions"
import { ios, isWeb, appVersion } from "../../utils/platform"
import { AppState, LayoutAnimation, Linking } from "react-native"
// @ts-ignore — no TS types published
import HotUpdate from "react-native-ota-hot-update"
import ReactNativeBlobUtil from "react-native-blob-util"
import { useEffect, useRef, useState } from "react"
import { updateService } from "../../services/updateService"

// ──────────────────────────────────────────────
// CONFIGURE: check if the project has a DEBUG or
// environment flag in its config. If so, use it:
//   const IS_DEBUG = Config.DEBUG
// Otherwise, __DEV__ is a safe default.
// ──────────────────────────────────────────────
const IS_DEBUG = __DEV__
const MAX_BUNDLE_VERSIONS_PROD = 2
// ──────────────────────────────────────────────

export type UpdateState = "idle" | "prompt" | "downloading" | "error"

export const useUpdateVersion = () => {
  const [updateState, setUpdateState] = useState<UpdateState>("idle")
  const [isRequired, setIsRequired] = useState(false)
  const [isStoreUpdate, setIsStoreUpdate] = useState(false)
  const [progress, setProgress] = useState(0)
  const isUpgrading = useRef(false)
  const bundleInfo = useRef({ url: "", version: 0 })
  const storeUrl = useRef("")

  // ── Track foreground/background ───────────────────────────
  const [isBackground, setIsBackground] = useState(false)

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setIsBackground(state !== "active")
    })
    return () => sub.remove()
  }, [])

  // ── Download & install bundle ─────────────────────────────
  const startUpdateBundle = (url: string, bundleVersion: number) => {
    setUpdateState("downloading")
    setProgress(0)
    isUpgrading.current = true
    HotUpdate.downloadBundleUri(ReactNativeBlobUtil, url, bundleVersion, {
      updateSuccess: () => {
        setProgress(100)
        // App will auto-restart due to restartAfterInstall: true
      },
      updateFail() {
        setUpdateState("error")
        isUpgrading.current = false
      },
      restartAfterInstall: true,
      maxBundleVersions: MAX_BUNDLE_VERSIONS_PROD,
      progress(received: string, total: string) {
        const percent = (+received / +total) * 100
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setProgress(percent)
      },
    })
  }

  // ── Check for OTA bundle update ───────────────────────────
  const checkUpdateBundle = async () => {
    const bundle = await updateService.requestUpdateBundle()
    const currentVersion = await HotUpdate.getCurrentVersion()

    if (bundle.kind === "ok" && bundle.data?.data?.length) {
      // Server already filters status=true; keep the client-side check as a safety net
      const [activeBundle] = bundle.data.data.filter((item) => item?.attributes?.status)
      const latestVersion = activeBundle?.id || 0

      const bundleUrl = activeBundle?.attributes?.bundle?.data?.attributes?.url

      if (bundleUrl && latestVersion > currentVersion) {
        bundleInfo.current = {
          url: bundleUrl,
          version: latestVersion,
        }

        if (currentVersion === 0) {
          // First install: download silently without prompting
          startUpdateBundle(bundleInfo.current.url, latestVersion)
        } else {
          // Existing install: show prompt
          setIsStoreUpdate(false)
          setIsRequired(!!activeBundle?.attributes?.required)
          setUpdateState("prompt")
        }
      }
    } else {
      // No bundles found — if first install, mark version as 1 to skip future silent downloads
      if (currentVersion === 0) {
        HotUpdate.setCurrentVersion(1)
      }
    }
  }

  // ── Main check: store version first, then bundle ─────────
  const checkUpdate = async () => {
    const store = await updateService.requestUpdateStore()

    if (store.kind === "ok" && store.data?.data?.length) {
      const [tenant] = store.data.data
      const requiredVersion = ios
        ? tenant?.attributes?.iosVersion
        : tenant?.attributes?.androidVersion

      // Guard: compareVersions throws on empty/invalid input (e.g. field left blank in CMS)
      const isBehindStore =
        validate(appVersion) &&
        !!requiredVersion &&
        validate(requiredVersion) &&
        compareVersions(appVersion, requiredVersion) < 0

      if (isBehindStore) {
        // Native app is behind required store version → force store update
        storeUrl.current = ios
          ? tenant?.attributes?.iosUrl
          : tenant?.attributes?.androidUrl
        setIsStoreUpdate(true)
        setIsRequired(true)
        setUpdateState("prompt")
      } else {
        // Native version OK → check for OTA bundle
        checkUpdateBundle()
      }
    } else {
      // Store check failed → still try bundle check
      checkUpdateBundle()
    }
  }

  // ── User actions ──────────────────────────────────────────
  const actionUpdate = () => {
    if (isStoreUpdate) {
      setTimeout(() => {
        Linking.openURL(storeUrl.current)
      }, 500)
    } else {
      startUpdateBundle(bundleInfo.current.url, bundleInfo.current.version)
    }
  }

  const actionRetry = () => {
    startUpdateBundle(bundleInfo.current.url, bundleInfo.current.version)
  }

  const actionSkip = () => {
    setUpdateState("idle")
  }

  // ── Trigger check on foreground ───────────────────────────
  useEffect(() => {
    if (!IS_DEBUG && !isWeb && !isBackground && !isUpgrading.current) {
      checkUpdate().catch(() => {
        // Never let an update check crash the app; silently retry on next foreground
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBackground])

  return {
    updateState,
    isRequired,
    isStoreUpdate,
    progress,
    actionUpdate,
    actionRetry,
    actionSkip,
  }
}
```

### Key behaviors

| Scenario | Behavior |
|---|---|
| `currentVersion === 0` (first install, no bundle yet) | Downloads silently without prompting, shows only progress bar, auto-restarts |
| `required === true` on bundle | Cancel button is hidden, user must update |
| Native app behind store minimum | Always required, opens App Store / Play Store |
| Store check fails | Falls through to bundle check (graceful degradation) |
| Download fails | Shows error state with Retry + Cancel. Cancel is shown even for `required` bundles **on purpose**, so a broken bundle URL can never lock users out of the app. Drop the `isError` condition on the Cancel button in §10 if you prefer a hard block. |
| Already upgrading | `isUpgrading` ref prevents concurrent checks |
| Store version empty/invalid in CMS | Store check is treated as "OK" and falls through to bundle check (no crash) |
| Bundle has no file URL | Ignored |
| New OTA bundle crashes at startup | Native crash handler rolls back to the previous bundle automatically (see §4.2) |
| DEV mode / web platform | Hook does nothing |

---

## §9. Web Stub

If your project supports web, Metro resolves `.web.ts` for web builds. This stub prevents OTA logic from running on web.

Create `components/update-component/useUpdateVersion.web.ts`:

```ts
// components/update-component/useUpdateVersion.web.ts
import { useState } from "react"
import type { UpdateState } from "./useUpdateVersion"

export const useUpdateVersion = () => {
  const [updateState] = useState<UpdateState>("idle")
  return {
    updateState,
    isRequired: false,
    isStoreUpdate: false,
    progress: 0,
    actionUpdate: () => {},
    actionRetry: () => {},
    actionSkip: () => {},
  }
}
```

> **Pure mobile projects** (no web target) can skip this file.

---

## §10. UI: UpdatingComponent

Full-screen overlay that blocks interaction during updates. Uses only React Native core components — no design-system dependency.

Create `components/update-component/UpdatingComponent.tsx`:

```tsx
// components/update-component/UpdatingComponent.tsx
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native"
import { useUpdateVersion } from "./useUpdateVersion"

// ──────────────────────────────────────────────
// CONFIGURE: customize these to match your brand
// ──────────────────────────────────────────────
const BACKGROUND_COLOR = "#FFFFFF"
const PROGRESS_COLOR = "#4d8a4d"
const TEXT_COLOR = "#373A3E"
const BUTTON_PRIMARY_BG = "#007AFF"
const BUTTON_PRIMARY_TEXT = "#FFFFFF"
const BUTTON_SECONDARY_TEXT = "#373A3E"
const BUTTON_SECONDARY_BORDER = "#E9EAEC"
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// CONFIGURE: Check if the project uses i18n or
// supports multiple languages (look for i18next,
// react-intl, expo-localization, or a translate()
// helper in the codebase). If yes, replace these
// hardcoded strings with the project's translation
// pattern. If not, keep these as-is.
//
// Example with i18next:
//   import { t } from "i18next"
//   const STRINGS = { title: t("update.title"), ... }
//
// Example with a custom translate():
//   import { translate } from "@/i18n"
//   const STRINGS = { title: translate("update.title"), ... }
// ──────────────────────────────────────────────
const STRINGS = {
  title: "Update to continue",
  bodyOta: "The latest version includes important improvements and fixes.",
  bodyStore: "A new version is available on the store. Please update to continue.",
  updateBtn: "Update",
  retryBtn: "Try again",
  cancelBtn: "Cancel",
  errorMsg: "Download failed, please try again.",
}
// ──────────────────────────────────────────────

export function UpdatingComponent() {
  const {
    updateState,
    isRequired,
    isStoreUpdate,
    progress,
    actionUpdate,
    actionRetry,
    actionSkip,
  } = useUpdateVersion()

  if (updateState === "idle") return null

  const isPrompt = updateState === "prompt"
  const isDownloading = updateState === "downloading"
  const isError = updateState === "error"

  return (
    <View style={styles.container}>
      {/* Center content */}
      <View style={styles.content}>
        {/* Optional: Add your app logo here */}
        {/* <Image source={require("./logo.png")} style={styles.logo} /> */}

        {(isPrompt || isError) && (
          <View style={styles.textBlock}>
            <Text style={styles.title}>{STRINGS.title}</Text>
            {isPrompt && (
              <Text style={styles.body}>
                {isStoreUpdate ? STRINGS.bodyStore : STRINGS.bodyOta}
              </Text>
            )}
            {isError && <Text style={styles.body}>{STRINGS.errorMsg}</Text>}
          </View>
        )}

        {isDownloading && (
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(100, progress))}%` } as ViewStyle,
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      {!isDownloading && (
        <View style={styles.actions}>
          {isPrompt && (
            <TouchableOpacity style={styles.primaryButton} onPress={actionUpdate}>
              <Text style={styles.primaryButtonText}>{STRINGS.updateBtn}</Text>
            </TouchableOpacity>
          )}
          {isError && (
            <TouchableOpacity style={styles.primaryButton} onPress={actionRetry}>
              <Text style={styles.primaryButtonText}>{STRINGS.retryBtn}</Text>
            </TouchableOpacity>
          )}
          {(!isRequired || isError) && (
            <TouchableOpacity style={styles.secondaryButton} onPress={actionSkip}>
              <Text style={styles.secondaryButtonText}>{STRINGS.cancelBtn}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BACKGROUND_COLOR,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  content: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  textBlock: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  title: {
    color: TEXT_COLOR,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: TEXT_COLOR,
    fontSize: 16,
    textAlign: "center",
  },
  progressBlock: {
    marginTop: 8,
    width: "80%",
  },
  progressTrack: {
    borderColor: PROGRESS_COLOR,
    borderRadius: 10,
    borderWidth: 1,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    backgroundColor: PROGRESS_COLOR,
    borderRadius: 10,
    height: "100%",
  },
  actions: {
    gap: 12,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 16,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: BUTTON_PRIMARY_BG,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: "100%",
  },
  primaryButtonText: {
    color: BUTTON_PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: BUTTON_SECONDARY_BORDER,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: "100%",
  },
  secondaryButtonText: {
    color: BUTTON_SECONDARY_TEXT,
    fontSize: 16,
  },
})
```

### State machine

```
"idle"        → returns null (invisible)
"prompt"      → Title + description + Update button (+ Cancel if not required)
"downloading" → Progress bar only (no buttons, auto-restart on success)
"error"       → Title + error text + Try Again + Cancel
```

---

## §11. Mount in Root App

Add `<UpdatingComponent />` as a **top-level overlay** in your app root, above the navigator:

```tsx
// App.tsx or app.tsx
import { UpdatingComponent } from "./components/update-component/UpdatingComponent"

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>

      {/* Must be AFTER/ABOVE navigator so it overlays everything */}
      <UpdatingComponent />
    </SafeAreaProvider>
  )
}
```

---

## §12. i18n Strings

The `STRINGS` object in `UpdatingComponent.tsx` contains all user-facing text. Before implementing, **check the project** for an existing i18n / translation system:

- Search for `i18next`, `react-intl`, `expo-localization`, or a custom `translate()` / `t()` helper
- If found → replace hardcoded strings with the project's translation pattern
- If not found → keep the hardcoded English strings as-is

Required string keys (English defaults):

| Key | Default value |
|---|---|
| title | Update to continue |
| bodyOta | The latest version includes important improvements and fixes. |
| bodyStore | A new version is available on the store. Please update to continue. |
| updateBtn | Update |
| retryBtn | Try again |
| cancelBtn | Cancel |
| errorMsg | Download failed, please try again. |

---

## §13. Bundle Export Scripts — Hermes Bytecode

Bundles **must always be exported as Hermes bytecode** (`.hbc`), not plain JavaScript. This ensures compatibility with Hermes-enabled builds and reduces bundle size.

### How it works

1. Metro bundles JS + assets into a single file
2. `hermesc` compiles the JS bundle to Hermes bytecode
3. The bytecode + assets are zipped together
4. The zip is uploaded to Strapi

### hermesc binary path — check which one exists

The `hermesc` location depends on the React Native version. **Check the project's `node_modules`** and use whichever exists:

```bash
ls node_modules/hermes-compiler/hermesc 2>/dev/null      # newer RN (hermes-compiler package)
ls node_modules/react-native/sdks/hermesc 2>/dev/null    # older RN
```

| RN setup | hermesc path (`HERMESC_PATH`) |
|---|---|
| `hermes-compiler` package present (newer RN) | `./node_modules/hermes-compiler/hermesc/<os>-bin/hermesc` |
| Otherwise (older RN) | `./node_modules/react-native/sdks/hermesc/<os>-bin/hermesc` |

`<os>` is the OS of the machine **running the script**:

| Runner | `<os>` |
|---|---|
| GitHub Actions `ubuntu-latest` / Linux | `linux64` |
| macOS (local build or `macos-latest` runner) | `osx` |
| Windows | `win64` (binary is `hermesc.exe`) |

The scripts below use `HERMESC_PATH` as a placeholder — **replace it** with the resolved path (normally the `linux64-bin` one, since CI runs on ubuntu). If the team also builds bundles locally on macOS, add separate `*-local` scripts using the `osx-bin` path.

### Expo projects — use `expo export:embed`

Add to `package.json` scripts (replace `YOUR_ENTRY_FILE` with your entry file, e.g. `index.tsx` or `index.js`):

```json
{
  "scripts": {
    "bytecode-android": "mkdir -p dist/android && npx expo export:embed --platform android --minify=true --entry-file YOUR_ENTRY_FILE --bundle-output dist/android/index.android.bundle --dev false --assets-dest dist/android && HERMESC_PATH -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && rm -f dist/android/index.android.bundle dist/android/index.android.hbc.bundle.map && cd dist && find android -type f | zip hermes.android.hbc.zip -@ && cd .. && rm -rf dist/android",
    "bytecode-ios": "mkdir -p dist/ios && npx expo export:embed --platform ios --minify=true --entry-file YOUR_ENTRY_FILE --bundle-output dist/ios/main.jsbundle --dev false --assets-dest dist/ios && HERMESC_PATH -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && rm -f dist/ios/main.jsbundle dist/ios/main.ios.hbc.jsbundle.map && cd dist && find ios -type f | zip hermes.ios.hbc.zip -@ && cd .. && rm -rf dist/ios",
    "hotupdate": "sh ./scripts/hotupdate.sh"
  }
}
```

### Bare RN CLI projects — use `react-native bundle`

```json
{
  "scripts": {
    "bytecode-android": "mkdir -p dist/android && npx react-native bundle --platform android --dev false --minify true --entry-file YOUR_ENTRY_FILE --bundle-output dist/android/index.android.bundle --assets-dest dist/android && HERMESC_PATH -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && rm -f dist/android/index.android.bundle dist/android/index.android.hbc.bundle.map && cd dist && find android -type f | zip hermes.android.hbc.zip -@ && cd .. && rm -rf dist/android",
    "bytecode-ios": "mkdir -p dist/ios && npx react-native bundle --platform ios --dev false --minify true --entry-file YOUR_ENTRY_FILE --bundle-output dist/ios/main.jsbundle --assets-dest dist/ios && HERMESC_PATH -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && rm -f dist/ios/main.jsbundle dist/ios/main.ios.hbc.jsbundle.map && cd dist && find ios -type f | zip hermes.ios.hbc.zip -@ && cd .. && rm -rf dist/ios",
    "hotupdate": "sh ./scripts/hotupdate.sh"
  }
}
```

### Output

After running `yarn bytecode-android` or `yarn bytecode-ios`:

```
dist/
  hermes.android.hbc.zip   # Android Hermes bytecode bundle
  hermes.ios.hbc.zip        # iOS Hermes bytecode bundle
```

### .gitignore

The `dist/` folder contains generated bundle artifacts and **must not** be committed to git. Check the project's `.gitignore` — if `dist/` is not already listed, add it:

```
# OTA hot update build output
dist/
```

---

## §14. Full hotupdate.sh Script

Create `scripts/hotupdate.sh`:

```bash
#!/bin/bash
set -e  # stop on first failure (e.g. bundle build fails → don't upload)

if [ -z "$1" ]; then
  echo "Error: Missing tenant argument."
  echo "Usage: yarn hotupdate <tenant>"
  echo ""
  echo "Tenant must correspond to a config file/folder that contains:"
  echo "  CMS_URL_DOMAIN, version, slug"
  echo ""
  echo "Required env var: STRAPI_TOKEN"
  exit 1
fi

TENANT=$1

# ──────────────────────────────────────────────
# CONFIGURE: read CMS_URL_DOMAIN from wherever
# this project stores its env config.
# Check the project for the existing pattern and
# adapt the command below accordingly.
#
# JSON file (jq):
#   DOMAIN=$(jq -r '.CMS_URL_DOMAIN' ./config/$TENANT.json)
#   DOMAIN=$(jq -r '.expo.extra.CMS_URL_DOMAIN' ./app.json)
#
# .env file (grep):
#   DOMAIN=$(grep -m1 CMS_URL_DOMAIN .env.$TENANT | cut -d= -f2)
#
# Hardcode per tenant:
#   if [ "$TENANT" = "myapp" ]; then DOMAIN="cms-dev.example.com"; fi
#   if [ "$TENANT" = "otherapp" ]; then DOMAIN="cms.example.com"; fi
# ──────────────────────────────────────────────
DOMAIN=__READ_CMS_URL_DOMAIN_HERE__  # <-- REPLACE with the command that reads CMS_URL_DOMAIN for this tenant

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "null" ]; then
  echo "Error: Could not read CMS_URL_DOMAIN for tenant '$TENANT'"
  exit 1
fi

echo "CMS_URL_DOMAIN: $DOMAIN"

if [ -z "$STRAPI_TOKEN" ]; then
  echo "Error: STRAPI_TOKEN env var is not set"
  exit 1
fi

# Optional: set REQUIRED=false to publish a skippable update (default: true)
REQUIRED=${REQUIRED:-true}

# Dependencies are expected to be installed already (CI installs them in a
# previous step). Uncomment if you run this script on a fresh checkout:
# yarn install   # or: npm ci / pnpm install --frozen-lockfile

# Build and upload Android bundle
yarn bytecode-android
sh ./scripts/release.sh \
  -p "android" \
  -f "./dist/hermes.android.hbc.zip" \
  -t "$STRAPI_TOKEN" \
  -l "$DOMAIN" \
  -e "$TENANT" \
  -r "$REQUIRED" \
  -n "release $TENANT android bundle"

# Build and upload iOS bundle
yarn bytecode-ios
sh ./scripts/release.sh \
  -p "ios" \
  -f "./dist/hermes.ios.hbc.zip" \
  -t "$STRAPI_TOKEN" \
  -l "$DOMAIN" \
  -e "$TENANT" \
  -r "$REQUIRED" \
  -n "release $TENANT ios bundle"
```

> Replace `yarn bytecode-*` with `npm run bytecode-*` / `pnpm bytecode-*` if the project does not use Yarn.

### Usage

```bash
# Set the Strapi API token first
export STRAPI_TOKEN="your_strapi_api_token"

# Run for a specific tenant (forced update)
yarn hotupdate myapp

# Publish a skippable update
REQUIRED=false yarn hotupdate myapp
```

`yarn hotupdate <tenant>` does the following in sequence:
1. Reads `CMS_URL_DOMAIN` from the tenant's config file
2. Builds Android Hermes bytecode zip (`yarn bytecode-android`)
3. Uploads Android zip to Strapi via `release.sh`
4. Builds iOS Hermes bytecode zip (`yarn bytecode-ios`)
5. Uploads iOS zip to Strapi via `release.sh`

The script stops at the first failing step (`set -e`), so a failed build never uploads a stale zip.

---

## §15. Upload Script — release.sh

Create `scripts/release.sh`:

> **Field names:** the code below uses the **suggested defaults** from §1b. If the user's mapping differs, replace the endpoint paths, the tenant filter field, the `jq` path to the tenant id, the JSON keys in `data`, and the `files.<field>` name accordingly. If §1b is not filled/confirmed yet, STOP and ask (Rule 2).

```bash
#!/bin/bash
set -e

usage() {
  echo "Usage: $0 -p <platform> -f <file> -t <bearer_token> -l <cms_host> -e <tenant> [-r true|false] [-n <note>]"
  echo "  -p     ios | android"
  echo "  -f     Path to Hermes zip file"
  echo "  -t     Strapi API token (Bearer)"
  echo "  -l     CMS_URL_DOMAIN (host only, no https://)"
  echo "  -e     Tenant name (must match the tenant 'name' in Strapi)"
  echo "  -r     Optional: required update, true (default) | false"
  echo "  -n     Optional release note"
  exit 1
}

if [ $# -lt 10 ]; then usage; fi

required="true"

while getopts "p:f:t:l:e:r:n:" opt; do
  case ${opt} in
    p) platform="$OPTARG" ;;
    f) file="$OPTARG" ;;
    t) token="$OPTARG" ;;
    l) link="$OPTARG" ;;
    e) tenant="$OPTARG" ;;
    r) required="$OPTARG" ;;
    n) note="$OPTARG" ;;
    *) usage ;;
  esac
done

if [ "$platform" != "ios" ] && [ "$platform" != "android" ]; then
  echo "Error: Invalid platform. Use 'ios' or 'android'."
  usage
fi

if [ "$required" != "true" ] && [ "$required" != "false" ]; then
  echo "Error: -r must be 'true' or 'false'."
  usage
fi

# ──────────────────────────────────────────────
# CONFIGURE: read the native app version.
# See §1 APP_VERSION_SOURCE for where this project
# stores its version and the matching shell command.
#
# Examples:
#   version=$(jq -r '.expo.version' ./app.json)
#   version=$(jq -r '.version' ./config/$tenant.json)
#   version=$(jq -r '.version' ./package.json)
# ──────────────────────────────────────────────
version=__READ_APP_VERSION_HERE__  # <-- REPLACE (see §1 APP_VERSION_SOURCE)

if [ -z "$version" ] || [ "$version" = "null" ]; then
  echo "Error: Could not read app version"
  exit 1
fi

echo "Deploy version: $version"
echo "Deploy tenant: $tenant"
echo "Required: $required"

if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Error: Bundle file not found at '$file'"
  usage
fi
if [ -z "$token" ] || [ -z "$link" ] || [ -z "$tenant" ]; then usage; fi

# Set API endpoint
if [ "$platform" = "ios" ]; then
  url="https://$link/api/ios-bundles"
else
  url="https://$link/api/android-bundles"
fi

note=${note:-""}

# Look up tenant ID from Strapi (requires public `find` on tenants, see §17)
tenant_encoded=$(jq -rn --arg v "$tenant" '$v | @uri')
ENV_URL="https://$link/api/tenants?filters%5Bname%5D%5B%24eq%5D=$tenant_encoded"
response_env=$(curl -sfL "$ENV_URL")
id_env=$(echo "$response_env" | jq '.data[0].id')

if [ "$id_env" = "null" ] || [ -z "$id_env" ]; then
  echo "Error: No tenant found for '$tenant'"
  exit 1
fi

echo "Tenant ID: $id_env"
echo "Uploading to: $url"

# Build JSON safely with jq (handles quotes/special chars in the note)
data=$(jq -cn \
  --arg note "$note" \
  --arg version "$version" \
  --argjson required "$required" \
  --argjson tenant "$id_env" \
  '{note: $note, targetVersion: $version, status: true, required: $required, tenant: $tenant}')

# Upload bundle to Strapi (v4 multipart create: data + files.<field>)
curl --fail-with-body --location "$url" \
  --header "Authorization: Bearer $token" \
  --form "data=$data" \
  --form "files.bundle=@\"$file\""

echo ""
echo "Done."
```

**Requirements:** `curl` (7.76+ for `--fail-with-body`), `jq` on the CI runner.

---

## §16. GitHub Actions (CI)

### Example workflow (push to a release branch)

```yaml
name: Hot Update
on:
  push:
    branches: ["develop"]  # Replace with the branch(es) that should publish OTA bundles

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build and upload bundles
        env:
          STRAPI_TOKEN: ${{ secrets.STRAPI_TOKEN }}
        run: yarn hotupdate myapp  # Replace with your tenant name
```

> **Package manager:** `--frozen-lockfile` is Yarn v1. Adapt to the project: Yarn Berry → `yarn install --immutable` (and `corepack enable` before `setup-node`), npm → `npm ci` (`cache: npm`), pnpm → `pnpm install --frozen-lockfile` (add `pnpm/action-setup`, `cache: pnpm`). Match `node-version` to the project's `.nvmrc` / `engines` if present.

### Required GitHub secrets

| Secret | Purpose |
|---|---|
| `STRAPI_TOKEN` | Strapi API token with write access to `ios-bundles` / `android-bundles` |

> If your CMS has separate dev and production instances, use different secrets per workflow (e.g. `STRAPI_TOKEN` for dev, `STRAPI_TOKEN_PROD` for production). The tenant's config file determines which CMS host the upload targets.

---

## §17. Strapi CMS Setup

### Collections to create

> This is the **suggested default schema** referenced in §1b. Walk the user through it step by step only if they chose option **B** in §1b (no endpoints yet). After they create it, ask them for one sample response per endpoint and compare it to the reference responses in §1b.

**1. Tenants** (collection type: `tenants`)

| Field | Type | Purpose |
|---|---|---|
| `name` | Short text | Tenant identifier — must match app's `slug` config |
| `iosVersion` | Short text | Minimum required iOS native version (e.g. "1.2.0") |
| `androidVersion` | Short text | Minimum required Android native version |
| `iosUrl` | Short text | App Store URL |
| `androidUrl` | Short text | Play Store URL |

> If the project already has a tenant/app-config collection, reuse it and just add these fields.

**2. iOS Bundles** (collection type: `ios-bundles`)

| Field | Type | Purpose |
|---|---|---|
| `targetVersion` | Short text | Native app version this bundle targets (must match exactly) |
| `status` | Boolean | `true` = active, `false` = disabled |
| `required` | Boolean | `true` = user cannot skip update |
| `note` | Text | Release note (optional) |
| `bundle` | Media (single file) | The uploaded Hermes bytecode zip |
| `tenant` | Relation → Tenants | Which tenant this bundle belongs to |

**3. Android Bundles** (collection type: `android-bundles`) — Same fields as iOS Bundles.

### Step-by-step in Strapi admin (v4)

1. **Content-Type Builder → Create new collection type** → display name `Tenant` (API ID plural becomes `tenants`). Add the Tenants fields above. Save.
2. Create collection type `iOS Bundle` with API ID plural `ios-bundles`. Add `targetVersion` (Text, short), `status` (Boolean, default `true`), `required` (Boolean, default `false`), `note` (Text, long), `bundle` (Media, **single**, allowed type: Files), `tenant` (Relation: *iOS Bundle has one Tenant*). In **Advanced settings**, turn **Draft & Publish off**. Save.
3. Repeat step 2 for `Android Bundle` / `android-bundles`.
4. **Content Manager → Tenant → Create entry**: fill `name` (= your `TENANT_SLUG`), min versions and store URLs. Save.
5. **Settings → Users & Permissions → Roles → Public**: enable `find` on Tenant, iOS Bundle, Android Bundle. Save.
6. **Settings → API Tokens → Create new API token** (type *Custom*): enable `create` on iOS Bundle and Android Bundle, and `upload` on Upload. Copy the token → store it as the `STRAPI_TOKEN` CI secret (never commit it).
7. Upload one test bundle (§18 "Manual upload") and open the reference URLs from §1b in a browser to confirm the response shape.

### Permissions

- **Public read** (or read-only token): `find` on `tenants`, `ios-bundles`, `android-bundles`
- **Authenticated write** (API token): `create` on `ios-bundles`, `android-bundles` (for CI uploads), plus `upload` on the Upload plugin

> Public `find` exposes every field of these collections. Do not store secrets on the tenant record.

### Draft & Publish

Disable **Draft & Publish** on `ios-bundles` / `android-bundles` (or make sure CI publishes on create). Otherwise uploaded bundles stay as drafts and the public API never returns them.

### Important: bundle version = Strapi record `id`

The Strapi `id` (auto-increment integer) serves as the bundle version number. `react-native-ota-hot-update` compares this against `HotUpdate.getCurrentVersion()`. Newer bundles always have higher IDs.

> **To roll back a bad bundle:** set its `status` to `false` in Strapi, then re-upload the previous good build (it gets a new, higher `id`). Lowering the latest `id` does not downgrade devices, because they only install bundles with an `id` greater than their current version.

### Strapi v5

This guide targets **Strapi v4**. Strapi v5 changes things this implementation depends on:

| Area | v4 (this guide) | v5 |
|---|---|---|
| Response shape | `data[].attributes.field` | `data[].field` (flattened, no `attributes`) |
| Media relation | `bundle.data.attributes.url` | `bundle.url` |
| Create with file | Multipart `data` + `files.bundle` in one request | Not supported: upload to `/api/upload` first, then create the entry with `bundle: <fileId>` |
| Draft & Publish | Same `id` for draft/published | Publishing can create a new row with a new `id`; `documentId` is a string. Bundle version must not rely on `id` without checking this. |

For v5: drop `attributes` from the types (§5) and the hook (§8), split the upload in `release.sh` (§15) into two requests, and either disable Draft & Publish or use a dedicated numeric `version` field instead of `id`.

---

## §18. Testing

### Prerequisites

- Release build on a real device (OTA never runs in `__DEV__` mode)
- At least one bundle uploaded to Strapi matching your native app version and tenant
- `CMS_URL` and `slug` correctly configured

### Test flow

1. Build and install a release version of the app
2. Upload a new Hermes bundle to Strapi via `yarn hotupdate <tenant>` or manually
3. Open the app (or background → foreground it)
4. Expected: update prompt appears → tap Update → progress bar → app restarts with new bundle

### First install behavior

On the very first launch after the native app is installed (before any OTA bundle exists on the device), `HotUpdate.getCurrentVersion()` returns `0`. The hook handles this specially:

- If a bundle is available: downloads silently (no prompt), shows progress, auto-restarts
- If no bundle is available: sets version to `1` to skip future silent-download attempts

### Manual upload (without scripts)

```bash
# 1. Get tenant ID
curl -sL "https://YOUR_CMS_HOST/api/tenants?filters[name][\$eq]=YOUR_SLUG" | jq '.data[0].id'

# 2. Upload bundle (replace TENANT_ID, VERSION, and file path)
curl --location "https://YOUR_CMS_HOST/api/android-bundles" \
  --header "Authorization: Bearer YOUR_TOKEN" \
  --form 'data={"note":"test","targetVersion":"VERSION","status":true,"required":true,"tenant":TENANT_ID}' \
  --form 'files.bundle=@"/path/to/hermes.android.hbc.zip"'
```

---

## §19. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Update never triggers | Running in `__DEV__` mode | Test with a release build only |
| No bundle found from API | `targetVersion` doesn't match native app version | Ensure bundle `targetVersion` in Strapi exactly matches the native app version |
| 403 on bundle upload | Token lacks permissions | Grant `create` on `ios-bundles`/`android-bundles` in Strapi admin |
| Zip rejected / crash after install | Bundle was plain JS, not Hermes bytecode | Always run `hermesc` to produce `.hbc` before zipping |
| App crashes after OTA install | Bundle was built from different native version | `targetVersion` must match the exact native binary the user has installed |
| Store check passes but bundle check fails | Network error on second request | The hook falls through gracefully; check CMS_URL and network |
| `HotUpdate.getCurrentVersion()` returns 0 | No OTA bundle installed yet | This is the first-install case — handled automatically |
| Default auth headers interfere | Your HTTP client adds Authorization globally | Use a separate client instance or strip the header for CMS requests |
| Expo Go crashes | Library has native code | Must use custom dev client or EAS Build, not Expo Go |
| `hermesc` not found on CI | Wrong path for this RN version | Newer RN ships it in `node_modules/hermes-compiler/hermesc/`, older RN in `node_modules/react-native/sdks/hermesc/` (see §13) |
| `hermesc: cannot execute binary file` | Using the `linux64-bin` binary on macOS (or vice versa) | Use the `<os>-bin` folder that matches the machine running the script (see §13) |
| App crashes loading the OTA bundle (JSC app) | App uses JSC, not Hermes | Enable Hermes, or skip the `hermesc` step and ship plain JS (§0) |
| Everything is `undefined` when parsing responses | CMS is Strapi v5 (no `attributes` wrapper), or field names differ from the defaults | See §17 "Strapi v5"; re-check the §1b mapping against a real response |
| Download fails immediately, URL starts with `/uploads/` | Strapi local upload provider returns relative media URLs | Prefix the URL with `CMS_URL` before calling `downloadBundleUri` |
| Bundle uploaded but API returns empty list | Entry saved as draft | Disable Draft & Publish on bundle collections (§17) |
| Upload fails with a JSON parse error | Release note contains quotes/special chars and JSON was built by hand | Build `data` with `jq` as in §15 |
| OTA never applies in an Expo app | `expo-updates` is installed and overrides the bundle URL | Remove/disable `expo-updates` (§0) |
| OTA bundle crashed and app reverted to the old version | Built-in crash auto-rollback kicked in | Expected. Fix the bundle, then upload again |

---

## §20. File Structure Summary

After implementation, your project should have:

```
your-project/
├── components/
│   └── update-component/
│       ├── useUpdateVersion.ts        # Core hook (logic)
│       ├── useUpdateVersion.web.ts    # Web stub (no-op)
│       └── UpdatingComponent.tsx      # Full-screen overlay UI
├── services/
│   ├── update.types.ts                # TypeScript types
│   └── updateService.ts               # HTTP calls to Strapi
├── utils/
│   └── platform.ts                    # ios, isWeb, appVersion
├── scripts/
│   ├── hotupdate.sh                   # Build + upload orchestrator
│   └── release.sh                     # Upload single bundle to Strapi
├── package.json                       # yarn hotupdate, bytecode-android, bytecode-ios
└── App.tsx                            # Mount <UpdatingComponent />
```

---

## §21. Adapting to Your Project

### If you already have a state management system (MobX, Redux, Zustand, etc.)

The hook in §8 uses local React state + `AppState` listener for foreground detection. If your app already tracks foreground/background state globally (e.g., MobX store), replace the `AppState` listener with your existing state:

```ts
// Example: replace `isBackground` with your store's value
// (MobX: rootStore.app.isBackground, Zustand: useAppStore((s) => s.isBackground), Redux: useSelector(...))
const isBackground = useAppStore((s) => s.isBackground)

useEffect(() => {
  if (!IS_DEBUG && !isWeb && !isBackground && !isUpgrading.current) {
    checkUpdate().catch(() => {})
  }
}, [isBackground])
```

### If you want to use your design system for the UI

Replace `UpdatingComponent.tsx` with your own components. The hook returns everything you need:

```ts
{ updateState, isRequired, isStoreUpdate, progress, actionUpdate, actionRetry, actionSkip }
```

Build any UI you want around these values. The state machine is the same regardless of UI.

### If you use a different HTTP client

Replace `fetchJson` in `updateService.ts` with your client. The only contract: return `{ kind: "ok", data: strapiJson }` on success.

---

## react-native-ota-hot-update API Reference

Full API of the `HotUpdate` module used in the hook. Reference: [github.com/vantuan88291/react-native-ota-hot-update](https://github.com/vantuan88291/react-native-ota-hot-update)

### Core methods used in this implementation

| Method | Signature | Description |
|---|---|---|
| `downloadBundleUri` | `(downloadManager, uri, version, options)` | Download and install a bundle from a remote URL |
| `getCurrentVersion` | `() => Promise<number>` | Get the currently installed bundle version (0 = no bundle) |
| `setCurrentVersion` | `(version: number) => boolean` | Manually set the current bundle version |
| `resetApp` | `() => void` | Restart the JS runtime |

### downloadBundleUri options

| Option | Type | Default | Description |
|---|---|---|---|
| `updateSuccess` | `() => void` | — | Called after successful install |
| `updateFail` | `(message: string) => void` | — | Called on download/install failure |
| `progress` | `(received: string, total: string) => void` | — | Download progress callback (values are numeric strings; convert with `+received`) |
| `restartAfterInstall` | `boolean` | `false` | Auto-restart app after successful install |
| `restartDelay` | `number` | `300` | Milliseconds before auto-restart |
| `maxBundleVersions` | `number` | `2` | Max bundle versions to keep on disk (older auto-deleted) |
| `headers` | `object` | — | Custom HTTP headers for the download request |
| `metadata` | `any` | — | Custom metadata stored with the bundle |

### Additional methods (not used in the hook, but available)

| Method | Description |
|---|---|
| `getBundleList()` | Returns all stored bundle versions with metadata |
| `deleteBundleById(id)` | Remove a specific stored bundle |
| `clearAllBundles()` | Remove all stored bundles, revert to default |
| `rollbackToPreviousBundle()` | Revert to the previously installed bundle |
| `removeUpdate(restart)` | Remove current update and optionally restart |
| `setupBundlePath(path)` | Install a bundle from a local zip file |
| `getUpdateMetadata()` | Get metadata stored with current bundle |
| `setUpdateMetadata(data)` | Store metadata with current bundle |

### Built-in safety (native side)

- **Version guard:** on startup the native side only loads the OTA bundle if the file exists and the app version it was installed for matches the current native app version. After a store update, the app falls back to the built-in bundle until a matching OTA bundle is downloaded.
- **Crash auto-rollback:** if the app crashes within ~2 seconds of startup on an OTA bundle, the native side restores the previous bundle and restarts. Enabled by default via `bundleJS(context)` (Android) / `getBundle()` (iOS). Android can disable it with `bundleJS(context, false)`.

---

## License

This implementation guide and the described architecture are open for use in any project.
