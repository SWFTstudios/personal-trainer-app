//
//  SavedCustomWorkout.swift
//  swft-personal-trainer-app
//

import Foundation

/// User-created workout saved from the journal; appears in preset list and later in Workouts custom tab.
struct SavedCustomWorkout: Identifiable, Codable, Sendable {
    let id: UUID
    let clientId: UUID
    var name: String
    var blocks: [WorkoutLogBlock]
    let createdAt: Date

    init(id: UUID = UUID(), clientId: UUID, name: String, blocks: [WorkoutLogBlock], createdAt: Date = Date()) {
        self.id = id
        self.clientId = clientId
        self.name = name
        self.blocks = blocks
        self.createdAt = createdAt
    }
}
