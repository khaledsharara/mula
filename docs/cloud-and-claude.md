# Cloud copy and Claude (optional)

Mula works fully offline. This optional part gives you two things:

- **A cloud copy** of your data on a small server you own (a "relay" on Cloudflare's free plan). It stays in sync with your phone and restores everything onto a new phone.
- **Claude, connected to that copy.** Ask about your money ("what did I spend on food this month compared with last?") or have it do things ("log 85 at Starbucks on CIB, bar & cafe", "move all my Uber rides to Taxi", "go through my review inbox"). Every change Claude makes shows up in Mula under **More › Automation › Claude › Claude's changes**, with **Undo**.

It takes about ten minutes, and you can do all of it from your phone. Nothing here costs money.

**What you need:** a free [Cloudflare](https://dash.cloudflare.com/sign-up) account, a free GitHub or GitLab account (the deploy button copies the relay there), and for the Claude part, a Claude plan that allows custom connectors.

## How it works, briefly

The relay is a Cloudflare Worker with one SQLite database (a Durable Object), running in **your** Cloudflare account. Mula pushes its changes there and pulls changes from it: when it opens, a few seconds after each change, and every minute while it's open. Claude connects to the relay as a custom connector (MCP) and signs in with a password you choose. It runs Mula's own data code, so Claude's edits follow the same rules as the app.

Two secrets protect it:

| Secret | Who uses it | What it is |
| --- | --- | --- |
| `APP_TOKEN` | the Mula app, to sync | 16+ random characters. Anyone with it can read and change your data, so treat it like a password. |
| `OWNER_PASSWORD` | you, once, when Claude connects | A password you choose (8+ characters). Ten wrong tries lock it for an hour. |

## 1. Make the app token (in Mula)

**More › Automation › Claude › Create a token.** Mula makes a random token, keeps it in the App token field, and copies it. Paste it into your notes or password manager for the next step.

## 2. Deploy your relay

### With the button (recommended)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/khaledsharara/mula/tree/relay-deploy)

1. Tap the button and sign in to Cloudflare (or create a free account).
2. Connect GitHub or GitLab when asked. Cloudflare copies the relay into a new repository in your account and builds it from there.
3. Keep the suggested names (Worker: `mula-relay`) or choose your own.
4. Fill in the two secrets: **APP_TOKEN** = the token from step 1, **OWNER_PASSWORD** = a password you choose.
5. Tap **Deploy**. When it's done, open the Worker and copy its address, which looks like `https://mula-relay.<your-subdomain>.workers.dev`.

Open that address in a browser: it should show `{"ok":true,"service":"mula-relay"}`.

<details>
<summary>Other ways to deploy</summary>

**From your fork with GitHub Actions.** Fork this repository, then in the fork: **Settings › Secrets and variables › Actions** › add four repository secrets:
- `CLOUDFLARE_API_TOKEN`: in Cloudflare, **My Profile › API Tokens › Create Token**, template **Edit Cloudflare Workers**
- `CLOUDFLARE_ACCOUNT_ID`: shown on the right of **Workers & Pages**
- `MULA_APP_TOKEN`: the app token
- `MULA_OWNER_PASSWORD`: your password

Then **Actions › Deploy relay › Run workflow**. Open **Workers & Pages** once beforehand so Cloudflare gives you a `workers.dev` subdomain.

**From a computer** (Node.js 22):
```sh
git clone --branch relay-deploy https://github.com/khaledsharara/mula.git mula-relay
cd mula-relay
npm install
npx wrangler login
npx wrangler deploy                     # prints the relay's address
npx wrangler secret put APP_TOKEN       # paste the app token
npx wrangler secret put OWNER_PASSWORD  # type your password
```
</details>

## 3. Connect Mula

Back in **More › Automation › Claude**: paste the relay address (the App token is still filled in from step 1) and tap **Connect**.

The first time, Mula uploads your data, which takes a few seconds for a few thousand records. If the relay already has data from another phone, Mula asks which copy to keep.

**New phone, or reinstalled?** On the welcome screen, tap **Connect your cloud copy** with the same address and token, and everything comes back.

## 4. Add Mula to Claude

In Claude (claude.ai, or the app's settings): **Settings › Connectors › Add custom connector**.

- **Name:** `Mula`
- **URL:** your relay address followed by `/mcp`, e.g. `https://mula-relay.<your-subdomain>.workers.dev/mcp`. Mula shows it under Automation › Claude with a **Copy** button.

Claude opens a Mula page: type your `OWNER_PASSWORD` and tap **Allow**. Connectors you add on the web also work in Claude's phone apps. If you don't see **Add custom connector**, your Claude plan may not include custom connectors.

Try:
- *What did I spend on food this month compared with last month?*
- *Go through my review inbox. Ask me about anything you're unsure of.*
- *Move all my Uber rides to Taxi.*
- *Add a planned payment: Netflix, 250 EGP on my dollar card, monthly from the 5th.*

## Day to day

- **Claude's changes** arrive on the phone with the next sync, and Mula shows a note when they do. Each change set can be undone in **Claude's changes**; records edited again since stay as they are.
- **Sign Claude out** (Automation › Claude) revokes its access until you approve it again.
- **Disconnect** stops syncing and keeps the data on this phone. **Erase cloud copy** also deletes everything from the relay.
- Your data now lives in two places: the phone, and your Cloudflare account.

## Updating the relay

New Mula releases sometimes update the relay too (the release notes say so). Redeploy from a computer with the commands above (same Worker name, so your data stays), or run **Deploy relay** again from your fork. An older relay keeps syncing everything it knows about; fields added later sync once it's updated.

## Free plan limits

Cloudflare's free plan allows 100,000 database rows written per day. The first upload writes about nine rows per record (indexes included), so even a few thousand records fit easily, and day-to-day syncing writes a handful of rows per change.

## Troubleshooting

- **"The relay rejected the app token":** the token in Mula doesn't match `APP_TOKEN` on the relay. Make a new token, update the secret in Cloudflare (**Worker › Settings › Variables and Secrets**), and connect again.
- **"Set a password first"** when Claude connects: `OWNER_PASSWORD` is missing or shorter than 8 characters on the relay.
- **Claude says it can't connect:** check the URL ends in `/mcp`, and open the relay address in a browser to see it's running.
- **Locked out after wrong passwords:** wait an hour.
