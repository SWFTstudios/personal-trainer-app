//
//  Client.swift
//  swft-personal-trainer-app
//

import Foundation

struct Client: Codable, Sendable {
    let id: UUID
    let userId: UUID
    let trainerId: UUID
    var onboardingCompletedAt: Date?
    var inviteCodeUsed: String?
    let createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case trainerId = "trainer_id"
        case onboardingCompletedAt = "onboarding_completed_at"
        case inviteCodeUsed = "invite_code_used"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
