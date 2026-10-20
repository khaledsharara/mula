package expo.modules.mulasms

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/** One notification that counts the bank payments waiting; tapping it opens the inbox. */
internal object SmsNotifier {
  private const val CHANNEL = "bank_messages"
  private const val NOTIFICATION_ID = 4201

  fun show(context: Context) {
    if (Build.VERSION.SDK_INT >= 33 &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL, "Bank messages", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "A payment from your bank is waiting in Mula"
      }
      context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    val count = SmsQueue.pendingCount(context)
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("mula://inbox"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val tap = PendingIntent.getActivity(context, NOTIFICATION_ID, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val notification = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(if (count > 1) "$count bank payments to review" else "New bank payment to review")
      .setContentText("Open Mula to confirm it.")
      .setContentIntent(tap)
      .setAutoCancel(true)
      .build()
    try {
      manager.notify(NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // Notifications turned off in the meantime.
    }
  }
}
