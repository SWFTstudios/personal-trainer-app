//
//  Exercise.swift
//  swft-personal-trainer-app
//

import Foundation

struct Exercise: Codable, Sendable, Identifiable {
    let id: UUID
    let trainerId: UUID?
    let name: String
    let category: String
    let discipline: String?
    let videoUrl: String?
    let instructions: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case name
        case category
        case discipline
        case videoUrl = "video_url"
        case instructions
        case createdAt = "created_at"
    }
}
