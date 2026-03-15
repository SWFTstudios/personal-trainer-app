//
//  ActiveWorkoutView.swift
//  swft-personal-trainer-app
//

import Combine
import SwiftUI

/// Phase of the active workout: in progress (round index 1-based) or completed and awaiting log.
private enum WorkoutPhase: Equatable {
    case inProgress(roundIndex: Int)
    case completedAwaitingLog
}

/// Picker option for weight unit per set row. Abbreviated labels (BW, LBS, KG) avoid wrapping in narrow rows.
private enum WeightInputMode: String, CaseIterable {
    case bodyWeight = "BW"
    case pounds = "LBS"
    case kilograms = "KG"
}

/// Active workout: rounds, per-set weight (BW or number + lbs/kg), round advance with pre-fill, Done/Finish → onStopped with full session data.
struct ActiveWorkoutView: View {
    let session: WorkoutSessionDraft
    let client: Client
    /// When sessionData is non-nil, parent should log to journal then dismiss; when nil, just dismiss (e.g. cancel without logging).
    let onStopped: (Date, Date, ActiveSessionData?) -> Void

    @State private var currentTime = Date()
    @State private var workoutPhase: WorkoutPhase
    @State private var weightData: [[[SetWeightRecord]]]
    @State private var elapsedAtPause: TimeInterval?
    @State private var currentExerciseIndex: Int = 0
    @State private var showStaleAlert = false
    @State private var showStopConfirm = false

    private let sessionStore = WorkoutSessionStore()
    private var exercises: [Exercise] { MockData.exercises }
    private var sortedExercises: [WorkoutSessionExercise] { session.exercises.sorted(by: { $0.order < $1.order }) }
    private var numberOfRounds: Int { session.numberOfRounds }
    private var currentRound: Int {
        switch workoutPhase {
        case .inProgress(let r): return r
        case .completedAwaitingLog: return numberOfRounds
        }
    }
    private var isLastRound: Bool { currentRound >= numberOfRounds }
    private var showFinishSection: Bool {
        if case .completedAwaitingLog = workoutPhase { return true }
        return false
    }
    private var isTimerPaused: Bool { elapsedAtPause != nil }

