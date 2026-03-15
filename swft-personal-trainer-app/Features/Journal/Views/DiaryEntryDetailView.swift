//
//  DiaryEntryDetailView.swift
//  swft-personal-trainer-app
//

import PhotosUI
import SwiftUI
import UIKit

struct DiaryEntryDetailView: View {
    let entry: DiaryEntry
    let client: Client
    var onUpdate: () -> Void

    @Environment(\.brandTheme) private var brandTheme
    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false
    @State private var showVideoPlayer = false
    @State private var playingVideoURL: URL?

    private let journalService = JournalService()

    private var enteredAtString: String {
        entry.createdAt.formatted(date: .abbreviated, time: .shortened)
    }

    private var lastEditedString: String? {
        guard let updated = entry.updatedAt else { return nil }
        guard updated != entry.createdAt else { return nil }
        return updated.formatted(date: .abbreviated, time: .shortened)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    timestampsSection
                    if let body = entry.bodyText, !body.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Note")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)
                            Text(body)
                                .font(AppTheme.Typography.body)
                                .foregroundStyle(.primary)
                        }
                    }
                    if !entry.mediaItems.isEmpty || entry.imagePath != nil || (entry.imageCaption != nil && !(entry.imageCaption?.isEmpty ?? true)) {
                        mediaSection
                    }
                    if entry.workoutId != nil || entry.workoutLog != nil || (entry.workoutCustomDescription != nil && !(entry.workoutCustomDescription?.isEmpty ?? true)) {
                        workoutSection
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(entry.createdAt.journalFormat("h:mm a"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button {
                            isEditing = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        Button(role: .destructive) {
                            Task { await deleteEntry() }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $isEditing) {
                EditDiaryEntrySheet(entry: entry, client: client) {
                    isEditing = false
                    onUpdate()
                }
            }
            .sheet(isPresented: $showVideoPlayer) {
                if let url = playingVideoURL {
                    VideoPlayerView(url: url) {
                        showVideoPlayer = false
                        playingVideoURL = nil
                    }
                }
            }
        }
        .id(entry.id)
    }

    private var timestampsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Entered \(enteredAtString)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let edited = lastEditedString {
                HStack(spacing: 6) {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Last edited \(edited)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
    }

    private var mediaSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Media")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            if !entry.mediaItems.isEmpty {
                ForEach(entry.mediaItems) { item in
                    mediaItemThumbnail(item) {
                        if let url = JournalMediaCache.videoURL(for: item.id) {
                            playingVideoURL = url
                            showVideoPlayer = true
                        }
                    }
                    if let cap = item.caption, !cap.isEmpty {
                        Text(cap)
                            .font(AppTheme.Typography.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                RoundedRectangle(cornerRadius: AppTheme.Radius.sm)
                    .fill(Color(.tertiarySystemFill))
                    .frame(height: 200)
                    .overlay(Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary))
                if let cap = entry.imageCaption, !cap.isEmpty {
                    Text(cap)
                        .font(AppTheme.Typography.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private func mediaItemThumbnail(_ item: DiaryMediaItem, onVideoTap: @escaping () -> Void = {}) -> some View {
        let cachedData = JournalMediaCache.thumbnailData(for: item.id)
        let thumbHeight: CGFloat = 160
        ZStack(alignment: .center) {
            if let data = cachedData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: thumbHeight)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                if item.kind == .video {
                    Image(systemName: "play.circle.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.white)
                        .shadow(radius: 2)
                }
            } else {
                RoundedRectangle(cornerRadius: AppTheme.Radius.sm)
                    .fill(Color(.tertiarySystemFill))
                    .frame(height: thumbHeight)
                    .overlay(
                        Image(systemName: item.kind == .video ? "video.fill" : "photo")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                    )
            }
        }
        .contentShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
        .onTapGesture {
            if item.kind == .video {
                onVideoTap()
            }
        }
    }

    @ViewBuilder
    private var workoutSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Workout")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                if let log = entry.workoutLog {
                    workoutLogContent(log)
                } else if let custom = entry.workoutCustomDescription, !custom.isEmpty {
                    Text(custom)
                        .font(AppTheme.Typography.body)
                        .foregroundStyle(.primary)
                } else if entry.workoutId != nil {
                    Text(entry.workoutDisplayTitle ?? "Logged from your plan")
                        .font(AppTheme.Typography.subheadline)
                        .foregroundStyle(.primary)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
            if let additional = entry.additionalWorkoutLogs, !additional.isEmpty {
                ForEach(Array(additional.enumerated()), id: \.offset) { index, log in
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Workout \(index + 2)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                        workoutLogContent(log)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                }
            }
        }
    }

    @ViewBuilder
    private func workoutLogContent(_ log: WorkoutLog) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let blocks = log.blocks, !blocks.isEmpty {
                ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                    switch block {
                    case .strength(let ex):
                        Text("• \(ex.customName ?? "Exercise") — \(ex.sets) × \(ex.reps)")
                            .font(AppTheme.Typography.subheadline)
                    case .cardio(let c):
                        cardioBlockDetail(c)
                    }
                }
            } else {
                Text(typeLabel(log.type))
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let cardio = log.cardio {
                    cardioBlockDetail(cardio)
                }
                if let exs = log.exercises, !exs.isEmpty {
                    if let r = log.rounds, r > 1 {
                        Text("\(r) rounds")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    ForEach(exs) { ex in
                        Text("• \(ex.customName ?? "Exercise") — \(ex.sets) × \(ex.reps)")
                            .font(AppTheme.Typography.subheadline)
                    }
                }
                if let custom = log.workoutCustomDescription, !custom.isEmpty {
                    Text(custom)
                        .font(AppTheme.Typography.body)
                        .foregroundStyle(.primary)
                }
            }
        }
    }

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
    private func cardioBlockDetail(_ c: CardioLog) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(cardioSummaryLine(c))
                .font(.subheadline)
                .fontWeight(.medium)
            if let activity = c.activityType {
                Text(cardioActivityLabel(activity))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let d = c.durationValue, d > 0, let u = c.durationUnit {
                Text("Duration: \(String(format: "%.0f", d)) \(u.rawValue)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let d = c.distanceValue, d > 0 {
                let unit = c.distanceUnit ?? .miles
                Text("Distance: \(String(format: "%.1f", d)) \(unit.rawValue)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let route = c.route {
                Text(route.isCircuit ? "Circuit" : "Point A → B")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func cardioActivityLabel(_ activity: CardioActivityType) -> String {
        activity.defaultTitle
    }

    private func typeLabel(_ type: WorkoutLogType) -> String {
        switch type {
        case .home: return "Home"
        case .cardio: return "Cardio"
        case .weightTraining: return "Weight training"
        }
    }

    private func deleteEntry() async {
        do {
            try await journalService.deleteDiaryEntry(id: entry.id)
            dismiss()
            onUpdate()
        } catch {}
    }
}

// MARK: - Edit diary entry sheet

private enum EditWorkoutSource: String, CaseIterable {
    case preset = "Preset workouts"
    case custom = "Custom"
}

private enum EditPresetItem: Hashable {
    case saved(UUID)
    case preMade(UUID)
    case customSaved(UUID)
}

private struct EditCustomBlockItem: Identifiable {
    let id: UUID
    var block: WorkoutLogBlock
}

/// Wraps an additional preset with a stable id so Remove uses id, not index (avoids index-out-of-range when SwiftUI updates).
private struct EditAdditionalPresetRow: Identifiable {
    let id: UUID
    var ref: EntryPresetRef
    init(id: UUID = UUID(), ref: EntryPresetRef) {
        self.id = id
        self.ref = ref
    }
}

private struct EditDiaryEntrySheet: View {
    let entry: DiaryEntry
    let client: Client
    var onSave: () -> Void

    @Environment(\.brandTheme) private var brandTheme
    @Environment(\.dismiss) private var dismiss
    @State private var bodyText: String
    @State private var imageCaption: String
    @State private var isLoading = false
    @State private var removedMediaIds: Set<UUID> = []
    @State private var selectedPhotoItems: [PhotosPickerItem] = []
    @State private var selectedVideoItem: PhotosPickerItem?
    @State private var loadedImageDataList: [Data] = []
    @State private var loadedVideoThumbnail: UIImage?
    @State private var didWorkout = false
    @State private var editWorkoutSource: EditWorkoutSource = .custom
    @State private var selectedEditPreset: EditPresetItem?
    @State private var editCustomBlocks: [EditCustomBlockItem] = []
    @State private var editAdditionalBlocksList: [[EditCustomBlockItem]] = []
    @State private var editAdditionalPresetRows: [EditAdditionalPresetRow] = []
    @State private var showAddAdditionalWorkoutChoice = false
    @State private var showAddAdditionalPresetSheet = false
    @State private var savedWorkouts: [Workout] = []
    @State private var workoutTemplates: [WorkoutTemplate] = []
    @State private var workoutStateInitialized = false

    private let journalService = JournalService()
    private let workoutService = WorkoutService()

    init(entry: DiaryEntry, client: Client, onSave: @escaping () -> Void) {
        self.entry = entry
        self.client = client
        self.onSave = onSave
        _bodyText = State(initialValue: entry.bodyText ?? "")
        _imageCaption = State(initialValue: entry.imageCaption ?? "")
        _didWorkout = State(initialValue: entry.workoutId != nil || entry.workoutLog != nil || (entry.workoutCustomDescription != nil && !(entry.workoutCustomDescription?.isEmpty ?? true)) || !(entry.additionalWorkoutLogs ?? []).isEmpty)
    }

    private var keptMediaItems: [DiaryMediaItem] {
        entry.mediaItems.filter { !removedMediaIds.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Note") {
                    TextField("How did you feel? Workout notes, mood…", text: $bodyText, axis: .vertical)
                        .lineLimit(3...6)
                }
                Section("Media") {
                    ForEach(keptMediaItems) { item in
                        editSheetMediaRow(item)
                    }
                    PhotosPicker(selection: $selectedPhotoItems, maxSelectionCount: 5, matching: .images) {
                        Label("Add or take a photo", systemImage: "photo")
                    }
                    .onChange(of: selectedPhotoItems) { _, new in
                        Task { await loadSelectedPhotos(new) }
                    }
                    PhotosPicker(selection: $selectedVideoItem, matching: .videos) {
                        Label("Add video", systemImage: "video")
                    }
                    .onChange(of: selectedVideoItem) { _, new in
                        Task { await loadSelectedVideo(new) }
                    }
                    if !loadedImageDataList.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Array(loadedImageDataList.enumerated()), id: \.offset) { index, data in
                                    if let uiImage = UIImage(data: data) {
                                        ZStack(alignment: .topTrailing) {
                                            Image(uiImage: uiImage)
                                                .resizable()
                                                .scaledToFill()
                                                .frame(width: 70, height: 70)
                                                .clipped()
                                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                            Button {
                                                loadedImageDataList.remove(at: index)
                                                if index < selectedPhotoItems.count {
                                                    selectedPhotoItems = selectedPhotoItems.enumerated().filter { $0.offset != index }.map(\.element)
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
                    }
                    if loadedVideoThumbnail != nil {
                        ZStack(alignment: .topTrailing) {
                            if let thumb = loadedVideoThumbnail {
                                Image(uiImage: thumb)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(height: 100)
                                    .clipped()
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            Button {
                                selectedVideoItem = nil
                                loadedVideoThumbnail = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.body)
                                    .foregroundStyle(.white)
                                    .shadow(radius: 1)
                            }
                            .padding(8)
                        }
                    }
                }
                Section("Photo caption") {
                    TextField("Description", text: $imageCaption, axis: .vertical)
                        .lineLimit(2...4)
                }
                Section("Workout") {
                    Toggle("Did you do a workout?", isOn: $didWorkout)
                    if didWorkout {
                        Picker("Source", selection: $editWorkoutSource) {
                            ForEach(EditWorkoutSource.allCases, id: \.self) { source in
                                Text(source.rawValue).tag(source)
                            }
                        }
                        .pickerStyle(.segmented)
                        switch editWorkoutSource {
                        case .preset:
                            editPresetPicker
                            editSelectedPresetWorkoutSummary
                        case .custom:
                            editCustomWorkoutForm
                        }
                        editAdditionalWorkoutsSection
                    }
                }
            }
            .navigationTitle("Edit entry")
            .task { await loadWorkoutOptionsAndInitializeFromEntry() }
            .navigationBarTitleDisplayMode(.inline)
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

    @ViewBuilder
    private func editSheetMediaRow(_ item: DiaryMediaItem) -> some View {
        let data = JournalMediaCache.thumbnailData(for: item.id)
        HStack(spacing: 12) {
            ZStack(alignment: .center) {
                if let d = data, let uiImage = UIImage(data: d) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 50, height: 50)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    if item.kind == .video {
                        Image(systemName: "play.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.white)
                    }
                } else {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(.tertiarySystemFill))
                        .frame(width: 50, height: 50)
                        .overlay(Image(systemName: item.kind == .video ? "video.fill" : "photo").font(.caption).foregroundStyle(.secondary))
                }
            }
            Text(item.kind == .video ? "Video" : "Photo")
                .font(.subheadline)
            Spacer()
            Button(role: .destructive) {
                removedMediaIds.insert(item.id)
            } label: {
                Image(systemName: "trash")
            }
        }
        .padding(.vertical, 4)
    }

    private func loadSelectedPhotos(_ items: [PhotosPickerItem]) async {
        var result: [Data] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self) {
                result.append(data)
            }
        }
        await MainActor.run {
            loadedImageDataList = result
        }
    }

    private func loadSelectedVideo(_ item: PhotosPickerItem?) async {
        guard let item else {
            await MainActor.run { loadedVideoThumbnail = nil }
            return
        }
        guard let movie = try? await item.loadTransferable(type: Movie.self) else {
            await MainActor.run { loadedVideoThumbnail = nil }
            return
        }
        let image = await VideoThumbnailGenerator.thumbnail(from: movie.url)
        await MainActor.run {
            loadedVideoThumbnail = image
        }
    }

    private func loadWorkoutOptionsAndInitializeFromEntry() async {
        guard AppConfig.skipAuthAndShowHome else { return }
        do {
            savedWorkouts = try await workoutService.fetchWorkouts(clientId: client.id)
            workoutTemplates = MockData.workoutTemplates
        } catch {}
        guard !workoutStateInitialized else { return }
        await MainActor.run {
            workoutStateInitialized = true
            if let log = entry.workoutLog, let blocks = log.blocks, !blocks.isEmpty {
                editWorkoutSource = .custom
                editCustomBlocks = blocks.map { EditCustomBlockItem(id: UUID(), block: $0) }
                selectedEditPreset = nil
            } else if let wid = entry.workoutId {
                if CustomWorkoutStore.entry(id: wid) != nil {
                    selectedEditPreset = .customSaved(wid)
                    editWorkoutSource = .preset
                } else {
                    selectedEditPreset = .saved(wid)
                    editWorkoutSource = .preset
                }
                editCustomBlocks = []
            } else if let desc = entry.workoutCustomDescription, !desc.isEmpty,
                      let templateId = workoutTemplates.first(where: { "Pre-made: \($0.title)" == desc })?.id {
                selectedEditPreset = .preMade(templateId)
                editWorkoutSource = .preset
                editCustomBlocks = []
            } else {
                selectedEditPreset = nil
                editCustomBlocks = []
            }
            editAdditionalBlocksList = (entry.additionalWorkoutLogs ?? []).map { log in
                (log.blocks ?? []).map { EditCustomBlockItem(id: UUID(), block: $0) }
            }
            editAdditionalPresetRows = (entry.additionalWorkoutPresets ?? []).map { EditAdditionalPresetRow(ref: $0) }
        }
    }

    @ViewBuilder
    private var editSelectedPresetWorkoutSummary: some View {
        if case .customSaved(let id) = selectedEditPreset,
           let workout = CustomWorkoutStore.entry(id: id),
           !workout.blocks.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text(workout.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                ForEach(Array(workout.blocks.enumerated()), id: \.offset) { _, block in
                    Text(editBlockTitle(block))
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
    private var editPresetPicker: some View {
        let customWorkouts = CustomWorkoutStore.list(clientId: client.id)
        if savedWorkouts.isEmpty && workoutTemplates.isEmpty && customWorkouts.isEmpty {
            Text("No preset workouts")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.vertical, 8)
        } else {
            Picker("Workout", selection: $selectedEditPreset) {
                Text("Select…").tag(nil as EditPresetItem?)
                ForEach(savedWorkouts) { w in
                    Text(w.name).tag(EditPresetItem.saved(w.id) as EditPresetItem?)
                }
                ForEach(workoutTemplates) { t in
                    Text(t.title).tag(EditPresetItem.preMade(t.id) as EditPresetItem?)
                }
                ForEach(customWorkouts) { w in
                    Text(w.name).tag(EditPresetItem.customSaved(w.id) as EditPresetItem?)
                }
            }
            .pickerStyle(.menu)
        }
    }

    @ViewBuilder
    private var editCustomWorkoutForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(editCustomBlocks.enumerated()), id: \.element.id) { index, item in
                editCustomBlockRow(blocks: $editCustomBlocks, index: index, item: item)
            }
            HStack(spacing: 10) {
                Button {
                    editCustomBlocks.append(EditCustomBlockItem(id: UUID(), block: .strength(StrengthExerciseLog(customName: "New exercise", sets: 3, reps: "10"))))
                } label: {
                    Label("Add exercise", systemImage: "plus.circle")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
                Button {
                    editCustomBlocks.append(EditCustomBlockItem(id: UUID(), block: .cardio(CardioLog(activityType: .outdoorTrack))))
                } label: {
                    Label("Add cardio", systemImage: "figure.run")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
            }
            if !editCustomBlocks.isEmpty {
                Button(role: .destructive) {
                    editCustomBlocks.removeAll()
                } label: {
                    Text("Clear all")
                        .font(.caption)
                }
            }
        }
    }

    @ViewBuilder
    private func editCustomBlockRow(blocks: Binding<[EditCustomBlockItem]>, index: Int, item: EditCustomBlockItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(editBlockTitle(item.block))
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
                editStrengthBlockFields(exercise: ex) { updated in
                    var arr = blocks.wrappedValue
                    guard index < arr.count else { return }
                    arr[index].block = .strength(updated)
                    blocks.wrappedValue = arr
                }
            case .cardio(let c):
                editCardioBlockFields(cardio: c) { updated in
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

    private func editBindingForAdditional(at index: Int) -> Binding<[EditCustomBlockItem]> {
        Binding(
            get: { index < editAdditionalBlocksList.count ? editAdditionalBlocksList[index] : [] },
            set: { newValue in
                var copy = editAdditionalBlocksList
                while copy.count <= index { copy.append([]) }
                copy[index] = newValue
                editAdditionalBlocksList = copy
            }
        )
    }

    private func editBlockTitle(_ block: WorkoutLogBlock) -> String {
        switch block {
        case .strength(let ex):
            let name = (ex.customName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? "Exercise"
            return "\(name) · \(ex.sets)×\(ex.reps)"
        case .cardio(let c):
            return editCardioSummaryLine(c)
        }
    }

    private func editCardioSummaryLine(_ c: CardioLog) -> String {
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
    private func editStrengthBlockFields(exercise: StrengthExerciseLog, onUpdate: @escaping (StrengthExerciseLog) -> Void) -> some View {
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
    private func editCardioBlockFields(cardio: CardioLog, onUpdate: @escaping (CardioLog) -> Void) -> some View {
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
        }
    }

    @ViewBuilder
    private var editAdditionalWorkoutsSection: some View {
        if didWorkout {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Additional workouts")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button {
                        showAddAdditionalWorkoutChoice = true
                    } label: {
                        Label("Add another workout", systemImage: "plus.circle")
                            .font(.subheadline)
                    }
                    .buttonStyle(.bordered)
                }
                .confirmationDialog("Add workout", isPresented: $showAddAdditionalWorkoutChoice, titleVisibility: .visible) {
                    Button("Preset workout") {
                        showAddAdditionalPresetSheet = true
                    }
                    Button("Custom workout") {
                        editAdditionalBlocksList.append([])
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Choose the type of workout to add.")
                }
                ForEach(Array(editAdditionalPresetRows.enumerated()), id: \.element.id) { presetIndex, row in
                    let workoutNumber = presetIndex + 2
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Workout \(workoutNumber)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button(role: .destructive) {
                                editAdditionalPresetRows.removeAll { $0.id == row.id }
                            } label: {
                                Text("Remove")
                                    .font(.caption)
                            }
                        }
                        Text(row.ref.displayTitle)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }
                    .padding(12)
                    .background(Color(.tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                }
                ForEach(Array(editAdditionalBlocksList.indices), id: \.self) { segmentIndex in
                    let workoutNumber = editAdditionalPresetRows.count + segmentIndex + 2
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Workout \(workoutNumber)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button(role: .destructive) {
                                editAdditionalBlocksList.remove(at: segmentIndex)
                            } label: {
                                Text("Remove")
                                    .font(.caption)
                            }
                        }
                        ForEach(Array(editBindingForAdditional(at: segmentIndex).wrappedValue.enumerated()), id: \.element.id) { blockIndex, item in
                            editCustomBlockRow(blocks: editBindingForAdditional(at: segmentIndex), index: blockIndex, item: item)
                        }
                        HStack(spacing: 10) {
                            Button {
                                var copy = editAdditionalBlocksList
                                while copy.count <= segmentIndex { copy.append([]) }
                                copy[segmentIndex].append(EditCustomBlockItem(id: UUID(), block: .strength(StrengthExerciseLog(customName: "New exercise", sets: 3, reps: "10"))))
                                editAdditionalBlocksList = copy
                            } label: {
                                Label("Add exercise", systemImage: "plus.circle")
                                    .font(.caption)
                            }
                            .buttonStyle(.bordered)
                            Button {
                                var copy = editAdditionalBlocksList
                                while copy.count <= segmentIndex { copy.append([]) }
                                copy[segmentIndex].append(EditCustomBlockItem(id: UUID(), block: .cardio(CardioLog(activityType: .outdoorTrack))))
                                editAdditionalBlocksList = copy
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
            }
            .sheet(isPresented: $showAddAdditionalPresetSheet) {
                editAdditionalPresetPickerSheet(onSelect: { presetRef in
                    editAdditionalPresetRows.append(EditAdditionalPresetRow(ref: presetRef))
                    showAddAdditionalPresetSheet = false
                }, onCancel: {
                    showAddAdditionalPresetSheet = false
                })
            }
        }
    }

    @ViewBuilder
    private func editAdditionalPresetPickerSheet(onSelect: @escaping (EntryPresetRef) -> Void, onCancel: @escaping () -> Void) -> some View {
        let customWorkouts = CustomWorkoutStore.list(clientId: client.id)
        NavigationStack {
            List {
                ForEach(savedWorkouts) { w in
                    Button {
                        onSelect(EntryPresetRef(id: w.id, displayTitle: w.name))
                    } label: {
                        Text(w.name)
                            .foregroundStyle(.primary)
                    }
                }
                ForEach(workoutTemplates) { t in
                    Button {
                        onSelect(EntryPresetRef(id: t.id, displayTitle: t.title))
                    } label: {
                        Text(t.title)
                            .foregroundStyle(.primary)
                    }
                }
                ForEach(customWorkouts) { w in
                    Button {
                        onSelect(EntryPresetRef(id: w.id, displayTitle: w.name))
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(w.name)
                                .font(.body)
                                .foregroundStyle(.primary)
                            if !w.blocks.isEmpty {
                                Text(w.blocks.prefix(3).map { editBlockTitle($0) }.joined(separator: " · "))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .navigationTitle("Select preset workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onCancel() }
                }
            }
        }
    }

    private func buildEditWorkoutPayload() -> (workoutId: UUID?, workoutDisplayTitle: String?, workoutCustomDescription: String?, workoutLog: WorkoutLog?, additionalWorkoutLogs: [WorkoutLog]?, additionalWorkoutPresets: [EntryPresetRef]?)? {
        guard didWorkout else {
            return (nil, nil, nil, nil, nil, nil)
        }
        let additional: [WorkoutLog] = editAdditionalBlocksList
            .filter { !$0.isEmpty }
            .map { blocks in
                WorkoutLog(
                    type: .weightTraining,
                    cardio: nil,
                    exercises: nil,
                    rounds: nil,
                    workoutId: nil,
                    workoutCustomDescription: nil,
                    blocks: blocks.map(\.block)
                )
            }
        let presets = editAdditionalPresetRows.isEmpty ? nil : editAdditionalPresetRows.map(\.ref)
        switch editWorkoutSource {
        case .preset:
            guard let preset = selectedEditPreset else { return (nil, nil, nil, nil, additional.isEmpty ? nil : additional, presets) }
            switch preset {
            case .saved(let id):
                return (id, savedWorkouts.first(where: { $0.id == id })?.name, nil, nil, additional.isEmpty ? nil : additional, presets)
            case .preMade(let id):
                let desc: String? = workoutTemplates.first(where: { $0.id == id }).map { t in "Pre-made: \(t.title)" }
                return (nil, nil, desc, nil, additional.isEmpty ? nil : additional, presets)
            case .customSaved(let id):
                return (id, CustomWorkoutStore.entry(id: id)?.name, nil, nil, additional.isEmpty ? nil : additional, presets)
            }
        case .custom:
            if editCustomBlocks.isEmpty {
                return (nil, nil, nil, nil, additional.isEmpty ? nil : additional, presets)
            }
            let blocks = editCustomBlocks.map(\.block)
            let log = WorkoutLog(
                type: .weightTraining,
                cardio: nil,
                exercises: nil,
                rounds: nil,
                workoutId: nil,
                workoutCustomDescription: nil,
                blocks: blocks
            )
            return (nil, nil, nil, log, additional.isEmpty ? nil : additional, presets)
        }
    }

    private func save() async {
        isLoading = true
        defer { isLoading = false }
        let trimmedBody = bodyText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedCaption = imageCaption.trimmingCharacters(in: .whitespacesAndNewlines)
        var finalMediaItems = keptMediaItems
        var mediaThumbnailData: [UUID: Data] = [:]
        let now = Date()
        for (index, imageData) in loadedImageDataList.enumerated() {
            let caption = (index == 0 && !trimmedCaption.isEmpty) ? trimmedCaption : nil
            let newItem = DiaryMediaItem(id: UUID(), kind: .image, storagePath: "saved_photo_\(index)", caption: caption, createdAt: now)
            finalMediaItems.append(newItem)
            mediaThumbnailData[newItem.id] = imageData
        }
        if selectedVideoItem != nil, let thumb = loadedVideoThumbnail, let data = thumb.jpegData(compressionQuality: 0.85) {
            let videoItem = DiaryMediaItem(id: UUID(), kind: .video, storagePath: "saved_video", caption: nil, createdAt: now)
            finalMediaItems.append(videoItem)
            mediaThumbnailData[videoItem.id] = data
            if let movie = try? await selectedVideoItem?.loadTransferable(type: Movie.self) {
                let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
                    .appendingPathComponent("JournalVideos", isDirectory: true)
                try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
                let dest = cacheDir.appendingPathComponent("\(videoItem.id.uuidString).mov")
                try? FileManager.default.removeItem(at: dest)
                try? FileManager.default.copyItem(at: movie.url, to: dest)
                JournalMediaCache.storeVideoURL(dest, for: videoItem.id)
            }
        }
        let imagePath: String? = finalMediaItems.first(where: { $0.kind == .image }).map { _ in "saved_photo_0" }
        let workoutPayload = buildEditWorkoutPayload()
        do {
            try await journalService.updateDiaryEntry(
                entry,
                bodyText: trimmedBody.isEmpty ? nil : trimmedBody,
                imagePath: imagePath ?? entry.imagePath,
                imageCaption: trimmedCaption.isEmpty ? nil : trimmedCaption,
                mediaItems: finalMediaItems,
                mediaThumbnailData: mediaThumbnailData.isEmpty ? nil : mediaThumbnailData,
                workoutPayload: workoutPayload
            )
            dismiss()
            onSave()
        } catch {}
    }
}
