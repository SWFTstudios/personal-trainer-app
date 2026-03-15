//
//  AppState.swift
//  swft-personal-trainer-app
//

import Combine
import Foundation
import Supabase
import SwiftUI

@MainActor
final class AppState: ObservableObject {
    enum Route {
        case signedOut
        case onboarding(client: Client)
        case client(client: Client, trainer: Trainer)
        case trainer(trainer: Trainer)
    }

    @Published private(set) var route: Route = .signedOut
    @Published var isLoading = true
    @Published var errorMessage: String?

    private let authService = AuthService()
    private let tenantService = TenantService()

    func resolveRoute() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil

        guard let session = await authService.currentSession else {
            route = .signedOut
            return
        }

        let userId = session.user.id

        do {
            if let trainerId = try await tenantService.fetchTrainerId(forUserId: userId) {
                let trainer = try await tenantService.fetchTrainer(trainerId: trainerId)
                route = .trainer(trainer: trainer)
                return
            }

            if let client = try await tenantService.fetchClient(forUserId: userId) {
                let trainer = try await tenantService.fetchTrainer(trainerId: client.trainerId)
                if client.onboardingCompletedAt == nil {
                    route = .onboarding(client: client)
                } else {
                    route = .client(client: client, trainer: trainer)
                }
                return
            }

            route = .signedOut
        } catch {
            errorMessage = error.localizedDescription
            route = .signedOut
        }
    }

    func signOut() async {
        try? await authService.signOut()
        await resolveRoute()
    }

    /// Call after client completes onboarding.
    func finishOnboarding() async {
        await resolveRoute()
    }

    /// Call after client signs up with invite (creates client row then resolves).
    func didCreateClient() async {
        await resolveRoute()
    }
}
