//
//  OnboardingView.swift
//  swft-personal-trainer-app
//

import SwiftUI
import Supabase

struct OnboardingView: View {
    let client: Client
    let trainer: Trainer
    var onComplete: () async -> Void

    @State private var currentStep = 0
    @State private var answers: [String: String] = [:]
    @State private var isLoading = false

    private let questions: [(key: String, question: String)] = [
        ("goals", "What are your main fitness goals?"),
        ("experience", "How would you describe your current fitness level?"),
        ("injuries", "Any injuries or limitations we should know about?"),
    ]

    var body: some View {
        VStack(spacing: AppTheme.Spacing.xl) {
            ProgressView(value: Double(currentStep + 1), total: Double(questions.count + 1))
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.top, AppTheme.Spacing.lg)

            if currentStep < questions.count {
                let q = questions[currentStep]
                VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
                    Text(q.question)
                        .font(AppTheme.Typography.title2)
                    TextField("Your answer", text: Binding(
                        get: { answers[q.key] ?? "" },
                        set: { answers[q.key] = $0 }
                    ))
                    .padding(AppTheme.Spacing.sm)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                Button("Next") {
                    withAnimation { currentStep += 1 }
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.bottom, AppTheme.Spacing.xl)
            } else {
                VStack(spacing: AppTheme.Spacing.md) {
                    Text("You're all set")
                        .font(AppTheme.Typography.title)
                    Text("Book your intro call with \(trainer.displayName ?? "your trainer") to get started.")
                        .font(AppTheme.Typography.body)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity)
                Spacer()

                Button("Book your intro call") {
                    openCalendly()
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal, AppTheme.Spacing.lg)

                Button("I'll book later") {
                    Task { await saveAndComplete() }
                }
                .padding(.top, AppTheme.Spacing.xs)
                .padding(.bottom, AppTheme.Spacing.xl)
            }
        }
        .task { await loadTrainerIfNeeded() }
    }

    private func loadTrainerIfNeeded() async {
        // Trainer is passed in; no load needed
    }

    private func openCalendly() {
        let urlString = trainer.calendlyUrl ?? trainer.brandTheme.calendlyURL ?? ""
        guard !urlString.isEmpty, let url = URL(string: urlString) else { return }
        UIApplication.shared.open(url)
        Task { await saveAndComplete() }
    }

    private func saveAndComplete() async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await saveOnboardingAnswers()
            try await markOnboardingComplete()
            await onComplete()
        } catch {
            // Still complete locally so user can proceed
            await onComplete()
        }
    }

    private func saveOnboardingAnswers() async throws {
        let supabase = SupabaseClientManager.shared
        struct Payload: Encodable {
            let clientId: UUID
            let answers: [String: String]
            let completedAt: String

            enum CodingKeys: String, CodingKey {
                case clientId = "client_id"
                case answers
                case completedAt = "completed_at"
            }
        }
        let payload = Payload(
            clientId: client.id,
            answers: answers,
            completedAt: ISO8601DateFormatter().string(from: Date())
        )
        try await supabase
            .from("onboarding_answers")
            .upsert(payload)
            .execute()
    }

    private func markOnboardingComplete() async throws {
        struct UpdatePayload: Encodable {
            let onboardingCompletedAt: String
            enum CodingKeys: String, CodingKey { case onboardingCompletedAt = "onboarding_completed_at" }
        }
        let supabase = SupabaseClientManager.shared
        let payload = UpdatePayload(onboardingCompletedAt: ISO8601DateFormatter().string(from: Date()))
        try await supabase
            .from("clients")
            .update(payload)
            .eq("id", value: client.id.uuidString)
            .execute()
    }
}
