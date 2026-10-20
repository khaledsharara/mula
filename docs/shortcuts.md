# iPhone: bank SMS and Apple Pay with Shortcuts

iOS doesn't let apps read your messages. Instead, a **Shortcuts personal automation** runs whenever a message arrives that contains a keyword, and hands it to Mula's **Log bank message** action. It runs silently in the background: the payment waits in Mula's inbox (and on the widget) the next time you look.

You need Mula installed with SideStore first ([install-ios.md](install-ios.md)). The Mula actions appear in Shortcuts after you've opened Mula once.

## Bank messages (about two minutes)

Make **one automation per keyword**. For CIB that's two:

| Keyword | Catches |
| --- | --- |
| `بطاق` | card payments, Apple Pay, ATM withdrawals, refunds, deposits (every message that says بطاقة or بطاقتك) |
| `حساب` | InstaPay sent and received (حسابك) |

The words are short on purpose: CIB writes them with different endings, and the stem matches all of them. Messages that match but aren't payments (codes, offers) are dropped by Mula. In the app, **More › Automation** has buttons that copy each keyword.

For each keyword:

1. Open **Shortcuts › Automation › + (New Automation) › Message**.
2. **Message Contains**: paste the keyword. Leave **Sender** empty: CIB's sender name can't be picked as a contact.
3. Choose **Run Immediately**, and turn off **Notify When Run**.
4. Tap **Next › New Blank Automation**, add the action **Log bank message** (search "Mula").
5. Tap the **Message** field in the action and choose **Shortcut Input**, then set it to **Content**.
6. Tap **Done**.

That's it. A message matching both automations is still logged once.

### Check it works

Ask someone to send you a test SMS that contains `بطاق` and an amount, or wait for your next card payment. Open Mula: it should be in the inbox. You can also paste any bank message into the inbox (**Inbox › Paste**) to see how Mula reads it.

## Apple Pay (optional)

The SMS already covers Apple Pay. This automation just makes it instant, and Mula merges the two into one payment.

1. **Shortcuts › Automation › + › Transaction**, pick your cards, choose **Run Immediately**.
2. Add **Log card payment** (Mula). Set **Amount** to *Shortcut Input › Amount*, **Merchant** to *Merchant*, and **Card** to *Card or Pass*.

The first time Mula sees a Wallet card it asks which account it belongs to, and remembers.

## Troubleshooting

- **The Mula actions don't show up in Shortcuts.** Open Mula once after installing or updating, then look again. Apps run inside LiveContainer don't provide Shortcuts actions.
- **Nothing arrives.** Check the automation is on, set to **Run Immediately**, and that the keyword is exactly the one above (Arabic letters, no spaces). iOS sometimes pauses automations in Low Power Mode.
- **A message arrives but Mula can't read it.** It shows up as "Money out" or "Money in" with the amount. Your bank may have changed its wording: please [open an issue](https://github.com/khaledsharara/mula/issues/new?template=bug.yml) with the message's wording, after replacing the amounts, digits, names and reference numbers with made-up ones.
- **Another bank?** The keywords for each supported bank are in **More › Automation**. If yours isn't supported yet, see [adding-a-bank.md](adding-a-bank.md).
