//
//  AppTheme.swift
//  swft-personal-trainer-app
//

import SwiftUI

/// Base design tokens — premium, minimal, luxurious.
/// Trainer branding (accent, logo) overlays via BrandTheme.
struct AppTheme {
    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
    }

    enum Typography {
        static let largeTitle = Font.system(size: 28, weight: .semibold, design: .default)
        static let title = Font.system(size: 22, weight: .semibold, design: .default)
        static let title2 = Font.system(size: 18, weight: .semibold, design: .default)
        static let headline = Font.system(size: 17, weight: .semibold, design: .default)
        static let body = Font.system(size: 17, weight: .regular, design: .default)
        static let callout = Font.system(size: 16, weight: .regular, design: .default)
        static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
        static let footnote = Font.system(size: 13, weight: .regular, design: .default)
    }
}
