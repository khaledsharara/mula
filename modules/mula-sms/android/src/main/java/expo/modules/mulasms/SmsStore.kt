package expo.modules.mulasms

import android.content.Context
import android.content.SharedPreferences
import java.security.MessageDigest

/**
 * What the app configured (on/off, which senders count as the bank, notifications) plus the
 * bookkeeping that keeps the live receiver and the catch-up scan from queuing a message twice.
 */
internal class SmsStore(context: Context) {
  private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  var enabled: Boolean
    get() = prefs.getBoolean(KEY_ENABLED, false)
    set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

  /** Lowercased, trimmed sender names. */
  var senders: Set<String>
    get() = prefs.getStringSet(KEY_SENDERS, emptySet())?.toSet() ?: emptySet()
    set(value) = prefs.edit().putStringSet(KEY_SENDERS, value.map(::normalize).filter { it.isNotEmpty() }.toSet()).apply()

  var notify: Boolean
    get() = prefs.getBoolean(KEY_NOTIFY, true)
    set(value) = prefs.edit().putBoolean(KEY_NOTIFY, value).apply()

  /** Newest inbox message date the catch-up has looked at. */
  var lastSeen: Long
    get() = prefs.getLong(KEY_LAST_SEEN, 0L)
    set(value) = prefs.edit().putLong(KEY_LAST_SEEN, value).apply()

  fun accepts(address: String?): Boolean = address != null && senders.contains(normalize(address))

  /** Records a message as queued. False when it already was (within the last week). */
  fun remember(hash: String, now: Long): Boolean = synchronized(LOCK) {
    val cutoff = now - WEEK_MS
    val entries = (prefs.getString(KEY_RECENT, "") ?: "")
      .split('\n')
      .mapNotNull { line ->
        val at = line.lastIndexOf('@')
        if (at <= 0) null else line.substring(0, at) to (line.substring(at + 1).toLongOrNull() ?: 0L)
      }
      .filter { it.second >= cutoff }
    if (entries.any { it.first == hash }) return@synchronized false
    val next = (entries + (hash to now)).takeLast(MAX_RECENT)
    prefs.edit().putString(KEY_RECENT, next.joinToString("\n") { "${it.first}@${it.second}" }).commit()
    true
  }

  companion object {
    private const val PREFS = "mula_sms"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_SENDERS = "senders"
    private const val KEY_NOTIFY = "notify"
    private const val KEY_LAST_SEEN = "last_seen"
    private const val KEY_RECENT = "recent"
    private const val WEEK_MS = 7L * 86_400_000L
    private const val MAX_RECENT = 500
    private val LOCK = Any()

    fun normalize(s: String): String = s.trim().lowercase()

    fun hash(address: String, body: String): String {
      val bytes = MessageDigest.getInstance("SHA-1").digest("${normalize(address)}|${body.trim()}".toByteArray(Charsets.UTF_8))
      return bytes.joinToString("") { "%02x".format(it) }
    }
  }
}
