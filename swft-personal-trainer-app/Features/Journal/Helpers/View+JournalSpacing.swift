//
//  View+JournalSpacing.swift
//  swft-personal-trainer-app
//

import SwiftUI

extension View {
    func hSpacing(_ alignment: Alignment) -> some View {
        frame(maxWidth: .infinity, alignment: alignment)
    }

    func vSpacing(_ alignment: Alignment) -> some View {
        frame(maxHeight: .infinity, alignment: alignment)
    }
}
