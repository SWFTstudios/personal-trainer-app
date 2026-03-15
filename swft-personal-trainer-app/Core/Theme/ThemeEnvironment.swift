//
//  ThemeEnvironment.swift
//  swft-personal-trainer-app
//

import SwiftUI

private struct BrandThemeKey: EnvironmentKey {
    static let defaultValue: BrandTheme = .default
}

extension EnvironmentValues {
    var brandTheme: BrandTheme {
        get { self[BrandThemeKey.self] }
        set { self[BrandThemeKey.self] = newValue }
    }
}
