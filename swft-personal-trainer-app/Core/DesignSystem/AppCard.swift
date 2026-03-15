//
//  AppCard.swift
//  swft-personal-trainer-app
//

import SwiftUI

/// Reusable card container for homepage and other premium card-based layouts.
/// Rounded corners, subtle background, consistent padding; supports optional tap.
struct AppCard<Content: View>: View {
    let content: () -> Content
    var action: (() -> Void)?

    init(
        action: (() -> Void)? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.action = action
        self.content = content
    }

    var body: some View {
        Group {
            if let action {
                Button(action: action) {
                    cardContent
                }
                .buttonStyle(.plain)
            } else {
                cardContent
            }
        }
    }

    private var cardContent: some View {
        content()
            .padding(AppTheme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.Radius.lg)
                    .stroke(Color(.systemGray4).opacity(0.5), lineWidth: 0.5)
            )
    }
}

#Preview {
    VStack(spacing: AppTheme.Spacing.lg) {
        AppCard {
            Text("Card content")
                .font(AppTheme.Typography.body)
        }
        AppCard(action: {}) {
            Text("Tappable card")
                .font(AppTheme.Typography.headline)
        }
    }
    .padding()
}
