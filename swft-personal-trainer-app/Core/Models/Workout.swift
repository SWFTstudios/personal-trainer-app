//
//  Workout.swift
//  swft-personal-trainer-app
//

import Foundation

struct Workout: Codable, Sendable, Identifiable {
    let id: UUID
    let clientId: UUID
    let name: String
    let scheduledDays: [Int]
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case name
        case scheduledDays = "scheduled_days"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct WorkoutExercise: Codable, Sendable {
    let id: UUID
    let workoutId: UUID
    let exerciseId: UUID
    let order: Int
    let sets: Int?
    let reps: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case workoutId = "workout_id"
        case exerciseId = "exercise_id"
        case order
        case sets
        case reps
        case createdAt = "created_at"
    }
}
