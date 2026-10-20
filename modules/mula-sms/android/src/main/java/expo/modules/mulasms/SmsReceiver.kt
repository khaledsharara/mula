package expo.modules.mulasms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/**
 * Runs when an SMS arrives, even with Mula closed. Messages from the configured bank senders
 * are queued for the app; everything else is left alone and never stored.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val store = SmsStore(context)
    if (!store.enabled) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return

    // A long alert arrives in parts; join them per sender.
    val bySender = LinkedHashMap<String, StringBuilder>()
    for (m in messages) {
      val address = m?.originatingAddress ?: continue
      bySender.getOrPut(address) { StringBuilder() }.append(m.messageBody ?: "")
    }

    val now = System.currentTimeMillis()
    var queued = 0
    for ((address, text) in bySender) {
      if (!store.accepts(address)) continue
      val body = text.toString()
      if (body.isBlank() || !store.remember(SmsStore.hash(address, body), now)) continue
      SmsQueue.enqueue(context, address, body, now)
      queued++
    }
    if (queued == 0) return
    if (store.notify) SmsNotifier.show(context)
    MulaSmsModule.emitQueued()
  }
}
