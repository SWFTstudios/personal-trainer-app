//
//  VideoPlayerView.swift
//  swft-personal-trainer-app
//

import AVFoundation
import AVKit
import SwiftUI

struct VideoPlayerView: View {
    let url: URL
    var onDismiss: (() -> Void)?

    var body: some View {
        VideoPlayer(player: AVPlayer(url: url)) {
            EmptyView()
        }
        .ignoresSafeArea()
        .onDisappear {
            onDismiss?()
        }
        .overlay(alignment: .topTrailing) {
            if let onDismiss {
                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title)
                        .foregroundStyle(.white)
                        .shadow(radius: 2)
                }
                .padding(20)
            }
        }
    }
}
