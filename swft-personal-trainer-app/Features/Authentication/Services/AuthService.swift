//
//  AuthService.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

@MainActor
final class AuthService: Sendable {
    private let client = SupabaseClientManager.shared

    var currentSession: Session? {
        get async {
            try? await client.auth.session
        }
    }

    var currentUserId: UUID? {
        get async {
            try? await client.auth.session.user.id
        }
    }

    func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(email: email, password: password)
    }

    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    func sessionStream() -> AsyncStream<Session?> {
        AsyncStream { continuation in
            let task = Task {
                for await (_, session) in client.auth.authStateChanges {
                    continuation.yield(session)
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
