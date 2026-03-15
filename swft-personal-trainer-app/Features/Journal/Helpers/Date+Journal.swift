//
//  Date+Journal.swift
//  swft-personal-trainer-app
//

import SwiftUI

extension Date {
    /// Custom date format for Journal (e.g. "MMMM", "YYYY", "E", "dd", "hh:mm a").
    func journalFormat(_ format: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = format
        return formatter.string(from: self)
    }

    var isToday: Bool {
        Calendar.current.isDateInToday(self)
    }

    /// Week containing this date as 7 WeekDay values (week-of-month interval).
    func fetchWeek() -> [JournalWeekDay] {
        let calendar = Calendar.current
        let startOfDate = calendar.startOfDay(for: self)
        guard let weekInterval = calendar.dateInterval(of: .weekOfMonth, for: startOfDate) else {
            return []
        }
        let startOfWeek = weekInterval.start
        return (0..<7).compactMap { index in
            calendar.date(byAdding: .day, value: index, to: startOfWeek).map { JournalWeekDay(date: $0) }
        }
    }

    func createNextWeek() -> [JournalWeekDay] {
        let calendar = Calendar.current
        let startOfSelf = calendar.startOfDay(for: self)
        guard let nextDay = calendar.date(byAdding: .day, value: 1, to: startOfSelf) else { return [] }
        return nextDay.fetchWeek()
    }

    func createPreviousWeek() -> [JournalWeekDay] {
        let calendar = Calendar.current
        let startOfSelf = calendar.startOfDay(for: self)
        guard let previousDay = calendar.date(byAdding: .day, value: -1, to: startOfSelf) else { return [] }
        return previousDay.fetchWeek()
    }
}

struct JournalWeekDay: Identifiable {
    let id = UUID()
    let date: Date
}