    init(session: WorkoutSessionDraft, client: Client, onStopped: @escaping (Date, Date, ActiveSessionData?) -> Void) {
        self.session = session
        self.client = client
        self.onStopped = onStopped
        let sorted = session.exercises.sorted(by: { $0.order < $1.order })
        let rounds = max(1, session.numberOfRounds)
        var grid: [[[SetWeightRecord]]] = []
        for ex in sorted {
            var roundRows: [[SetWeightRecord]] = []
            for _ in 0..<rounds {
                roundRows.append([SetWeightRecord](repeating: SetWeightRecord(), count: max(1, ex.sets)))
            }
            grid.append(roundRows)
        }
        _workoutPhase = State(initialValue: .inProgress(roundIndex: 1))
        _weightData = State(initialValue: grid)
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                        elapsedSection
                        roundHeader
                        if !showFinishSection {
                            currentRoundExercises(scrollProxy: proxy)
                            nextRoundOrFinishButton(scrollProxy: proxy)
                        } else {
                            finishWorkoutSection
                        }
                    }
                    .padding(AppTheme.Spacing.lg)
                }
                .onChange(of: workoutPhase) { _, newPhase in
                    if case .inProgress = newPhase {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            proxy.scrollTo("exercise-0", anchor: .top)
                        }
                    }
                }
            }
            .navigationTitle(session.templateTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        showStopConfirm = true
                    }
                }
            }
            .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
                guard !isTimerPaused else { return }
                currentTime = Date()
            }
            .onAppear {
                if sessionStore.isStale(session) {
                    showStaleAlert = true
                }
            }
            .alert("Still working out?", isPresented: $showStaleAlert) {
                Button("Continue workout", role: .cancel) {}
                Button("Cancel workout", role: .destructive) {
                    sessionStore.clearInProgress(clientId: client.id)
                    onStopped(session.startDate, Date(), nil)
                }
            } message: {
                Text("This workout was started a while ago. Continue or cancel without logging.")
            }
            .confirmationDialog("Stop workout", isPresented: $showStopConfirm) {
                Button("Stop and log to journal") {
                    finishAndNotify()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Record this workout in your journal?")
            }
        }
    }

    private var elapsedSection: some View {
        let elapsed: TimeInterval = elapsedAtPause ?? currentTime.timeIntervalSince(session.startDate)
        let minutes = Int(elapsed) / 60
        let seconds = Int(elapsed) % 60
        return VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
            Text("Elapsed time")
                .font(AppTheme.Typography.footnote)
                .foregroundStyle(.secondary)
            Text(String(format: "%d:%02d", minutes, seconds))
                .font(.system(.title, design: .monospaced))
        }
    }

    private var roundHeader: some View {
        Text("Round \(currentRound) of \(numberOfRounds)")
            .font(AppTheme.Typography.headline)
    }

    private func currentRoundExercises(scrollProxy: ScrollViewProxy) -> some View {
        let roundIndex = currentRound - 1
        return VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            ForEach(Array(sortedExercises.enumerated()), id: \.element.exerciseId) { exIndex, ex in
                exerciseBlock(exIndex: exIndex, exercise: ex, roundIndex: roundIndex)
            }
        }
    }

    private func exerciseBlock(exIndex: Int, exercise: WorkoutSessionExercise, roundIndex: Int) -> some View {
        let name = exercises.first(where: { $0.id == exercise.exerciseId })?.name ?? "Exercise"
        let setRecords = weightData[safe: exIndex]?[safe: roundIndex] ?? []
        let isFocused = exIndex == currentExerciseIndex
        return VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text(name)
                .font(AppTheme.Typography.headline)
            Text("\(exercise.reps) reps per set")
                .font(AppTheme.Typography.footnote)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                ForEach(0..<exercise.sets, id: \.self) { setIndex in
                    setRow(
                        exIndex: exIndex,
                        roundIndex: roundIndex,
                        setIndex: setIndex,
                        reps: exercise.reps,
                        record: setRecords[safe: setIndex] ?? SetWeightRecord()
                    )
                }
            }
        }
        .padding(AppTheme.Spacing.md)
        .background(isFocused ? Color.accentColor.opacity(0.08) : Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.Radius.lg)
                .stroke(isFocused ? Color.accentColor : Color.clear, lineWidth: 2)
        )
        .id("exercise-\(exIndex)")
        .onTapGesture {
            currentExerciseIndex = exIndex
        }
    }

    private func setRow(exIndex: Int, roundIndex: Int, setIndex: Int, reps: String, record: SetWeightRecord) -> some View {
        let binding = weightBinding(exIndex: exIndex, roundIndex: roundIndex, setIndex: setIndex)
        let modeBinding = weightModeBinding(binding)
        let isNumeric = modeBinding.wrappedValue != .bodyWeight
        return HStack(spacing: AppTheme.Spacing.sm) {
            Text("Set \(setIndex + 1)")
                .font(AppTheme.Typography.footnote)
                .foregroundStyle(.secondary)
                .frame(width: 44, alignment: .leading)
            Text("\(reps) reps")
                .font(AppTheme.Typography.body)
                .frame(width: 64, alignment: .leading)
            Picker("Unit", selection: modeBinding) {
                ForEach(WeightInputMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                        .lineLimit(1)
                }
            }
            .pickerStyle(.menu)
            .labelsHidden()
            .frame(minWidth: 52)
            .fixedSize(horizontal: true, vertical: false)
            if isNumeric {
                TextField("Weight", text: textFieldBinding(binding))
                    .keyboardType(.decimalPad)
                    .frame(width: 56)
                    .multilineTextAlignment(.center)
            }
            Spacer(minLength: 0)
        }
        .padding(AppTheme.Spacing.sm)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.md))
    }

    private func weightModeBinding(_ recordBinding: Binding<SetWeightRecord>) -> Binding<WeightInputMode> {
        Binding(
            get: {
                let w = recordBinding.wrappedValue.weight
                if w == "BW" { return .bodyWeight }
                return recordBinding.wrappedValue.unit == .kg ? .kilograms : .pounds
            },
            set: { mode in
                let current = recordBinding.wrappedValue
                switch mode {
                case .bodyWeight:
                    recordBinding.wrappedValue = SetWeightRecord(weight: "BW", unit: nil)
                case .pounds:
                    recordBinding.wrappedValue = SetWeightRecord(
                        weight: current.weight == "BW" ? nil : current.weight,
                        unit: .lb
                    )
                case .kilograms:
                    recordBinding.wrappedValue = SetWeightRecord(
                        weight: current.weight == "BW" ? nil : current.weight,
                        unit: .kg
                    )
                }
            }
        )
    }

    private func textFieldBinding(_ recordBinding: Binding<SetWeightRecord>) -> Binding<String> {
        Binding(
            get: {
                let w = recordBinding.wrappedValue.weight
                if w == nil || w == "BW" { return "" }
                return w ?? ""
            },
            set: { new in
                let trimmed = new.trimmingCharacters(in: .whitespacesAndNewlines)
                let current = recordBinding.wrappedValue
                if trimmed.isEmpty {
                    recordBinding.wrappedValue = SetWeightRecord(weight: nil, unit: current.unit)
                } else {
                    recordBinding.wrappedValue = SetWeightRecord(weight: trimmed, unit: current.unit ?? .lb)
                }
            }
        )
    }

    private func weightBinding(exIndex: Int, roundIndex: Int, setIndex: Int) -> Binding<SetWeightRecord> {
        Binding(
            get: {
                guard exIndex < weightData.count,
                      roundIndex < weightData[exIndex].count,
                      setIndex < weightData[exIndex][roundIndex].count else { return SetWeightRecord() }
                return weightData[exIndex][roundIndex][setIndex]
            },
            set: { newValue in
                guard exIndex < weightData.count,
                      roundIndex < weightData[exIndex].count,
                      setIndex < weightData[exIndex][roundIndex].count else { return }
                var exCopy = weightData[exIndex]
                var roundCopy = exCopy[roundIndex]
                roundCopy[setIndex] = newValue
                exCopy[roundIndex] = roundCopy
                var full = weightData
                full[exIndex] = exCopy
                weightData = full
            }
        )
    }

    private func nextRoundOrFinishButton(scrollProxy: ScrollViewProxy) -> some View {
        Button {
            if isLastRound {
                elapsedAtPause = Date().timeIntervalSince(session.startDate)
                workoutPhase = .completedAwaitingLog
            } else {
                copyWeightsToNextRound()
                workoutPhase = .inProgress(roundIndex: currentRound + 1)
                currentExerciseIndex = 0
                withAnimation(.easeInOut(duration: 0.25)) {
                    scrollProxy.scrollTo("exercise-0", anchor: .top)
                }
            }
        } label: {
            Text(isLastRound ? "Finish workout" : "Round complete")
                .font(AppTheme.Typography.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppTheme.Spacing.md)
        }
        .buttonStyle(.borderedProminent)
    }

    private var finishWorkoutSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("All rounds complete.")
                .font(AppTheme.Typography.body)
            Button {
                finishAndNotify()
            } label: {
                Text("Done — log to journal")
                    .font(AppTheme.Typography.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
            }
            .buttonStyle(.borderedProminent)
            Button {
                elapsedAtPause = nil
                workoutPhase = .inProgress(roundIndex: numberOfRounds)
                currentExerciseIndex = 0
            } label: {
                Text("Return to workout")
                    .font(AppTheme.Typography.body)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.sm)
            }
            .buttonStyle(.bordered)
        }
        .padding(AppTheme.Spacing.md)
    }

    private func copyWeightsToNextRound() {
        let fromRound = currentRound - 1
        let toRound = currentRound
        guard toRound < numberOfRounds else { return }
        var newGrid = weightData
        for exIndex in 0..<newGrid.count {
            guard fromRound < newGrid[exIndex].count, toRound < newGrid[exIndex].count else { continue }
            newGrid[exIndex][toRound] = newGrid[exIndex][fromRound]
        }
        weightData = newGrid
    }

    private func buildSessionData(endDate: Date) -> ActiveSessionData {
        ActiveSessionData(
            startDate: session.startDate,
            endDate: endDate,
            templateId: session.templateId,
            templateTitle: session.templateTitle,
            clientId: session.clientId,
            exercises: session.exercises,
            numberOfRounds: session.numberOfRounds,
            weightData: weightData
        )
    }

    private func finishAndNotify() {
        showStopConfirm = false
        let endDate = Date()
        let data = buildSessionData(endDate: endDate)
        sessionStore.clearInProgress(clientId: client.id)
        onStopped(session.startDate, endDate, data)
    }
}

// MARK: - Safe array subscript
private extension Array {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
