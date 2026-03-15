//
//  JournalService.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

struct JournalEntry: Codable, Sendable, Identifiable {
    let id: UUID
    let clientId: UUID
    let date: String
    let moodText: String?
    let workoutDifficultyNotes: String?
    let foodNotes: String?
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case date
        case moodText = "mood_text"
        case workoutDifficultyNotes = "workout_difficulty_notes"
        case foodNotes = "food_notes"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

extension Notification.Name {
    /// Posted when a diary entry is added (e.g. from workout stop) so journal UI can refresh.
    static let journalDidAddEntry = Notification.Name("journalDidAddEntry")
}

@MainActor
final class JournalService: Sendable {
    private let client = SupabaseClientManager.shared

    func fetchEntries(clientId: UUID, limit: Int = 30) async throws -> [JournalEntry] {
        if AppConfig.skipAuthAndShowHome { return MockData.journalEntries }
        let response: [JournalEntry] = try await client
            .from("journal_entries")
            .select()
            .eq("client_id", value: clientId.uuidString)
            .order("date", ascending: false)
            .limit(limit)
            .execute()
            .value
        return response
    }

    struct UpsertPayload: Encodable {
        let clientId: UUID
        let date: String
        let moodText: String?
        let workoutDifficultyNotes: String?
        let foodNotes: String?

        enum CodingKeys: String, CodingKey {
            case clientId = "client_id"
            case date
            case moodText = "mood_text"
            case workoutDifficultyNotes = "workout_difficulty_notes"
            case foodNotes = "food_notes"
        }
    }

    func upsertEntry(clientId: UUID, date: Date, moodText: String?, workoutDifficultyNotes: String?, foodNotes: String?) async throws {
        if AppConfig.skipAuthAndShowHome { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: date)
        let payload = UpsertPayload(
            clientId: clientId,
            date: dateString,
            moodText: moodText,
            workoutDifficultyNotes: workoutDifficultyNotes,
            foodNotes: foodNotes
        )
        try await client
            .from("journal_entries")
            .upsert(payload, onConflict: "client_id,date")
            .execute()
    }

    // MARK: - Diary entries (digital diary UX; mock only for now)

    private static let diaryDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    func fetchDiaryEntries(clientId: UUID, for date: Date) async throws -> [DiaryEntry] {
        if AppConfig.skipAuthAndShowHome {
            let dateString = Self.diaryDateFormatter.string(from: date)
            return MockData.diaryEntries
                .filter { $0.clientId == clientId && $0.date == dateString }
                .sorted { $0.createdAt < $1.createdAt }
        }
        return []
    }

    /// Fetches all diary entries for the client between start and end dates (inclusive).
    func fetchDiaryEntries(clientId: UUID, from startDate: Date, to endDate: Date) async throws -> [DiaryEntry] {
        if AppConfig.skipAuthAndShowHome {
            let startString = Self.diaryDateFormatter.string(from: startDate)
            let endString = Self.diaryDateFormatter.string(from: endDate)
            return MockData.diaryEntries
                .filter { entry in
                    entry.clientId == clientId && entry.date >= startString && entry.date <= endString
                }
                .sorted { $0.createdAt < $1.createdAt }
        }
        return []
    }

    /// - Parameter mediaThumbnailData: Optional map of DiaryMediaItem.id → image/thumbnail Data for mock cache; order matches mediaItems.
    func addDiaryEntry(clientId: UUID, date: Date, createdAt: Date, bodyText: String?, imagePath: String?, imageCaption: String?, mediaItems: [DiaryMediaItem] = [], mediaThumbnailData: [UUID: Data]? = nil, workoutId: UUID? = nil, workoutDisplayTitle: String? = nil, workoutCustomDescription: String? = nil, workoutLog: WorkoutLog? = nil, additionalWorkoutLogs: [WorkoutLog]? = nil, additionalWorkoutPresets: [EntryPresetRef]? = nil) async throws {
        if AppConfig.skipAuthAndShowHome {
            let dateString = Self.diaryDateFormatter.string(from: date)
            let entry = DiaryEntry(
                id: UUID(),
                clientId: clientId,
                date: dateString,
                createdAt: createdAt,
                updatedAt: nil,
                bodyText: bodyText,
                imagePath: imagePath,
                imageCaption: imageCaption,
                mediaItems: mediaItems,
                workoutId: workoutId,
                workoutDisplayTitle: workoutDisplayTitle,
                workoutCustomDescription: workoutCustomDescription,
                workoutLog: workoutLog,
                additionalWorkoutLogs: additionalWorkoutLogs,
                additionalWorkoutPresets: additionalWorkoutPresets
            )
            MockData.diaryEntries.append(entry)
            if let dataMap = mediaThumbnailData {
                for item in mediaItems {
                    if let data = dataMap[item.id] {
                        JournalMediaCache.store(data, for: item.id)
                    }
                }
            }
            return
        }
        // TODO: persist to backend when connected
    }

