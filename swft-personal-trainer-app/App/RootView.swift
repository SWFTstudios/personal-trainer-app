//
//  RootView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct RootView: View {
    @StateObject private var appState = AppState()

    var body: some View {
        Group {
            if AppConfig.skipAuthAndShowHome {
                NavigationStack {
                    ClientTabView(client: MockData.client, trainer: MockData.trainer, appState: appState)
                        .environment(\.brandTheme, MockData.trainer.brandTheme)
                }
            } else if appState.isLoading {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content(for: appState.route)
            }
        }
        .task {
            guard !AppConfig.skipAuthAndShowHome else { return }
            await appState.resolveRoute()
        }
        .onOpenURL { url in
            handleInviteURL(url)
        }
    }

    @ViewBuilder
    private func content(for route: AppState.Route) -> some View {
        switch route {
        case .signedOut:
            SignInView(onSignedIn: { await appState.resolveRoute() })
        case .onboarding(let client):
            OnboardingContainerView(client: client) {
                await appState.finishOnboarding()
            }
        case .client(let client, let trainer):
            NavigationStack {
                ClientTabView(client: client, trainer: trainer, appState: appState)
                    .environment(\.brandTheme, trainer.brandTheme)
            }
        case .trainer(let trainer):
            TrainerDashboardView(trainer: trainer, appState: appState)
        }
    }

    private func handleInviteURL(_ url: URL) {
        guard url.scheme == "swfttrainer" || url.host == "join",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let trainerId = components.queryItems?.first(where: { $0.name == "trainer" })?.value else { return }
        UserDefaults.standard.set(trainerId, forKey: "pending_invite_trainer_id")
    }
}
