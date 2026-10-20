# Install Mula on iPhone

Mula isn't on the App Store. You install it yourself with **SideStore**, which signs apps with your own free Apple ID and refreshes them in the background, so you don't need a paid developer account or a Mac.

**You need:** an iPhone on iOS 16.4 or later, a free Apple ID, and a computer (Windows, Mac or Linux) once, to install SideStore.

## 1. Install SideStore (once)

Follow SideStore's own guide, which stays up to date: **[docs.sidestore.io › Installation](https://docs.sidestore.io/docs/installation/prerequisites)**. In short, you install **LocalDevVPN** on the iPhone from the App Store, then **iloader** on the computer, plug the iPhone in, and let iloader install SideStore and its pairing file. After that you don't need the computer again.

Sign in to SideStore with the Apple ID you use on that iPhone.

<details>
<summary>SideStore can't sign in?</summary>

Apple changes its sign-in from time to time, and SideStore's fixes usually land in the Nightly build first. In October 2026, for example, sign-in failed with errors like `-80045` or `-22421`. What worked then was:

1. **Settings › User Customizations**: turn off **On-Device Anisette**.
2. **Settings › Anisette Servers**: choose **SideStore (New)**, and turn off automatic rotation.
3. **User Customizations › Reset adi.pb** (with "keep headers" unchecked), then sign in again.

Don't retry many times in a row: Apple rate-limits sign-ins. Check [SideStore's issues](https://github.com/SideStore/SideStore/issues) for the current advice.
</details>

## 2. Download Mula

On the iPhone, open the [latest release](https://github.com/khaledsharara/mula/releases/latest) in Safari and download **`Mula-x.y.z.ipa`**.

## 3. Install it with SideStore

Open **SideStore › My Apps › +** and pick the IPA from **Downloads**. Or open the file in Files and share it to SideStore. SideStore signs it with your Apple ID and installs it. Keep LocalDevVPN connected while it does.

Open Mula once. It asks for your accounts, and for notifications (for reminders).

## 4. Add the widget (optional)

Long-press the Home Screen › **+** › **Mula** › **Review inbox**. Small and medium sizes work on the Home Screen, and two sizes on the Lock Screen. It shows how many payments are waiting and the oldest few, and tapping it opens Review.

## 5. Connect your bank messages

Create the Shortcuts automation so bank SMS reach Mula in the background: **[docs/shortcuts.md](shortcuts.md)**. The same steps are in the app under **More › Automation**, with buttons that copy the keywords.

## Good to know

- **Refresh.** Apps signed with a free Apple ID expire after 7 days. SideStore refreshes them in the background while LocalDevVPN is connected, or tap **Refresh All** in SideStore. An expired app keeps its data and works again after a refresh.
- **App slots.** A free Apple ID can have 3 sideloaded apps active, SideStore included. Mula uses two, because the widget counts as its own app ID, and two of the 10 new app IDs Apple allows per week.
- **Updating.** Download the new IPA from Releases and install it the same way. Your data stays.
- **Notifications** are local reminders scheduled on the phone (free accounts can't receive push notifications). Mula doesn't need push.
- **Don't run Mula inside LiveContainer.** Notifications and the Shortcuts actions don't work there.
- **Coming from another phone or the web version?** Export a backup there (**More › Import and export › Export backup**) and restore it here. The cloud copy also restores everything onto a new phone: see [cloud-and-claude.md](cloud-and-claude.md).

## Prefer to build it yourself?

Fork this repository and run **Actions › Release › Run workflow**. GitHub's macOS runners build the unsigned IPA, which you then install the same way. It's free for public repositories, and private ones get a monthly allowance.
