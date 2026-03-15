//
//  CategoryExercisesView.swift
//  swft-personal-trainer-app
//

import SwiftUI

struct CategoryExercisesView: View {
    let category: String
    let exercises: [Exercise]

    var body: some View {
        List {
            ForEach(exercises) { exercise in
                Text(exercise.name)
                    .font(AppTheme.Typography.body)
            }
        }
        .navigationTitle(category)
    }
}
