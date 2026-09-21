/**
 * TurniCute Calendar - Application Logic (Con Installatore PWA Interattivo)
 */

let deferredPrompt = null;

// Presets dei turni aggiornati con Smontante
const SHIFT_PRESETS = {
  mattina: { name: 'Mattina', emoji: '☀️', start: '07:00', end: '14:00', breakMins: 0, rate: 12.50, cssClass: 'shift-mattina' },
  pomeriggio: { name: 'Pomeriggio', emoji: '🌆', start: '14:00', end: '20:00', breakMins: 0, rate: 12.50, cssClass: 'shift-pomeriggio' },
  notte: { name: 'Notte', emoji: '🌙', start: '20:00', end: '07:00', breakMins: 0, rate: 15.00, cssClass: 'shift-notte' },
  smontante: { name: 'Smontante', emoji: '💤', start: '07:00', end: '07:00', breakMins: 0, rate: 0.00, fixedHours: 0, cssClass: 'shift-smontante' },
  ferie: { name: 'Ferie', emoji: '🌴', start: '09:00', end: '15:00', breakMins: 0, rate: 12.50, fixedHours: 6, cssClass: 'shift-ferie' },
  riposo: { name: 'Riposo', emoji: '🏖️', start: '00:00', end: '00:00', breakMins: 0, rate: 0.00, cssClass: 'shift-riposo' },
  extra: { name: 'Extra', emoji: '⏱️', start: '09:00', end: '17:00', breakMins: 0, rate: 14.00, cssClass: 'shift-extra' }
};
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('ServiceWorker registration error:', err);
    });
  }
}

navigator.serviceWorker.register('sw.js');

const MONTH_NAMES_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// Stato dell'App
let currentDisplayDate = new Date();
let shiftDatabase = {}; // Format: { "YYYY-MM-DD": { type, start, end, breakMins, rate, notes } }
let selectedShiftType = 'mattina';

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();
  initLucideIcons();
  setupEventListeners();
  renderCalendar();
  registerServiceWorker();
  setupPWAInstaller();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Carica Dati da LocalStorage
function loadDatabase() {
  const saved = localStorage.getItem('turnicute_shifts');
  if (saved) {
    try {
      shiftDatabase = JSON.parse(saved);
    } catch (e) {
      console.error("Errore caricamento database turni", e);
      shiftDatabase = {};
    }
  }
}

// Salva Dati su LocalStorage
function saveDatabase() {
  localStorage.setItem('turnicute_shifts', JSON.stringify(shiftDatabase));
  renderCalendar();
}

// Configurazione Event Listeners
function setupEventListeners() {
  // Navigazione Mese
  document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));
  document.getElementById('today-btn').addEventListener('click', () => {
    currentDisplayDate = new Date();
    renderCalendar();
  });

  // Modale Modifica Turno
  document.getElementById('btn-close-shift-modal').addEventListener('click', () => closeModal('modal-shift'));
  document.getElementById('shift-form').addEventListener('submit', handleShiftFormSubmit);
  document.getElementById('btn-delete-shift').addEventListener('click', handleShiftDelete);

  // Preset buttons in shift modal
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedShiftType = btn.dataset.type;
      
      const preset = SHIFT_PRESETS[selectedShiftType];
      if (preset) {
        document.getElementById('shift-start').value = preset.start;
        document.getElementById('shift-end').value = preset.end;
        document.getElementById('shift-break').value = preset.breakMins;
        document.getElementById('shift-rate').value = preset.rate;
      }
    });
  });

  // Ciclo Rapido (Pattern Fill)
  document.getElementById('btn-quick-fill').addEventListener('click', () => {
    const todayStr = formatDateISO(new Date());
    document.getElementById('quick-start-date').value = todayStr;
    openModal('modal-quick-fill');
  });
  document.getElementById('btn-close-quick-modal').addEventListener('click', () => closeModal('modal-quick-fill'));
  document.getElementById('btn-cancel-quick-fill').addEventListener('click', () => closeModal('modal-quick-fill'));
  document.getElementById('quick-fill-form').addEventListener('submit', handleQuickFillSubmit);

  document.getElementById('quick-pattern-select').addEventListener('change', (e) => {
    const customWrapper = document.getElementById('custom-pattern-wrapper');
    customWrapper.style.display = e.target.value === 'custom' ? 'block' : 'none';
  });

  // Statistiche Modale
  document.getElementById('btn-stats-toggle').addEventListener('click', () => {
    updateModalStats();
    openModal('modal-stats');
  });
  document.getElementById('btn-close-stats-modal').addEventListener('click', () => closeModal('modal-stats'));

  // Guida iPhone / Android
  document.getElementById('btn-info-iphone').addEventListener('click', () => openModal('modal-iphone-info'));
  document.getElementById('btn-close-iphone-modal').addEventListener('click', () => closeModal('modal-iphone-info'));

  // Export iCal per Apple Calendar
  document.getElementById('btn-export-ical').addEventListener('click', exportToICalendar);

  // Backup & Import JSON
  document.getElementById('btn-export-json').addEventListener('click', exportJSONBackup);
  document.getElementById('input-import-json').addEventListener('change', importJSONBackup);
}

