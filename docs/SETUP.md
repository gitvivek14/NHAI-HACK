# Setup Guide

This guide is for setting up NHAI FieldAuth on a new computer after unzipping
the source archive or cloning the repository.

## Required Tools

- Node.js 22 or newer
- npm
- Java 17
- Android Studio
- Android SDK Platform Tools
- Android SDK Build Tools
- Android device with USB debugging, or Android emulator

## 1. Install Dependencies

From the repository root:

```bash
npm install --prefix backend
npm install --prefix admin
npm install --prefix mobile
```

## 2. Configure Android SDK

If Gradle cannot find the Android SDK, create:

```text
mobile/android/local.properties
```

Example on macOS:

```properties
sdk.dir=/Users/YOUR_NAME/Library/Android/sdk
```

Example on Windows:

```properties
sdk.dir=C:\\Users\\YOUR_NAME\\AppData\\Local\\Android\\Sdk
```

Do not commit this file.

## 3. Use Java 17

macOS:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Windows PowerShell example:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-17"
```

## 4. Start Backend

```bash
npm run backend:start
```

Backend default:

```text
http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/api/health
```

## 5. Start Admin Dashboard

In a second terminal:

```bash
npm run admin:dev
```

Open:

```text
http://localhost:5173
```

## 6. Run Mobile App On A Phone

In a third terminal:

```bash
npm run mobile:start
```

Connect Android phone with USB debugging enabled:

```bash
adb devices
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000
```

In a fourth terminal:

```bash
npm run mobile:android
```

Inside the app, open Settings and tap:

```text
USB backend
```

## 7. Run Mobile App On Emulator

Start backend and admin as above, then run:

```bash
npm run mobile:start
npm run mobile:android
```

Inside the app, open Settings and tap:

```text
Emulator
```

## 8. Build Release APK

```bash
cd mobile/android
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew assembleRelease
```

Output:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 9. Common Issues

ADB not found:

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
```

Phone cannot sync:

```bash
adb reverse tcp:4000 tcp:4000
```

Then use `Settings -> USB backend`.

Gradle uses wrong Java:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Metro cache issue:

```bash
npm --prefix mobile run start -- --reset-cache
```
