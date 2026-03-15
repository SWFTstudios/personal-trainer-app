//
//  TrainerDashboardView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct TrainerDashboardView: View {
    let trainer: Trainer
    @ObservedObject var appState: AppState

    var body: some View {
        TabView {
            NavigationStack {
                List {
                    Section("Your profile") {
                        Text(trainer.displayName ?? "Trainer")
                        if let url = trainer.calendlyUrl, !url.isEmpty {
                            Text("Scheduling: Calendly configured")
                                .font(AppTheme.Typography.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Section("Quick actions") {
                        Text("Manage branding, videos, and clients from the web dashboard.")
                            .font(AppTheme.Typography.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .navigationTitle(trainer.appName ?? "Dashboard")
            }
            .tabItem { Label("Dashboard", systemImage: "square.grid.2x2") }
            NavigationStack {
                SettingsView(appState: appState)
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
