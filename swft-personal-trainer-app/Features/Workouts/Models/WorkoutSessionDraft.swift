//
//  WorkoutSessionDraft.swift
//  swft-personal-trainer-app
//

import Foundation

/// Session-layer model: one exercise as selected for a single workout run. Not the template.
struct WorkoutSessionExercise: Codable, Hashable {
    let exerciseId: UUID
    let order: Int
    var sets: Int
    var reps: String
}

/// In-progress or completed session payload. Template stays immutable; this is the frozen run.
struct WorkoutSessionDraft: Codable, Identifiable {
    let id: UUID
    let clientId: UUID
    let templateId: UUID
    let templateTitle: String
    let startDate: Date
    var exercises: [WorkoutSessionExercise]
    /// Number of rounds for this run (default 3). One round = one pass through all exercises.
    var numberOfRounds: Int
    var isInProgress: Bool

    init(id: UUID = UUID(), clientId: UUID, templateId: UUID, templateTitle: String, startDate: Date, exercises: [WorkoutSessionExercise], numberOfRounds: Int = 3, isInProgress: Bool = true) {
        self.id = id
        self.clientId = clientId
        self.templateId = templateId
        self.templateTitle = templateTitle
        self.startDate = startDate
        self.exercises = exercises
        self.numberOfRounds = max(1, min(20, numberOfRounds))
        self.isInProgress = isInProgress
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        clientId = try c.decode(UUID.self, forKey: .clientId)
        templateId = try c.decode(UUID.self, forKey: .templateId)
        templateTitle = try c.decode(String.self, forKey: .templateTitle)
        startDate = try c.decode(Date.self, forKey: .startDate)
        exercises = try c.decode([WorkoutSessionExercise].self, forKey: .exercises)
        numberOfRounds = (try c.decodeIfPresent(Int.self, forKey: .numberOfRounds)) ?? 3
        isInProgress = (try c.decodeIfPresent(Bool.self, forKey: .isInProgress)) ?? true
    }
}

/// Full session data when user finishes a workout: used to build the journal WorkoutLog (rounds + per-set weights).
struct ActiveSessionData {
    let startDate: Date
    let endDate: Date
    let templateId: UUID
    let templateTitle: String
    let clientId: UUID
    let exercises: [WorkoutSessionExercise]
    let numberOfRounds: Int
    /// [exerciseIndex][roundIndex][setIndex] — per-set weight (nil / "BW" / number) and unit.
    let weightData: [[[SetWeightRecord]]]
}
