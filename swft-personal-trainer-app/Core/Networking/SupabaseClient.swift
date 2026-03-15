//
//  SupabaseClient.swift
//  swft-personal-trainer-app
//

import Foundation
import Supabase

enum SupabaseClientConfig {
    static var url: URL {
        let urlString = (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String)
            ?? ProcessInfo.processInfo.environment["SUPABASE_URL"]
            ?? "https://placeholder.supabase.co"
        return URL(string: urlString) ?? URL(string: "https://placeholder.supabase.co")!
    }

    static var anonKey: String {
        (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String)
            ?? ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"]
            ?? "placeholder-anon-key"
    }

    static var isConfigured: Bool {
        (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String) != nil
            || ProcessInfo.processInfo.environment["SUPABASE_URL"] != nil
    }
}

final class SupabaseClientManager {
    static let shared: SupabaseClient = {
        SupabaseClient(
            supabaseURL: SupabaseClientConfig.url,
            supabaseKey: SupabaseClientConfig.anonKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(emitLocalSessionAsInitialSession: true)
            )
        )
    }()
}
