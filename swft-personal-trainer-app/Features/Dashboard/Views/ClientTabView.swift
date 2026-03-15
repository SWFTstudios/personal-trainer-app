//
//  ClientTabView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct ClientTabView: View {
    let client: Client
    let trainer: Trainer
    @ObservedObject var appState: AppState

    var body: some View {
        TabView {
            NavigationStack {
                ClientHomeView(client: client, trainer: trainer)
            }
            .tabItem { Label("Home", systemImage: "house") }
            NavigationStack {
                WorkoutsListView(client: client, trainer: trainer)
            }
            .tabItem { Label("Workouts", systemImage: "dumbbell") }
            NavigationStack {
                JournalListView(client: client)
            }
            .tabItem { Label("Journal", systemImage: "book") }
            NavigationStack {
                LeaderboardView(client: client, trainer: trainer)
            }
            .tabItem { Label("Progress", systemImage: "chart.bar") }
            NavigationStack {
                SettingsView(appState: appState)
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

struct SettingsView: View {
    @ObservedObject var appState: AppState

    var body: some View {
        List {
            Button("Sign out", role: .destructive) {
                Task { await appState.signOut() }
            }
        }
        .navigationTitle("Settings")
    }
}