// Configurazione Installatore PWA (Android / Chrome / iOS Safari)
function setupPWAInstaller() {
  const installBtn = document.getElementById('btn-pwa-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  installBtn.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted PWA install prompt');
        }
        deferredPrompt = null;
      });
    } else {
      // Mostra modale con la guida guidata per Safari (iOS) o Chrome
      openModal('modal-iphone-info');
    }
  });
}

// Naviga Mese
function changeMonth(delta) {
  currentDisplayDate.setMonth(currentDisplayDate.getMonth() + delta);
  renderCalendar();
}

// Rendering del Calendario
function renderCalendar() {
  const year = currentDisplayDate.getFullYear();
  const month = currentDisplayDate.getMonth();

  document.getElementById('current-month-text').textContent = `${MONTH_NAMES_IT[month]} ${year}`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex < 0) firstDayIndex = 6;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const totalDaysCurrentMonth = lastDayOfMonth.getDate();
  const todayStr = formatDateISO(new Date());

  // Padding Mese Precedente
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevMonthLastDay - i + 1;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<div class="day-header"><span class="day-number">${dayNum}</span></div>`;
    grid.appendChild(cell);
  }

  // Giorni Mese Corrente
  let monthHours = 0;
  let monthEarnings = 0;
  let monthShiftsCount = 0;

  for (let day = 1; day <= totalDaysCurrentMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dateStr = formatDateISO(cellDate);
    const shift = shiftDatabase[dateStr];

    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';

    if (dateStr === todayStr) {
      cell.classList.add('is-today');
    }

    let innerHTML = `
      <div class="day-header">
        <span class="day-number">${day}</span>
        ${shift && shift.notes ? '<span class="day-notes-dot" title="Ha note"></span>' : ''}
      </div>
    `;

    if (shift) {
      const preset = SHIFT_PRESETS[shift.type] || SHIFT_PRESETS.extra;
      const hoursNet = calculateNetHoursForShift(shift);
      const earnings = hoursNet * (shift.rate || 0);

      if (shift.type !== 'riposo' && shift.type !== 'smontante') {
        monthHours += hoursNet;
        monthEarnings += earnings;
        monthShiftsCount++;
      } else if (shift.type === 'smontante') {
        monthShiftsCount++;
      }

      innerHTML += `
        <div class="shift-badge ${preset.cssClass}">
          <div class="shift-title">
            <span>${preset.emoji}</span>
            <span>${preset.name}</span>
          </div>
          ${shift.type === 'ferie' ? `<span class="shift-hours-text">Ferie (6h)</span>` : (shift.type !== 'riposo' && shift.type !== 'smontante' ? `<span class="shift-hours-text">${shift.start}-${shift.end} (${hoursNet}h)</span>` : '')}
        </div>
      `;
    }

    cell.innerHTML = innerHTML;
    cell.addEventListener('click', () => openShiftModal(dateStr));
    grid.appendChild(cell);
  }

  // Padding Mese Successivo
  const totalCellsSoFar = firstDayIndex + totalDaysCurrentMonth;
  const nextMonthPadding = (7 - (totalCellsSoFar % 7)) % 7;
  for (let j = 1; j <= nextMonthPadding; j++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<div class="day-header"><span class="day-number">${j}</span></div>`;
    grid.appendChild(cell);
  }

  // Statistiche Mese
  document.getElementById('stat-total-hours').textContent = `${monthHours.toFixed(1)}h`;
  document.getElementById('stat-total-earnings').textContent = `€ ${monthEarnings.toFixed(2)}`;
  document.getElementById('stat-total-shifts').textContent = `${monthShiftsCount} giorni`;

  initLucideIcons();
}