    /// - Parameter mediaThumbnailData: Optional map of DiaryMediaItem.id → image/thumbnail Data for new/updated items; previous media item ids not in the new list are removed from cache.
    /// - Parameter workoutPayload: When nil, keeps the entry's current workout fields. When non-nil, applies the tuple (nil values clear those fields). Optional additionalWorkoutLogs and additionalWorkoutPresets in payload update those lists.
    func updateDiaryEntry(_ entry: DiaryEntry, bodyText: String?, imagePath: String?, imageCaption: String?, mediaItems: [DiaryMediaItem]? = nil, mediaThumbnailData: [UUID: Data]? = nil, workoutPayload: (workoutId: UUID?, workoutDisplayTitle: String?, workoutCustomDescription: String?, workoutLog: WorkoutLog?, additionalWorkoutLogs: [WorkoutLog]?, additionalWorkoutPresets: [EntryPresetRef]?)? = nil) async throws {
        if AppConfig.skipAuthAndShowHome {
            guard let index = MockData.diaryEntries.firstIndex(where: { $0.id == entry.id }) else { return }
            let newMediaItems = mediaItems ?? entry.mediaItems
            let previousIds = Set(entry.mediaItems.map(\.id))
            let newIds = Set(newMediaItems.map(\.id))
            JournalMediaCache.remove(mediaItemIds: Array(previousIds.subtracting(newIds)))
            if let dataMap = mediaThumbnailData {
                for item in newMediaItems {
                    if let data = dataMap[item.id] {
                        JournalMediaCache.store(data, for: item.id)
                    }
                }
            }
            let (workoutId, workoutDisplayTitle, workoutCustomDescription, workoutLog, additionalWorkoutLogs, additionalWorkoutPresets): (UUID?, String?, String?, WorkoutLog?, [WorkoutLog]?, [EntryPresetRef]?) = workoutPayload.map {
                ($0.workoutId, $0.workoutDisplayTitle, $0.workoutCustomDescription, $0.workoutLog, $0.additionalWorkoutLogs, $0.additionalWorkoutPresets)
            } ?? (entry.workoutId, entry.workoutDisplayTitle, entry.workoutCustomDescription, entry.workoutLog, entry.additionalWorkoutLogs, entry.additionalWorkoutPresets)
            let updated = DiaryEntry(
                id: entry.id,
                clientId: entry.clientId,
                date: entry.date,
                createdAt: entry.createdAt,
                updatedAt: Date(),
                bodyText: bodyText ?? entry.bodyText,
                imagePath: imagePath ?? entry.imagePath,
                imageCaption: imageCaption ?? entry.imageCaption,
                mediaItems: newMediaItems,
                workoutId: workoutId,
                workoutDisplayTitle: workoutDisplayTitle,
                workoutCustomDescription: workoutCustomDescription,
                workoutLog: workoutLog,
                additionalWorkoutLogs: additionalWorkoutLogs,
                additionalWorkoutPresets: additionalWorkoutPresets
            )
            MockData.diaryEntries[index] = updated
            return
        }
        // TODO: persist to backend when connected
    }

    func deleteDiaryEntry(id: UUID) async throws {
        if AppConfig.skipAuthAndShowHome {
            if let entry = MockData.diaryEntries.first(where: { $0.id == id }) {
                JournalMediaCache.remove(mediaItemIds: entry.mediaItems.map(\.id))
            }
            MockData.diaryEntries.removeAll { $0.id == id }
            return
        }
        // TODO: delete from backend when connected
    }
}
