//
//  WorkoutTemplateDetailView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct WorkoutTemplateDetailView: View {
    let template: WorkoutTemplate
    let client: Client
    @Binding var inProgressSession: WorkoutSessionDraft?

    @State private var showStartOptions = false
    @State private var showCustomize = false

    private let headerHeight: CGFloat = 220
    private var exercises: [Exercise] { MockData.exercises }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                headerSection
                difficultySection
                if template.videoUrl != nil {
                    videoSection
                }
                descriptionSection
                exercisesSection
                startButton
            }
            .padding(AppTheme.Spacing.lg)
        }
        .navigationTitle(template.title)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showStartOptions) {
            startOptionsSheet
        }
        .sheet(isPresented: $showCustomize) {
            WorkoutCustomizeSessionView(
                template: template,
                clientId: client.id,
                onGo: { draft in
                    let store = WorkoutSessionStore()
                    store.saveInProgress(draft)
                    inProgressSession = draft
                    showCustomize = false
                    showStartOptions = false
                },
                onCancel: {
                    showCustomize = false
                }
            )
        }
    }

    private var startOptionsSheet: some View {
        NavigationStack {
            VStack(spacing: AppTheme.Spacing.lg) {
                Text("Is everything as you want it? You can start with the default sets and reps, or adjust them for this workout.")
                    .font(AppTheme.Typography.body)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                VStack(spacing: AppTheme.Spacing.sm) {
                    Button {
                        startAsIs()
                        showStartOptions = false
                    } label: {
                        Text("Start as is")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AppTheme.Spacing.md)
                    }
                    .buttonStyle(.borderedProminent)
                    Button {
                        showStartOptions = false
                        showCustomize = true
                    } label: {
                        Text("Make changes for this workout")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, AppTheme.Spacing.md)
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal)
                Spacer()
            }
            .padding(.top, AppTheme.Spacing.xl)
            .navigationTitle("Start workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showStartOptions = false
                    }
                }
            }
        }
    }

    private func startAsIs() {
        let exercises: [WorkoutSessionExercise] = template.exercises
            .sorted(by: { $0.order < $1.order })
            .map { WorkoutSessionExercise(exerciseId: $0.exerciseId, order: $0.order, sets: $0.suggestedSets, reps: $0.suggestedReps) }
        let draft = WorkoutSessionDraft(
            clientId: client.id,
            templateId: template.id,
            templateTitle: template.title,
            startDate: Date(),
            exercises: exercises,
            numberOfRounds: 3,
            isInProgress: true
        )
        let store = WorkoutSessionStore()
        store.saveInProgress(draft)
        inProgressSession = draft
        showStartOptions = false
    }

    private var startButton: some View {
        Button {
            let store = WorkoutSessionStore()
            if let existing = store.loadInProgress(clientId: client.id) {
                inProgressSession = existing
                return
            }
            showStartOptions = true
        } label: {
            Text("Start workout")
                .font(AppTheme.Typography.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.md)
        }
        .buttonStyle(.borderedProminent)
        .padding(.top, AppTheme.Spacing.sm)
    }

    private var headerSection: some View {
        ZStack(alignment: .center) {
            WorkoutThumbnailView(
                thumbnailUrl: template.thumbnailUrl,
                hasVideo: template.videoUrl != nil,
                height: headerHeight
            )
            if template.videoUrl != nil {
                Button {
                    if let url = URL(string: template.videoUrl!) {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.white)
                        .shadow(radius: 4)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var difficultySection: some View {
        Text(template.difficulty.displayString)
            .font(AppTheme.Typography.footnote)
            .foregroundStyle(.secondary)
    }

    private var videoSection: some View {
        Button {
            if let url = URL(string: template.videoUrl!) {
                UIApplication.shared.open(url)
            }
        } label: {
            HStack {
                Image(systemName: "play.circle.fill")
                    .font(.title2)
                Text("Watch video")
                    .font(AppTheme.Typography.headline)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.footnote)
            }
            .padding(AppTheme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
        }
        .buttonStyle(.plain)
    }

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("What this workout is for")
                .font(AppTheme.Typography.headline)
            Text(template.longDescription)
                .font(AppTheme.Typography.body)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var exercisesSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("Exercises")
                .font(AppTheme.Typography.headline)
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                ForEach(Array(template.exercises.sorted(by: { $0.order < $1.order })), id: \.exerciseId) { item in
                    readOnlyExerciseRow(item)
                }
            }
        }
    }

    private func readOnlyExerciseRow(_ item: TemplateExerciseItem) -> some View {
        let name = exercises.first(where: { $0.id == item.exerciseId })?.name ?? "Exercise"
        let orderIndex = template.exercises.sorted(by: { $0.order < $1.order }).firstIndex(where: { $0.exerciseId == item.exerciseId }).map { $0 + 1 } ?? 0
        return HStack(alignment: .top, spacing: AppTheme.Spacing.sm) {
            Text("\(orderIndex).")
                .font(AppTheme.Typography.body)
                .foregroundStyle(.secondary)
                .frame(width: 24, alignment: .leading)
            Text("\(name) — \(item.suggestedSets) sets × \(item.suggestedReps) reps")
                .font(AppTheme.Typography.body)
            Spacer(minLength: 0)
        }
        .padding(AppTheme.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.md))
    }
}
