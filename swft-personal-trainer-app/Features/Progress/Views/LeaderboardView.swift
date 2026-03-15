//
//  LeaderboardView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct LeaderboardView: View {
    let client: Client
    let trainer: Trainer

    @State private var completionsCount: Int = 0
    @State private var loadError: String?

    private let leaderboardService = LeaderboardService()

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            if let error = loadError {
                Text(error)
                    .font(AppTheme.Typography.body)
                    .foregroundStyle(.secondary)
            } else {
                Text("Your progress")
                    .font(AppTheme.Typography.title)
                Text("\(completionsCount) workouts completed (last 30 days)")
                    .font(AppTheme.Typography.body)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle("Progress")
        .task { await load() }
    }

    private func load() async {
        loadError = nil
        do {
            completionsCount = try await leaderboardService.fetchMyCompletionsCount(clientId: client.id, lastDays: 30)
        } catch {
            loadError = error.localizedDescription
        }
    }
}
