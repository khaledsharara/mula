# Install Mula on Android (beta)

**You need:** Android 7.0 or later. A CIB account if you want bank SMS read automatically (other banks: see [adding a bank](adding-a-bank.md)).

> The Android app is newer than the iPhone one. It's tested on the Android emulator, and reports from real phones are very welcome: [open an issue](https://github.com/khaledsharara/mula/issues/new?template=bug.yml).

## 1. Download and install

1. On the phone, open the [latest release](https://github.com/khaledsharara/mula/releases/latest) and download **`Mula-x.y.z.apk`**.
2. Open the downloaded file. If Android asks, allow your browser or file manager to **install unknown apps**, then go back and tap **Install**.
3. Google Play Protect may warn that it doesn't recognize the app, because it isn't from the Play Store and it asks for SMS access. Tap **More details › Install anyway**.

The release page lists the APK's signing certificate (SHA-256), so you can check you have the official build. Every official update is signed with the same key, so it installs over the old version and keeps your data.

## 2. Let Mula read bank messages

Open Mula, add your accounts (with the last 4 digits of your cards and account, as they appear in your bank's SMS), then go to **More › Automation › Read bank messages** and turn it on.

On **Android 13 and later**, apps installed from an APK can't get SMS access until you allow it once in the app's settings. If Mula says SMS access isn't allowed:

1. Tap **Open app info** in Mula (or long-press the Mula icon › **App info**).
2. Tap **⋮** in the top right › **Allow restricted settings**, then confirm with your PIN or fingerprint.
   This menu item only shows up after Android has blocked a request once, so turn the switch on in Mula first if you don't see it.
3. Tap **Permissions › SMS › Allow**.
4. Go back to Mula and turn on **Read bank messages**.

Allow notifications too, if you'd like a notification when a payment is waiting.

**What Mula reads:** only SMS from your bank's sender names (listed on the same screen, e.g. `CIB`). Everything else is ignored and never stored. Turning the switch off stops it immediately.

**From when:** from the moment you turn it on. To bring in older messages, export them as a CSV file with the columns `datetime`, `sender` and `text` (most SMS backup apps can export CSV, or convert to it), then use **More › Import and export › Import CIB SMS history**.

## 3. Keep it running

Mula receives bank SMS even while it's closed. Some phones (Xiaomi, Oppo, Vivo, Huawei, Samsung with aggressive battery settings) block apps they consider idle:

- Allow **autostart** for Mula, and set its battery use to **Unrestricted** or **No restrictions**.
- If the phone did stop Mula, nothing is lost: next time you open Mula it reads any bank messages it missed from your SMS inbox.

## Differences from the iPhone app

- No home screen widget yet.
- No Apple Pay automation (Google Wallet doesn't offer one); card payments still arrive by SMS.
- Tested on emulators only so far.

## Updating

Download the newer APK from Releases and install it over the old one. Your data stays.
