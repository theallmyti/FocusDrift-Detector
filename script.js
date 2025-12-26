document.addEventListener('DOMContentLoaded', () => {
    
    // --- State Management ---
    const STORAGE_KEY = 'burnout_detector_data';
    
    // Set default date to today
    const dateInput = document.getElementById('entryDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Range slider value display
    const focusRange = document.getElementById('focusLevel');
    const focusValDisplay = document.getElementById('focusValueDisplay');
    focusRange.addEventListener('input', (e) => {
        focusValDisplay.textContent = e.target.value;
    });

    // --- Chart Initialization ---
    const ctx = document.getElementById('trendsChart').getContext('2d');
    let trendsChart;

    function initChart(data) {
        // Sort data by date
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Limit to last 7 entries for clarity
        const recentData = sortedData.slice(-7);

        const labels = recentData.map(d => d.date);
        const burnoutScores = recentData.map(d => d.results.burnoutScore);
        const focusScores = recentData.map(d => d.results.focusStability);

        const config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Burnout Risk',
                        data: burnoutScores,
                        borderColor: '#d63031', // Red
                        backgroundColor: 'rgba(214, 48, 49, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Focus Stability',
                        data: focusScores,
                        borderColor: '#00b894', // Green
                        backgroundColor: 'rgba(0, 184, 148, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: '#2d2d2d' },
                        ticks: { color: '#a0a0a0' }
                    },
                    x: {
                        grid: { color: '#2d2d2d' },
                        ticks: { color: '#a0a0a0' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#e0e0e0' }
                    }
                }
            }
        };

        if (trendsChart) {
            trendsChart.destroy();
        }
        trendsChart = new Chart(ctx, config);
    }

    // --- Scoring Logic ---
    function calculateResults(inputs) {
        let burnoutScore = 0;
        let focusStability = 100;

        // 1. Burnout Calculation (0 - 100)
        // Screen time impact
        if (inputs.screenTime > 12) burnoutScore += 50;
        else if (inputs.screenTime > 8) burnoutScore += 30;
        else if (inputs.screenTime > 5) burnoutScore += 10;

        // Sleep impact (Low sleep increases risk)
        if (inputs.sleep < 5) burnoutScore += 30;
        else if (inputs.sleep < 7) burnoutScore += 15;

        // Breaks impact
        if (!inputs.breaks) burnoutScore += 20;

        // Cap at 100
        burnoutScore = Math.min(100, burnoutScore);


        // 2. Focus Stability Calculation (0 - 100)
        // App Switching impact (High switching reduces focus)
        if (inputs.switches === 'high') focusStability -= 30;
        else if (inputs.switches === 'medium') focusStability -= 15;

        // Self-reported impact
        // Scale 1-5. 1=Bad(-20), 5=Good(0)
        const focusPenalty = (5 - inputs.focus) * 10; // (5-1)*10 = 40 max penalty
        focusStability -= focusPenalty;

        // Fatigue impact on focus (Burnout bleed-over)
        if (burnoutScore > 60) focusStability -= 15;

        // Clamp
        focusStability = Math.max(0, focusStability);


        // 3. Determine status state
        let status = 'Focused';
        let colorClass = 'green';
        let message = 'You are in a good flow state. Keep it up!';
        let tips = [];

        if (burnoutScore > 65) {
            status = 'Burnout Risk';
            colorClass = 'red';
            message = 'High fatigue indicators detected. Prioritize rest today.';
            tips.push('🛑 Stop looking at screens for at least 30 minutes.');
            tips.push('💤 Aim for 8 hours of sleep tonight.');
            tips.push('🌳 Go for a walk outside without your phone.');
        } else if (focusStability < 50) {
            status = 'Drifting';
            colorClass = 'yellow';
            message = 'Your focus is fragmented. Try single-tasking.';
            tips.push('🔕 Turn off notifications for the next hour.');
            tips.push('⏱️ Try the Pomodoro technique (25m work / 5m break).');
            tips.push('📝 Write down your top 3 tasks and hide the rest.');
        } else {
            // Healthy state tips
            tips.push('💧 Stay hydrated to maintain these levels.');
            tips.push('👀 Follow the 20-20-20 rule for eye health.');
        }

        return {
            burnoutScore,
            focusStability,
            status,
            colorClass,
            message,
            tips
        };
    }

    // --- UI Updates ---
    function updateDashboard(results, date) {
        document.getElementById('displayDate').textContent = date;
        
        // Status
        const statusTitle = document.getElementById('statusTitle');
        const statusMsg = document.getElementById('statusMessage');
        const statusIcon = document.getElementById('statusIcon');
        
        statusTitle.textContent = results.status;
        statusMsg.textContent = results.message;

        // Icons & Colors
        const statusCard = document.getElementById('statusCard');
        statusCard.style.borderTop = `4px solid var(--accent-${results.colorClass})`; // Visual accent

        if (results.colorClass === 'red') {
            statusIcon.textContent = '🔥';
            statusTitle.style.color = 'var(--accent-red)';
        } else if (results.colorClass === 'yellow') {
            statusIcon.textContent = '🌫️';
            statusTitle.style.color = 'var(--accent-yellow)';
        } else {
            statusIcon.textContent = '✨';
            statusTitle.style.color = 'var(--accent-green)';
        }

        // Progress Bars
        const burnoutBar = document.getElementById('burnoutBar');
        const focusBar = document.getElementById('focusBar');
        
        setTimeout(() => {
            burnoutBar.style.width = `${results.burnoutScore}%`;
            burnoutBar.style.backgroundColor = results.burnoutScore > 70 ? 'var(--accent-red)' : 'var(--primary)';
            
            focusBar.style.width = `${results.focusStability}%`;
            focusBar.style.backgroundColor = results.focusStability < 50 ? 'var(--accent-yellow)' : 'var(--accent-green)';
        }, 100); // Small delay for animation

        document.getElementById('burnoutValue').textContent = `${results.burnoutScore}%`;
        document.getElementById('focusValue').textContent = `${results.focusStability}%`;

        // Tips
        const tipsList = document.getElementById('tipsList');
        tipsList.innerHTML = '';
        results.tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });
    }

    // --- Loading Data ---
    function loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function checkToday(data, date) {
        const entry = data.find(d => d.date === date);
        if (entry) {
            updateDashboard(entry.results, date);
            
            // Pre-fill form
            document.getElementById('screenTime').value = entry.inputs.screenTime;
            document.getElementById('appSwitches').value = entry.inputs.switches;
            document.getElementById('focusLevel').value = entry.inputs.focus;
            document.getElementById('focusValueDisplay').textContent = entry.inputs.focus;
            document.getElementById('breaksTaken').checked = entry.inputs.breaks;
            document.getElementById('sleepDuration').value = entry.inputs.sleep;
        }
    }

    // --- Form Submission ---
    document.getElementById('dailyForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const date = document.getElementById('entryDate').value;
        const inputs = {
            screenTime: parseFloat(document.getElementById('screenTime').value),
            switches: document.getElementById('appSwitches').value,
            focus: parseInt(document.getElementById('focusLevel').value),
            breaks: document.getElementById('breaksTaken').checked,
            sleep: parseFloat(document.getElementById('sleepDuration').value)
        };

        const results = calculateResults(inputs);
        const entry = { date, inputs, results };

        // Save
        let allData = loadData();
        // Remove existing entry for same date if any
        allData = allData.filter(d => d.date !== date);
        allData.push(entry);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

        // Update UI
        updateDashboard(results, date);
        initChart(allData);

        // Feedback animation
        const btn = e.target.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Saved! ✅';
        setTimeout(() => btn.textContent = originalText, 2000);
    });

    // --- Initialization ---
    const allData = loadData();
    initChart(allData);
    checkToday(allData, today);
});
