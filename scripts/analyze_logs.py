import csv
import os
from datetime import datetime
from collections import defaultdict

def analyze_pomofocus_logs():
    log_path = os.path.expanduser('~/pomofocus-logs.csv')
    
    if not os.path.exists(log_path):
        print(f"No log file found at {log_path}. Complete some sessions first!")
        return

    total_focus_minutes = 0
    sessions_by_date = defaultdict(list)
    categories = defaultdict(int)

    with open(log_path, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row['Session Type'] == 'Focus':
                try:
                    # Parse ISO format dates
                    start_time = datetime.fromisoformat(row['Start Time'].replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(row['End Time'].replace('Z', '+00:00'))
                    
                    duration = (end_time - start_time).total_seconds() / 60
                    if duration > 0:
                        total_focus_minutes += duration
                        date_str = start_time.strftime('%Y-%m-%d')
                        sessions_by_date[date_str].append(duration)
                        
                        note = row['Note'].strip()
                        if note:
                            categories[note] += duration
                except Exception as e:
                    pass # Skip malformed rows

    print("====================================")
    print(" PomoFocus: Deep Work Performance ")
    print("====================================")
    print(f"Total Lifetime Deep Work: {total_focus_minutes / 60:.1f} hours")
    print("\nRecent Days:")
    
    # Sort dates descending and show top 5
    for date in sorted(sessions_by_date.keys(), reverse=True)[:5]:
        daily_mins = sum(sessions_by_date[date])
        print(f"  {date}: {daily_mins / 60:.1f} hours ({len(sessions_by_date[date])} sessions)")

    print("\nTop Focus Categories (by hours):")
    # Sort categories by duration descending
    for category, mins in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  - {category}: {mins / 60:.1f} hours")
    print("====================================")

if __name__ == '__main__':
    analyze_pomofocus_logs()
