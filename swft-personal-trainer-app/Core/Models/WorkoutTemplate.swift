//
//  WorkoutTemplate.swift
//  swft-personal-trainer-app
//

import Foundation

/// Difficulty level for a workout template. Display-only in this branch; may be derived from user profile later.
enum WorkoutDifficulty: String, CaseIterable, Hashable {
    case easy
    case moderate
    case challenging

    var displayString: String {
        switch self {
        case .easy: return "Easy"
        case .moderate: return "Moderate"
        case .challenging: return "Challenging"
        }
    }
}

/// One exercise in a workout template with suggested sets and reps. Used for display and in-memory editing.
struct TemplateExerciseItem: Hashable {
    let exerciseId: UUID
    let order: Int
    let suggestedSets: Int
    let suggestedReps: String
}

/// Template workout for the workout library (list + detail). No backend yet; used with mock data.
struct WorkoutTemplate: Identifiable, Hashable {
    let id: UUID
    let title: String
    let shortDescription: String
    let longDescription: String
    let thumbnailUrl: String?
    let videoUrl: String?
    let difficulty: WorkoutDifficulty
    let exercises: [TemplateExerciseItem]

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: WorkoutTemplate, rhs: WorkoutTemplate) -> Bool { lhs.id == rhs.id }
}
