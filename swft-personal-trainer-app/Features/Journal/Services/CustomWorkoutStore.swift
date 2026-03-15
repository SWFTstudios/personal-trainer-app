//
//  CustomWorkoutStore.swift
//  swft-personal-trainer-app
//

import Foundation

/// In-memory store for user-saved custom workouts (from journal). Used by preset picker and later by Workouts list custom tab.
enum CustomWorkoutStore {
    private static let lock = NSLock()
    private static var _items: [SavedCustomWorkout] = []

    static var items: [SavedCustomWorkout] {
        lock.lock()
        defer { lock.unlock() }
        return _items
    }

    static func list(clientId: UUID) -> [SavedCustomWorkout] {
        lock.lock()
        defer { lock.unlock() }
        return _items.filter { $0.clientId == clientId }.sorted { $0.createdAt < $1.createdAt }
    }

    static func entry(id: UUID) -> SavedCustomWorkout? {
        lock.lock()
        defer { lock.unlock() }
        return _items.first { $0.id == id }
    }

    static func add(_ workout: SavedCustomWorkout) {
        lock.lock()
        defer { lock.unlock() }
        _items.append(workout)
    }

    /// Default name "Custom Workout N" where N is the next sequential number for this client.
    static func nextDefaultName(clientId: UUID) -> String {
        lock.lock()
        defer { lock.unlock() }
        let prefix = "Custom Workout "
        let existing = _items.filter { $0.clientId == clientId }
        let numbers = existing.compactMap { w -> Int? in
            guard w.name.hasPrefix(prefix) else { return nil }
            let suffix = w.name.dropFirst(prefix.count)
            return Int(suffix)
        }
        let next = (numbers.max() ?? 0) + 1
        return "\(prefix)\(next)"
    }
}
