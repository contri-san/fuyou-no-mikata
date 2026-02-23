// App State
const state = {
    config: {
        hourlyWage: 0,
        transportType: 'none',
        transportValue: 0,
        targetWall: 1300000,
        isLargeCompany: false,
        isStudent: false, // New field
    },
    shifts: {}, // Format: { '2026-02-23': 5.5, ... }
    bonuses: {}, // Format: { '2026-02': 50000, ... }
    currentMonth: new Date().toISOString().slice(0, 7),
    selectedDate: null
};

// Selectors
const setupView = document.getElementById('setup-view');
const step1 = document.getElementById('setup-step1');
const step2 = document.getElementById('setup-step2');
const dashboardView = document.getElementById('dashboard-view');
const inputModal = document.getElementById('input-modal');
const monthlyBonusInput = document.getElementById('monthly-bonus');

// Initialize Lucide icons
function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Save & Load
function saveState() {
    localStorage.setItem('fuyou_mikata_state', JSON.stringify(state));
    calculateAndRender();
}

function loadState() {
    const saved = localStorage.getItem('fuyou_mikata_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        if (!state.bonuses) state.bonuses = {}; // For backward compatibility

        if (state.config.hourlyWage > 0) {
            showDashboard();
        }
        // Set form values from state
        document.getElementById('hourly-wage').value = state.config.hourlyWage;
        document.getElementById('transport-type').value = state.config.transportType;
        document.getElementById('transport-value').value = state.config.transportValue;
        document.getElementById('target-wall').value = state.config.targetWall;
        if (state.config.transportType !== 'none') {
            document.getElementById('transport-value-group').classList.remove('hidden');
        }
        syncEmpButtons();
        syncStudentButtons();
    }
}

// UI Navigation
function showDashboard() {
    setupView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    calculateAndRender();
}

function showSetup() {
    dashboardView.classList.add('hidden');
    setupView.classList.remove('hidden');
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
}

// Step 1 Events
document.getElementById('transport-type').addEventListener('change', (e) => {
    const valGroup = document.getElementById('transport-value-group');
    const label = document.getElementById('transport-value-label');
    state.config.transportType = e.target.value;

    if (e.target.value === 'none') {
        valGroup.classList.add('hidden');
    } else {
        valGroup.classList.remove('hidden');
        label.textContent = e.target.value === 'daily' ? '金額 (日額/円)' : '金額 (月額/円)';
    }
});

document.getElementById('next-to-step2').addEventListener('click', () => {
    state.config.hourlyWage = parseInt(document.getElementById('hourly-wage').value) || 0;
    state.config.transportValue = parseInt(document.getElementById('transport-value').value) || 0;

    if (state.config.hourlyWage <= 0) {
        alert('時給を入力してくださいね！');
        return;
    }
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
});

// Step 2 Events
function syncEmpButtons() {
    document.querySelectorAll('.emp-btn').forEach(btn => {
        const isBtnTrue = btn.getAttribute('data-value') === 'true';
        if (state.config.isLargeCompany === isBtnTrue) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        } else {
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
        }
    });
}

document.querySelectorAll('.emp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.config.isLargeCompany = btn.getAttribute('data-value') === 'true';
        syncEmpButtons();
    });
});

function syncStudentButtons() {
    document.querySelectorAll('.student-btn').forEach(btn => {
        const isBtnTrue = btn.getAttribute('data-value') === 'true';
        if (state.config.isStudent === isBtnTrue) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary', 'selected');
            btn.classList.add('selected');
        } else {
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary', 'selected');
        }
    });
}

document.querySelectorAll('.student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.config.isStudent = btn.getAttribute('data-value') === 'true';
        syncStudentButtons();
    });
});

document.getElementById('finish-setup').addEventListener('click', () => {
    state.config.targetWall = parseInt(document.getElementById('target-wall').value);
    saveState();
    showDashboard();
});

