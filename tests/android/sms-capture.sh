#!/usr/bin/env bash
# Android SMS capture on an emulator (run by .github/workflows/android-e2e.yml):
#   bash tests/android/sms-capture.sh path/to/test.apk
# The APK must be built with EXPO_PUBLIC_MULA_E2E_SMS_SENDER=$E2E_SENDER. Messages are made up.
set -euo pipefail

APK="$1"
PKG=io.github.khaledsharara.mula
SENDER="${E2E_SENDER:-15555550100}"
OUT=tests/android/output
mkdir -p "$OUT"

screen() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  adb shell cat /sdcard/ui.xml > "$OUT/$1.xml" 2>/dev/null || true
  adb exec-out screencap -p > "$OUT/$1.png" 2>/dev/null || true
}

# A slow emulator sometimes shows "<app> isn't responding" for the launcher; tap Wait.
dismiss_system_dialog() {
  local xml="$1" bounds
  grep -q "isn't responding" "$xml" 2>/dev/null || return 0
  bounds=$(grep -o 'text="Wait"[^>]*bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' "$xml" | grep -o '\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]' | head -1)
  if [ -n "$bounds" ]; then
    read -r x1 y1 x2 y2 <<<"$(echo "$bounds" | sed 's/\]\[/,/' | tr -d '[]' | tr ',' ' ')"
    adb shell input tap $(( (x1 + x2) / 2 )) $(( (y1 + y2) / 2 ))
  else
    adb shell input keyevent KEYCODE_ENTER
  fi
  sleep 1
}

expect_on_screen() {
  local text="$1" name="$2"
  for _ in $(seq 1 30); do
    screen "$name"
    dismiss_system_dialog "$OUT/$name.xml"
    if grep -q "$text" "$OUT/$name.xml"; then
      echo "ok   $name: \"$text\" is in the inbox"
      return 0
    fi
    sleep 2
  done
  echo "::error::$name: \"$text\" never showed up in the inbox"
  adb logcat -d > "$OUT/logcat.txt" || true
  exit 1
}

open_inbox() {
  adb shell am start -a android.intent.action.VIEW -d "mula://inbox" "$PKG" >/dev/null
}

no_crash() {
  adb logcat -d > "$OUT/logcat.txt"
  if grep -q "FATAL EXCEPTION" "$OUT/logcat.txt"; then
    echo "::error::Mula crashed (see logcat.txt)"
    exit 1
  fi
}

# No system "isn't responding" dialogs over the app while we read the screen.
adb shell settings put global hide_error_dialogs 1 || true
adb install -r "$APK"
adb shell dumpsys package "$PKG" | sed -n '/requested permissions:/,/install permissions:/p' > "$OUT/permissions.txt" || true
cat "$OUT/permissions.txt"
for p in RECEIVE_SMS READ_SMS POST_NOTIFICATIONS; do adb shell pm grant "$PKG" "android.permission.$p"; done
adb logcat -c

echo "== launch"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 25
no_crash
screen launch

echo "== live: a message while Mula is open"
adb emu sms send "$SENDER" "Purchase of EGP 123.45 with your card ending 9002 at Emulator Cafe One on 20/08/26."
sleep 5
open_inbox
expect_on_screen "Emulator Cafe One" live
if adb shell dumpsys notification --noredact | grep -q "bank payment"; then echo "ok   notification posted"; else echo "::warning::no notification seen"; fi

echo "== catch-up: a message while Mula was force-stopped"
adb shell am force-stop "$PKG"
sleep 2
adb emu sms send "$SENDER" "Purchase of EGP 67.89 with your card ending 9002 at Emulator Cafe Two on 20/08/26."
sleep 8
open_inbox
# A cold start of a fresh install lands on onboarding; open the inbox again once Mula is up.
sleep 20
open_inbox
expect_on_screen "Emulator Cafe Two" catch-up

echo "== other senders are left alone"
adb emu sms send 15555559999 "Purchase of EGP 11.11 with your card ending 9002 at Not A Bank Shop on 20/08/26."
sleep 8
open_inbox
sleep 5
screen other-sender
if grep -q "Not A Bank Shop" "$OUT/other-sender.xml"; then
  echo "::error::a message from another sender reached the inbox"
  exit 1
fi
echo "ok   other senders ignored"

no_crash
echo "All Android SMS capture checks passed"
