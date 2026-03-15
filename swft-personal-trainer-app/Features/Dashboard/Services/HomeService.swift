//
//  HomeService.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

@MainActor
final class HomeService: Sendable {
    private let client = SupabaseClientManager.shared

    /// New videos from trainer (e.g. last 7 days)
    func fetchNewVideos(trainerId: UUID, sinceDays: Int = 7) async throws -> [TrainerVideo] {
        if AppConfig.skipAuthAndShowHome { return MockData.trainerVideos }
        let since = Calendar.current.date(byAdding: .day, value: -sinceDays, to: Date()) ?? Date()
        let sinceString = ISO8601DateFormatter().string(from: since)
        let response: [TrainerVideo] = try await client
            .from("trainer_videos")
            .select()
            .eq("trainer_id", value: trainerId.uuidString)
            .gte("created_at", value: sinceString)
            .order("created_at", ascending: false)
            .execute()
            .value
        return response
    }

    /// Recent announcements from trainer
    func fetchAnnouncements(trainerId: UUID, limit: Int = 5) async throws -> [TrainerAnnouncement] {
        if AppConfig.skipAuthAndShowHome { return MockData.announcements }
        let response: [TrainerAnnouncement] = try await client
            .from("trainer_announcements")
            .select()
            .eq("trainer_id", value: trainerId.uuidString)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value
        return response
    }

    /// Workouts scheduled for today (weekday 1–7, Sunday=1 or Monday=1 depending on schema; using Calendar weekday 1=Sun .. 7=Sat)
    func fetchTodaysWorkouts(clientId: UUID) async throws -> [Workout] {
        if AppConfig.skipAuthAndShowHome {
            let weekday = Calendar.current.component(.weekday, from: Date())
            return MockData.workouts.filter { $0.scheduledDays.contains(weekday) }
        }
        let weekday = Calendar.current.component(.weekday, from: Date())
        let response: [Workout] = try await client
            .from("workouts")
            .select()
            .eq("client_id", value: clientId.uuidString)
            .contains("scheduled_days", value: [weekday])
            .execute()
            .value
        return response
    }

    /// Workout exercises for a workout (with exercise details if we join; for simplicity fetch workout_exercises and then exercises)
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

    /// Exercises for trainer. RLS allows reading trainer's exercises; global (trainer_id null) can be added later.
    func fetchExercises(trainerId: UUID) async throws -> [Exercise] {
        if AppConfig.skipAuthAndShowHome { return MockData.exercises }
        let response: [Exercise] = try await client
            .from("exercises")
            .select()
            .eq("trainer_id", value: trainerId.uuidString)
            .execute()
            .value
        return response
    }
}
