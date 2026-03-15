//
//  TenantService.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

/// Resolves whether the current user is a trainer or client and loads trainer branding for clients.
@MainActor
final class TenantService: Sendable {
    private let client = SupabaseClientManager.shared

    /// If user is a trainer, returns their trainer row id. Otherwise nil.
    func fetchTrainerId(forUserId userId: UUID) async throws -> UUID? {
        let response: Trainer? = try await client
            .from("trainers")
            .select()
            .eq("user_id", value: userId.uuidString)
            .single()
            .execute()
            .value
        return response?.id
    }

    /// If user is a client, returns their client row. Otherwise nil.
    func fetchClient(forUserId userId: UUID) async throws -> Client? {
        let response: Client? = try await client
            .from("clients")
            .select()
            .eq("user_id", value: userId.uuidString)
            .single()
            .execute()
            .value
        return response
    }

    /// Load trainer profile for branding (for clients: pass client.trainerId).
    func fetchTrainer(trainerId: UUID) async throws -> Trainer {
        let response: Trainer = try await client
            .from("trainers")
            .select()
            .eq("id", value: trainerId.uuidString)
            .single()
            .execute()
            .value
        return response
    }

    /// Create client row after signup when joining via invite (trainerId from invite link/code).
    func createClient(userId: UUID, trainerId: UUID, inviteCodeUsed: String?) async throws -> Client {
        struct InsertPayload: Encodable {
            let userId: UUID
            let trainerId: UUID
            let inviteCodeUsed: String?

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case trainerId = "trainer_id"
                case inviteCodeUsed = "invite_code_used"
            }
        }
        let payload = InsertPayload(userId: userId, trainerId: trainerId, inviteCodeUsed: inviteCodeUsed)
        let response: Client = try await client
            .from("clients")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
        return response
    }
}
