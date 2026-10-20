# Mula relay (ready to deploy)

This branch is a ready-made build of the Mula relay: your own cloud copy of Mula's data, and the connector that lets Claude read and edit it. It runs on Cloudflare Workers' free plan.

It is generated automatically from `relay/` on the main branch, so don't edit it here. Full guide: [docs/cloud-and-claude.md](https://github.com/khaledsharara/mula/blob/main/docs/cloud-and-claude.md).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/khaledsharara/mula/tree/relay-deploy)

Deploying asks for two secrets:

| Secret | What to enter |
| --- | --- |
| `APP_TOKEN` | 16+ random characters. In Mula: **More › Automation › Claude › Create a token** makes one and copies it. |
| `OWNER_PASSWORD` | A password you choose (8+ characters). You type it once when Claude connects. |

Deploying from a computer instead:

```sh
npm install
npx wrangler login
npx wrangler deploy
npx wrangler secret put APP_TOKEN
npx wrangler secret put OWNER_PASSWORD
```
