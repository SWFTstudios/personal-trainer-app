//
//
//  JournalListView.swift
//  swft-personal-trainer-app
//

import AVFoundation
import PhotosUI
import SwiftUI
import UIKit
import UniformTypeIdentifiers

private struct JournalScrollContentValue: Equatable {
    var minY: CGFloat
    var contentHeight: CGFloat
}

private struct JournalScrollContentKey: PreferenceKey {
    static var defaultValue: JournalScrollContentValue { JournalScrollContentValue(minY: 0, contentHeight: 0) }
    static func reduce(value: inout JournalScrollContentValue, nextValue: () -> JournalScrollContentValue) {
        value = nextValue()
    }
}

struct JournalListView: View {
    let client: Client

    @Environment(\.brandTheme) private var brandTheme
    @State private var diaryEntries: [DiaryEntry] = []
    @State private var loadError: String?
    @State private var selectedDate = Date()
    @State private var showAddEntry = false
    @State private var showExportReport = false
    @State private var selectedEntry: DiaryEntry?
    @State private var weekSlider: [[JournalWeekDay]] = []
    @State private var currentWeekIndex: Int = 1
    @State private var createWeek = false
    @Namespace private var animation
    @State private var scrollOverscrollTriggered: (top: Bool, bottom: Bool) = (false, false)
    @State private var showMonthPicker = false
    @State private var showYearPicker = false

