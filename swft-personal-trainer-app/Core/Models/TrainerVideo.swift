//
//  TrainerVideo.swift
//  swft-personal-trainer-app
//

import Foundation

struct TrainerVideo: Codable, Sendable {
    let id: UUID
    let trainerId: UUID
    let title: String
    let url: String
    let thumbnailUrl: String?
    let type: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case title
        case url
        case thumbnailUrl = "thumbnail_url"
        case type
        case createdAt = "created_at"
    }
}
