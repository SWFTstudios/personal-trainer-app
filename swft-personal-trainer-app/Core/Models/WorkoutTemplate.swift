//
//  WorkoutTemplate.swift
//  swft-personal-trainer-app
//

import Foundation

/// Template workout video for the workout library (list + detail). No backend yet; used with mock data.
struct WorkoutTemplate: Identifiable, Hashable {
    let id: UUID
    let title: String
    let shortDescription: String
    let longDescription: String
    let thumbnailUrl: String?
    let videoUrl: String

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: WorkoutTemplate, rhs: WorkoutTemplate) -> Bool { lhs.id == rhs.id }
}
