//
//  OnboardingContainerView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct OnboardingContainerView: View {
    let client: Client
    var onComplete: () async -> Void

    @State private var trainer: Trainer?
    @State private var loadError: String?

    var body: some View {
        Group {
            if let trainer {
                OnboardingView(client: client, trainer: trainer, onComplete: onComplete)
            } else if let loadError {
                VStack(spacing: AppTheme.Spacing.md) {
                    Text(loadError)
                        .font(AppTheme.Typography.body)
                        .foregroundStyle(.secondary)
                    Button("Retry") { Task { await loadTrainer() } }
                        .buttonStyle(.borderedProminent)
                }
                .padding(AppTheme.Spacing.lg)
            } else {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task { await loadTrainer() }
    }

    private func loadTrainer() async {
        do {
            trainer = try await TenantService().fetchTrainer(trainerId: client.trainerId)
        } catch {
            loadError = error.localizedDescription
        }
    }
}
