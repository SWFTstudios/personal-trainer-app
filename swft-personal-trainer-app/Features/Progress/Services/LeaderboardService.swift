//
//  LeaderboardService.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

@MainActor
final class LeaderboardService: Sendable {
    private let client = SupabaseClientManager.shared

    /// Count of workout completions for the client in the last N days.
    func fetchMyCompletionsCount(clientId: UUID, lastDays: Int) async throws -> Int {
        if AppConfig.skipAuthAndShowHome { return MockData.completionsCount }
        let since = Calendar.current.date(byAdding: .day, value: -lastDays, to: Date()) ?? Date()
        let sinceString = ISO8601DateFormatter().string(from: since).prefix(10)
        let response: [WorkoutCompletionRow] = try await client
            .from("workout_completions")
            .select("id")
            .eq("client_id", value: clientId.uuidString)
            .gte("scheduled_date", value: String(sinceString))
            .execute()
            .value
        return response.count
    }
}

private struct WorkoutCompletionRow: Codable {
    let id: UUID
}
