# Mobile Build Notes

## Overview

This project is a Capacitor mobile app. The React/Vite web app is built first, then Capacitor copies that built web app into the native Android or iOS project.

Codemagic can show each workflow as a separate selectable option. Choose the workflow you want in the Codemagic UI; you do not need to edit `codemagic.yaml` to switch build types.

## What `npm install` or `npm ci` Does

`npm install` downloads the JavaScript packages listed in `package.json`.

Codemagic uses `npm ci` in this project. It is similar, but stricter: it installs exactly what is recorded in `package-lock.json`. That makes CI builds more repeatable.

## What `npm run build` Does

`npm run build` runs Vite's production build. It compiles the React and TypeScript app into browser-ready HTML, CSS, JavaScript, images, and service worker files.

This step also injects Vite environment variables such as `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_STRIPE_PUBLISHABLE_KEY` into the built app.

## What `dist/` Is

`dist/` is the production web output folder created by `npm run build`.

Capacitor does not package the source files from `src/` directly. It packages the already-built files from `dist/`, because those are the files a WebView can load inside the mobile app.

## What `npx cap sync android` Does

`npx cap sync android` copies the latest files from `dist/` into the Android project.

It also updates Capacitor native configuration and plugin information under the `android/` folder. Run this after every web build so the Android app contains the latest web code.

## Why Gradle Is Used

Gradle is Android's build system. Capacitor creates a real Android project, and Gradle is what compiles that project into installable Android build artifacts.

For debug builds, Gradle runs `assembleDebug`.

For release builds, Gradle runs `bundleRelease`.

## APK vs AAB

An APK is an Android application package that can be installed directly on a device. The Android Debug workflow produces a debug APK at:

`android/app/build/outputs/apk/debug/*.apk`

An AAB is an Android App Bundle. It is the preferred release format for Google Play. Google Play uses the AAB to generate optimized APKs for different devices. The Android Release workflow produces a release AAB at:

`android/app/build/outputs/bundle/release/*.aab`

## Why Signing Is Required for Release

Android release builds must be signed with a release keystore. The signature proves that future updates come from the same app owner.

Debug APKs use a debug signing key automatically. Release AABs need the real release keystore and passwords from Codemagic environment variables.

## Codemagic Environment Groups

`worldcuptransport_app` stores public build-time settings needed by the web app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

`worldcuptransport_android_signing` stores Android release signing secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

`worldcuptransport_ios_signing` stores or connects the Apple signing setup used by Codemagic. This is expected to include App Store Connect access or equivalent Codemagic signing configuration.

## Why iOS Requires Apple Signing

iOS apps must be signed with Apple certificates and provisioning profiles. Apple uses these to verify the developer account, bundle id, device permissions for development builds, and App Store distribution permissions for release builds.

The iOS workflows use Codemagic signing commands:

- `keychain initialize`
- `app-store-connect fetch-signing-files`
- `keychain add-certificates`
- `xcode-project use-profiles`

These are standard Codemagic steps for preparing an Xcode project for signed iOS builds.

## Where Build Artifacts Are Produced

Android Debug APK:

`android/app/build/outputs/apk/debug/*.apk`

Android Release AAB:

`android/app/build/outputs/bundle/release/*.aab`

iOS IPA:

`build/ios/ipa/*.ipa`

Xcode logs:

`/tmp/xcodebuild_logs/*.log`

## Local Android Debug Test Commands

Run these commands from the project root to test the same basic Android debug flow locally:

```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The local machine must have Java and the Android SDK installed. Codemagic provides those on its Android build machines.
