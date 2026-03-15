//
//  MockData.swift
//  swft-personal-trainer-app
//

import Foundation

enum MockData {
    private static let trainerId = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!
    private static let clientId = UUID(uuidString: "00000000-0000-0000-0000-000000000002")!
    private static let userId = UUID(uuidString: "00000000-0000-0000-0000-000000000003")!
    private static let now = Date()

    // Dummy IDs for workouts and exercises (used by Home, Workouts, Journal, Progress)
    static let workout1Id = UUID(uuidString: "00000000-0000-0000-0000-000000000010")!
    static let workout2Id = UUID(uuidString: "00000000-0000-0000-0000-000000000011")!
    static let exercise1Id = UUID(uuidString: "00000000-0000-0000-0000-000000000020")!
    static let exercise2Id = UUID(uuidString: "00000000-0000-0000-0000-000000000021")!
    static let exercise3Id = UUID(uuidString: "00000000-0000-0000-0000-000000000022")!
    static let exercise4Id = UUID(uuidString: "00000000-0000-0000-0000-000000000023")!
    static let exercise5Id = UUID(uuidString: "00000000-0000-0000-0000-000000000024")!
    static let exercise6Id = UUID(uuidString: "00000000-0000-0000-0000-000000000025")!
    // Template-only exercises (fictitious, for workout templates)
    static let exJumpSquatId = UUID(uuidString: "00000000-0000-0000-0000-000000000026")!
    static let exMountainClimbersId = UUID(uuidString: "00000000-0000-0000-0000-000000000027")!
    static let exBurpeesId = UUID(uuidString: "00000000-0000-0000-0000-000000000028")!
    static let exHighKneesId = UUID(uuidString: "00000000-0000-0000-0000-000000000029")!
    static let exPlankJacksId = UUID(uuidString: "00000000-0000-0000-0000-00000000002a")!
    static let exBirdDogId = UUID(uuidString: "00000000-0000-0000-0000-00000000002b")!
    static let exBicycleCrunchId = UUID(uuidString: "00000000-0000-0000-0000-00000000002c")!
    static let exHollowHoldId = UUID(uuidString: "00000000-0000-0000-0000-00000000002d")!
    static let exLegRaiseId = UUID(uuidString: "00000000-0000-0000-0000-00000000002e")!
    static let exWalkingLungeId = UUID(uuidString: "00000000-0000-0000-0000-00000000002f")!
    static let exStepUpId = UUID(uuidString: "00000000-0000-0000-0000-000000000030")!
    static let exCalfRaiseId = UUID(uuidString: "00000000-0000-0000-0000-000000000031")!
    static let exBandPullApartId = UUID(uuidString: "00000000-0000-0000-0000-000000000032")!
    static let exOverheadPressId = UUID(uuidString: "00000000-0000-0000-0000-000000000033")!
    static let exLateralRaiseId = UUID(uuidString: "00000000-0000-0000-0000-000000000034")!
    static let exFrontRaiseId = UUID(uuidString: "00000000-0000-0000-0000-000000000035")!
    static let exFacePullId = UUID(uuidString: "00000000-0000-0000-0000-000000000036")!
    static let exCatCowId = UUID(uuidString: "00000000-0000-0000-0000-000000000037")!
    static let exHipCircleId = UUID(uuidString: "00000000-0000-0000-0000-000000000038")!
    static let exBentOverRowId = UUID(uuidString: "00000000-0000-0000-0000-000000000039")!
    static let exLatPulldownId = UUID(uuidString: "00000000-0000-0000-0000-00000000003a")!
    static let exReverseFlyId = UUID(uuidString: "00000000-0000-0000-0000-00000000003b")!
    static let exGluteBridgeId = UUID(uuidString: "00000000-0000-0000-0000-00000000003c")!
    static let exHipThrustId = UUID(uuidString: "00000000-0000-0000-0000-00000000003d")!
    static let exSingleLegDeadliftId = UUID(uuidString: "00000000-0000-0000-0000-00000000003e")!
    static let exCurtsyLungeId = UUID(uuidString: "00000000-0000-0000-0000-00000000003f")!
    static let exTricepDipId = UUID(uuidString: "00000000-0000-0000-0000-000000000040")!
    static let exHammerCurlId = UUID(uuidString: "00000000-0000-0000-0000-000000000041")!
    static let exSquatToChairId = UUID(uuidString: "00000000-0000-0000-0000-000000000042")!
    static let exWallPushUpId = UUID(uuidString: "00000000-0000-0000-0000-000000000043")!
    static let exStandingRowId = UUID(uuidString: "00000000-0000-0000-0000-000000000044")!
    static let exHeelRaiseId = UUID(uuidString: "00000000-0000-0000-0000-000000000045")!
    static let exJumpingJackId = UUID(uuidString: "00000000-0000-0000-0000-000000000046")!
    static let exSkaterId = UUID(uuidString: "00000000-0000-0000-0000-000000000047")!