// Dashboard Events
document.getElementById('back-to-setup').addEventListener('click', showSetup);
document.getElementById('reset-data').addEventListener('click', () => {
    if (confirm('すべての入力データを消去して初期設定に戻りますか？')) {
        localStorage.removeItem('fuyou_mikata_state');
        location.reload();
    }
});

// Bonus Input
monthlyBonusInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value) || 0;
    if (val <= 0) {
        delete state.bonuses[state.currentMonth];
    } else {
        state.bonuses[state.currentMonth] = val;
    }
    saveState();
});

// Modal Logic
function openModal(dateKey) {
    state.selectedDate = dateKey;
    const [y, m, d] = dateKey.split('-');
    document.getElementById('modal-date-display').textContent = `${parseInt(m)}月${parseInt(d)}日`;
    document.getElementById('modal-hours').value = state.shifts[dateKey] || '';
    inputModal.classList.remove('hidden');
}

function closeModal() {
    inputModal.classList.add('hidden');
    state.selectedDate = null;
}

document.getElementById('save-modal').addEventListener('click', () => {
    const hours = parseFloat(document.getElementById('modal-hours').value);
    if (isNaN(hours) || hours <= 0) {
        delete state.shifts[state.selectedDate];
    } else {
        state.shifts[state.selectedDate] = hours;
    }
    saveState();
    closeModal();
});

document.getElementById('delete-modal').addEventListener('click', () => {
    delete state.shifts[state.selectedDate];
    saveState();
    closeModal();
});

document.getElementById('close-modal').addEventListener('click', closeModal);

