//
//  TrainerAnnouncement.swift
//  swft-personal-trainer-app
//

import Foundation

struct TrainerAnnouncement: Codable, Sendable {
    let id: UUID
    let trainerId: UUID
    let body: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case body
        case createdAt = "created_at"
    }
}