    private let journalService = JournalService()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            headerView
            GeometryReader { geo in
                ScrollView(.vertical) {
                    entriesSection(size: geo.size)
                        .hSpacing(.center)
                        .vSpacing(.top)
                        .background(alignment: .top) {
                            GeometryReader { contentGeo in
                                Color.clear
                                    .preference(
                                        key: JournalScrollContentKey.self,
                                        value: JournalScrollContentValue(minY: contentGeo.frame(in: .named("journalScroll")).minY, contentHeight: contentGeo.size.height)
                                    )
                            }
                        }
                }
                .coordinateSpace(name: "journalScroll")
                .scrollIndicators(.hidden)
                .onPreferenceChange(JournalScrollContentKey.self) { value in
                    let minY = value.minY
                    let contentHeight = value.contentHeight
                    let scrollHeight = geo.size.height
                    let overscrollThreshold: CGFloat = 44
                    if minY > overscrollThreshold, !scrollOverscrollTriggered.top {
                        scrollOverscrollTriggered.top = true
                        selectPreviousDay()
                    } else if minY <= 0 {
                        scrollOverscrollTriggered.top = false
                    }
                    if contentHeight > scrollHeight, minY < scrollHeight - contentHeight - overscrollThreshold, !scrollOverscrollTriggered.bottom {
                        scrollOverscrollTriggered.bottom = true
                        selectNextDay()
                    } else if minY >= scrollHeight - contentHeight {
                        scrollOverscrollTriggered.bottom = false
                    }
                }
            }
        }
        .onChange(of: selectedDate) { _, _ in
            scrollOverscrollTriggered = (false, false)
        }
        .vSpacing(.top)
        .background(Color(.systemGroupedBackground))
        .overlay(alignment: .bottomTrailing) {
            Button {
                showAddEntry = true
            } label: {
                Image(systemName: "plus")
                    .fontWeight(.semibold)
                    .foregroundStyle(brandTheme.onAccentForeground)
                    .frame(width: 55, height: 55)
                    .background(brandTheme.accentColor.shadow(.drop(color: .black.opacity(0.25), radius: 5, x: 2, y: 2)), in: .circle)
            }
            .padding(15)
        }
        .navigationTitle("Journal")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showExportReport = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .refreshable { await load() }
        .task(id: selectedDate) { await load() }
        .onReceive(NotificationCenter.default.publisher(for: .journalDidAddEntry)) { _ in
            Task { await load() }
        }
        .onAppear {
            if weekSlider.isEmpty {
                let currentWeek = Date().fetchWeek()
                if let first = currentWeek.first?.date {
                    weekSlider.append(first.createPreviousWeek())
                }
                weekSlider.append(currentWeek)
                if let last = currentWeek.last?.date {
                    weekSlider.append(last.createNextWeek())
                }
            }
        }
        .onChange(of: currentWeekIndex, initial: false) { _, newValue in
            if newValue == 0 || newValue == weekSlider.count - 1 {
                createWeek = true
            }
        }
        .sheet(isPresented: $showAddEntry) {
            AddDiaryEntryView(client: client, selectedDate: selectedDate) {
                showAddEntry = false
                Task { await load() }
            }
            .presentationDetents([.medium, .large])
            .presentationCornerRadius(30)
            .presentationBackground(Color(.systemGroupedBackground))
        }
        .sheet(item: $selectedEntry) { entry in
            DiaryEntryDetailView(entry: entry, client: client) {
                selectedEntry = nil
                Task { await load() }
            }
        }
        .sheet(isPresented: $showExportReport) {
            ExportReportSheet(client: client) {
                showExportReport = false
            }
        }
        .sheet(isPresented: $showMonthPicker) {
            monthPickerSheet
        }
        .sheet(isPresented: $showYearPicker) {
            yearPickerSheet
        }
    }

    private var monthPickerSheet: some View {
        let cal = Calendar.current
        let currentMonth = cal.component(.month, from: selectedDate)
        let year = cal.component(.year, from: selectedDate)
        let monthSymbols = cal.monthSymbols
        return NavigationStack {
            List(1...12, id: \.self) { month in
                Button {
                    let day = cal.component(.day, from: selectedDate)
                    let range = cal.range(of: .day, in: .month, for: cal.date(from: DateComponents(year: year, month: month))!)!
                    let clampedDay = min(day, range.count)
                    if let newDate = cal.date(from: DateComponents(year: year, month: month, day: clampedDay)) {
                        withAnimation(.snappy) {
                            selectedDate = newDate
                            syncWeekStrip(to: newDate)
                        }
                        showMonthPicker = false
                    }
                } label: {
                    HStack {
                        Text(monthSymbols[month - 1])
                        if month == currentMonth {
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Select month")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showMonthPicker = false }
                }
            }
        }
    }

    private var yearPickerSheet: some View {
        let cal = Calendar.current
        let currentYear = cal.component(.year, from: selectedDate)
        let month = cal.component(.month, from: selectedDate)
        let day = cal.component(.day, from: selectedDate)
        let yearRange = (currentYear - 15)...(currentYear + 5)
        return NavigationStack {
            List(Array(yearRange), id: \.self) { y in
                Button {
                    guard let refDate = cal.date(from: DateComponents(year: y, month: month, day: 1)) else { return }
                    let range = cal.range(of: .day, in: .month, for: refDate)!
                    let clampedDay = min(day, range.count)
                    if let newDate = cal.date(from: DateComponents(year: y, month: month, day: clampedDay)) {
                        withAnimation(.snappy) {
                            selectedDate = newDate
                            syncWeekStrip(to: newDate)
                        }
                        showYearPicker = false
                    }
                } label: {
                    HStack {
                        Text(String(y))
                        if y == currentYear {
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Select year")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showYearPicker = false }
                }
            }
        }
    }

    private var headerView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Button {
                    selectPreviousDay()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                }
                HStack(spacing: 5) {
                    Button {
                        showMonthPicker = true
                    } label: {
                        Text(selectedDate.journalFormat("MMMM"))
                            .foregroundStyle(.primary)
                    }
                    .buttonStyle(.plain)
                    Button {
                        showYearPicker = true
                    } label: {
                        Text(selectedDate.journalFormat("yyyy"))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .font(.title.bold())
                Spacer(minLength: 8)
                Button {
                    goToToday()
                } label: {
                    Text("Today")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(brandTheme.accentColor)
                }
                Button {
                    selectNextDay()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.primary)
                        .frame(width: 44, height: 44)
                }
            }

            Text(selectedDate.formatted(date: .complete, time: .omitted))
                .font(.callout)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            TabView(selection: $currentWeekIndex) {
                ForEach(Array(weekSlider.enumerated()), id: \.offset) { index, week in
                    weekRow(week)
                        .padding(.horizontal, 15)
                        .tag(index)
                }
            }
            .padding(.horizontal, -15)
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 90)
        }
        .hSpacing(.leading)
        .padding(15)
        .background(Color(.secondarySystemGroupedBackground))
    }

    private func weekRow(_ week: [JournalWeekDay]) -> some View {
        HStack(spacing: 0) {
            ForEach(week) { day in
                let isSelected = Calendar.current.isDate(day.date, inSameDayAs: selectedDate)
                VStack(spacing: 8) {
                    Text(day.date.journalFormat("E"))
                        .font(.callout)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                    Text(day.date.journalFormat("dd"))
                        .font(.callout)
                        .fontWeight(.bold)
                        .foregroundStyle(isSelected ? brandTheme.onAccentForeground : .primary)
                        .frame(width: 35, height: 35)
                        .background {
                            if isSelected {
                                Circle()
                                    .fill(brandTheme.accentColor)
                                    .matchedGeometryEffect(id: "WEEKINDICATOR", in: animation)
                            }
                            if day.date.isToday {
                                Circle()
                                    .fill(brandTheme.accentColor.opacity(0.6))
                                    .frame(width: 5, height: 5)
                                    .vSpacing(.bottom)
                                    .offset(y: 12)
                            }
                        }
                        .background(Color(.tertiarySystemFill), in: .circle)
                }
                .hSpacing(.center)
                .contentShape(.rect)
                .onTapGesture {
                    withAnimation(.snappy) {
                        selectedDate = day.date
                    }
                }
            }
        }
        .background {
            GeometryReader { geo in
                Color.clear
                    .preference(key: OffsetKey.self, value: geo.frame(in: .global).minX)
                    .onPreferenceChange(OffsetKey.self) { value in
                        if value.rounded() == 15 && createWeek {
                            paginateWeek()
                            createWeek = false
                        }
                    }
            }
        }
    }

    private func paginateWeek() {
        guard weekSlider.indices.contains(currentWeekIndex) else { return }
        if let firstDate = weekSlider[currentWeekIndex].first?.date, currentWeekIndex == 0 {
            weekSlider.insert(firstDate.createPreviousWeek(), at: 0)
            weekSlider.removeLast()
            currentWeekIndex = 1
        }
        if let lastDate = weekSlider[currentWeekIndex].last?.date, currentWeekIndex == weekSlider.count - 1 {
            weekSlider.append(lastDate.createNextWeek())
            weekSlider.removeFirst()
            currentWeekIndex = weekSlider.count - 2
        }
    }

    private func goToToday() {
        let today = Date()
        withAnimation(.snappy) {
            selectedDate = today
            syncWeekStrip(to: today)
        }
    }

    private func selectNextDay() {
        let cal = Calendar.current
        guard let next = cal.date(byAdding: .day, value: 1, to: selectedDate) else { return }
        withAnimation(.snappy) {
            selectedDate = next
            syncWeekStrip(to: next)
        }
    }

    private func selectPreviousDay() {
        let cal = Calendar.current
        guard let previous = cal.date(byAdding: .day, value: -1, to: selectedDate) else { return }
        withAnimation(.snappy) {
            selectedDate = previous
            syncWeekStrip(to: previous)
        }
    }

    private func syncWeekStrip(to date: Date) {
        let cal = Calendar.current
        let startOfDate = cal.startOfDay(for: date)
        if let index = weekSlider.firstIndex(where: { week in
            week.contains { cal.isDate($0.date, inSameDayAs: startOfDate) }
        }) {
            currentWeekIndex = index
        } else {
            let targetWeek = date.fetchWeek()
            if let first = targetWeek.first?.date {
                weekSlider = [first.createPreviousWeek(), targetWeek, first.createNextWeek()]
            }
            currentWeekIndex = 1
        }
    }

    private func entriesSection(size: CGSize) -> some View {
        VStack(alignment: .leading, spacing: 35) {
            if let error = loadError {
                Text(error)
                    .font(AppTheme.Typography.footnote)
                    .foregroundStyle(.secondary)
            }
            ForEach(Array(diaryEntries.enumerated()), id: \.element.id) { index, entry in
                DiaryEntryRow(entry: entry, accentColor: brandTheme.accentColor)
                    .contentShape(.rect)
                    .onTapGesture { selectedEntry = entry }
                    .background(alignment: .leading) {
                        if index < diaryEntries.count - 1 {
                            Rectangle()
                                .fill(Color(.separator))
                                .frame(width: 1)
                                .offset(x: 8)
                                .padding(.bottom, -35)
                        }
                    }
            }
        }
        .padding(15)
        .overlay {
            if diaryEntries.isEmpty && loadError == nil {
                Text("No entries for this day")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(width: 200)
                    .offset(y: (size.height - 80) / 2)
            }
        }
    }

    private func load() async {
        loadError = nil
        do {
            diaryEntries = try await journalService.fetchDiaryEntries(clientId: client.id, for: selectedDate)
        } catch {
            loadError = error.localizedDescription
        }
    }
}

// MARK: - Timeline row (TaskRowView style)

private struct DiaryEntryRow: View {
    let entry: DiaryEntry
    var accentColor: Color

    private var timeString: String {
        entry.createdAt.journalFormat("hh:mm a")
    }

    private var isTextEntry: Bool {
        entry.bodyText != nil && !(entry.bodyText?.isEmpty ?? true)
    }

    private var hasImage: Bool {
        !entry.mediaItems.isEmpty || entry.imagePath != nil || (entry.imageCaption != nil && !(entry.imageCaption?.isEmpty ?? true))
    }

