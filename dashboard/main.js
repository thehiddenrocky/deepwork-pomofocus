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
        // Simple CSV split (won't handle commas inside quotes well, but enough for our basic logs)
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
    const sessionsByDate = {};
    const categories = {};
    
    logs.forEach(row => {
        if (row['Session Type'] === 'Focus') {
            try {
                const start = new Date(row['Start Time'].replace('Z', '+00:00'));
                const end = new Date(row['End Time'].replace('Z', '+00:00'));
                
                const durationMins = (end - start) / (1000 * 60);
                if (durationMins > 0) {
                    totalFocusMinutes += durationMins;
                    
                    const dateStr = start.toISOString().split('T')[0];
                    if (!sessionsByDate[dateStr]) sessionsByDate[dateStr] = 0;
                    sessionsByDate[dateStr] += durationMins;
                    
                    const note = row['Note'] || 'Uncategorized';
                    if (!categories[note]) categories[note] = 0;
                    categories[note] += durationMins;
                }
            } catch (e) {
                // skip bad rows
            }
        }
    });
    
    // Calculate Weekly Summary
    const now = new Date();
    let weeklyMins = 0;
    
    Object.keys(sessionsByDate).forEach(dateStr => {
        const d = new Date(dateStr);
        const daysDiff = (now - d) / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) {
            weeklyMins += sessionsByDate[dateStr];
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
    
    // Update DOM Stats
    document.getElementById('total-hours').innerText = (totalFocusMinutes / 60).toFixed(1) + ' hrs';
    document.getElementById('weekly-hours').innerText = (weeklyMins / 60).toFixed(1) + ' hrs';
    document.getElementById('top-category').innerText = topCat;
    
    // Render Heatmap (Last 30 Days)
    renderHeatmap(sessionsByDate);
}

function renderHeatmap(sessionsByDate) {
    const heatmapEl = document.getElementById('heatmap');
    heatmapEl.innerHTML = '';
    
    const today = new Date();
    // Start 30 days ago
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const mins = sessionsByDate[dateStr] || 0;
        const hours = mins / 60;
        
        const box = document.createElement('div');
        box.classList.add('day-box');
        
        // Heatmap colors based on deep work hours
        if (hours > 0 && hours <= 1) box.classList.add('heat-1');
        else if (hours > 1 && hours <= 3) box.classList.add('heat-2');
        else if (hours > 3 && hours <= 5) box.classList.add('heat-3');
        else if (hours > 5) box.classList.add('heat-4');
        
        box.setAttribute('data-info', `${dateStr}: ${hours.toFixed(1)} hrs`);
        
        heatmapEl.appendChild(box);
    }
}
