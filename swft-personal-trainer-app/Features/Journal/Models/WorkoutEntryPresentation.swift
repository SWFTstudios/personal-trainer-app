//
//  WorkoutEntryPresentation.swift
//  swft-personal-trainer-app
//

import Foundation

/// Header block for a workout journal entry: time range and title.
struct WorkoutEntryHeader {
    var timeRange: String
    var title: String
}

/// One exercise line in the round details: name and set summaries ("Set 1 BW", "Set 2 30 LBS", ...).
struct WorkoutRoundExerciseRow {
    var exerciseName: String
    var setSummaries: [String]
}

/// One round in the round details block: 1-based index and exercise rows with set weights.
struct WorkoutRoundSection {
    var roundIndex: Int
    var exerciseRows: [WorkoutRoundExerciseRow]
}

/// Structured presentation for a blocks-based workout log. Powers journal detail, card preview, and report.
struct WorkoutEntryPresentation {
    var header: WorkoutEntryHeader
    var summaryRows: [String]
    var roundSections: [WorkoutRoundSection]
}

// MARK: - Builder

extension WorkoutEntryPresentation {

    /// Builds presentation from entry metadata and a blocks-based workout log. Returns nil for legacy logs without blocks.
    static func from(entry: DiaryEntry, log: WorkoutLog) -> WorkoutEntryPresentation? {
        guard let blocks = log.blocks, !blocks.isEmpty else { return nil }

        let timeRange = entry.workoutCustomDescription?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let title = entry.workoutDisplayTitle?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let header = WorkoutEntryHeader(timeRange: timeRange, title: title)

        var summaryRows: [String] = []
        for block in blocks {
            if case .strength(let ex) = block {
                let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                summaryRows.append(WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps))
            }
        }

        let roundSections = Self.buildRoundSections(log: log, blocks: blocks)

        return WorkoutEntryPresentation(
            header: header,
            summaryRows: summaryRows,
            roundSections: roundSections
        )
    }

    private static func buildRoundSections(log: WorkoutLog, blocks: [WorkoutLogBlock]) -> [WorkoutRoundSection] {
        let roundsCount = effectiveRoundsCount(log: log)
        guard roundsCount > 0, hasRoundsWeights(blocks: blocks) else { return [] }

        return (0..<roundsCount).map { roundIndex in
            var exerciseRows: [WorkoutRoundExerciseRow] = []
            for block in blocks {
                if case .strength(let ex) = block,
                   let roundsData = ex.roundsData,
                   roundIndex < roundsData.count,
                   !roundsData[roundIndex].isEmpty {
                    let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                    let setSummaries = roundsData[roundIndex].enumerated().map { idx, record in
                        WorkoutDisplayHelpers.setSummaryDisplay(setIndex: idx, record: record)
                    }
                    exerciseRows.append(WorkoutRoundExerciseRow(exerciseName: name, setSummaries: setSummaries))
                }
            }
            return WorkoutRoundSection(roundIndex: roundIndex + 1, exerciseRows: exerciseRows)
        }
    }

    private static func effectiveRoundsCount(log: WorkoutLog) -> Int {
        if let r = log.rounds, r > 0 { return r }
        guard let blocks = log.blocks else { return 0 }
        for block in blocks {
            if case .strength(let ex) = block, let rounds = ex.roundsData, !rounds.isEmpty {
                return rounds.count
            }
        }
        return 0
    }

    private static func hasRoundsWeights(blocks: [WorkoutLogBlock]) -> Bool {
        blocks.contains { block in
            if case .strength(let ex) = block, let rounds = ex.roundsData, !rounds.isEmpty {
                return rounds.contains { !$0.isEmpty }
            }
            return false
        }
    }
}