    /// Workout summary as groups (title + lines) for the card. Each group can show a bold title and exercise lines.
    /// Prefer full workoutLog over workoutCustomDescription so entries with both show name + exercises + time.
    private var workoutSummaryGroups: [(title: String?, lines: [String])]? {
        var groups: [(title: String?, lines: [String])] = []
        if let log = entry.workoutLog {
            let lines = workoutLogSummaryLines(log)
            let title = entry.workoutDisplayTitle?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                ? entry.workoutDisplayTitle
                : nil
            var displayLines: [String] = []
            if let timeRange = entry.workoutCustomDescription?.trimmingCharacters(in: .whitespacesAndNewlines), !timeRange.isEmpty {
                displayLines.append(timeRange)
            }
            displayLines.append(contentsOf: lines)
            if workoutLogHasRoundsWeights(log) {
                let roundCount = log.rounds ?? 1
                displayLines.append(roundCount > 1 ? "\(roundCount) rounds · weights logged" : "Weights logged")
            }
            groups.append((title, displayLines))
        } else if let custom = entry.workoutCustomDescription, !custom.isEmpty {
            let trimmed = custom.trimmingCharacters(in: .whitespacesAndNewlines)
            let title = trimmed.hasPrefix("Pre-made: ") ? String(trimmed.dropFirst("Pre-made: ".count)) : trimmed
            groups.append((title, []))
        } else if let wid = entry.workoutId, let saved = CustomWorkoutStore.entry(id: wid) {
            let blockLines = blockSummaryLines(saved.blocks)
            groups.append((saved.name, blockLines))
        } else if entry.workoutId != nil, let title = entry.workoutDisplayTitle, !title.isEmpty {
            groups.append((title, []))
        } else if entry.workoutId != nil {
            groups.append(("Saved workout", []))
        }
        for preset in entry.additionalWorkoutPresets ?? [] {
            if let saved = CustomWorkoutStore.entry(id: preset.id) {
                let blockLines = blockSummaryLines(saved.blocks)
                groups.append((preset.displayTitle, blockLines))
            } else {
                groups.append((preset.displayTitle, []))
            }
        }
        for log in entry.additionalWorkoutLogs ?? [] {
            let lines = workoutLogSummaryLines(log)
            groups.append((nil, lines))
        }
        return groups.isEmpty ? nil : groups
    }

