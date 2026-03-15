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
                WorkoutsTabContent(client: client, trainer: trainer)
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

/// Wrapper so navigationDestination is on the NavigationStack root; owns in-progress session state for resume and active workout cover.
private struct WorkoutsTabContent: View {
    let client: Client
    let trainer: Trainer
    private let workoutService = WorkoutService()
    private let sessionStore = WorkoutSessionStore()
    private let journalService = JournalService()

    @State private var inProgressSession: WorkoutSessionDraft?

    var body: some View {
        WorkoutsListView(client: client, trainer: trainer)
            .navigationDestination(for: WorkoutTemplate.self) { template in
                WorkoutTemplateDetailView(template: template, client: client, inProgressSession: $inProgressSession)
            }
            .navigationDestination(for: Workout.self) { workout in
                WorkoutDetailView(workout: workout, client: client, workoutService: workoutService)
            }
            .fullScreenCover(item: $inProgressSession) { session in
                ActiveWorkoutView(session: session, client: client) { startDate, endDate, sessionData in
                    if let sessionData {
                        logCompletedWorkout(startDate: startDate, endDate: endDate, sessionData: sessionData) {
                            inProgressSession = nil
                        }
                    } else {
                        inProgressSession = nil
                    }
                }
            }
            .onAppear {
                if let existing = sessionStore.loadInProgress(clientId: client.id) {
                    inProgressSession = existing
                }
            }
    }

    private func logCompletedWorkout(startDate: Date, endDate: Date, sessionData: ActiveSessionData, onDone: @escaping () -> Void) {
        let log = WorkoutSessionToLogMapper.makeWorkoutLog(from: sessionData)
        let timeRange = formatTimeRange(startDate, endDate)
        Task {
            do {
                try await journalService.addDiaryEntry(
                    clientId: client.id,
                    date: startDate,
                    createdAt: startDate,
                    bodyText: nil,
                    imagePath: nil,
                    imageCaption: nil,
                    mediaItems: [],
                    mediaThumbnailData: nil,
                    workoutId: nil,
                    workoutDisplayTitle: sessionData.templateTitle,
                    workoutCustomDescription: timeRange,
                    workoutLog: log,
                    additionalWorkoutLogs: nil,
                    additionalWorkoutPresets: nil
                )
                sessionStore.clearInProgress(clientId: client.id)
                NotificationCenter.default.post(name: .journalDidAddEntry, object: nil)
                await MainActor.run { onDone() }
            } catch {
                await MainActor.run { onDone() }
            }
        }
    }

    private func formatTimeRange(_ start: Date, _ end: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return "\(f.string(from: start)) – \(f.string(from: end))"
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
