//
//  SignInView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct SignInView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var inviteTrainerId: String?

    var onSignedIn: (() async -> Void)?

    init(onSignedIn: (() async -> Void)? = nil) {
        _inviteTrainerId = State(initialValue: UserDefaults.standard.string(forKey: "pending_invite_trainer_id"))
        self.onSignedIn = onSignedIn
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppTheme.Spacing.xl) {
                Text(isSignUp ? "Create account" : "Welcome back")
                    .font(AppTheme.Typography.largeTitle)
                    .padding(.top, AppTheme.Spacing.xxl)

                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text("Email")
                        .font(AppTheme.Typography.footnote)
                    TextField("", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .padding(AppTheme.Spacing.sm)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                }

                VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                    Text("Password")
                        .font(AppTheme.Typography.footnote)
                    SecureField("", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                        .padding(AppTheme.Spacing.sm)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                }

                if isSignUp {
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text("Invite code (optional)")
                            .font(AppTheme.Typography.footnote)
                        TextField("Trainer invite code", text: Binding(
                            get: { inviteTrainerId ?? "" },
                            set: { inviteTrainerId = $0.isEmpty ? nil : $0 }
                        ))
                        .textContentType(.username)
                        .autocapitalization(.none)
                        .padding(AppTheme.Spacing.sm)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.sm))
                    }
                }

                if let error = errorMessage {
                    Text(error)
                        .font(AppTheme.Typography.footnote)
                        .foregroundStyle(.red)
                }

                Button(action: submit) {
                    Group {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text(isSignUp ? "Sign up" : "Sign in")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(AppTheme.Spacing.md)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading || email.isEmpty || password.isEmpty)

                Button(isSignUp ? "Already have an account? Sign in" : "Create an account") {
                    isSignUp.toggle()
                    errorMessage = nil
                }
                .font(AppTheme.Typography.callout)
            }
            .padding(AppTheme.Spacing.lg)
        }
    }

    private func submit() {
        Task {
            isLoading = true
            errorMessage = nil
            defer { isLoading = false }
            do {
                let auth = AuthService()
                if isSignUp {
                    try await auth.signUp(email: email, password: password)
                    if let trainerIdString = inviteTrainerId,
                       let trainerId = UUID(uuidString: trainerIdString),
                       let userId = await auth.currentUserId {
                        _ = try await TenantService().createClient(userId: userId, trainerId: trainerId, inviteCodeUsed: inviteTrainerId)
                    }
                } else {
                    try await auth.signIn(email: email, password: password)
                }
                await onSignedIn?()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

#Preview {
    SignInView()
}