    static let trainer = Trainer(
        id: trainerId,
        userId: userId,
        displayName: "Your Trainer",
        logoUrl: nil,
        accentColorHex: nil,
        secondaryColorHex: nil,
        calendlyUrl: "https://calendly.com",
        appName: nil,
        createdAt: now,
        updatedAt: now
    )

    static let client = Client(
        id: clientId,
        userId: userId,
        trainerId: trainerId,
        onboardingCompletedAt: now,
        inviteCodeUsed: nil,
        createdAt: now,
        updatedAt: now
    )

    /// Placeholder display name for the profile card when using mock/skip-auth flow.
    static let clientDisplayName = "Michael"

    // MARK: - Dummy content (used when skipAuthAndShowHome is true)

    static let youtubePlaceholder = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    private static func templateThumbnailURL(seed: String) -> String {
        "https://picsum.photos/seed/\(seed)/400/300"
    }

    static let workoutTemplates: [WorkoutTemplate] = [
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000100")!,
            title: "Full Body Burn",
            shortDescription: "30-minute high-intensity routine targeting every major muscle group.",
            longDescription: "This full-body workout is designed to maximize calorie burn and build lean muscle. Start with a dynamic warm-up: arm circles, leg swings, and light jogging in place for 3–5 minutes. Perform each exercise for 45 seconds with 15 seconds rest. Complete 3 rounds. Focus on controlled movements and full range of motion. Cool down with 5 minutes of stretching, holding each stretch for 20–30 seconds. Stay hydrated and listen to your body—scale intensity as needed.",
            thumbnailUrl: templateThumbnailURL(seed: "fullbody100"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exercise1Id, order: 0, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exJumpSquatId, order: 1, suggestedSets: 3, suggestedReps: "12"),
                TemplateExerciseItem(exerciseId: exercise2Id, order: 2, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exMountainClimbersId, order: 3, suggestedSets: 3, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exercise4Id, order: 4, suggestedSets: 2, suggestedReps: "10"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000101")!,
            title: "Core Crusher",
            shortDescription: "Dynamic routines for a toned midsection and strong abs.",
            longDescription: "A focused core session that emphasizes stability and control. Begin with dead bugs and bird dogs to activate the deep core. Move into planks—hold a strict plank for 30–60 seconds, keeping your hips level and avoiding sagging. Follow with bicycle crunches, keeping the lower back pressed into the floor. Finish with hollow holds and leg raises. Breathe steadily and avoid straining your neck. Perform 3–4 sets of each exercise with 30 seconds rest between sets.",
            thumbnailUrl: templateThumbnailURL(seed: "core101"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exercise3Id, order: 0, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exBirdDogId, order: 1, suggestedSets: 3, suggestedReps: "8 each"),
                TemplateExerciseItem(exerciseId: exercise5Id, order: 2, suggestedSets: 3, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exBicycleCrunchId, order: 3, suggestedSets: 3, suggestedReps: "15 each"),
                TemplateExerciseItem(exerciseId: exHollowHoldId, order: 4, suggestedSets: 2, suggestedReps: "30 sec"),
                TemplateExerciseItem(exerciseId: exLegRaiseId, order: 5, suggestedSets: 3, suggestedReps: "12"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000102")!,
            title: "Legs Program",
            shortDescription: "Engage your core and lower body with this quick, effective session.",
            longDescription: "This lower-body workout builds strength and endurance. Warm up with bodyweight squats and lunges. Perform goblet squats with a dumbbell or kettlebell: keep your chest up, push your knees out, and descend until your thighs are at least parallel. Follow with Romanian deadlifts for hamstrings, then walking lunges and step-ups. Finish with calf raises. Use a weight that allows 10–12 reps with good form. Rest 60–90 seconds between sets. Stretch quads, hamstrings, and calves afterward.",
            thumbnailUrl: templateThumbnailURL(seed: "legs102"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exercise1Id, order: 0, suggestedSets: 4, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exercise4Id, order: 1, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exWalkingLungeId, order: 2, suggestedSets: 3, suggestedReps: "10 each"),
                TemplateExerciseItem(exerciseId: exStepUpId, order: 3, suggestedSets: 3, suggestedReps: "10 each"),
                TemplateExerciseItem(exerciseId: exCalfRaiseId, order: 4, suggestedSets: 3, suggestedReps: "15"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000103")!,
            title: "Shoulder Shaper",
            shortDescription: "Exercises focusing on shoulder definition and mobility.",
            longDescription: "Target your delts and upper back with controlled, deliberate movements. Start with band pull-aparts and shoulder dislocates to warm up the rotator cuffs. Perform overhead press (dumbbell or barbell) with a full range of motion. Include lateral raises, front raises, and face pulls for balance. Keep rest periods to 45–60 seconds. Avoid shrugging or rolling shoulders forward—maintain a proud chest. Cool down with arm crosses and doorway stretches.",
            thumbnailUrl: templateThumbnailURL(seed: "shoulder103"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exBandPullApartId, order: 0, suggestedSets: 2, suggestedReps: "15"),
                TemplateExerciseItem(exerciseId: exOverheadPressId, order: 1, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exLateralRaiseId, order: 2, suggestedSets: 3, suggestedReps: "12"),
                TemplateExerciseItem(exerciseId: exFrontRaiseId, order: 3, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exFacePullId, order: 4, suggestedSets: 3, suggestedReps: "12"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000104")!,
            title: "HIIT Blast",
            shortDescription: "Short, intense intervals to boost metabolism and endurance.",
            longDescription: "High-intensity interval training alternates 30–45 seconds of max effort with 15–30 seconds of rest. Choose 4–6 exercises (e.g. burpees, mountain climbers, jump squats, high knees, plank jacks). Complete 4–5 rounds with minimal rest between exercises and 1–2 minutes between rounds. Form matters more than speed—reduce range or pace if technique breaks down. Warm up for 5 minutes and cool down with light movement and stretching. Best done 2–3 times per week with recovery days in between.",
            thumbnailUrl: templateThumbnailURL(seed: "hiit104"),
            videoUrl: youtubePlaceholder,
            difficulty: .challenging,
            exercises: [
                TemplateExerciseItem(exerciseId: exBurpeesId, order: 0, suggestedSets: 4, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exMountainClimbersId, order: 1, suggestedSets: 4, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exJumpSquatId, order: 2, suggestedSets: 4, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exHighKneesId, order: 3, suggestedSets: 4, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exPlankJacksId, order: 4, suggestedSets: 4, suggestedReps: "45 sec"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000105")!,
            title: "Stretch & Mobility",
            shortDescription: "Restore range of motion and ease tension with guided stretching.",
            longDescription: "A full-body mobility routine to improve flexibility and reduce stiffness. Move slowly and breathe into each stretch—never bounce. Start with neck and shoulder rolls, then chest opener, cat-cow, and hip circles. Include hamstring stretches (seated and standing), quad and hip flexor stretches, and a figure-four stretch for glutes. Hold each stretch 20–40 seconds. Finish with a full-body flow or child’s pose. Ideal after workouts or on rest days. If anything pinches or hurts, ease off and consult a professional.",
            thumbnailUrl: templateThumbnailURL(seed: "stretch105"),
            videoUrl: nil,
            difficulty: .easy,
            exercises: [
                TemplateExerciseItem(exerciseId: exCatCowId, order: 0, suggestedSets: 1, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exHipCircleId, order: 1, suggestedSets: 1, suggestedReps: "8 each"),
                TemplateExerciseItem(exerciseId: exBirdDogId, order: 2, suggestedSets: 1, suggestedReps: "6 each"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000106")!,
            title: "Upper Body Strength",
            shortDescription: "Push, pull, and build a strong back, chest, and arms.",
            longDescription: "This session focuses on compound and isolation moves for the upper body. Begin with rows (barbell or dumbbell) to prime the back, then bench or push-ups for the chest. Add pull-ups or lat pulldowns, overhead press, and bicep/tricep work. Use a weight that allows 8–12 reps with one rep left in the tank. Rest 90 seconds between heavy sets. Keep shoulders packed and avoid excessive arch or flare. Warm up with band work and light sets before working weight.",
            thumbnailUrl: templateThumbnailURL(seed: "upper106"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exBentOverRowId, order: 0, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exercise2Id, order: 1, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exLatPulldownId, order: 2, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exOverheadPressId, order: 3, suggestedSets: 3, suggestedReps: "8"),
                TemplateExerciseItem(exerciseId: exercise6Id, order: 4, suggestedSets: 2, suggestedReps: "12"),
                TemplateExerciseItem(exerciseId: exTricepDipId, order: 5, suggestedSets: 2, suggestedReps: "10"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000107")!,
            title: "Quick Cardio",
            shortDescription: "15–20 minutes of heart-pumping cardio for busy days.",
            longDescription: "A time-efficient cardio session you can do anywhere. After a 2–3 minute warm-up (march in place, arm swings), alternate 1 minute at a moderate pace with 30 seconds at a higher intensity. Use jumping jacks, skaters, or running in place. Keep your core engaged and land softly to protect joints. Cool down with 2–3 minutes of walking and light stretching. Aim for 15–20 minutes total. Pair with strength work on other days for a balanced routine.",
            thumbnailUrl: templateThumbnailURL(seed: "cardio107"),
            videoUrl: youtubePlaceholder,
            difficulty: .easy,
            exercises: [
                TemplateExerciseItem(exerciseId: exJumpingJackId, order: 0, suggestedSets: 4, suggestedReps: "1 min"),
                TemplateExerciseItem(exerciseId: exSkaterId, order: 1, suggestedSets: 4, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exHighKneesId, order: 2, suggestedSets: 4, suggestedReps: "45 sec"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000108")!,
            title: "Back Builder",
            shortDescription: "Rows, pulls, and extensions for a strong, resilient back.",
            longDescription: "Build a strong back to support posture and daily movement. Warm up with band rows and scapular wall slides. Perform bent-over rows (both arms or single-arm), then lat pulldowns or pull-ups. Add reverse flyes for rear delts and back extensions or supermans for the lower back. Squeeze at the top of each rep and control the negative. Rest 60–90 seconds between sets. Stretch lats and upper back at the end.",
            thumbnailUrl: templateThumbnailURL(seed: "back108"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exBandPullApartId, order: 0, suggestedSets: 2, suggestedReps: "15"),
                TemplateExerciseItem(exerciseId: exBentOverRowId, order: 1, suggestedSets: 4, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exLatPulldownId, order: 2, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exReverseFlyId, order: 3, suggestedSets: 3, suggestedReps: "12"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000109")!,
            title: "Glutes & Hamstrings",
            shortDescription: "Target the posterior chain for strength and shape.",
            longDescription: "Focus on glutes and hamstrings with hip hinges and hip thrusts. Start with glute bridges to activate the glutes, then move to Romanian deadlifts—keep a slight bend in the knees and push your hips back. Add hip thrusts (bodyweight or weighted), single-leg deadlifts, and curtsy lunges. Squeeze the glutes at the top of each rep. Rest 60–90 seconds. Finish with a hamstring and hip flexor stretch.",
            thumbnailUrl: templateThumbnailURL(seed: "glutes109"),
            videoUrl: youtubePlaceholder,
            difficulty: .moderate,
            exercises: [
                TemplateExerciseItem(exerciseId: exGluteBridgeId, order: 0, suggestedSets: 3, suggestedReps: "12"),
                TemplateExerciseItem(exerciseId: exercise4Id, order: 1, suggestedSets: 4, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exHipThrustId, order: 2, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exSingleLegDeadliftId, order: 3, suggestedSets: 3, suggestedReps: "8 each"),
                TemplateExerciseItem(exerciseId: exCurtsyLungeId, order: 4, suggestedSets: 3, suggestedReps: "10 each"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-00000000010a")!,
            title: "Arms & Abs Finisher",
            shortDescription: "Isolation work for arms plus a short core finisher.",
            longDescription: "A compact session for biceps, triceps, and core. Perform bicep curls (dumbbell or band), then tricep dips or overhead extensions, and hammer curls. Alternate with 30–45 seconds of planks, dead bugs, or mountain climbers. Use moderate weight and focus on the squeeze. Complete 3 rounds. Cool down with arm and core stretches. Ideal as a finisher after a main workout or on a light day.",
            thumbnailUrl: templateThumbnailURL(seed: "arms10a"),
            videoUrl: nil,
            difficulty: .easy,
            exercises: [
                TemplateExerciseItem(exerciseId: exercise6Id, order: 0, suggestedSets: 3, suggestedReps: "12"),
                TemplateExerciseItem(exerciseId: exTricepDipId, order: 1, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exHammerCurlId, order: 2, suggestedSets: 3, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exercise5Id, order: 3, suggestedSets: 2, suggestedReps: "45 sec"),
                TemplateExerciseItem(exerciseId: exercise3Id, order: 4, suggestedSets: 2, suggestedReps: "10"),
            ]
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-00000000010b")!,
            title: "Beginner Full Body",
            shortDescription: "Low-impact, form-focused routine for those new to training.",
            longDescription: "A welcoming full-body workout that prioritizes form and consistency. Use bodyweight or light resistance. Start with squats to a chair, wall push-ups, and standing rows with a band. Add marching in place, heel raises, and bird dogs. Perform 2–3 sets of 10–12 reps with rest as needed. Move at a comfortable pace and avoid pushing into pain. Build the habit first; intensity can increase over time. Always warm up for 3–5 minutes and cool down with stretching.",
            thumbnailUrl: templateThumbnailURL(seed: "beginner10b"),
            videoUrl: youtubePlaceholder,
            difficulty: .easy,
            exercises: [
                TemplateExerciseItem(exerciseId: exSquatToChairId, order: 0, suggestedSets: 2, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exWallPushUpId, order: 1, suggestedSets: 2, suggestedReps: "8"),
                TemplateExerciseItem(exerciseId: exStandingRowId, order: 2, suggestedSets: 2, suggestedReps: "10"),
                TemplateExerciseItem(exerciseId: exHeelRaiseId, order: 3, suggestedSets: 2, suggestedReps: "12"),
                TemplateExerciseItem(exerciseId: exBirdDogId, order: 4, suggestedSets: 2, suggestedReps: "6 each"),
            ]
        ),
    ]

    static let trainerVideos: [TrainerVideo] = [
        TrainerVideo(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000030")!,
            trainerId: trainerId,
            title: "Introduction to form",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            thumbnailUrl: nil,
            type: "youtube",
            createdAt: now
        ),
        TrainerVideo(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000031")!,
            trainerId: trainerId,
            title: "Full body warm-up",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            thumbnailUrl: nil,
            type: "youtube",
            createdAt: now
        ),
    ]

    static let announcements: [TrainerAnnouncement] = [
        TrainerAnnouncement(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000040")!,
            trainerId: trainerId,
            body: "New program dropping next week. Focus on strength and mobility—perfect for where you are right now.",
            createdAt: now
        ),
        TrainerAnnouncement(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000041")!,
            trainerId: trainerId,
            body: "Reminder: book your check-in call if you haven’t already. I’d love to hear how the last two weeks felt.",
            createdAt: now
        ),
    ]

    /// Workouts for the mock client. workout1 is scheduled for today (current weekday).
    static var workouts: [Workout] {
        let weekday = Calendar.current.component(.weekday, from: Date())
        return [
            Workout(
                id: workout1Id,
                clientId: clientId,
                name: "Morning strength",
                scheduledDays: [weekday],
                createdAt: now,
                updatedAt: now
            ),
            Workout(
                id: workout2Id,
                clientId: clientId,
                name: "Core & mobility",
                scheduledDays: [2, 4, 6],
                createdAt: now,
                updatedAt: now
            ),
        ]
    }

    static let workoutExercises: [WorkoutExercise] = [
        WorkoutExercise(id: UUID(), workoutId: workout1Id, exerciseId: exercise1Id, order: 0, sets: 3, reps: "10", createdAt: now),
        WorkoutExercise(id: UUID(), workoutId: workout1Id, exerciseId: exercise2Id, order: 1, sets: 3, reps: "12", createdAt: now),
        WorkoutExercise(id: UUID(), workoutId: workout1Id, exerciseId: exercise3Id, order: 2, sets: 2, reps: "8", createdAt: now),
    ]

    static let exercises: [Exercise] = [
        Exercise(id: exercise1Id, trainerId: trainerId, name: "Goblet squat", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exercise2Id, trainerId: trainerId, name: "Push-up", category: "Arms", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exercise3Id, trainerId: trainerId, name: "Dead bug", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exercise4Id, trainerId: trainerId, name: "Romanian deadlift", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exercise5Id, trainerId: trainerId, name: "Plank", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exercise6Id, trainerId: trainerId, name: "Bicep curl", category: "Arms", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exJumpSquatId, trainerId: trainerId, name: "Jump squat", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exMountainClimbersId, trainerId: trainerId, name: "Mountain climbers", category: "Full body", discipline: "Cardio", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exBurpeesId, trainerId: trainerId, name: "Burpees", category: "Full body", discipline: "Cardio", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exHighKneesId, trainerId: trainerId, name: "High knees", category: "Legs", discipline: "Cardio", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exPlankJacksId, trainerId: trainerId, name: "Plank jacks", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exBirdDogId, trainerId: trainerId, name: "Bird dog", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exBicycleCrunchId, trainerId: trainerId, name: "Bicycle crunch", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exHollowHoldId, trainerId: trainerId, name: "Hollow hold", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exLegRaiseId, trainerId: trainerId, name: "Leg raise", category: "Abs", discipline: "Core", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exWalkingLungeId, trainerId: trainerId, name: "Walking lunge", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exStepUpId, trainerId: trainerId, name: "Step-up", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exCalfRaiseId, trainerId: trainerId, name: "Calf raise", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exBandPullApartId, trainerId: trainerId, name: "Band pull-apart", category: "Back", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exOverheadPressId, trainerId: trainerId, name: "Overhead press", category: "Shoulders", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exLateralRaiseId, trainerId: trainerId, name: "Lateral raise", category: "Shoulders", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exFrontRaiseId, trainerId: trainerId, name: "Front raise", category: "Shoulders", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exFacePullId, trainerId: trainerId, name: "Face pull", category: "Back", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exCatCowId, trainerId: trainerId, name: "Cat-cow", category: "Back", discipline: "Mobility", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exHipCircleId, trainerId: trainerId, name: "Hip circle", category: "Hips", discipline: "Mobility", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exBentOverRowId, trainerId: trainerId, name: "Bent-over row", category: "Back", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exLatPulldownId, trainerId: trainerId, name: "Lat pulldown", category: "Back", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exReverseFlyId, trainerId: trainerId, name: "Reverse fly", category: "Back", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exGluteBridgeId, trainerId: trainerId, name: "Glute bridge", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exHipThrustId, trainerId: trainerId, name: "Hip thrust", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exSingleLegDeadliftId, trainerId: trainerId, name: "Single-leg deadlift", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exCurtsyLungeId, trainerId: trainerId, name: "Curtsy lunge", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exTricepDipId, trainerId: trainerId, name: "Tricep dip", category: "Arms", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exHammerCurlId, trainerId: trainerId, name: "Hammer curl", category: "Arms", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exSquatToChairId, trainerId: trainerId, name: "Squat to chair", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exWallPushUpId, trainerId: trainerId, name: "Wall push-up", category: "Arms", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exStandingRowId, trainerId: trainerId, name: "Standing row", category: "Back", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exHeelRaiseId, trainerId: trainerId, name: "Heel raise", category: "Legs", discipline: "Strength", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exJumpingJackId, trainerId: trainerId, name: "Jumping jack", category: "Full body", discipline: "Cardio", videoUrl: nil, instructions: nil, createdAt: now),
        Exercise(id: exSkaterId, trainerId: trainerId, name: "Skater", category: "Legs", discipline: "Cardio", videoUrl: nil, instructions: nil, createdAt: now),
    ]

    static let journalEntries: [JournalEntry] = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return [
            JournalEntry(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000050")!,
                clientId: clientId,
                date: formatter.string(from: now),
                moodText: "Felt strong today. Sleep was good.",
                workoutDifficultyNotes: "Morning strength was tough but doable.",
                foodNotes: "Oats, eggs, greens. Light lunch.",
                createdAt: now,
                updatedAt: now
            ),
            JournalEntry(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000051")!,
                clientId: clientId,
                date: formatter.string(from: Calendar.current.date(byAdding: .day, value: -1, to: now)!),
                moodText: "A bit tired. Rest day.",
                workoutDifficultyNotes: nil,
                foodNotes: "Normal meals, extra water.",
                createdAt: now,
                updatedAt: now
            ),
        ]
    }()

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static var diaryEntries: [DiaryEntry] = {
        let cal = Calendar.current
        let today = now
        let yesterday = cal.date(byAdding: .day, value: -1, to: now)!
        let todayString = dateFormatter.string(from: today)
        let yesterdayString = dateFormatter.string(from: yesterday)
        let nineAM = cal.date(bySettingHour: 9, minute: 0, second: 0, of: today)!
        let sevenPM = cal.date(bySettingHour: 19, minute: 30, second: 0, of: today)!
        return [
            DiaryEntry(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000060")!,
                clientId: clientId,
                date: todayString,
                createdAt: nineAM,
                updatedAt: nil,
                bodyText: "Felt strong after morning workout. Good energy for the day.",
                imagePath: nil,
                imageCaption: nil,
                mediaItems: [],
                workoutId: nil,
                workoutDisplayTitle: nil,
                workoutCustomDescription: nil,
                workoutLog: nil
            ),
            DiaryEntry(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000061")!,
                clientId: clientId,
                date: todayString,
                createdAt: sevenPM,
                updatedAt: cal.date(bySettingHour: 20, minute: 0, second: 0, of: today),
                bodyText: nil,
                imagePath: "placeholder_meal",
                imageCaption: "Breakfast at 9am – eggs and bacon with avocado.",
                mediaItems: [],
                workoutId: nil,
                workoutDisplayTitle: nil,
                workoutCustomDescription: nil,
                workoutLog: nil
            ),
            DiaryEntry(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000062")!,
                clientId: clientId,
                date: yesterdayString,
                createdAt: cal.date(bySettingHour: 8, minute: 0, second: 0, of: yesterday)!,
                updatedAt: nil,
                bodyText: "A bit tired. Rest day. Kept meals light.",
                imagePath: nil,
                imageCaption: nil,
                mediaItems: [],
                workoutId: nil,
                workoutDisplayTitle: nil,
                workoutCustomDescription: nil,
                workoutLog: nil
            ),
        ]
    }()

    static let completionsCount = 12
}
