//
//  DiaryEntry.swift
//  swft-personal-trainer-app
//

import Foundation

/// A single photo or video attached to a diary entry.
struct DiaryMediaItem: Identifiable {
    let id: UUID
    let kind: Kind
    var storagePath: String
    var caption: String?
    let createdAt: Date

    enum Kind: String, Codable {
        case image
        case video
    }
}

/// Reference to a preset workout (saved from plan, pre-made, or saved custom) for list/detail without lookup.
struct EntryPresetRef: Equatable {
    let id: UUID
    let displayTitle: String
}

/// A single timestamped diary log (text and/or image + caption). Used for the digital-diary UX.
struct DiaryEntry: Identifiable {
    let id: UUID
    let clientId: UUID
    let date: String // "yyyy-MM-dd"
    let createdAt: Date
    var updatedAt: Date?
    var bodyText: String?
    var imagePath: String?
    var imageCaption: String?
    /// Multiple photos/videos; when non-empty, list/detail prefer this over imagePath/imageCaption.
    var mediaItems: [DiaryMediaItem]
    /// In-app workout logged with this entry (optional).
    var workoutId: UUID?
    /// Display name for saved workout (e.g. from plan) for list/detail without lookup.
    var workoutDisplayTitle: String?
    /// Free-text workout description when not from app (e.g. "30 min walk").
    var workoutCustomDescription: String?
    /// Structured workout log (type, cardio, strength exercises, rounds) when user logs a custom workout.
    var workoutLog: WorkoutLog?
    /// Extra workouts logged in the same entry (custom only). Primary workout remains above.
    var additionalWorkoutLogs: [WorkoutLog]?
    /// Additional preset workouts (saved from plan, pre-made, or saved custom). Shown after primary, before additionalWorkoutLogs.
    var additionalWorkoutPresets: [EntryPresetRef]?

    init(id: UUID, clientId: UUID, date: String, createdAt: Date, updatedAt: Date? = nil, bodyText: String? = nil, imagePath: String? = nil, imageCaption: String? = nil, mediaItems: [DiaryMediaItem] = [], workoutId: UUID? = nil, workoutDisplayTitle: String? = nil, workoutCustomDescription: String? = nil, workoutLog: WorkoutLog? = nil, additionalWorkoutLogs: [WorkoutLog]? = nil, additionalWorkoutPresets: [EntryPresetRef]? = nil) {
        self.id = id
        self.clientId = clientId
        self.date = date
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.bodyText = bodyText
        self.imagePath = imagePath
        self.imageCaption = imageCaption
        self.mediaItems = mediaItems
        self.workoutId = workoutId
        self.workoutDisplayTitle = workoutDisplayTitle
        self.workoutCustomDescription = workoutCustomDescription
        self.workoutLog = workoutLog
        self.additionalWorkoutLogs = additionalWorkoutLogs
        self.additionalWorkoutPresets = additionalWorkoutPresets
    }
}
