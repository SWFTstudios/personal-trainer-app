//
//  JournalMediaCache.swift
//  swft-personal-trainer-app
//

import Foundation

/// In-memory cache of thumbnail/image data and video file URLs for diary media items, keyed by `DiaryMediaItem.id`.
/// Used in mock mode so list/detail/edit can show actual thumbnails and play videos; when backend exists, load from storagePath and use cache as fallback.
enum JournalMediaCache {
    private static let lock = NSLock()
    private static var storage: [UUID: Data] = [:]
    private static var videoURLStorage: [UUID: URL] = [:]

    static func store(_ data: Data, for mediaItemId: UUID) {
        lock.lock()
        defer { lock.unlock() }
        storage[mediaItemId] = data
    }

    static func thumbnailData(for mediaItemId: UUID) -> Data? {
        lock.lock()
        defer { lock.unlock() }
        return storage[mediaItemId]
    }

    static func remove(mediaItemId: UUID) {
        lock.lock()
        defer { lock.unlock() }
        storage.removeValue(forKey: mediaItemId)
        if let url = videoURLStorage.removeValue(forKey: mediaItemId) {
            try? FileManager.default.removeItem(at: url)
        }
    }

    static func remove(mediaItemIds: [UUID]) {
        lock.lock()
        defer { lock.unlock() }
        for id in mediaItemIds {
            storage.removeValue(forKey: id)
            if let url = videoURLStorage.removeValue(forKey: id) {
                try? FileManager.default.removeItem(at: url)
            }
        }
    }

    /// Store a local file URL for video playback (caller should copy to this URL if needed).
    static func storeVideoURL(_ url: URL, for mediaItemId: UUID) {
        lock.lock()
        defer { lock.unlock() }
        videoURLStorage[mediaItemId] = url
    }

    static func videoURL(for mediaItemId: UUID) -> URL? {
        lock.lock()
        defer { lock.unlock() }
        return videoURLStorage[mediaItemId]
    }
}
