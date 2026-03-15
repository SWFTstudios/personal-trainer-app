//
//  JournalReportService.swift
//  swft-personal-trainer-app
//

import Foundation
import UIKit

@MainActor
final class JournalReportService {
    private let journalService = JournalService()

    /// Fetches diary entries in range and builds a PDF report; returns temporary file URL for sharing.
    func generateReport(clientId: UUID, from startDate: Date, to endDate: Date) async throws -> URL {
        let entries = try await journalService.fetchDiaryEntries(clientId: clientId, from: startDate, to: endDate)
        let data = Self.renderPDF(entries: entries, startDate: startDate, endDate: endDate)
        let fileName = "journal-report-\(Self.formatForFile(startDate))-\(Self.formatForFile(endDate)).pdf"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try data.write(to: tempURL)
        return tempURL
    }

    private static func formatForFile(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private static func renderPDF(entries: [DiaryEntry], startDate: Date, endDate: Date) -> Data {
        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 50
        let lineHeight: CGFloat = 18
        let titleFont = UIFont.boldSystemFont(ofSize: 16)
        let sectionFont = UIFont.boldSystemFont(ofSize: 14)
        let bodyFont = UIFont.systemFont(ofSize: 11)

        let dateFormatter: DateFormatter = {
            let f = DateFormatter()
            f.dateStyle = .medium
            f.timeStyle = .short
            return f
        }()

        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight))
        let data = renderer.pdfData { context in
            var y = margin
            let contentWidth = pageWidth - 2 * margin

            func newPageIfNeeded(neededHeight: CGFloat) {
                if y + neededHeight > pageHeight - margin {
                    context.beginPage()
                    y = margin
                }
            }

            func drawTitle(_ text: String) {
                newPageIfNeeded(neededHeight: lineHeight * 2)
                let attrs: [NSAttributedString.Key: Any] = [.font: titleFont]
                text.draw(at: CGPoint(x: margin, y: y), withAttributes: attrs)
                y += lineHeight * 1.5
            }

            func drawSection(_ text: String) {
                newPageIfNeeded(neededHeight: lineHeight * 2)
                let attrs: [NSAttributedString.Key: Any] = [.font: sectionFont]
                text.draw(at: CGPoint(x: margin, y: y), withAttributes: attrs)
                y += lineHeight * 1.2
            }

            func drawBody(_ text: String) {
                let attrs: [NSAttributedString.Key: Any] = [.font: bodyFont]
                let boundingRect = text.boundingRect(with: CGSize(width: contentWidth, height: .greatestFiniteMagnitude), options: .usesLineFragmentOrigin, attributes: attrs, context: nil)
                newPageIfNeeded(neededHeight: boundingRect.height + lineHeight)
                text.draw(in: CGRect(x: margin, y: y, width: contentWidth, height: boundingRect.height + 4), withAttributes: attrs)
                y += boundingRect.height + lineHeight * 0.5
            }

            context.beginPage()
            drawTitle("Journal Report")
            let rangeStr = "\(formatForFile(startDate)) – \(formatForFile(endDate))"
            drawBody(rangeStr)
            y += lineHeight

            func drawWorkoutEntry(entry: DiaryEntry, log: WorkoutLog, drawBody: (String) -> Void) {
                guard let presentation = WorkoutEntryPresentation.from(entry: entry, log: log) else {
                    if let summary = workoutLogSummary(log), !summary.isEmpty {
                        drawBody("  Workout: \(summary)")
                    }
                    return
                }
                if !presentation.header.timeRange.isEmpty {
                    drawBody("  \(presentation.header.timeRange)")
                }
                if !presentation.header.title.isEmpty {
                    drawBody("  \(presentation.header.title)")
                }
                for line in presentation.summaryRows {
                    drawBody("  \(line)")
                }
                for section in presentation.roundSections {
                    drawBody("  Round \(section.roundIndex)")
                    for row in section.exerciseRows {
                        let setLine = row.setSummaries.joined(separator: ", ")
                        drawBody("    \(row.exerciseName): \(setLine)")
                    }
                }
            }

            func drawWorkoutLogAsBody(_ log: WorkoutLog, drawBody: (String) -> Void) {
                if let summary = workoutLogSummary(log), !summary.isEmpty {
                    drawBody("  Workout: \(summary)")
                }
            }

            let groupedByDate = Dictionary(grouping: entries, by: { $0.date }).sorted { $0.key < $1.key }
            for (dateStr, dayEntries) in groupedByDate {
                drawSection(dateStr)
                for entry in dayEntries {
                    drawBody("  \(entry.createdAt.journalFormat("h:mm a"))")
                    if let body = entry.bodyText, !body.isEmpty {
                        drawBody("  \(body)")
                    }
                    drawBody("  Entered: \(dateFormatter.string(from: entry.createdAt))")
                    if let updated = entry.updatedAt, updated != entry.createdAt {
                        drawBody("  Last edited: \(dateFormatter.string(from: updated))")
                    }
                    if !entry.mediaItems.isEmpty {
                        for item in entry.mediaItems {
                            drawBody("  [\(item.kind == .video ? "Video" : "Photo")]\(item.caption.map { " – \($0)" } ?? "")")
                        }
                    } else if entry.imagePath != nil {
                        drawBody("  [Photo]\(entry.imageCaption.map { " – \($0)" } ?? "")")
                    }
                    if let log = entry.workoutLog {
                        drawWorkoutEntry(entry: entry, log: log, drawBody: drawBody)
                    } else if let custom = entry.workoutCustomDescription, !custom.isEmpty {
                        drawBody("  Workout: \(custom)")
                    } else if entry.workoutId != nil {
                        drawBody("  Workout: \(entry.workoutDisplayTitle ?? "Logged from plan")")
                    }
                    for log in entry.additionalWorkoutLogs ?? [] {
                        drawWorkoutLogAsBody(log, drawBody: drawBody)
                    }
                    y += lineHeight * 0.5
                }
                y += lineHeight
            }
        }
        return data
    }

    private nonisolated static func workoutLogSummary(_ log: WorkoutLog) -> String? {
        if let blocks = log.blocks, !blocks.isEmpty {
            let parts = blocks.prefix(5).compactMap { block -> String? in
                switch block {
                case .strength(let ex):
                    let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                    return WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps)
                case .cardio(let c):
                    return cardioSummaryLineForReport(c)
                }
            }
            return parts.isEmpty ? nil : parts.joined(separator: ", ")
        }
        if let custom = log.workoutCustomDescription, !custom.isEmpty { return custom }
        if let c = log.cardio {
            if let d = c.durationValue, let u = c.durationUnit {
                return "Cardio \(String(format: "%.0f", d)) \(u.rawValue)"
            }
            if let d = c.distanceValue, let u = c.distanceUnit {
                return "Cardio \(String(format: "%.1f", d)) \(u.rawValue)"
            }
        }
        if let exs = log.exercises, !exs.isEmpty {
            return exs.map { ex in
                let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                return WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps)
            }.joined(separator: ", ")
        }
        return nil
    }

    private nonisolated static func cardioSummaryLineForReport(_ c: CardioLog) -> String {
        let title = (c.title?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? c.activityType?.defaultTitle
        var parts: [String] = []
        parts.append(title ?? "Cardio")
        if let d = c.durationValue, d > 0 {
            let u = c.durationUnit ?? .minutes
            parts.append("\(String(format: "%.0f", d)) \(u.rawValue)")
        }
        if let d = c.distanceValue, d > 0 {
            let u = c.distanceUnit ?? .miles
            parts.append("\(String(format: "%.1f", d)) \(u.rawValue)")
        }
        return parts.joined(separator: " · ")
    }
}