// Open Shift Modal
function openShiftModal(dateStr) {
  document.getElementById('shift-date-val').value = dateStr;
  
  const [y, m, d] = dateStr.split('-');
  document.getElementById('modal-shift-date-title').textContent = `Turno del ${d}/${m}/${y}`;

  const existingShift = shiftDatabase[dateStr];

  if (existingShift) {
    selectedShiftType = existingShift.type;
    document.getElementById('shift-start').value = existingShift.start;
    document.getElementById('shift-end').value = existingShift.end;
    document.getElementById('shift-break').value = existingShift.breakMins;
    document.getElementById('shift-rate').value = existingShift.rate;
    document.getElementById('shift-notes').value = existingShift.notes || '';
    document.getElementById('btn-delete-shift').style.display = 'inline-flex';
  } else {
    selectedShiftType = 'mattina';
    const preset = SHIFT_PRESETS.mattina;
    document.getElementById('shift-start').value = preset.start;
    document.getElementById('shift-end').value = preset.end;
    document.getElementById('shift-break').value = preset.breakMins;
    document.getElementById('shift-rate').value = preset.rate;
    document.getElementById('shift-notes').value = '';
    document.getElementById('btn-delete-shift').style.display = 'none';
  }

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === selectedShiftType);
  });

  openModal('modal-shift');
}

function handleShiftFormSubmit(e) {
  e.preventDefault();
  const dateStr = document.getElementById('shift-date-val').value;
  
  shiftDatabase[dateStr] = {
    type: selectedShiftType,
    start: document.getElementById('shift-start').value,
    end: document.getElementById('shift-end').value,
    breakMins: parseFloat(document.getElementById('shift-break').value) || 0,
    rate: parseFloat(document.getElementById('shift-rate').value) || 0,
    notes: document.getElementById('shift-notes').value.trim()
  };

  saveDatabase();
  closeModal('modal-shift');
}

function handleShiftDelete() {
  const dateStr = document.getElementById('shift-date-val').value;
  if (shiftDatabase[dateStr]) {
    delete shiftDatabase[dateStr];
    saveDatabase();
  }
  closeModal('modal-shift');
}

// Generatore Ciclo Rapido Turni
function handleQuickFillSubmit(e) {
  e.preventDefault();
  const startDateStr = document.getElementById('quick-start-date').value;
  if (!startDateStr) return;

  const patternSelect = document.getElementById('quick-pattern-select').value;
  let patternArray = [];

  if (patternSelect === '1M-1P-1N-1S-1R') {
    patternArray = ['mattina', 'pomeriggio', 'notte', 'smontante', 'riposo'];
  } else if (patternSelect === '2M-2P-2N-2R') {
    patternArray = ['mattina', 'mattina', 'pomeriggio', 'pomeriggio', 'notte', 'notte', 'riposo', 'riposo'];
  } else if (patternSelect === '5M-2R') {
    patternArray = ['mattina', 'mattina', 'mattina', 'mattina', 'mattina', 'riposo', 'riposo'];
  } else if (patternSelect === 'custom') {
    const raw = document.getElementById('custom-pattern-text').value.toUpperCase();
    const map = { 'M': 'mattina', 'P': 'pomeriggio', 'N': 'notte', 'S': 'smontante', 'SM': 'smontante', 'F': 'ferie', 'R': 'riposo' };
    patternArray = raw.split(',').map(s => map[s.trim()]).filter(Boolean);
  }

  if (patternArray.length === 0) {
    alert("Sequenza non valida! Usa M, P, N, S, F, R separati da virgola.");
    return;
  }

  const numMonths = parseInt(document.getElementById('quick-num-repeats').value) || 1;
  const totalDaysToFill = numMonths * 30;

  let current = new Date(startDateStr);

  for (let i = 0; i < totalDaysToFill; i++) {
    const dateStr = formatDateISO(current);
    const type = patternArray[i % patternArray.length];
    const preset = SHIFT_PRESETS[type];

    shiftDatabase[dateStr] = {
      type: type,
      start: preset.start,
      end: preset.end,
      breakMins: preset.breakMins,
      rate: preset.rate,
      notes: ''
    };

    current.setDate(current.getDate() + 1);
  }

  saveDatabase();
  closeModal('modal-quick-fill');
}

