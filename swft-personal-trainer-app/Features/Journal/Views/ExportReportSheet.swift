//
//  ExportReportSheet.swift
//  swft-personal-trainer-app
//

import SwiftUI
import UIKit

struct ExportReportSheet: View {
    let client: Client
    var onDismiss: () -> Void

    @State private var startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State private var endDate = Date()
    @State private var isGenerating = false
    @State private var reportURL: URL?
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    private let reportService = JournalReportService()

    var body: some View {
        NavigationStack {
            Form {
                Section("Date range") {
                    DatePicker("From", selection: $startDate, displayedComponents: .date)
                    DatePicker("To", selection: $endDate, displayedComponents: .date)
                }
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Export report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                        onDismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Generate") { Task { await generate() } }
                        .disabled(isGenerating || startDate > endDate)
                }
            }
            .sheet(item: Binding(get: { reportURL.map(IdentifiableURL.init) }, set: { reportURL = $0?.url })) { identifiable in
                NavigationStack {
                    ShareSheet(activityItems: [identifiable.url])
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Done") {
                                    reportURL = nil
                                    dismiss()
                                    onDismiss()
                                }
                            }
                        }
                }
            }
        }
        .onChange(of: startDate) { _, newStart in
            if newStart > endDate { endDate = newStart }
        }
        .onChange(of: endDate) { _, newEnd in
            if newEnd < startDate { startDate = newEnd }
        }
    }

    private func generate() async {
        isGenerating = true
        errorMessage = nil
        defer { isGenerating = false }
        do {
            let url = try await reportService.generateReport(clientId: client.id, from: startDate, to: endDate)
            reportURL = url
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct IdentifiableURL: Identifiable {
    let id = UUID()
    let url: URL
}

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
