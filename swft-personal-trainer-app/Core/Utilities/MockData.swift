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

    static let workoutTemplates: [WorkoutTemplate] = [
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000100")!,
            title: "Full Body Burn",
            shortDescription: "30-minute high-intensity routine targeting every major muscle group.",
            longDescription: "This full-body workout is designed to maximize calorie burn and build lean muscle. Start with a dynamic warm-up: arm circles, leg swings, and light jogging in place for 3–5 minutes. Perform each exercise for 45 seconds with 15 seconds rest. Complete 3 rounds. Focus on controlled movements and full range of motion. Cool down with 5 minutes of stretching, holding each stretch for 20–30 seconds. Stay hydrated and listen to your body—scale intensity as needed.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000101")!,
            title: "Core Crusher",
            shortDescription: "Dynamic routines for a toned midsection and strong abs.",
            longDescription: "A focused core session that emphasizes stability and control. Begin with dead bugs and bird dogs to activate the deep core. Move into planks—hold a strict plank for 30–60 seconds, keeping your hips level and avoiding sagging. Follow with bicycle crunches, keeping the lower back pressed into the floor. Finish with hollow holds and leg raises. Breathe steadily and avoid straining your neck. Perform 3–4 sets of each exercise with 30 seconds rest between sets.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000102")!,
            title: "Legs Program",
            shortDescription: "Engage your core and lower body with this quick, effective session.",
            longDescription: "This lower-body workout builds strength and endurance. Warm up with bodyweight squats and lunges. Perform goblet squats with a dumbbell or kettlebell: keep your chest up, push your knees out, and descend until your thighs are at least parallel. Follow with Romanian deadlifts for hamstrings, then walking lunges and step-ups. Finish with calf raises. Use a weight that allows 10–12 reps with good form. Rest 60–90 seconds between sets. Stretch quads, hamstrings, and calves afterward.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000103")!,
            title: "Shoulder Shaper",
            shortDescription: "Exercises focusing on shoulder definition and mobility.",
            longDescription: "Target your delts and upper back with controlled, deliberate movements. Start with band pull-aparts and shoulder dislocates to warm up the rotator cuffs. Perform overhead press (dumbbell or barbell) with a full range of motion. Include lateral raises, front raises, and face pulls for balance. Keep rest periods to 45–60 seconds. Avoid shrugging or rolling shoulders forward—maintain a proud chest. Cool down with arm crosses and doorway stretches.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000104")!,
            title: "HIIT Blast",
            shortDescription: "Short, intense intervals to boost metabolism and endurance.",
            longDescription: "High-intensity interval training alternates 30–45 seconds of max effort with 15–30 seconds of rest. Choose 4–6 exercises (e.g. burpees, mountain climbers, jump squats, high knees, plank jacks). Complete 4–5 rounds with minimal rest between exercises and 1–2 minutes between rounds. Form matters more than speed—reduce range or pace if technique breaks down. Warm up for 5 minutes and cool down with light movement and stretching. Best done 2–3 times per week with recovery days in between.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000105")!,
            title: "Stretch & Mobility",
            shortDescription: "Restore range of motion and ease tension with guided stretching.",
            longDescription: "A full-body mobility routine to improve flexibility and reduce stiffness. Move slowly and breathe into each stretch—never bounce. Start with neck and shoulder rolls, then chest opener, cat-cow, and hip circles. Include hamstring stretches (seated and standing), quad and hip flexor stretches, and a figure-four stretch for glutes. Hold each stretch 20–40 seconds. Finish with a full-body flow or child’s pose. Ideal after workouts or on rest days. If anything pinches or hurts, ease off and consult a professional.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000106")!,
            title: "Upper Body Strength",
            shortDescription: "Push, pull, and build a strong back, chest, and arms.",
            longDescription: "This session focuses on compound and isolation moves for the upper body. Begin with rows (barbell or dumbbell) to prime the back, then bench or push-ups for the chest. Add pull-ups or lat pulldowns, overhead press, and bicep/tricep work. Use a weight that allows 8–12 reps with one rep left in the tank. Rest 90 seconds between heavy sets. Keep shoulders packed and avoid excessive arch or flare. Warm up with band work and light sets before working weight.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000107")!,
            title: "Quick Cardio",
            shortDescription: "15–20 minutes of heart-pumping cardio for busy days.",
            longDescription: "A time-efficient cardio session you can do anywhere. After a 2–3 minute warm-up (march in place, arm swings), alternate 1 minute at a moderate pace with 30 seconds at a higher intensity. Use jumping jacks, skaters, or running in place. Keep your core engaged and land softly to protect joints. Cool down with 2–3 minutes of walking and light stretching. Aim for 15–20 minutes total. Pair with strength work on other days for a balanced routine.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000108")!,
            title: "Back Builder",
            shortDescription: "Rows, pulls, and extensions for a strong, resilient back.",
            longDescription: "Build a strong back to support posture and daily movement. Warm up with band rows and scapular wall slides. Perform bent-over rows (both arms or single-arm), then lat pulldowns or pull-ups. Add reverse flyes for rear delts and back extensions or supermans for the lower back. Squeeze at the top of each rep and control the negative. Rest 60–90 seconds between sets. Stretch lats and upper back at the end.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000109")!,
            title: "Glutes & Hamstrings",
            shortDescription: "Target the posterior chain for strength and shape.",
            longDescription: "Focus on glutes and hamstrings with hip hinges and hip thrusts. Start with glute bridges to activate the glutes, then move to Romanian deadlifts—keep a slight bend in the knees and push your hips back. Add hip thrusts (bodyweight or weighted), single-leg deadlifts, and curtsy lunges. Squeeze the glutes at the top of each rep. Rest 60–90 seconds. Finish with a hamstring and hip flexor stretch.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-00000000010a")!,
            title: "Arms & Abs Finisher",
            shortDescription: "Isolation work for arms plus a short core finisher.",
            longDescription: "A compact session for biceps, triceps, and core. Perform bicep curls (dumbbell or band), then tricep dips or overhead extensions, and hammer curls. Alternate with 30–45 seconds of planks, dead bugs, or mountain climbers. Use moderate weight and focus on the squeeze. Complete 3 rounds. Cool down with arm and core stretches. Ideal as a finisher after a main workout or on a light day.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
        ),
        WorkoutTemplate(
            id: UUID(uuidString: "00000000-0000-0000-0000-00000000010b")!,
            title: "Beginner Full Body",
            shortDescription: "Low-impact, form-focused routine for those new to training.",
            longDescription: "A welcoming full-body workout that prioritizes form and consistency. Use bodyweight or light resistance. Start with squats to a chair, wall push-ups, and standing rows with a band. Add marching in place, heel raises, and bird dogs. Perform 2–3 sets of 10–12 reps with rest as needed. Move at a comfortable pace and avoid pushing into pain. Build the habit first; intensity can increase over time. Always warm up for 3–5 minutes and cool down with stretching.",
            thumbnailUrl: nil,
            videoUrl: youtubePlaceholder
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
