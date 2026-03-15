//
//  WorkoutsListView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct WorkoutsListView: View {
    let client: Client
    let trainer: Trainer

    @State private var workouts: [Workout] = []
    @State private var loadError: String?
    @State private var showCreate = false

    private let workoutService = WorkoutService()

    private var templates: [WorkoutTemplate] {
        AppConfig.skipAuthAndShowHome ? MockData.workoutTemplates : []
    }

    var body: some View {
        Group {
            if AppConfig.skipAuthAndShowHome {
                templateList
            } else if let error = loadError {
                Text(error)
                    .font(AppTheme.Typography.body)
                    .foregroundStyle(.secondary)
                    .padding()
            } else {
                myWorkoutsList
            }
        }
        .navigationTitle("Workouts")
        .toolbar {
            if !AppConfig.skipAuthAndShowHome {
                ToolbarItem(placement: .primaryAction) {
                    Button("New") { showCreate = true }
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showCreate) {
            CreateWorkoutView(client: client, trainer: trainer) {
                showCreate = false
                Task { await load() }
            }
        }
        .navigationDestination(for: WorkoutTemplate.self) { template in
            WorkoutTemplateDetailView(template: template)
        }
        .navigationDestination(for: Workout.self) { workout in
            WorkoutDetailView(workout: workout, client: client, workoutService: workoutService)
        }
    }

    private var templateList: some View {
        ScrollView {
            LazyVStack(spacing: AppTheme.Spacing.md) {
                ForEach(templates) { template in
                    NavigationLink(value: template) {
                        AppCard {
                            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                                Text(template.title)
                                    .font(AppTheme.Typography.headline)
                                Text(template.shortDescription)
                                    .font(AppTheme.Typography.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(AppTheme.Spacing.lg)
        }
    }

    private var myWorkoutsList: some View {
        List {
            ForEach(workouts, id: \.id) { workout in
                NavigationLink(value: workout) {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xxs) {
                        Text(workout.name)
                            .font(AppTheme.Typography.headline)
                        Text(scheduledDaysText(workout.scheduledDays))
                            .font(AppTheme.Typography.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func scheduledDaysText(_ days: [Int]) -> String {
        let names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        return days.sorted().map { names.indices.contains($0 - 1) ? names[$0 - 1] : "\($0)" }.joined(separator: ", ")
    }

    private func load() async {
        guard !AppConfig.skipAuthAndShowHome else { return }
        loadError = nil
        do {
            workouts = try await workoutService.fetchWorkouts(clientId: client.id)
        } catch {
            loadError = error.localizedDescription
        }
    }
}

struct WorkoutDetailView: View {
    let workout: Workout
    let client: Client
    let workoutService: WorkoutService

    @State private var exercises: [WorkoutExercise] = []
    @State private var showComplete = false
    @State private var completionNotes = ""

    var body: some View {
        List {
            ForEach(Array(exercises.enumerated()), id: \.element.id) { index, we in
                Text("\(index + 1). \(exerciseName(for: we))")
                    .font(AppTheme.Typography.body)
            }
            Section {
                Button("Mark as completed today") {
                    showComplete = true
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .navigationTitle(workout.name)
        .task { await loadExercises() }
        .alert("Complete workout", isPresented: $showComplete) {
            TextField("Notes (optional)", text: $completionNotes)
            Button("Complete") {
                Task { await complete() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Add optional notes about how it went.")
        }
    }

    private func exerciseName(for we: WorkoutExercise) -> String {
        guard AppConfig.skipAuthAndShowHome,
              let name = MockData.exercises.first(where: { $0.id == we.exerciseId })?.name else {
            return "Exercise \(we.exerciseId.uuidString.prefix(8))…"
        }
        return name
    }

    private func loadExercises() async {
        do {
            exercises = try await workoutService.fetchWorkoutExercises(workoutId: workout.id)
        } catch {}
    }

    private func complete() async {
        do {
            try await workoutService.completeWorkout(workoutId: workout.id, clientId: client.id, notes: completionNotes.isEmpty ? nil : completionNotes)
            showComplete = false
        } catch {}
    }
}

struct CreateWorkoutView: View {
    let client: Client
    let trainer: Trainer
    var onDismiss: () -> Void

    @State private var name = ""
    @State private var selectedDays: Set<Int> = []
    @State private var exercises: [Exercise] = []
    @State private var selectedExerciseIds: [UUID] = []
    @State private var isLoading = false
    @Environment(\.dismiss) private var dismiss

    private let workoutService = WorkoutService()
    private let homeService = HomeService()
    private let dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Workout name", text: $name)
                }
                Section("Days") {
                    ForEach(1...7, id: \.self) { day in
                        Toggle(dayNames[day - 1], isOn: Binding(
                            get: { selectedDays.contains(day) },
                            set: { if $0 { selectedDays.insert(day) } else { selectedDays.remove(day) } }
                        ))
                    }
                }
                Section("Exercises") {
                    ForEach(exercises) { exercise in
                        Toggle(exercise.name, isOn: Binding(
                            get: { selectedExerciseIds.contains(exercise.id) },
                            set: { on in
                                if on { selectedExerciseIds.append(exercise.id) }
                                else { selectedExerciseIds.removeAll { $0 == exercise.id } }
                            }
                        ))
                    }
                }
            }
            .navigationTitle("New workout")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(name.isEmpty || selectedDays.isEmpty || selectedExerciseIds.isEmpty || isLoading)
                }
            }
            .task {
                do {
                    exercises = try await homeService.fetchExercises(trainerId: trainer.id)
                } catch {}
            }
        }
    }

    private func save() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let workout = try await workoutService.createWorkout(
                clientId: client.id,
                name: name,
                scheduledDays: Array(selectedDays)
            )
            for (index, exerciseId) in selectedExerciseIds.enumerated() {
                _ = try await workoutService.addExerciseToWorkout(workoutId: workout.id, exerciseId: exerciseId, order: index, sets: nil, reps: nil)
            }
            dismiss()
            onDismiss()
        } catch {}
    }
}

extension Workout: Hashable {
    public func hash(into hasher: inout Hasher) { hasher.combine(id) }
    public static func == (lhs: Workout, rhs: Workout) -> Bool { lhs.id == rhs.id }
}
