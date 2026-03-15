//
//  WorkoutDisplayHelpers.swift
//  swft-personal-trainer-app
//

import Foundation

/// Shared formatting for workout text across journal detail, timeline cards, and report/export.
/// Use these helpers everywhere so display is consistent (e.g. "—", "×", BW/LBS/KG).
enum WorkoutDisplayHelpers {

    // MARK: - Exercise summary line

    /// One line per exercise: "Goblet squat — 4 × 10", "Walking lunge — 3 × 10 each".
    static func exerciseSummaryLine(name: String, sets: Int, reps: String) -> String {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let displayName = trimmedName.isEmpty ? "Exercise" : trimmedName
        let displayReps = repDisplay(reps)
        return "\(displayName) — \(sets) × \(displayReps)"
    }

    // MARK: - Rep display

    /// Normalized rep string for display: "10", "10 each", "45 sec", etc.
    static func repDisplay(_ reps: String) -> String {
        reps.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Weight display

    /// Short weight token for read-only views and report: "—", "BW", "30 LBS", "20 KG".
    static func weightDisplayString(for record: SetWeightRecord) -> String {
        let w = record.weight?.trimmingCharacters(in: .whitespacesAndNewlines)
        if w == nil || w?.isEmpty == true { return "—" }
        if w == "BW" { return "BW" }
        guard let value = w else { return "—" }
        let unitLabel = (record.unit == .kg) ? "KG" : "LBS"
        return "\(value) \(unitLabel)"
    }

    // MARK: - Set summary display

    /// Per-set line in round details: "Set 1 BW", "Set 2 30 LBS", "Set 3 20 KG".
    static func setSummaryDisplay(setIndex: Int, record: SetWeightRecord) -> String {
        let weightStr = weightDisplayString(for: record)
        return "Set \(setIndex + 1) \(weightStr)"
    }
}
