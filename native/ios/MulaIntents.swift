import AppIntents
import Foundation

// Shortcuts actions for Mula. They run in the background (the app never opens): each one drops
// a small JSON file into Documents/intents, and the app files those into its inbox the next time
// it starts or comes to the foreground. See src/modules/integrations/utils/intents.ts.

enum MulaIntentQueue {
  static func enqueue(_ fields: [String: String]) throws {
    let documents = try FileManager.default.url(
      for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let directory = documents.appendingPathComponent("intents", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

    let receivedAt = Int64(Date().timeIntervalSince1970 * 1000)
    var payload: [String: Any] = ["receivedAt": receivedAt]
    for (key, value) in fields {
      payload[key] = value
    }
    let data = try JSONSerialization.data(withJSONObject: payload, options: [])
    let name = "\(receivedAt)-\(UUID().uuidString).json"
    try data.write(to: directory.appendingPathComponent(name), options: .atomic)
  }
}

/// For a "Message" automation: pass the bank SMS text (Shortcut Input).
@available(iOS 16.0, *)
struct LogBankMessageIntent: AppIntent {
  static let title: LocalizedStringResource = "Log bank message"
  static let openAppWhenRun: Bool = false

  @Parameter(title: "Message")
  var message: String

  @Parameter(title: "Sender")
  var sender: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Log \(\.$message) in Mula")
  }

  func perform() async throws -> some IntentResult {
    try MulaIntentQueue.enqueue(["kind": "sms", "text": message, "sender": sender ?? ""])
    return .result()
  }
}

/// For a Wallet "Transaction" automation: pass Amount, Merchant and Card or Pass.
@available(iOS 16.0, *)
struct LogCardPaymentIntent: AppIntent {
  static let title: LocalizedStringResource = "Log card payment"
  static let openAppWhenRun: Bool = false

  @Parameter(title: "Amount")
  var amount: String

  @Parameter(title: "Merchant")
  var merchant: String?

  @Parameter(title: "Card")
  var card: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Log \(\.$amount) at \(\.$merchant) in Mula")
  }

  func perform() async throws -> some IntentResult {
    try MulaIntentQueue.enqueue([
      "kind": "applepay", "amount": amount, "merchant": merchant ?? "", "card": card ?? "",
    ])
    return .result()
  }
}
