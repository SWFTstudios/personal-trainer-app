//
//  BrandTheme.swift
//  swft-personal-trainer-app
//

import SwiftUI

/// Trainer-specific branding (logo, accent). Applied on top of AppTheme.
struct BrandTheme {
    var displayName: String
    var logoURL: String?
    var accentColorHex: String?
    var secondaryColorHex: String?
    var calendlyURL: String?
    var appName: String?

    var accentColor: Color {
        guard let hex = accentColorHex else { return Color.primary }
        return Color(hex: hex) ?? Color.primary
    }

    /// Use for text/icons on accent backgrounds (e.g. FAB, selected date) so they stay readable.
    var onAccentForeground: Color {
        guard let hex = accentColorHex?.trimmingCharacters(in: CharacterSet.alphanumerics.inverted),
              !hex.isEmpty
        else { return .black }
        var int: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&int) else { return .black }
        let r, g, b: Double
        switch hex.count {
        case 3:
            r = Double((int >> 8) * 17) / 255
            g = Double((int >> 4 & 0xF) * 17) / 255
            b = Double((int & 0xF) * 17) / 255
        case 6, 8:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            return .black
        }
        let luminance = 0.299 * r + 0.587 * g + 0.114 * b
        return luminance > 0.5 ? .black : .white
    }

    static let `default` = BrandTheme(
        displayName: "Your Trainer",
        logoURL: nil,
        accentColorHex: nil,
        secondaryColorHex: nil,
        calendlyURL: nil,
        appName: nil
    )
}

extension Color {
    init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&int) else { return nil }
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
