//
//  WorkoutSessionStore.swift
//  swft-personal-trainer-app
//

import Foundation

/// Persists in-progress workout session so it survives app backgrounding/termination.
/// One in-progress session per client.
@MainActor
final class WorkoutSessionStore {
    private let keyPrefix = "workout_session_in_progress"

    private func key(clientId: UUID) -> String {
        "\(keyPrefix)_\(clientId.uuidString)"
    }

    func saveInProgress(_ session: WorkoutSessionDraft) {
        guard session.isInProgress else { return }
        let data = (try? JSONEncoder().encode(session))
        UserDefaults.standard.set(data, forKey: key(clientId: session.clientId))
    }

    func loadInProgress(clientId: UUID) -> WorkoutSessionDraft? {
        guard let data = UserDefaults.standard.data(forKey: key(clientId: clientId)),
              let session = try? JSONDecoder().decode(WorkoutSessionDraft.self, from: data),
              session.isInProgress else { return nil }
        return session
    }

    func clearInProgress(clientId: UUID) {
        UserDefaults.standard.removeObject(forKey: key(clientId: clientId))
    }

    /// Threshold in seconds (e.g. 2 hours).
    static let staleSessionThreshold: TimeInterval = 2 * 60 * 60

    func isStale(_ session: WorkoutSessionDraft) -> Bool {
        Date().timeIntervalSince(session.startDate) > Self.staleSessionThreshold
    }
}
