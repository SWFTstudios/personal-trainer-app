//
//  WorkoutSessionToLogMapper.swift
//  swft-personal-trainer-app
//

import Foundation

enum WorkoutSessionToLogMapper {
    /// Converts completed session data (with rounds and per-set weights) into the journal's WorkoutLog structure.
    static func makeWorkoutLog(from data: ActiveSessionData) -> WorkoutLog {
        let sorted = data.exercises.sorted(by: { $0.order < $1.order })
        let blocks: [WorkoutLogBlock] = sorted.enumerated().map { exIndex, ex in
            let roundsDataForEx = exIndex < data.weightData.count
                ? data.weightData[exIndex]
                : nil
            let exerciseName = exerciseName(for: ex.exerciseId)
            let strength = StrengthExerciseLog(
                id: UUID(),
                exerciseId: ex.exerciseId,
                customName: exerciseName,
                sets: ex.sets,
                reps: sanitizedReps(ex.reps),
                roundsData: roundsDataForEx
            )
            return .strength(strength)
        }
        return WorkoutLog(
            type: .weightTraining,
            cardio: nil,
            exercises: nil,
            rounds: data.numberOfRounds,
            workoutId: nil,
            workoutCustomDescription: nil,
            blocks: blocks
        )
    }

    /// Converts a completed session draft (no per-set weights) into the journal's WorkoutLog structure.
    static func makeWorkoutLog(from session: WorkoutSessionDraft) -> WorkoutLog {
        let data = ActiveSessionData(
            startDate: session.startDate,
            endDate: session.startDate,
            templateId: session.templateId,
            templateTitle: session.templateTitle,
            clientId: session.clientId,
            exercises: session.exercises,
            numberOfRounds: session.numberOfRounds,
            weightData: [] // no per-set data
        )
        return makeWorkoutLog(from: data)
    }

    /// Resolves exercise display name for journal (uses same source as rest of app).
    private static func exerciseName(for exerciseId: UUID) -> String? {
        MockData.exercises.first(where: { $0.id == exerciseId })?.name
    }

    /// Avoid empty or invalid reps in journal.
    private static func sanitizedReps(_ reps: String) -> String {
        let t = reps.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return "—" }
        return String(t.prefix(64))
    }
}
