//
//  ClientHomeView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct ClientHomeView: View {
    let client: Client
    let trainer: Trainer

    @Environment(\.brandTheme) private var brandTheme
    @State private var currentDate = Date()
    @State private var newVideos: [TrainerVideo] = []
    @State private var announcements: [TrainerAnnouncement] = []
    @State private var todaysWorkouts: [Workout] = []
    @State private var exercises: [Exercise] = []
    @State private var loadError: String?

    private let homeService = HomeService()
    private let workoutService = WorkoutService()
    private let cal = Calendar.current

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                profileCard
                weekStripCard
                if let error = loadError {
                    Text(error)
                        .font(AppTheme.Typography.footnote)
                        .foregroundStyle(.secondary)
                }
                currentVideoCard
                scheduledWorkoutCard
                exerciseCategoriesSection
                Spacer(minLength: AppTheme.Spacing.xxl)
            }
            .padding(AppTheme.Spacing.lg)
        }
        .navigationTitle(trainer.appName ?? "Home")
        .refreshable {
            currentDate = Date()
            await load()
        }
        .task { await load() }
        .navigationDestination(for: Workout.self) { workout in
            WorkoutDetailView(workout: workout, client: client, workoutService: workoutService)
        }
    }

    // MARK: - Profile card

    private var profileCard: some View {
        AppCard {
            HStack(spacing: AppTheme.Spacing.md) {
                profileAvatar
                VStack(alignment: .leading, spacing: AppTheme.Spacing.xxs) {
                    Text(clientDisplayName)
                        .font(AppTheme.Typography.headline)
                    if let url = trainer.calendlyUrl, !url.isEmpty {
                        Button("Book a call with \(trainer.displayName ?? "your trainer")") {
                            if let u = URL(string: url) { UIApplication.shared.open(u) }
                        }
                        .font(AppTheme.Typography.footnote)
                        .tint(brandTheme.accentColor)
                    }
                }
                Spacer()
                Image(systemName: "gearshape")
                    .font(AppTheme.Typography.body)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Settings")
            }
        }
    }

    private var profileAvatar: some View {
        Group {
            if AppConfig.skipAuthAndShowHome {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(.secondary)
            } else {
                Text(String(clientDisplayName.prefix(2)).uppercased())
                    .font(AppTheme.Typography.title2)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(brandTheme.accentColor)
                    .clipShape(Circle())
            }
        }
        .accessibilityLabel("Profile photo")
    }

    private var clientDisplayName: String {
        AppConfig.skipAuthAndShowHome ? MockData.clientDisplayName : "You"
    }

    // MARK: - Week strip

    private var weekStripCard: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                TabView {
                    weekRow(weekStart: lastWeekStart)
                    weekRow(weekStart: currentWeekStart)
                    weekRow(weekStart: nextWeekStart)
                }
                .tabViewStyle(.page(indexDisplayMode: .automatic))
                .frame(height: 56)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Week selector")
    }

    private var currentWeekStart: Date {
        cal.dateInterval(of: .weekOfYear, for: currentDate)?.start ?? currentDate
    }

    private var lastWeekStart: Date {
        cal.date(byAdding: .day, value: -7, to: currentWeekStart) ?? currentWeekStart
    }

    private var nextWeekStart: Date {
        cal.date(byAdding: .day, value: 7, to: currentWeekStart) ?? currentWeekStart
    }

    private func weekRow(weekStart: Date) -> some View {
        HStack(spacing: AppTheme.Spacing.xs) {
            ForEach(0..<7, id: \.self) { offset in
                let day = cal.date(byAdding: .day, value: offset, to: weekStart)!
                let isToday = cal.isDateInToday(day)
                dayPill(date: day, isToday: isToday)
            }
        }
    }

    private func dayPill(date: Date, isToday: Bool) -> some View {
        let dayNum = cal.component(.day, from: date)
        let short = shortWeekday(from: date)
        return Text("\(dayNum) \(short)")
            .font(AppTheme.Typography.footnote)
            .fontWeight(isToday ? .semibold : .regular)
            .foregroundStyle(isToday ? .white : .primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppTheme.Spacing.xs)
            .background(isToday ? brandTheme.accentColor : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
            .accessibilityLabel("\(dayNum) \(short)\(isToday ? ", today" : "")")
    }

    private func shortWeekday(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    // MARK: - Current video card

    private var currentVideoCard: some View {
        Group {
            if let video = newVideos.first {
                AppCard(action: {
                    if let url = URL(string: video.url) { UIApplication.shared.open(url) }
                }) {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                        ZStack {
                            if let thumb = video.thumbnailUrl, let u = URL(string: thumb) {
                                AsyncImage(url: u) { phase in
                                    switch phase {
                                    case .success(let image): image.resizable().scaledToFill()
                                    default: videoPlaceholder
                                    }
                                }
                                .frame(height: 160)
                                .clipped()
                            } else {
                                videoPlaceholder
                            }
                            Image(systemName: "play.circle.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(.white.opacity(0.9))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 160)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.md))
                        Text("New from \(trainer.displayName ?? "your trainer")")
                            .font(AppTheme.Typography.footnote)
                            .foregroundStyle(.secondary)
                        Text(video.title)
                            .font(AppTheme.Typography.headline)
                    }
                }
                .accessibilityLabel("Latest video: \(video.title)")
                .accessibilityHint("Opens video")
            } else {
                AppCard {
                    HStack {
                        Image(systemName: "video.slash")
                            .foregroundStyle(.secondary)
                        Text("No new videos this week")
                            .font(AppTheme.Typography.body)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var videoPlaceholder: some View {
        Rectangle()
            .fill(Color(.systemGray5))
            .overlay(Image(systemName: "play.circle.fill").font(.system(size: 48)).foregroundStyle(.secondary))
    }

    // MARK: - Scheduled workout card

    private var scheduledWorkoutCard: some View {
        Group {
            if let workout = todaysWorkouts.first {
                NavigationLink(value: workout) {
                    AppCard {
                        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                            Text("Today's workout")
                                .font(AppTheme.Typography.footnote)
                                .foregroundStyle(.secondary)
                            Text(workout.name)
                                .font(AppTheme.Typography.headline)
                            Text("\(workoutExerciseCount(workout)) exercises")
                                .font(AppTheme.Typography.subheadline)
                                .foregroundStyle(.secondary)
                            HStack {
                                Spacer()
                                Text("View")
                                    .font(AppTheme.Typography.callout)
                                    .fontWeight(.medium)
                                    .foregroundColor(brandTheme.accentColor)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
            } else {
                AppCard {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text("No workout scheduled today")
                            .font(AppTheme.Typography.body)
                            .foregroundStyle(.secondary)
                        Text("Rest day")
                            .font(AppTheme.Typography.footnote)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
    }

    private func workoutExerciseCount(_ workout: Workout) -> Int {
        guard AppConfig.skipAuthAndShowHome else { return 0 }
        return MockData.workoutExercises.filter { $0.workoutId == workout.id }.count
    }

    // MARK: - Exercise categories grid

    private var exerciseCategoriesSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("Exercises")
                .font(AppTheme.Typography.headline)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppTheme.Spacing.sm) {
                ForEach(exerciseCategories, id: \.self) { category in
                    let count = exercises.filter { $0.category == category }.count
                    NavigationLink(destination: CategoryExercisesView(category: category, exercises: exercises.filter { $0.category == category })) {
                        AppCard {
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                                Text(category)
                                    .font(AppTheme.Typography.headline)
                                Text("\(count) exercise\(count == 1 ? "" : "s")")
                                    .font(AppTheme.Typography.footnote)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(category), \(count) exercises")
                }
            }
        }
    }

    private var exerciseCategories: [String] {
        let fixed = ["Arms", "Abs", "Legs", "Back", "Chest"]
        let fromData = Set(exercises.map(\.category))
        return (fixed + fromData).uniquedPreservingOrder()
    }

    // MARK: - Data

    private func load() async {
        loadError = nil
        do {
            async let videos = homeService.fetchNewVideos(trainerId: trainer.id)
            async let announcementsTask = homeService.fetchAnnouncements(trainerId: trainer.id)
            async let workouts = homeService.fetchTodaysWorkouts(clientId: client.id)
            async let exercisesTask = homeService.fetchExercises(trainerId: trainer.id)
            newVideos = try await videos
            _ = try await announcementsTask
            todaysWorkouts = try await workouts
            exercises = try await exercisesTask
        } catch {
            loadError = error.localizedDescription
        }
    }
}

private extension Array where Element: Hashable {
    func uniquedPreservingOrder() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}

// MARK: - Video row (kept for any reuse)

private struct VideoRowView: View {
    let video: TrainerVideo

    var body: some View {
        HStack(spacing: AppTheme.Spacing.sm) {
            Text(video.title)
                .font(AppTheme.Typography.body)
            Spacer()
            Image(systemName: "play.circle.fill")
                .foregroundStyle(.secondary)
        }
        .padding(AppTheme.Spacing.sm)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
        .onTapGesture {
            if let url = URL(string: video.url) { UIApplication.shared.open(url) }
        }
    }
}
