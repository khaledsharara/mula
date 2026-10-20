package expo.modules.mulasms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat

/**
 * Picks up bank messages that arrived while the receiver couldn't run (Mula force-stopped,
 * or the phone restarting), by reading the SMS inbox since the last message it looked at.
 */
internal object SmsInbox {
  private const val MAX_ROWS = 500

  fun catchUp(context: Context): Int {
    val store = SmsStore(context)
    if (!store.enabled) return 0
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) return 0

    val since = store.lastSeen
    var newest = since
    var queued = 0
    val now = System.currentTimeMillis()
    val cursor = context.contentResolver.query(
      Telephony.Sms.Inbox.CONTENT_URI,
      arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
      "${Telephony.Sms.DATE} > ?",
      arrayOf(since.toString()),
      "${Telephony.Sms.DATE} ASC",
    ) ?: return 0
    cursor.use { c ->
      val addressCol = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
      val bodyCol = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
      val dateCol = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
      var rows = 0
      while (c.moveToNext() && rows < MAX_ROWS) {
        rows++
        val date = c.getLong(dateCol)
        if (date > newest) newest = date
        val address = c.getString(addressCol) ?: continue
        val body = c.getString(bodyCol) ?: continue
        if (!store.accepts(address) || body.isBlank()) continue
        if (!store.remember(SmsStore.hash(address, body), now)) continue
        SmsQueue.enqueue(context, address, body, date)
        queued++
      }
    }
    if (newest > store.lastSeen) store.lastSeen = newest
    return queued
  }
}
