//
//  VideoThumbnailHelpers.swift
//  swft-personal-trainer-app
//

import AVFoundation
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct Movie: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { movie in
            SentTransferredFile(movie.url)
        } importing: { received in
            let copy = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".mov")
            if FileManager.default.fileExists(atPath: copy.path()) {
                try FileManager.default.removeItem(at: copy)
            }
            try FileManager.default.copyItem(at: received.file, to: copy)
            return Self(url: copy)
        }
    }
}

enum VideoThumbnailGenerator {
    static func thumbnail(from url: URL) async -> UIImage? {
        let asset = AVURLAsset(url: url)
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 400, height: 400)
        let time = CMTime(seconds: 0, preferredTimescale: 60)
        guard let (cgImage, _) = try? await generator.image(at: time) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
