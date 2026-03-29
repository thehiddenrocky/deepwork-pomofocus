document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/logs');
        if (!response.ok) {
            throw new Error('Logs not found. Complete a session first!');
        }
        const csvText = await response.text();
        analyzeLogs(csvText);
    } catch (err) {
        document.getElementById('total-hours').innerText = '0 hrs';
        document.getElementById('weekly-hours').innerText = '0 hrs';
        console.error(err);
    }
});

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const obj = {};
        headers.forEach((h, index) => {
            obj[h] = row[index] ? row[index].trim() : '';
        });
        data.push(obj);
    }
    return data;
}

function analyzeLogs(csvText) {
    const logs = parseCSV(csvText);
    
    let totalFocusMinutes = 0;
    let weeklyMins = 0;
    const categories = {};
    
    // For GitHub Heatmap (Last 30 Days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    let totalSessions30Days = 0;
    
    // gridData[dayOfWeek][hourOfDay] = total minutes
    // sessionCount[dayOfWeek][hourOfDay] = total sessions
    const gridData = Array(7).fill().map(() => Array(24).fill(0));
    const sessionCount = Array(7).fill().map(() => Array(24).fill(0));
    const datesInBlock = Array(7).fill().map(() => Array(24).fill().map(() => new Set()));

    logs.forEach(row => {
        if (row['Session Type'] === 'Focus') {
            try {
                const start = new Date(row['Start Time'].replace('Z', '+00:00'));
                const end = new Date(row['End Time'].replace('Z', '+00:00'));
                
                const durationMins = (end - start) / (1000 * 60);
                if (durationMins > 0) {
                    totalFocusMinutes += durationMins;
                    
                    const daysDiff = (now - start) / (1000 * 60 * 60 * 24);
                    if (daysDiff < 7) {
                        weeklyMins += durationMins;
                    }
                    
                    const note = row['Note'] || 'Uncategorized';
                    if (!categories[note]) categories[note] = 0;
                    categories[note] += durationMins;
                    
                    // Populate Heatmap Data
                    if (start >= thirtyDaysAgo) {
                        const day = start.getDay(); // 0 = Sunday
                        const hour = start.getHours(); // 0-23
                        
                        gridData[day][hour] += durationMins;
                        sessionCount[day][hour] += 1;
                        datesInBlock[day][hour].add(start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                        totalSessions30Days++;
                    }
                }
            } catch (e) {
                // skip bad rows
            }
        }
    });
    
    // Find Top Category
    let topCat = '--';
    let maxMins = 0;
    Object.keys(categories).forEach(cat => {
        if (categories[cat] > maxMins && cat !== 'Uncategorized' && cat.trim() !== '') {
            maxMins = categories[cat];
            topCat = cat;
        }
    });
    
    // Update Overview Stats
    document.getElementById('total-hours').innerText = (totalFocusMinutes / 60).toFixed(1) + ' hrs';
    document.getElementById('weekly-hours').innerText = (weeklyMins / 60).toFixed(1) + ' hrs';
    document.getElementById('top-category').innerText = topCat;
    
    document.getElementById('contribution-heading').innerText = `${totalSessions30Days} deep sessions in the last 30 days`;
    
    renderGitHubHeatmap(gridData, sessionCount, datesInBlock);
}

function renderGitHubHeatmap(gridData, sessionCount, datesInBlock) {
    const container = document.getElementById('gh-grid');
    container.innerHTML = '';
    
    // 1. Render Top Header Row (Hours)
    const emptyCorner = document.createElement('div');
    container.appendChild(emptyCorner); // Top-left empty space
    
    for (let h = 0; h < 24; h++) {
        const hourLabel = document.createElement('div');
        hourLabel.className = 'gh-label-x';
        
        // Show labels every 3 hours (12am, 3am, 6am, etc) to mimic Month spacing
        if (h % 3 === 0) {
            const displayHour = h === 0 ? '12am' : (h < 12 ? `${h}am` : (h === 12 ? '12pm' : `${h-12}pm`));
            hourLabel.innerText = displayHour;
        }
        container.appendChild(hourLabel);
    }
    
    // 2. Render Grid Rows (Days of the week)
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let d = 0; d < 7; d++) {
        // Y-axis Label
        const dayLabel = document.createElement('div');
        dayLabel.className = 'gh-label-y';
        if (d === 1 || d === 3 || d === 5) { // Only show Mon, Wed, Fri
            dayLabel.innerText = dayLabels[d];
        }
        container.appendChild(dayLabel);
        
        // Data Boxes for 24 hours
        for (let h = 0; h < 24; h++) {
            const box = document.createElement('div');
            box.className = 'gh-box';
            
            const mins = gridData[d][h];
            const count = sessionCount[d][h];
            const dates = Array.from(datesInBlock[d][h]);
            
            // Apply GitHub colors based on intensity (minutes of deep work in that hour block)
            if (mins > 0 && mins <= 25) {
                box.classList.add('gh-lvl-1');
            } else if (mins > 25 && mins <= 50) {
                box.classList.add('gh-lvl-2');
            } else if (mins > 50 && mins <= 90) {
                box.classList.add('gh-lvl-3');
            } else if (mins > 90) {
                box.classList.add('gh-lvl-4'); // Highly productive slot over the month!
            }
            
            // Tooltip on Hover
            if (count > 0) {
                const timeStr = h === 0 ? '12 AM' : (h < 12 ? `${h} AM` : (h === 12 ? '12 PM' : `${h-12} PM`));
                const dateSummary = dates.length > 2 ? `${dates[0]}, ${dates[1]} (+${dates.length-2} more)` : dates.join(', ');
                box.setAttribute('data-info', `${count} session${count > 1 ? 's' : ''} on ${dateSummary} at ${timeStr}`);
            }
            
            container.appendChild(box);
        }
    }
}
