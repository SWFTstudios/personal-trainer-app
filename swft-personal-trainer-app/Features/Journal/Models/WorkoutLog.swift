//
//  WorkoutLog.swift
//  swft-personal-trainer-app
//

import Foundation

/// Workout type for journal log (tags/tabs in add-entry).
enum WorkoutLogType: String, Codable, CaseIterable {
    case home
    case cardio
    case weightTraining
}

/// Cardio activity: Indoor (track circuit, treadmill) and Outdoor (track, point A to B, circuit).
enum CardioActivityType: String, CaseIterable {
    case indoorCircuit = "indoorCircuit"
    case indoorTreadmill = "treadmill"
    case outdoorTrack = "outdoorTrack"
    case outdoorPointAToB = "pointToPoint"
    case outdoorCircuit = "circuit"

    /// Default display title when user leaves cardio title blank.
    var defaultTitle: String {
        switch self {
        case .indoorCircuit: return "Indoor circuit"
        case .indoorTreadmill: return "Indoor treadmill"
        case .outdoorTrack: return "Outdoor track"
        case .outdoorPointAToB: return "Outdoor point A to B"
        case .outdoorCircuit: return "Outdoor circuit"
        }
    }
}

extension CardioActivityType: Codable {
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        switch raw {
        case "indoorCircuit": self = .indoorCircuit
        case "indoorRun": self = .indoorCircuit
        case "treadmill": self = .indoorTreadmill
        case "outdoorTrack": self = .outdoorTrack
        case "outdoorRun": self = .outdoorTrack
        case "pointToPoint": self = .outdoorPointAToB
        case "circuit": self = .outdoorCircuit
        default: self = .outdoorTrack
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

/// A single geographic point for route waypoints (map follow-up).
struct Coordinate: Codable, Equatable {
    var latitude: Double
    var longitude: Double
}

/// Route info for cardio (waypoints; isCircuit = closed loop back to start). Map and distance in follow-up.
struct RouteInfo: Codable {
    var waypoints: [Coordinate]
    var isCircuit: Bool
}

/// Distance unit for cardio log.
enum DistanceUnit: String, Codable, CaseIterable {
    case miles
    case kilometers
    case meters
}

/// Duration unit for cardio (e.g. minutes or hours).
enum DurationUnit: String, Codable, CaseIterable {
    case minutes
    case hours
}

/// Cardio-specific log: duration and/or distance, optional title and route.
struct CardioLog: Codable {
    var title: String?
    var durationValue: Double?
    var durationUnit: DurationUnit?
    var distanceValue: Double?
    var distanceUnit: DistanceUnit?
    var activityType: CardioActivityType?
    var route: RouteInfo?

    init(title: String? = nil, durationValue: Double? = nil, durationUnit: DurationUnit? = nil, distanceValue: Double? = nil, distanceUnit: DistanceUnit? = nil, activityType: CardioActivityType? = nil, route: RouteInfo? = nil) {
        self.title = title
        self.durationValue = durationValue
        self.durationUnit = durationUnit
        self.distanceValue = distanceValue
        self.distanceUnit = distanceUnit
        self.activityType = activityType
        self.route = route
    }
}

/// Single exercise in a strength workout log: either from trainer (exerciseId) or custom (customName).
struct StrengthExerciseLog: Codable, Identifiable {
    let id: UUID
    var exerciseId: UUID?
    var customName: String?
    var sets: Int
    var reps: String

    init(id: UUID = UUID(), exerciseId: UUID? = nil, customName: String? = nil, sets: Int, reps: String) {
        self.id = id
        self.exerciseId = exerciseId
        self.customName = customName
        self.sets = sets
        self.reps = reps
    }
}

/// A single block in a custom workout: either one strength exercise or one cardio segment.
enum WorkoutLogBlock: Codable {
    case strength(StrengthExerciseLog)
    case cardio(CardioLog)

    enum CodingKeys: String, CodingKey {
        case strength
        case cardio
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try container.decodeIfPresent(StrengthExerciseLog.self, forKey: .strength) {
            self = .strength(s)
            return
        }
        if let c = try container.decodeIfPresent(CardioLog.self, forKey: .cardio) {
            self = .cardio(c)
            return
        }
        throw DecodingError.dataCorrupted(DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "WorkoutLogBlock must have strength or cardio"))
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .strength(let s): try container.encode(s, forKey: .strength)
        case .cardio(let c): try container.encode(c, forKey: .cardio)
        }
    }
}

/// Structured workout log for a diary entry (custom type with cardio or strength details, or reference to saved workout).
/// When `blocks` is non-empty, it drives the workout content; otherwise legacy `type`/`cardio`/`exercises` are used.
struct WorkoutLog: Codable {
    var type: WorkoutLogType
    var cardio: CardioLog?
    var exercises: [StrengthExerciseLog]?
    var rounds: Int?
    var workoutId: UUID?
    var workoutCustomDescription: String?
    /// Stacked blocks (strength + cardio in any order). When set, list/detail prefer this over type/cardio/exercises.
    var blocks: [WorkoutLogBlock]?
}
