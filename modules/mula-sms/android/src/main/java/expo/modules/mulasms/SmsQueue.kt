package expo.modules.mulasms

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Hands messages to the app the same way the iPhone Shortcuts actions do: one JSON file per
 * message in <files>/intents (expo-file-system's Paths.document), drained by
 * src/modules/integrations/utils/intents.ts when Mula opens.
 */
internal object SmsQueue {
  private fun dir(context: Context) = File(context.filesDir, "intents")

  fun enqueue(context: Context, sender: String, body: String, receivedAt: Long) {
    val dir = dir(context)
    dir.mkdirs()
    val json = JSONObject()
      .put("kind", "sms")
      .put("text", body)
      .put("sender", sender)
      .put("receivedAt", receivedAt)
    val name = "$receivedAt-${UUID.randomUUID()}"
    // Written under another name first, so the app never reads half a file.
    val tmp = File(dir, "$name.json.tmp")
    tmp.writeText(json.toString(), Charsets.UTF_8)
    if (!tmp.renameTo(File(dir, "$name.json"))) tmp.delete()
  }

  fun pendingCount(context: Context): Int = dir(context).listFiles { f -> f.name.endsWith(".json") }?.size ?: 0
}
