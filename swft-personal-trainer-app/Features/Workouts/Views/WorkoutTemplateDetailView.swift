//
//  WorkoutTemplateDetailView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct WorkoutTemplateDetailView: View {
    let template: WorkoutTemplate

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                thumbnailSection
                videoSection
                descriptionSection
            }
            .padding(AppTheme.Spacing.lg)
        }
        .navigationTitle(template.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var thumbnailSection: some View {
        Group {
            if let urlString = template.thumbnailUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        thumbnailPlaceholder
                    }
                }
                .frame(height: 200)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
            } else {
                thumbnailPlaceholder
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
    }

    private var thumbnailPlaceholder: some View {
        ZStack {
            Rectangle()
                .fill(Color(.systemGray5))
            Image(systemName: "play.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
        }
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
    }

    private var videoSection: some View {
        Button {
            if let url = URL(string: template.videoUrl) {
                UIApplication.shared.open(url)
            }
        } label: {
            HStack {
                Image(systemName: "play.circle.fill")
                    .font(.title2)
                Text("Watch video")
                    .font(AppTheme.Typography.headline)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.footnote)
            }
            .padding(AppTheme.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
        }
        .buttonStyle(.plain)
    }

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("How to do it correctly")
                .font(AppTheme.Typography.headline)
            Text(template.longDescription)
                .font(AppTheme.Typography.body)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
