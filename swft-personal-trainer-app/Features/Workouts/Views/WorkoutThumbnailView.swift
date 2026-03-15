//
//  WorkoutThumbnailView.swift
//  swft-personal-trainer-app
//

import SwiftUI

/// Shared thumbnail for workout list and detail. Shows image from URL or a consistent placeholder (with video or image icon).
struct WorkoutThumbnailView: View {
    let thumbnailUrl: String?
    let hasVideo: Bool
    var height: CGFloat = 200
    var cornerRadius: CGFloat = AppTheme.Radius.lg

    var body: some View {
        Group {
            if let urlString = thumbnailUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        placeholderContent
                    }
                }
            } else {
                placeholderContent
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }

    private var placeholderContent: some View {
        ZStack {
            Rectangle()
                .fill(Color(.systemGray5))
            Image(systemName: hasVideo ? "play.circle.fill" : "photo")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
        }
    }
}
