//
//  WorkoutCustomizeSessionView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct WorkoutCustomizeSessionView: View {
    let template: WorkoutTemplate
    let clientId: UUID
    let onGo: (WorkoutSessionDraft) -> Void
    let onCancel: () -> Void

    @State private var sessionExercises: [WorkoutSessionExercise]
    @State private var numberOfRounds: Int
    @Environment(\.dismiss) private var dismiss

    private var exercises: [Exercise] { MockData.exercises }

    init(template: WorkoutTemplate, clientId: UUID, onGo: @escaping (WorkoutSessionDraft) -> Void, onCancel: @escaping () -> Void) {
        self.template = template
        self.clientId = clientId
        self.onGo = onGo
        self.onCancel = onCancel
        let initial = template.exercises
            .sorted(by: { $0.order < $1.order })
            .map { WorkoutSessionExercise(exerciseId: $0.exerciseId, order: $0.order, sets: $0.suggestedSets, reps: $0.suggestedReps) }
        _sessionExercises = State(initialValue: initial)
        _numberOfRounds = State(initialValue: 3)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Stepper("Rounds: \(numberOfRounds)", value: $numberOfRounds, in: 1...20)
                } header: {
                    Text("Number of rounds")
                } footer: {
                    Text("One round is one pass through all exercises.")
                }
                Section {
                    ForEach(Array(sessionExercises.enumerated()), id: \.element.exerciseId) { index, ex in
                        sessionExerciseRow(index: index, exercise: ex)
                    }
                } header: {
                    Text("Sets and reps for this workout only. Changes are not saved to the template.")
                }
            }
            .navigationTitle("Customize workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Go") {
                        commitAndGo()
                    }
                }
            }
        }
    }

    private func sessionExerciseRow(index: Int, exercise: WorkoutSessionExercise) -> some View {
        let name = exercises.first(where: { $0.id == exercise.exerciseId })?.name ?? "Exercise"
        return Section {
            Stepper("Sets: \(sessionExercises[index].sets)", value: $sessionExercises[index].sets, in: 1...10)
            TextField("Reps (e.g. 10, 8-12, 45 sec)", text: $sessionExercises[index].reps)
                .keyboardType(.default)
                .textInputAutocapitalization(.never)
        } header: {
            Text("\(index + 1). \(name)")
        }
    }

    private func commitAndGo() {
        let repsSanitized = sessionExercises.map { ex -> WorkoutSessionExercise in
            let r = ex.reps.trimmingCharacters(in: .whitespacesAndNewlines)
            return WorkoutSessionExercise(exerciseId: ex.exerciseId, order: ex.order, sets: max(1, min(10, ex.sets)), reps: r.isEmpty ? "—" : String(r.prefix(64)))
        }
        let draft = WorkoutSessionDraft(
            clientId: clientId,
            templateId: template.id,
            templateTitle: template.title,
            startDate: Date(),
            exercises: repsSanitized,
            numberOfRounds: max(1, min(20, numberOfRounds)),
            isInProgress: true
        )
        onGo(draft)
        dismiss()
    }
}