// Calculation & Rendering
function calculateAndRender() {
    const grid = document.getElementById('calendar-grid');
    const monthStr = state.currentMonth;
    const [year, month] = monthStr.split('-').map(Number);

    // Student Threshold adjustment (2025 Special Rule)
    let effectiveWall = state.config.targetWall;
    if (state.config.isStudent && state.config.targetWall === 1300000) {
        effectiveWall = 1500000;
    }

    // Update Bonus Field
    monthlyBonusInput.value = state.bonuses[monthStr] || '';

    // Render Calendar Grid
    grid.innerHTML = '';
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    // Prev Month Fillers
    for (let i = firstDay - 1; i >= 0; i--) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.innerHTML = `<span class="day-num">${daysInPrevMonth - i}</span>`;
        grid.appendChild(div);
    }

    // Current Month Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${monthStr}-${String(d).padStart(2, '0')}`;
        const hours = state.shifts[dateKey];

        const div = document.createElement('div');
        div.className = `calendar-day ${hours ? 'has-value' : ''}`;
        div.innerHTML = `
      <span class="day-num">${d}</span>
      ${hours ? `<span class="day-hours">${hours}h</span>` : ''}
    `;
        div.onclick = () => openModal(dateKey);
        grid.appendChild(div);
    }

    // Next Month Fillers
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let d = 1; grid.children.length < totalCells; d++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.innerHTML = `<span class="day-num">${d}</span>`;
        grid.appendChild(div);
    }

    // Income Logic
    let totalAnnualTaxable = 0;
    let totalAnnualSocial = 0;
    const isMonthlyTransport = state.config.transportType === 'monthly';
    const isDailyTransport = state.config.transportType === 'daily';
    const monthlySocialTotals = {};

    // Add Bonus to Annual totals
    Object.entries(state.bonuses).forEach(([mKey, bonus]) => {
        totalAnnualTaxable += bonus;
        totalAnnualSocial += bonus;
        monthlySocialTotals[mKey] = (monthlySocialTotals[mKey] || 0) + bonus;
    });

    Object.entries(state.shifts).forEach(([date, hours]) => {
        const h = parseFloat(hours) || 0;
        const wage = h * state.config.hourlyWage;
        const mKey = date.slice(0, 7);
        totalAnnualTaxable += wage;
        let socialWage = wage;
        if (isDailyTransport && h > 0) socialWage += state.config.transportValue;
        monthlySocialTotals[mKey] = (monthlySocialTotals[mKey] || 0) + socialWage;
        totalAnnualSocial += socialWage;
    });

    if (isMonthlyTransport) {
        const monthsWithShifts = new Set(Object.keys(state.shifts).map(d => d.slice(0, 7)));
        totalAnnualSocial += monthsWithShifts.size * state.config.transportValue;
        monthsWithShifts.forEach(m => {
            monthlySocialTotals[m] = (monthlySocialTotals[m] || 0) + state.config.transportValue;
        });
    }

    // Update UI
    const progress = Math.min((totalAnnualSocial / effectiveWall) * 100, 100);
    document.getElementById('main-progress').style.width = `${progress}%`;
    document.getElementById('total-income-display').textContent = `¥${totalAnnualSocial.toLocaleString()}`;
    document.getElementById('remaining-info').textContent = `目標までの残り: ¥${Math.max(effectiveWall - totalAnnualSocial, 0).toLocaleString()}`;

    // Weekly Totals Calculation
    const weekTotals = [];
    let currentWeekSum = 0;

    // Create a flattened array of days that appear in the calendar grid for calculation
    const calendarDays = [];
    // Prev Month Fillers
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push({ hours: 0 }); // We don't track prev month hours in THIS month's weeks for simplicity, or we could if needed.
    }
    // Current Month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${monthStr}-${String(d).padStart(2, '0')}`;
        calendarDays.push({ hours: state.shifts[dateKey] || 0 });
    }
    // Next Month Fillers
    while (calendarDays.length % 7 !== 0) {
        calendarDays.push({ hours: 0 });
    }

    // Group into weeks and sum
    for (let i = 0; i < calendarDays.length; i++) {
        currentWeekSum += calendarDays[i].hours;
        if ((i + 1) % 7 === 0) {
            weekTotals.push(currentWeekSum);
            currentWeekSum = 0;
        }
    }

    // Alerts
    const alertBox = document.getElementById('alert-box');
    const alertMsg = document.getElementById('alert-message');
    let alerts = [];

    // Weekly 20h Check
    if (weekTotals.some(w => w >= 20)) {
        alerts.push('ℹ️ 週20時間を超えた週があります。社会保険の加入基準（職場の規模による）にご注意ください。');
    }

    if (state.config.isLargeCompany || state.config.targetWall === 1060000) {
        const currentMonthTotal = monthlySocialTotals[state.currentMonth] || 0;
        if (currentMonthTotal >= 88000) {
            alerts.push('⚠️ 今月の収入が8.8万円を超えました！<br><small>（※2026年10月よりこの金額制限は撤廃予定です）</small>');
        } else if (currentMonthTotal > 70000) {
            const bonusInCurrentMonth = state.bonuses[state.currentMonth] || 0;
            const remaining = 88000 - (currentMonthTotal - bonusInCurrentMonth);
            const hours = (Math.max(remaining, 0) / state.config.hourlyWage).toFixed(1);
            alerts.push(`今月の8.8万の壁まであと約${hours}時間です。`);
        }
    }

    if (totalAnnualSocial > effectiveWall * 0.9) {
        alerts.push(`⚠️ 目標の${effectiveWall / 10000}万円の壁が近づいています！`);
        if (effectiveWall === 1300000 || effectiveWall === 1500000) {
            alerts.push('<small>※2026年4月より、労働契約上の金額が130万円未満であれば、一時的な超過でも扶養に留まれるように運用が変更されます。</small>');
        }
    }

    if (alerts.length > 0) {
        alertBox.classList.remove('hidden');
        alertMsg.innerHTML = alerts.join('<br>');
    } else {
        alertBox.classList.add('hidden');
    }

    refreshIcons();
}

document.getElementById('current-month-select').value = state.currentMonth;
document.getElementById('current-month-select').addEventListener('change', (e) => {
    state.currentMonth = e.target.value;
    calculateAndRender();
});

const helpModal = document.getElementById('help-modal');
document.getElementById('open-help').addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});
document.getElementById('close-help-modal').addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

// Initial Load
window.addEventListener('DOMContentLoaded', () => {
    loadState();
    refreshIcons();
});
