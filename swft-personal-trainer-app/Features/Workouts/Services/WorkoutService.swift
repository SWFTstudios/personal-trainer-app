//
//  WorkoutService.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

@MainActor
final class WorkoutService: Sendable {
    private let client = SupabaseClientManager.shared

    func fetchWorkouts(clientId: UUID) async throws -> [Workout] {
        if AppConfig.skipAuthAndShowHome { return MockData.workouts }
        let response: [Workout] = try await client
            .from("workouts")
            .select()
            .eq("client_id", value: clientId.uuidString)
            .order("created_at", ascending: false)
            .execute()
            .value
        return response
    }

    func fetchWorkoutExercises(workoutId: UUID) async throws -> [WorkoutExercise] {
        if AppConfig.skipAuthAndShowHome {
            return MockData.workoutExercises.filter { $0.workoutId == workoutId }
        }
        let response: [WorkoutExercise] = try await client
            .from("workout_exercises")
            .select()
            .eq("workout_id", value: workoutId.uuidString)
            .order("order", ascending: true)
            .execute()
            .value
        return response
    }

    struct CreateWorkoutPayload: Encodable {
        let clientId: UUID
        let name: String
        let scheduledDays: [Int]

        enum CodingKeys: String, CodingKey {
            case clientId = "client_id"
            case name
            case scheduledDays = "scheduled_days"
        }
    }

    func createWorkout(clientId: UUID, name: String, scheduledDays: [Int]) async throws -> Workout {
        if AppConfig.skipAuthAndShowHome {
            return Workout(id: UUID(), clientId: clientId, name: name, scheduledDays: scheduledDays, createdAt: Date(), updatedAt: Date())
        }
        let payload = CreateWorkoutPayload(clientId: clientId, name: name, scheduledDays: scheduledDays)
        let response: Workout = try await client
            .from("workouts")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
        return response
    }

    struct AddWorkoutExercisePayload: Encodable {
        let workoutId: UUID
        let exerciseId: UUID
        let order: Int
        let sets: Int?
        let reps: String?

        enum CodingKeys: String, CodingKey {
            case workoutId = "workout_id"
            case exerciseId = "exercise_id"
            case order
            case sets
            case reps
        }
    }

    func addExerciseToWorkout(workoutId: UUID, exerciseId: UUID, order: Int, sets: Int?, reps: String?) async throws -> WorkoutExercise {
        if AppConfig.skipAuthAndShowHome {
            return WorkoutExercise(id: UUID(), workoutId: workoutId, exerciseId: exerciseId, order: order, sets: sets, reps: reps, createdAt: Date())
        }
        let payload = AddWorkoutExercisePayload(workoutId: workoutId, exerciseId: exerciseId, order: order, sets: sets, reps: reps)
        let response: WorkoutExercise = try await client
            .from("workout_exercises")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
        return response
    }

    struct CompleteWorkoutPayload: Encodable {
        let workoutId: UUID
        let clientId: UUID
        let scheduledDate: String
        let completedAt: String
        let notes: String?

        enum CodingKeys: String, CodingKey {
            case workoutId = "workout_id"
            case clientId = "client_id"
            case scheduledDate = "scheduled_date"
            case completedAt = "completed_at"
            case notes
        }
    }

    func completeWorkout(workoutId: UUID, clientId: UUID, notes: String?) async throws {
        if AppConfig.skipAuthAndShowHome { return }
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        let payload = CompleteWorkoutPayload(
            workoutId: workoutId,
            clientId: clientId,
            scheduledDate: String(today),
            completedAt: ISO8601DateFormatter().string(from: Date()),
            notes: notes
        )
        try await client
            .from("workout_completions")
            .insert(payload)
            .execute()
    }
}