// Statistiche Dettagliate
function updateModalStats() {
  const counts = { mattina: 0, pomeriggio: 0, notte: 0, smontante: 0, ferie: 0, riposo: 0, extra: 0 };
  const hours = { mattina: 0, pomeriggio: 0, notte: 0, smontante: 0, ferie: 0, riposo: 0, extra: 0 };

  const currentYear = currentDisplayDate.getFullYear();
  const currentMonth = currentDisplayDate.getMonth();

  Object.entries(shiftDatabase).forEach(([dateStr, shift]) => {
    const [y, m] = dateStr.split('-').map(Number);
    if (y === currentYear && (m - 1) === currentMonth) {
      const type = shift.type || 'extra';
      counts[type] = (counts[type] || 0) + 1;

      const netH = calculateNetHoursForShift(shift);
      hours[type] = (hours[type] || 0) + netH;
    }
  });

  document.getElementById('count-mattina').textContent = counts.mattina;
  document.getElementById('hours-mattina').textContent = `${hours.mattina.toFixed(1)}h`;

  document.getElementById('count-pomeriggio').textContent = counts.pomeriggio;
  document.getElementById('hours-pomeriggio').textContent = `${hours.pomeriggio.toFixed(1)}h`;

  document.getElementById('count-notte').textContent = counts.notte;
  document.getElementById('hours-notte').textContent = `${hours.notte.toFixed(1)}h`;

  document.getElementById('count-smontante').textContent = counts.smontante;

  document.getElementById('count-ferie').textContent = counts.ferie;
  document.getElementById('hours-ferie').textContent = `${hours.ferie.toFixed(1)}h`;

  document.getElementById('count-riposo').textContent = counts.riposo;

  const totalShifts = (counts.mattina + counts.pomeriggio + counts.notte + counts.smontante + counts.ferie + counts.riposo) || 1;
  document.getElementById('bar-mattina').style.width = `${(counts.mattina / totalShifts) * 100}%`;
  document.getElementById('bar-pomeriggio').style.width = `${(counts.pomeriggio / totalShifts) * 100}%`;
  document.getElementById('bar-notte').style.width = `${(counts.notte / totalShifts) * 100}%`;
  document.getElementById('bar-smontante').style.width = `${(counts.smontante / totalShifts) * 100}%`;
  document.getElementById('bar-ferie').style.width = `${(counts.ferie / totalShifts) * 100}%`;
  document.getElementById('bar-riposo').style.width = `${(counts.riposo / totalShifts) * 100}%`;
}

// Esportazione iCal per Apple Calendar
function exportToICalendar() {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurniCute Calendar//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Turni di Lavoro 🌸'
  ];

  Object.entries(shiftDatabase).forEach(([dateStr, shift]) => {
    if (shift.type === 'riposo' || shift.type === 'smontante') return;

    const preset = SHIFT_PRESETS[shift.type] || SHIFT_PRESETS.extra;
    const dateFormatted = dateStr.replace(/-/g, '');

    const [startH, startM] = shift.start.split(':');
    const [endH, endM] = shift.end.split(':');

    let dtStart = `${dateFormatted}T${startH}${startM}00`;
    let dtEnd = `${dateFormatted}T${endH}${endM}00`;

    if (parseInt(endH) < parseInt(startH)) {
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatDateISO(nextDay).replace(/-/g, '');
      dtEnd = `${nextDayStr}T${endH}${endM}00`;
    }

    icsContent.push(
      'BEGIN:VEVENT',
      `SUMMARY:${preset.emoji} ${preset.name}`,
      `DESCRIPTION:Ore: ${shift.type === 'ferie' ? '6 ore ferie' : shift.start + ' - ' + shift.end}. ${shift.notes ? 'Note: ' + shift.notes : ''}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `UID:turnicute-${dateStr}-${shift.type}@local`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Turni_Apple_Calendario_${formatDateISO(new Date())}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Backup & Import JSON
function exportJSONBackup() {
  const jsonStr = JSON.stringify(shiftDatabase, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `backup_turnicute_${formatDateISO(new Date())}.json`;
  link.click();
}

function importJSONBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (typeof imported === 'object') {
        shiftDatabase = { ...shiftDatabase, ...imported };
        saveDatabase();
        alert("✨ Backup ripristinato con successo!");
        closeModal('modal-stats');
      }
    } catch (err) {
      alert("Errore nel file di backup JSON.");
    }
  };
  reader.readAsText(file);
}

// Helper Funzioni
function calculateNetHoursForShift(shift) {
  if (shift.type === 'ferie') return 6.0;
  if (shift.type === 'riposo' || shift.type === 'smontante') return 0.0;

  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Turno notturno
  }

  let totalMins = (endMinutes - startMinutes) - (shift.breakMins || 0);
  return Math.max(0, totalMins / 60);
}

function formatDateISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('ServiceWorker registration skipped in dev mode', err);
    });
  }
}
