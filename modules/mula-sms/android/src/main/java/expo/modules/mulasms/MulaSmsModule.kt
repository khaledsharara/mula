package expo.modules.mulasms

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.lang.ref.WeakReference

class SmsConfig : Record {
  @Field
  val enabled: Boolean = false

  @Field
  val senders: List<String> = emptyList()

  @Field
  val notify: Boolean = true
}

/** JS side: src/modules/integrations/utils/androidSms.ts. */
class MulaSmsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("MulaSms")

    Events(EVENT_QUEUED)

    OnCreate {
      current = WeakReference(this@MulaSmsModule)
    }

    OnDestroy {
      if (current?.get() === this@MulaSmsModule) current = null
    }

    Function("getStatus") {
      val store = SmsStore(context)
      mapOf(
        "enabled" to store.enabled,
        "senders" to store.senders.toList(),
        "notify" to store.notify,
        "lastSeen" to store.lastSeen.toDouble(),
      )
    }

    Function("configure") { config: SmsConfig ->
      val store = SmsStore(context)
      // Turning capture on starts from now; older messages come in through the history import.
      if (config.enabled && !store.enabled) store.lastSeen = System.currentTimeMillis()
      store.senders = config.senders.toSet()
      store.notify = config.notify
      store.enabled = config.enabled
    }

    AsyncFunction("catchUp") {
      SmsInbox.catchUp(context)
    }
  }

  companion object {
    private const val EVENT_QUEUED = "onQueued"
    private var current: WeakReference<MulaSmsModule>? = null

    /** Tells a running app that messages are waiting, so it files them right away. */
    fun emitQueued() {
      current?.get()?.sendEvent(EVENT_QUEUED, mapOf("at" to System.currentTimeMillis().toDouble()))
    }
  }
}