    /// One line per block (strength or cardio) for journal card summaries. Uses shared formatter: "Name — sets × reps".
    private func blockSummaryLines(_ blocks: [WorkoutLogBlock]) -> [String] {
        blocks.compactMap { block -> String? in
            switch block {
            case .strength(let ex):
                let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                return WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps)
            case .cardio(let c):
                return cardioSummaryLine(c)
            }
        }
    }

    /// True when any strength block has per-round weight data.
    private func workoutLogHasRoundsWeights(_ log: WorkoutLog) -> Bool {
        guard let blocks = log.blocks else { return false }
        return blocks.contains { block in
            if case .strength(let ex) = block, let rounds = ex.roundsData, !rounds.isEmpty {
                return rounds.contains { !$0.isEmpty }
            }
            return false
        }
    }

    private func workoutLogSummaryLines(_ log: WorkoutLog) -> [String] {
        if let blocks = log.blocks, !blocks.isEmpty {
            return blockSummaryLines(blocks)
        }
        switch log.type {
        case .home:
            return [log.workoutCustomDescription ?? "Workout"]
        case .cardio:
            if let c = log.cardio {
                return [cardioSummaryLine(c)]
            }
            return ["Cardio"]
        case .weightTraining:
            if let exs = log.exercises, !exs.isEmpty {
                return exs.map { ex in
                    let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
                    return WorkoutDisplayHelpers.exerciseSummaryLine(name: name, sets: ex.sets, reps: ex.reps)
                }
            }
            return ["Weight"]
        }
    }

    /// One line for cardio: title/activity plus duration and/or distance when present.
    private func cardioSummaryLine(_ c: CardioLog) -> String {
        let title = (c.title?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? c.activityType?.defaultTitle
        var parts: [String] = []
        parts.append(title ?? "Cardio")
        if let d = c.durationValue, d > 0 {
            let u = c.durationUnit ?? .minutes
            parts.append("\(String(format: "%.0f", d)) \(u.rawValue)")
        }
        if let d = c.distanceValue, d > 0 {
            let u = c.distanceUnit ?? .miles
            parts.append("\(String(format: "%.1f", d)) \(u.rawValue)")
        }
        return parts.joined(separator: " · ")
    }

    @ViewBuilder
    private var entryRowThumbnail: some View {
        let firstItem = entry.mediaItems.first
        let cachedData = firstItem.flatMap { JournalMediaCache.thumbnailData(for: $0.id) }
        let thumbSize: CGFloat = 60
        ZStack {
            if let data = cachedData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: thumbSize, height: thumbSize)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                if firstItem?.kind == .video {
                    Image(systemName: "play.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .shadow(radius: 1)
                }
            } else {
                RoundedRectangle(cornerRadius: AppTheme.Radius.sm)
                    .fill(Color(.tertiarySystemFill))
                    .frame(width: thumbSize, height: thumbSize)
                    .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
            }
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            Circle()
                .fill(hasImage ? accentColor.opacity(0.8) : accentColor)
                .frame(width: 10, height: 10)
                .padding(4)
                .background(Circle().fill(Color(.secondarySystemGroupedBackground)))
                .shadow(color: .black.opacity(0.1), radius: 3)

            VStack(alignment: .leading, spacing: 8) {
                Label(timeString, systemImage: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let body = entry.bodyText, !body.isEmpty {
                    Text(body)
                        .font(AppTheme.Typography.body)
                        .foregroundStyle(.primary)
                }
                if hasImage {
                    HStack(alignment: .top, spacing: AppTheme.Spacing.sm) {
                        entryRowThumbnail
                        if let cap = entry.imageCaption, !cap.isEmpty {
                            Text(cap)
                                .font(AppTheme.Typography.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                if let groups = workoutSummaryGroups, !groups.isEmpty {
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "figure.run")
                            .font(.caption2)
                            .foregroundStyle(accentColor)
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(Array(groups.enumerated()), id: \.offset) { _, group in
                                if let title = group.title, !title.isEmpty {
                                    Text(title)
                                        .font(AppTheme.Typography.footnote)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(.secondary)
                                }
                                ForEach(group.lines, id: \.self) { line in
                                    Text(line)
                                        .font(AppTheme.Typography.footnote)
                                        .foregroundStyle(.secondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(accentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                }
            }
            .padding(15)
            .hSpacing(.leading)
            .background(
                Color(.secondarySystemGroupedBackground),
                in: RoundedRectangle(cornerRadius: 15)
            )
            .offset(y: -8)
        }
    }
}

// MARK: - Add diary entry (unified photo + text)

private enum WorkoutSource: String, CaseIterable {
    case preset = "Preset workouts"
    case custom = "Custom"
}

private enum PresetItem: Hashable {
    case saved(UUID)
    case preMade(UUID)
    case customSaved(UUID)

    var savedId: UUID? { if case .saved(let id) = self { return id }; return nil }
    var preMadeId: UUID? { if case .preMade(let id) = self { return id }; return nil }
    var customSavedId: UUID? { if case .customSaved(let id) = self { return id }; return nil }
}

/// Wraps a WorkoutLogBlock with a stable id for list identity and reordering.
private struct CustomBlockItem: Identifiable {
    let id: UUID
    var block: WorkoutLogBlock
}

/// Single additional workout in add-entry flow: either a preset (with optional selection) or custom blocks.
private enum AdditionalWorkoutItem: Identifiable {
    case preset(id: UUID, selection: PresetItem?)
    case custom(id: UUID, blocks: [CustomBlockItem])

    var id: UUID {
        switch self {
        case .preset(let id, _), .custom(let id, _): return id
        }
    }
}

struct AddDiaryEntryView: View {
    let client: Client
    let selectedDate: Date
    var onSave: () -> Void

    @Environment(\.brandTheme) private var brandTheme
    @State private var bodyText = ""
    @State private var entryTime: Date
    @State private var imageCaption = ""
    @State private var selectedPhotoItems: [PhotosPickerItem] = []
    @State private var selectedVideoItems: [PhotosPickerItem] = []
    @State private var loadedImageDataList: [Data] = []
    @State private var loadedVideoThumbnails: [UIImage] = []
    @State private var isLoading = false
    @State private var didWorkout = false
    @State private var workoutSource: WorkoutSource = .custom
    @State private var workoutCustomDescription = ""
    @State private var selectedPreset: PresetItem?
    @State private var customBlocks: [CustomBlockItem] = []
    @State private var customWorkoutSaveName = ""
    @State private var savedWorkoutConfirmation: String?
    @State private var savedWorkouts: [Workout] = []
    /// Additional workouts in add order: each item is either preset or custom.
    @State private var additionalWorkoutItems: [AdditionalWorkoutItem] = []
    @State private var showAddWorkoutTypeChoice = false
    @State private var workoutTemplates: [WorkoutTemplate] = []
    @State private var exercises: [Exercise] = []
    @Environment(\.dismiss) private var dismiss

    private let journalService = JournalService()
    private let workoutService = WorkoutService()
    private let homeService = HomeService()

    init(client: Client, selectedDate: Date, onSave: @escaping () -> Void) {
        self.client = client
        self.selectedDate = selectedDate
        self.onSave = onSave
        _entryTime = State(initialValue: Self.initialEntryTime(selectedDate: selectedDate))
    }

    /// Selected date’s calendar day combined with current time (hour and minute).
    private static func initialEntryTime(selectedDate: Date) -> Date {
        let cal = Calendar.current
        let now = Date()
        let startOfSelected = cal.startOfDay(for: selectedDate)
        return cal.date(
            bySettingHour: cal.component(.hour, from: now),
            minute: cal.component(.minute, from: now),
            second: 0,
            of: startOfSelected
        ) ?? startOfSelected
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 15) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title)
                        .foregroundStyle(.secondary)
                }
                .hSpacing(.leading)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Photo & video")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if !loadedImageDataList.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(Array(loadedImageDataList.enumerated()), id: \.offset) { index, data in
                                    if let uiImage = UIImage(data: data) {
                                        ZStack(alignment: .topTrailing) {
                                            Image(uiImage: uiImage)
                                                .resizable()
                                                .scaledToFill()
                                                .frame(width: 80, height: 80)
                                                .clipped()
                                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                            Button {
                                                loadedImageDataList.remove(at: index)
                                                if index < selectedPhotoItems.count {
                                                    selectedPhotoItems = selectedPhotoItems.enumerated().filter { $0.offset != index }.map(\.element)
                                                }
                                            } label: {
                                                Image(systemName: "xmark.circle.fill")
                                                    .font(.title3)
                                                    .foregroundStyle(.white)
                                                    .shadow(radius: 2)
                                            }
                                            .padding(4)
                                        }
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    PhotosPicker(selection: $selectedPhotoItems, maxSelectionCount: 5, matching: .images) {
                        HStack {
                            Image(systemName: "photo.badge.plus")
                            Text("Add or take a photo")
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                    }
                    .onChange(of: selectedPhotoItems) { _, newItems in
                        Task {
                            var dataList: [Data] = []
                            for item in newItems {
                                if let data = try? await item.loadTransferable(type: Data.self) {
                                    dataList.append(data)
                                }
                            }
                            await MainActor.run {
                                loadedImageDataList = dataList
                            }
                        }
                    }
                    if !loadedVideoThumbnails.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(Array(loadedVideoThumbnails.enumerated()), id: \.offset) { index, thumb in
                                    ZStack(alignment: .topTrailing) {
                                        Image(uiImage: thumb)
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 80, height: 80)
                                            .clipped()
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                        Image(systemName: "play.circle.fill")
                                            .font(.title3)
                                            .foregroundStyle(.white)
                                            .shadow(radius: 1)
                                        Button {
                                            if index < selectedVideoItems.count {
                                                selectedVideoItems.remove(at: index)
                                                loadedVideoThumbnails.remove(at: index)
                                            }
                                        } label: {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.caption)
                                                .foregroundStyle(.white)
                                                .shadow(radius: 1)
                                        }
                                        .padding(4)
                                    }
                                }
                            }
                        }
                    }
                    PhotosPicker(selection: $selectedVideoItems, maxSelectionCount: 5, matching: .videos) {
                        HStack {
                            Image(systemName: "video.badge.plus")
                            Text(selectedVideoItems.isEmpty ? "Add video" : "Add another video")
                        }
                        .font(.subheadline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                    }
                    .onChange(of: selectedVideoItems) { _, newItems in
                        Task { await loadVideoThumbnails(for: newItems) }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Time")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    DatePicker("", selection: $entryTime, displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(.compact)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Note")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField("How did you feel? Workout notes, mood…", text: $bodyText, axis: .vertical)
                        .lineLimit(3...6)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 15)
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                }
                if !loadedImageDataList.isEmpty {
                    TextField("Photo description (optional)", text: $imageCaption, axis: .vertical)
                        .lineLimit(2...4)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 15)
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                }

                addEntryWorkoutSection
                addEntryAdditionalWorkoutsSection

                Button {
                    Task { await save() }
                } label: {
                    Text("Add entry")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundStyle(canSave ? .black : .white)
                        .hSpacing(.center)
                        .padding(.vertical, 12)
                        .background(canSave ? brandTheme.accentColor : Color.gray, in: RoundedRectangle(cornerRadius: 10))
                }
                .disabled(!canSave || isLoading)
                .padding(.top, 8)
                }
                .padding(15)
            }
            .scrollDismissesKeyboard(.interactively)
            .task { await loadWorkoutOptions() }
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var addEntryWorkoutSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Workout")
                .font(.caption)
                .foregroundStyle(.secondary)
            Toggle("Did you do a workout?", isOn: $didWorkout)
            if didWorkout {
                Picker("Source", selection: $workoutSource) {
                    ForEach(WorkoutSource.allCases, id: \.self) { source in
                        Text(source.rawValue).tag(source)
                    }
                }
                .pickerStyle(.segmented)
                switch workoutSource {
                case .preset:
                    presetWorkoutPicker
                case .custom:
                    customWorkoutForm
                }
            }
        }
    }

    @ViewBuilder
    private var presetWorkoutPicker: some View {
        let customWorkouts = CustomWorkoutStore.list(clientId: client.id)
        if savedWorkouts.isEmpty && workoutTemplates.isEmpty && customWorkouts.isEmpty {
            Text("No preset workouts")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.vertical, 8)
        } else {
            Picker("Workout", selection: $selectedPreset) {
                Text("Select…").tag(nil as PresetItem?)
                ForEach(savedWorkouts) { w in
                    Text(w.name).tag(PresetItem.saved(w.id) as PresetItem?)
                }
                ForEach(workoutTemplates) { t in
                    Text(t.title).tag(PresetItem.preMade(t.id) as PresetItem?)
                }
                ForEach(customWorkouts) { w in
                    Text(w.name).tag(PresetItem.customSaved(w.id) as PresetItem?)
                }
            }
            .pickerStyle(.menu)
            selectedPresetWorkoutSummary
        }
    }

    @ViewBuilder
    private func additionalPresetPicker(selection: Binding<PresetItem?>) -> some View {
        additionalPresetListPicker(selection: selection)
    }

    /// List-style preset picker: one row per preset with name and optional exercise summary (no squishing).
    @ViewBuilder
    private func additionalPresetListPicker(selection: Binding<PresetItem?>) -> some View {
        let customWorkouts = CustomWorkoutStore.list(clientId: client.id)
        if savedWorkouts.isEmpty && workoutTemplates.isEmpty && customWorkouts.isEmpty {
            Text("No preset workouts")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Button {
                    selection.wrappedValue = nil
                } label: {
                    HStack {
                        Text("Select a preset…")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        if selection.wrappedValue == nil {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                ForEach(savedWorkouts) { w in
                    presetListRow(
                        title: w.name,
                        subtitle: nil,
                        isSelected: selection.wrappedValue?.savedId == w.id
                    ) {
                        selection.wrappedValue = .saved(w.id)
                    }
                }
                ForEach(workoutTemplates) { t in
                    presetListRow(
                        title: t.title,
                        subtitle: nil,
                        isSelected: selection.wrappedValue?.preMadeId == t.id
                    ) {
                        selection.wrappedValue = .preMade(t.id)
                    }
                }
                ForEach(customWorkouts) { w in
                    let blocksSummary = w.blocks.isEmpty ? nil : w.blocks.prefix(3).map { blockTitle($0) }.joined(separator: " · ")
                    presetListRow(
                        title: w.name,
                        subtitle: blocksSummary,
                        isSelected: selection.wrappedValue?.customSavedId == w.id
                    ) {
                        selection.wrappedValue = .customSaved(w.id)
                    }
                }
            }
        }
    }

    private func presetListRow(title: String, subtitle: String?, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                if let subtitle = subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var selectedPresetWorkoutSummary: some View {
        if case .customSaved(let id) = selectedPreset,
           let workout = CustomWorkoutStore.entry(id: id),
           !workout.blocks.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text(workout.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                ForEach(Array(workout.blocks.enumerated()), id: \.offset) { _, block in
                    Text(blockTitle(block))
                        .font(AppTheme.Typography.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
        }
    }

    @ViewBuilder
    private var customWorkoutForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(customBlocks.enumerated()), id: \.element.id) { index, item in
                customBlockRow(blocks: $customBlocks, index: index, item: item)
            }
            HStack(spacing: 10) {
                Button {
                    customBlocks.append(CustomBlockItem(id: UUID(), block: .strength(StrengthExerciseLog(customName: "New exercise", sets: 3, reps: "10"))))
                } label: {
                    Label("Add exercise", systemImage: "plus.circle")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
                Button {
                    customBlocks.append(CustomBlockItem(id: UUID(), block: .cardio(CardioLog(activityType: .outdoorTrack))))
                } label: {
                    Label("Add cardio", systemImage: "figure.run")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
            }
            if !customBlocks.isEmpty {
                saveCustomWorkoutSection
                Button(role: .destructive) {
                    customBlocks.removeAll()
                } label: {
                    Text("Clear all")
                        .font(.caption)
                }
            }
        }
    }

    @ViewBuilder
    private var saveCustomWorkoutSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Name (optional)", text: $customWorkoutSaveName)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
            Button {
                saveCustomWorkoutToLibrary()
            } label: {
                Label("Save workout", systemImage: "square.and.arrow.down")
                    .font(.subheadline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(customBlocks.isEmpty)
            if let msg = savedWorkoutConfirmation {
                Text(msg)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func bindingForAdditionalItem(at index: Int) -> Binding<AdditionalWorkoutItem> {
        Binding(
            get: { index < additionalWorkoutItems.count ? additionalWorkoutItems[index] : .custom(id: UUID(), blocks: []) },
            set: { newValue in
                guard index < additionalWorkoutItems.count else { return }
                var copy = additionalWorkoutItems
                copy[index] = newValue
                additionalWorkoutItems = copy
            }
        )
    }

    @ViewBuilder
    private var addEntryAdditionalWorkoutsSection: some View {
        if didWorkout {
            VStack(alignment: .leading, spacing: 12) {
                Text("Additional workouts")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                ForEach(Array(additionalWorkoutItems.enumerated()), id: \.element.id) { index, item in
                    let workoutNumber = index + 2
                    let itemId = item.id
                    switch item {
                    case .preset(let id, let selection):
                        addEntryAdditionalPresetCard(workoutNumber: workoutNumber, id: id, selection: selection, onRemove: {
                            additionalWorkoutItems.removeAll { $0.id == itemId }
                        }, onSelectionChange: { newSelection in
                            bindingForAdditionalItem(at: index).wrappedValue = .preset(id: id, selection: newSelection)
                        })
                    case .custom(let id, let blocks):
                        addEntryAdditionalCustomCard(workoutNumber: workoutNumber, id: id, blocks: blocks, onRemove: {
                            additionalWorkoutItems.removeAll { $0.id == itemId }
                        }, onBlocksChange: { newBlocks in
                            bindingForAdditionalItem(at: index).wrappedValue = .custom(id: id, blocks: newBlocks)
                        })
                    }
                }
                Button {
                    showAddWorkoutTypeChoice = true
                } label: {
                    Label("Add another workout", systemImage: "plus.circle")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
                .confirmationDialog("Add workout", isPresented: $showAddWorkoutTypeChoice, titleVisibility: .visible) {
                    Button("Preset workout") {
                        additionalWorkoutItems.append(.preset(id: UUID(), selection: nil))
                    }
                    Button("Custom workout") {
                        additionalWorkoutItems.append(.custom(id: UUID(), blocks: []))
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Choose the type of workout to add.")
                }
            }
        }
    }

    private func presetDisplayTitle(_ preset: PresetItem?) -> String {
        guard let preset else { return "Select…" }
        switch preset {
        case .saved(let id):
            return savedWorkouts.first(where: { $0.id == id })?.name ?? "Workout"
        case .preMade(let id):
            return workoutTemplates.first(where: { $0.id == id })?.title ?? "Pre-made"
        case .customSaved(let id):
            return CustomWorkoutStore.entry(id: id)?.name ?? "Custom"
        }
    }

    @ViewBuilder
    private func addEntryAdditionalPresetCard(workoutNumber: Int, id: UUID, selection: PresetItem?, onRemove: @escaping () -> Void, onSelectionChange: @escaping (PresetItem?) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Workout \(workoutNumber)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Spacer()
                Button(role: .destructive) {
                    onRemove()
                } label: {
                    Text("Remove")
                        .font(.caption)
                }
            }
            if let selection {
                Text(presetDisplayTitle(selection))
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                additionalPresetWheelPicker(selection: Binding(
                    get: { selection },
                    set: { onSelectionChange($0) }
                ))
            }
        }
        .padding(12)
        .background(Color(.tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
    }

    @ViewBuilder
    private func additionalPresetWheelPicker(selection: Binding<PresetItem?>) -> some View {
        let customWorkouts = CustomWorkoutStore.list(clientId: client.id)
        if savedWorkouts.isEmpty && workoutTemplates.isEmpty && customWorkouts.isEmpty {
            Text("No preset workouts")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Picker("Preset", selection: selection) {
                Text("Select…").tag(nil as PresetItem?)
                ForEach(savedWorkouts) { w in
                    Text(w.name).tag(PresetItem.saved(w.id) as PresetItem?)
                }
                ForEach(workoutTemplates) { t in
                    Text(t.title).tag(PresetItem.preMade(t.id) as PresetItem?)
                }
                ForEach(customWorkouts) { w in
                    Text(w.name).tag(PresetItem.customSaved(w.id) as PresetItem?)
                }
            }
            .pickerStyle(.wheel)
            .frame(height: 120)
        }
    }

    @ViewBuilder
    private func addEntryAdditionalCustomCard(workoutNumber: Int, id: UUID, blocks: [CustomBlockItem], onRemove: @escaping () -> Void, onBlocksChange: @escaping ([CustomBlockItem]) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Workout \(workoutNumber)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Spacer()
                Button(role: .destructive) {
                    onRemove()
                } label: {
                    Text("Remove")
                        .font(.caption)
                }
            }
            ForEach(Array(blocks.enumerated()), id: \.element.id) { blockIndex, item in
                customBlockRow(blocks: Binding(
                    get: { blocks },
                    set: { onBlocksChange($0) }
                ), index: blockIndex, item: item)
            }
            HStack(spacing: 10) {
                Button {
                    var newBlocks = blocks
                    newBlocks.append(CustomBlockItem(id: UUID(), block: .strength(StrengthExerciseLog(customName: "New exercise", sets: 3, reps: "10"))))
                    onBlocksChange(newBlocks)
                } label: {
                    Label("Add exercise", systemImage: "plus.circle")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                Button {
                    var newBlocks = blocks
                    newBlocks.append(CustomBlockItem(id: UUID(), block: .cardio(CardioLog(activityType: .outdoorTrack))))
                    onBlocksChange(newBlocks)
                } label: {
                    Label("Add cardio", systemImage: "figure.run")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(12)
        .background(Color(.tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
    }

    private func saveCustomWorkoutToLibrary() {
        guard !customBlocks.isEmpty else { return }
        let name = customWorkoutSaveName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? CustomWorkoutStore.nextDefaultName(clientId: client.id)
            : customWorkoutSaveName.trimmingCharacters(in: .whitespacesAndNewlines)
        let blocks = customBlocks.map(\.block)
        let workout = SavedCustomWorkout(clientId: client.id, name: name, blocks: blocks)
        CustomWorkoutStore.add(workout)
        savedWorkoutConfirmation = "Saved as \"\(name)\""
        customWorkoutSaveName = ""
    }

    @ViewBuilder
    private func customBlockRow(blocks: Binding<[CustomBlockItem]>, index: Int, item: CustomBlockItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(blockTitle(item.block))
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Spacer()
                Button(role: .destructive) {
                    blocks.wrappedValue.remove(at: index)
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.body)
                }
            }
            switch item.block {
            case .strength(let ex):
                strengthBlockFields(exercise: ex) { updated in
                    var arr = blocks.wrappedValue
                    guard index < arr.count else { return }
                    arr[index].block = .strength(updated)
                    blocks.wrappedValue = arr
                }
            case .cardio(let c):
                cardioBlockFields(cardio: c) { updated in
                    var arr = blocks.wrappedValue
                    guard index < arr.count else { return }
                    arr[index].block = .cardio(updated)
                    blocks.wrappedValue = arr
                }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
    }

    private func blockTitle(_ block: WorkoutLogBlock) -> String {
        switch block {
        case .strength(let ex):
            let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
            return "\(name) · \(ex.sets)×\(ex.reps)"
        case .cardio(let c):
            return cardioSummaryLine(c)
        }
    }

    /// One line for cardio: when no title use activity type; when titled show name, duration (with unit), and distance if set.
    private func cardioSummaryLine(_ c: CardioLog) -> String {
        let title = (c.title?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? c.activityType?.defaultTitle
        var parts: [String] = []
        parts.append(title ?? "Cardio")
        if let d = c.durationValue, d > 0 {
            let u = c.durationUnit ?? .minutes
            parts.append("\(String(format: "%.0f", d)) \(u.rawValue)")
        }
        if let d = c.distanceValue, d > 0 {
            let u = c.distanceUnit ?? .miles
            parts.append("\(String(format: "%.1f", d)) \(u.rawValue)")
        }
        return parts.joined(separator: " · ")
    }

    @ViewBuilder
    private func strengthBlockFields(exercise: StrengthExerciseLog, onUpdate: @escaping (StrengthExerciseLog) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("Exercise name", text: Binding(
                get: { exercise.customName ?? "" },
                set: { onUpdate(StrengthExerciseLog(id: exercise.id, exerciseId: exercise.exerciseId, customName: $0.isEmpty ? nil : $0, sets: exercise.sets, reps: exercise.reps)) }
            ))
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
            HStack(spacing: 10) {
                HStack(spacing: 4) {
                    Text("Sets")
                        .fixedSize()
                    Text("\(exercise.sets)")
                        .frame(minWidth: 20)
                    Stepper("", value: Binding(
                        get: { exercise.sets },
                        set: { onUpdate(StrengthExerciseLog(id: exercise.id, exerciseId: exercise.exerciseId, customName: exercise.customName, sets: $0, reps: exercise.reps)) }
                    ), in: 1...20)
                    .labelsHidden()
                }
                Text("Reps")
                    .fixedSize()
                TextField("Reps", text: Binding(
                    get: { exercise.reps },
                    set: { onUpdate(StrengthExerciseLog(id: exercise.id, exerciseId: exercise.exerciseId, customName: exercise.customName, sets: exercise.sets, reps: $0)) }
                ))
                .keyboardType(.numberPad)
                .frame(width: 50)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder
    private func cardioBlockFields(cardio: CardioLog, onUpdate: @escaping (CardioLog) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            TextField("Title (optional)", text: Binding(
                get: { cardio.title ?? "" },
                set: { onUpdate(CardioLog(title: $0.isEmpty ? nil : $0, durationValue: cardio.durationValue, durationUnit: cardio.durationUnit, distanceValue: cardio.distanceValue, distanceUnit: cardio.distanceUnit, activityType: cardio.activityType, route: cardio.route)) }
            ))
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
            HStack(spacing: 10) {
                TextField("Duration", text: Binding(
                    get: {
                        guard let d = cardio.durationValue, d > 0 else { return "" }
                        return d == floor(d) ? "\(Int(d))" : "\(d)"
                    },
                    set: {
                        let parsed = Double($0.replacingOccurrences(of: ",", with: "."))
                        let value = ($0.isEmpty || parsed == nil) ? nil : parsed
                        onUpdate(CardioLog(title: cardio.title, durationValue: value, durationUnit: cardio.durationUnit, distanceValue: cardio.distanceValue, distanceUnit: cardio.distanceUnit, activityType: cardio.activityType, route: cardio.route))
                    }
                ))
                .keyboardType(.decimalPad)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
                Picker("Unit", selection: Binding(
                    get: { cardio.durationUnit ?? .minutes },
                    set: { onUpdate(CardioLog(title: cardio.title, durationValue: cardio.durationValue, durationUnit: $0, distanceValue: cardio.distanceValue, distanceUnit: cardio.distanceUnit, activityType: cardio.activityType, route: cardio.route)) }
                )) {
                    ForEach(DurationUnit.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.menu)
            }
            HStack(spacing: 10) {
                TextField("Distance", text: Binding(
                    get: {
                        guard let d = cardio.distanceValue, d > 0 else { return "" }
                        return d == floor(d) ? "\(Int(d))" : String(format: "%.1f", d)
                    },
                    set: {
                        let parsed = Double($0.replacingOccurrences(of: ",", with: "."))
                        let value = ($0.isEmpty || parsed == nil) ? nil : parsed
                        onUpdate(CardioLog(title: cardio.title, durationValue: cardio.durationValue, durationUnit: cardio.durationUnit, distanceValue: value, distanceUnit: cardio.distanceUnit, activityType: cardio.activityType, route: cardio.route))
                    }
                ))
                .keyboardType(.decimalPad)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
                Picker("Unit", selection: Binding(
                    get: { cardio.distanceUnit ?? .miles },
                    set: { onUpdate(CardioLog(title: cardio.title, durationValue: cardio.durationValue, durationUnit: cardio.durationUnit, distanceValue: cardio.distanceValue, distanceUnit: $0, activityType: cardio.activityType, route: cardio.route)) }
                )) {
                    ForEach(DistanceUnit.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.menu)
            }
            Picker("Activity", selection: Binding(
                get: { cardio.activityType ?? .outdoorTrack },
                set: { onUpdate(CardioLog(title: cardio.title, durationValue: cardio.durationValue, durationUnit: cardio.durationUnit, distanceValue: cardio.distanceValue, distanceUnit: cardio.distanceUnit, activityType: $0, route: cardio.route)) }
            )) {
                Text("Indoor – Track circuit").tag(CardioActivityType.indoorCircuit)
                Text("Indoor – Treadmill").tag(CardioActivityType.indoorTreadmill)
                Text("Outdoor – Track").tag(CardioActivityType.outdoorTrack)
                Text("Outdoor – Point A → B").tag(CardioActivityType.outdoorPointAToB)
                Text("Outdoor – Circuit").tag(CardioActivityType.outdoorCircuit)
            }
            .pickerStyle(.menu)
            if let activity = cardio.activityType, activity == .outdoorCircuit || activity == .outdoorPointAToB || activity == .indoorCircuit {
                Text("Route (map coming soon)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func exerciseDisplayName(_ ex: StrengthExerciseLog) -> String {
        if let name = ex.customName, !name.isEmpty { return name }
        if let id = ex.exerciseId, let e = exercises.first(where: { $0.id == id }) { return e.name }
        return "Exercise"
    }

    private func loadWorkoutOptions() async {
        guard AppConfig.skipAuthAndShowHome else { return }
        do {
            async let workouts = workoutService.fetchWorkouts(clientId: client.id)
            async let exs = homeService.fetchExercises(trainerId: client.trainerId)
            savedWorkouts = try await workouts
            exercises = try await exs
            workoutTemplates = MockData.workoutTemplates
        } catch {}
    }

    private func entryPresetRef(from preset: PresetItem?) -> EntryPresetRef? {
        guard let preset else { return nil }
        switch preset {
        case .saved(let id):
            let title = savedWorkouts.first(where: { $0.id == id })?.name ?? "Workout"
            return EntryPresetRef(id: id, displayTitle: title)
        case .preMade(let id):
            let title = workoutTemplates.first(where: { $0.id == id })?.title ?? "Pre-made"
            return EntryPresetRef(id: id, displayTitle: title)
        case .customSaved(let id):
            let title = CustomWorkoutStore.entry(id: id)?.name ?? "Custom"
            return EntryPresetRef(id: id, displayTitle: title)
        }
    }

    private func buildWorkoutPayload() -> (workoutId: UUID?, workoutCustomDescription: String?, workoutLog: WorkoutLog?, additionalWorkoutLogs: [WorkoutLog]?, additionalWorkoutPresets: [EntryPresetRef]?) {
        guard didWorkout else { return (nil, nil, nil, nil, nil) }
        let additionalLogs: [WorkoutLog] = additionalWorkoutItems.compactMap { item in
            guard case .custom(_, let blocks) = item, !blocks.isEmpty else { return nil }
            return WorkoutLog(
                type: .weightTraining,
                cardio: nil,
                exercises: nil,
                rounds: nil,
                workoutId: nil,
                workoutCustomDescription: nil,
                blocks: blocks.map(\.block)
            )
        }
        let additionalPresets: [EntryPresetRef] = additionalWorkoutItems.compactMap { item in
            guard case .preset(_, let selection) = item else { return nil }
            return entryPresetRef(from: selection)
        }
        let logsOptional = additionalLogs.isEmpty ? nil : additionalLogs
        let presetsOptional = additionalPresets.isEmpty ? nil : additionalPresets
        switch workoutSource {
        case .preset:
            guard let preset = selectedPreset else { return (nil, nil, nil, logsOptional, presetsOptional) }
            switch preset {
            case .saved(let id):
                return (id, nil, nil, logsOptional, presetsOptional)
            case .preMade(let id):
                let desc: String? = workoutTemplates.first(where: { $0.id == id }).map { t in "Pre-made: \(t.title)" }
                return (nil, desc, nil, logsOptional, presetsOptional)
            case .customSaved(let id):
                return (id, nil, nil, logsOptional, presetsOptional)
            }
        case .custom:
            if customBlocks.isEmpty {
                return (nil, nil, nil, logsOptional, presetsOptional)
            }
            let blocks = customBlocks.map(\.block)
            let log = WorkoutLog(
                type: .weightTraining,
                cardio: nil,
                exercises: nil,
                rounds: nil,
                workoutId: nil,
                workoutCustomDescription: nil,
                blocks: blocks
            )
            return (nil, nil, log, logsOptional, presetsOptional)
        }
    }

    private var canSave: Bool {
        let hasMedia = !loadedImageDataList.isEmpty || !selectedVideoItems.isEmpty
        let hasNote = !bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasWorkout = didWorkout && (
            selectedPreset != nil ||
            !customBlocks.isEmpty
        )
        return hasMedia || hasNote || hasWorkout
    }

    private func loadVideoThumbnails(for items: [PhotosPickerItem]) async {
        var thumbs: [UIImage] = []
        for item in items {
            guard let movie = try? await item.loadTransferable(type: Movie.self) else { continue }
            if let image = await VideoThumbnailGenerator.thumbnail(from: movie.url) {
                thumbs.append(image)
            }
        }
        await MainActor.run {
            loadedVideoThumbnails = thumbs
        }
    }

    private func save() async {
        isLoading = true
        defer { isLoading = false }
        let cal = Calendar.current
        let dateForEntry = cal.isDate(selectedDate, inSameDayAs: entryTime) ? selectedDate : entryTime
        let trimmedBody = bodyText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedCaption = imageCaption.trimmingCharacters(in: .whitespacesAndNewlines)
        var mediaItems: [DiaryMediaItem] = []
        var mediaThumbnailData: [UUID: Data] = [:]
        let now = entryTime
        for (index, imageData) in loadedImageDataList.enumerated() {
            let caption = (index == 0 && !trimmedCaption.isEmpty) ? trimmedCaption : nil
            let item = DiaryMediaItem(id: UUID(), kind: .image, storagePath: "saved_photo_\(index)", caption: caption, createdAt: now)
            mediaItems.append(item)
            mediaThumbnailData[item.id] = imageData
        }
        for (index, _) in selectedVideoItems.enumerated() {
            let videoItem = DiaryMediaItem(id: UUID(), kind: .video, storagePath: "saved_video_\(index)", caption: nil, createdAt: now)
            mediaItems.append(videoItem)
            if index < loadedVideoThumbnails.count, let data = loadedVideoThumbnails[index].jpegData(compressionQuality: 0.85) {
                mediaThumbnailData[videoItem.id] = data
            }
            if let movie = try? await selectedVideoItems[index].loadTransferable(type: Movie.self) {
                let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
                    .appendingPathComponent("JournalVideos", isDirectory: true)
                try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
                let dest = cacheDir.appendingPathComponent("\(videoItem.id.uuidString).mov")
                try? FileManager.default.removeItem(at: dest)
                try? FileManager.default.copyItem(at: movie.url, to: dest)
                JournalMediaCache.storeVideoURL(dest, for: videoItem.id)
            }
        }
        let (workoutId, workoutCustom, workoutLog, additionalWorkoutLogs, additionalWorkoutPresets) = buildWorkoutPayload()
        let workoutDisplayTitle: String? = {
            guard workoutSource == .preset, let preset = selectedPreset else { return nil }
            switch preset {
            case .saved(let id):
                return savedWorkouts.first(where: { $0.id == id })?.name
            case .customSaved(let id):
                return CustomWorkoutStore.entry(id: id)?.name
            case .preMade:
                return nil
            }
        }()
        do {
            try await journalService.addDiaryEntry(
                clientId: client.id,
                date: dateForEntry,
                createdAt: entryTime,
                bodyText: trimmedBody.isEmpty ? nil : trimmedBody,
                imagePath: !loadedImageDataList.isEmpty ? "saved_photo_0" : nil,
                imageCaption: trimmedCaption.isEmpty ? nil : trimmedCaption,
                mediaItems: mediaItems,
                mediaThumbnailData: mediaThumbnailData.isEmpty ? nil : mediaThumbnailData,
                workoutId: workoutId,
                workoutDisplayTitle: workoutDisplayTitle,
                workoutCustomDescription: workoutCustom,
                workoutLog: workoutLog,
                additionalWorkoutLogs: additionalWorkoutLogs,
                additionalWorkoutPresets: additionalWorkoutPresets
            )
            dismiss()
            onSave()
        } catch {}
    }
}

// MARK: - Legacy journal entry (kept for non-diary flow if needed)

struct JournalEntryView: View {
    let client: Client
    let date: Date
    var onSave: () -> Void

    @State private var moodText = ""
    @State private var workoutNotes = ""
    @State private var foodNotes = ""
    @State private var isLoading = false
    @Environment(\.dismiss) private var dismiss

    private let journalService = JournalService()

    var body: some View {
        NavigationStack {
            Form {
                Section("How are you feeling?") {
                    TextField("Mood", text: $moodText, axis: .vertical)
                        .lineLimit(3...6)
                }
                Section("Workout") {
                    TextField("Difficulty, notes", text: $workoutNotes, axis: .vertical)
                        .lineLimit(2...4)
                }
                Section("Food") {
                    TextField("What you ate", text: $foodNotes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Journal entry")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(isLoading)
                }
            }
        }
    }

    private func save() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await journalService.upsertEntry(
                clientId: client.id,
                date: date,
                moodText: moodText.isEmpty ? nil : moodText,
                workoutDifficultyNotes: workoutNotes.isEmpty ? nil : workoutNotes,
                foodNotes: foodNotes.isEmpty ? nil : foodNotes
            )
            dismiss()
            onSave()
        } catch {}
    }
}

