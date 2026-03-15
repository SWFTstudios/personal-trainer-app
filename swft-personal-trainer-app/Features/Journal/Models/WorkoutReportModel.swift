//
//  WorkoutReportModel.swift
//  swft-personal-trainer-app
//

import Foundation

/// One workout entry for report/export: structured for date-range reports and PDF.
struct WorkoutReportEntry {
    var createdAt: Date
    var title: String
    var timeRange: String
    var summaryLines: [String]
    var roundSections: [WorkoutRoundSection]
    var note: String?
}

/// One day in a workout report: date key and all workout entries that day.
struct WorkoutReportDay {
    var date: String
    var entries: [WorkoutReportEntry]
}

// MARK: - Builder

extension WorkoutReportDay {

    /// Groups diary entries by date and builds report-ready workout entries. Uses WorkoutEntryPresentation when log has blocks.
    static func grouped(from entries: [DiaryEntry]) -> [WorkoutReportDay] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: entries) { $0.date }
        return grouped.keys.sorted().map { dateStr in
            let dayEntries = (grouped[dateStr] ?? []).sorted { $0.createdAt < $1.createdAt }
            let reportEntries = dayEntries.compactMap { entry -> WorkoutReportEntry? in
                if let log = entry.workoutLog, let presentation = WorkoutEntryPresentation.from(entry: entry, log: log) {
                    return WorkoutReportEntry(
                        createdAt: entry.createdAt,
                        title: presentation.header.title,
                        timeRange: presentation.header.timeRange,
                        summaryLines: presentation.summaryRows,
                        roundSections: presentation.roundSections,
                        note: entry.bodyText?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? entry.bodyText : nil
                    )
                }
                if entry.workoutLog != nil || entry.workoutId != nil || (entry.workoutCustomDescription != nil && !(entry.workoutCustomDescription?.isEmpty ?? true)) {
                    let title = entry.workoutDisplayTitle ?? entry.workoutCustomDescription ?? "Workout"
                    let timeRange = entry.workoutCustomDescription ?? ""
                    let summaryLines = entry.workoutLog.map { workoutLogSummaryLines($0) } ?? []
                    return WorkoutReportEntry(
                        createdAt: entry.createdAt,
                        title: title,
                        timeRange: timeRange,
                        summaryLines: summaryLines,
                        roundSections: [],
                        note: entry.bodyText?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? entry.bodyText : nil
                    )
                }
                return nil
            }
            return WorkoutReportDay(date: dateStr, entries: reportEntries)
        }.filter { !$0.entries.isEmpty }
    }

    private static func workoutLogSummaryLines(_ log: WorkoutLog) -> [String] {
        if let blocks = log.blocks, !blocks.isEmpty {
            return blocks.compactMap { block -> String? in
                if case .strength(let ex) = block {
                    let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                    return WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps)
                }
                return nil
            }
        }
        if let exs = log.exercises, !exs.isEmpty {
            return exs.map { ex in
                let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                return WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps)
            }
        }
        return []
    }
}
