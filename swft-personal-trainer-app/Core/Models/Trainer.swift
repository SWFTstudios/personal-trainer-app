//
//  Trainer.swift
//  swft-personal-trainer-app
//

import Foundation

struct Trainer: Codable, Sendable {
    let id: UUID
    let userId: UUID
    var displayName: String?
    var logoUrl: String?
    var accentColorHex: String?
    var secondaryColorHex: String?
    var calendlyUrl: String?
    var appName: String?
    let createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case displayName = "display_name"
        case logoUrl = "logo_url"
        case accentColorHex = "accent_color_hex"
        case secondaryColorHex = "secondary_color_hex"
        case calendlyUrl = "calendly_url"
        case appName = "app_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var brandTheme: BrandTheme {
        BrandTheme(
            displayName: displayName ?? "Your Trainer",
            logoURL: logoUrl,
            accentColorHex: accentColorHex,
            secondaryColorHex: secondaryColorHex,
            calendlyURL: calendlyUrl,
            appName: appName
        )
    }
}
