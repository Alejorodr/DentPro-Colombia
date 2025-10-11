// === Datos base: profesionales y especialidades ===============================
// Estructura mínima para poblar selects, disponibilidad y resumen.
const professionals = [
  {
    id: 'laura-martinez',
    name: 'Dra. Laura Martínez',
    specialties: ['Estética y Diseño de Sonrisa', 'Odontología Preventiva'],
    detail: 'Consultorio 2 · Diseño de sonrisa digital',
    // Disponibilidad por día de la semana: 0=Dom, 1=Lun, ..., 6=Sáb
    availability: {
      1: ['08:00', '09:30', '11:00', '15:00'],
      3: ['08:30', '10:00', '11:30', '16:00'],
      5: ['09:00', '10:30', '14:00']
    }
  },
  {
    id: 'camilo-rodriguez',
    name: 'Dr. Camilo Rodríguez',
    specialties: ['Rehabilitación Oral', 'Urgencias 24/7'],
    detail: 'Consultorio 1 · Cirugía guiada',
    availability: {
      1: ['07:30', '09:00', '10:30', '13:00'],
      2: ['08:00', '10:00', '14:30', '16:00'],
      4: ['09:00', '11:30', '15:00']
    }
  },
  {
    id: 'natalia-gomez',
    name: 'Dra. Natalia Gómez',
    specialties: ['Odontopediatría', 'Odontología Preventiva'],
    detail: 'Consultorio kids · Experiencias inmersivas',
    availability: {
      2: ['08:30', '09:30', '11:00', '15:30'],
      4: ['08:00', '09:30', '11:30', '14:30'],
      6: ['09:00', '10:00', '11:30']
    }
  },
  {
    id: 'andres-lopez',
    name: 'Dr. Andrés López',
    specialties: ['Ortodoncia Inteligente'],
    detail: 'Consultorio 3 · Alineadores invisibles',
    availability: {
      1: ['12:00', '13:00', '17:00'],
      3: ['09:00', '12:30', '18:00'],
      5: ['08:30', '10:30', '16:30']
    }
  }
];

// Derivar catálogo de especialidades único + id legible para HTML
const specialties = Array.from(
  new Set(professionals.flatMap((p) => p.specialties))
).map((name) => ({
  id: name.toLowerCase().replace(/[^a-záéíóúñ0-9]+/gi, '-'),
  name
}));

// === Constantes de almacenamiento y formato ==================================
const STORAGE_KEYS = {
  appointments: 'dentpro-agenda',
  notifications: 'dentpro-notifications'
};

// Estado de selección de la interfaz
const state = {
  selectedSlot: null,
  selectedDate: null,
  selectedProfessional: null
};

// Estado para compartir y acciones descargables
const shareState = { details: null };
const actionState = { downloadUrl: null };

// Formateadores reutilizables para fechas/horas
const formatters = {
  longDate: new Intl.DateTimeFormat('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  longDateTime: new Intl.DateTimeFormat('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  history: new Intl.DateTimeFormat('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  shortDate: new Intl.DateTimeFormat('es-CO', { month: 'short', day: 'numeric' }),
  time: new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' })
};

const AGENDA_LOCATION = 'Dent Pro · Cra. 11 # 10-38, Centro Empresarial Sabana, Chía';

// === Cache de elementos del DOM ==============================================
const elements = {
  specialtySelect: document.getElementById('especialidad'),
  professionalSelect: document.getElementById('profesional'),
  professionalDetail: document.getElementById('profesional-detalle'),
  dateInput: document.getElementById('fecha'),
  slotsContainer: document.getElementById('horarios'),
  form: document.getElementById('form-agenda'),
  summary: document.getElementById('agenda-resumen'),
  history: document.getElementById('agenda-historial'),
  feedback: document.getElementById('agenda-feedback'), // opcional en HTML
  actionsContainer: document.getElementById('agenda-actions'), // opcional en HTML
  shareButton: document.getElementById('agenda-compartir'), // opcional en HTML
  reminderButton: document.getElementById('boton-recordatorio'),
  reminderModal: document.getElementById('recordatorio-modal'),
  reminderForm: document.getElementById('recordatorio-form'),
  reminderResult: document.getElementById('recordatorio-resultado'),
  clientAppointments: document.getElementById('panel-turnos'),
  notificationToggle: document.getElementById('toggle-notificaciones'),
  notificationStatus: document.getElementById('estado-notificaciones')
};

const navToggle = document.querySelector('.main-nav__toggle');
const navLinks = document.getElementById('menu-principal');
const navToggleLabel = document.getElementById('texto-toggle-menu'); // opcional
const portalTabs = Array.from(document.querySelectorAll('[data-portal-tab]'));
const portalPanels = Array.from(document.querySelectorAll('[data-portal-panel]'));

// === Navegación principal (menú responsive accesible) ========================
function initNavigation() {
  if (!navToggle || !navLinks) return;

  const openNav = () => {
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Cerrar menú de navegación');
    if (navToggleLabel) navToggleLabel.textContent = 'Cerrar menú';
    navLinks.classList.add('is-open');
    document.body.classList.add('is-nav-open');
  };

  const closeNav = ({ focusToggle } = {}) => {
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    if (navToggleLabel) navToggleLabel.textContent = 'Abrir menú';
    navLinks.classList.remove('is-open');
    document.body.classList.remove('is-nav-open');
    if (focusToggle) navToggle.focus();
  };

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    expanded ? closeNav() : openNav();
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeNav());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('is-nav-open')) {
      closeNav({ focusToggle: true });
    }
  });
}

// === Especialidades y profesionales ==========================================
function populateSpecialties() {
  if (!elements.specialtySelect) return;
  specialties.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  specialties.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.name;
    option.textContent = s.name;
    elements.specialtySelect.append(option);
  });
}

function resetProfessionals() {
  if (!elements.professionalSelect || !elements.professionalDetail) return;
  elements.professionalSelect.innerHTML = '<option value="" disabled selected>Selecciona un profesional</option>';
  elements.professionalDetail.textContent = '';
  state.selectedProfessional = null;
}

function populateProfessionals(specialtyName) {
  if (!elements.professionalSelect) return;
  resetProfessionals();
  const filtered = professionals.filter((p) => p.specialties.includes(specialtyName));
  filtered.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    elements.professionalSelect.append(option);
  });
  // Autoseleccionar si solo hay uno
  if (filtered.length === 1) {
    elements.professionalSelect.value = filtered[0].id;
    updateProfessionalDetail(filtered[0].id);
  }
}

function updateProfessionalDetail(professionalId) {
  if (!elements.professionalDetail) return;
  const professional = professionals.find((p) => p.id === professionalId);
  if (!professional) {
    elements.professionalDetail.textContent = '';
    state.selectedProfessional = null;
    return;
  }
  elements.professionalDetail.textContent = professional.detail;
  state.selectedProfessional = professional;
  renderSlots();
  updateSummary();
}

// === Fecha mínima en date input ==============================================
function setDateMinimum() {
  if (!elements.dateInput) return;
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  elements.dateInput.min = `${year}-${month}-${day}`;
}

// === Render de horarios según profesional + día ==============================
function renderSlots() {
  if (!elements.slotsContainer) return;
  elements.slotsContainer.innerHTML = '';
  state.selectedSlot = null;

  const { selectedProfessional, selectedDate } = state;
  if (!selectedProfessional || !selectedDate) {
    elements.slotsContainer.innerHTML = '<p class="form-helper">Selecciona una fecha y profesional para ver los horarios.</p>';
    return;
  }

  const date = new Date(selectedDate);
  const weekday = date.getDay(); // 0..6
  const slots = selectedProfessional.availability[weekday];

  if (!slots || slots.length === 0) {
    elements.slotsContainer.innerHTML = '<p class="form-helper">El profesional no tiene disponibilidad este día. Prueba con otra fecha.</p>';
    return;
  }

  slots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'agenda__slot';
    button.textContent = slot;
    button.dataset.slot = slot;
    button.addEventListener('click', () => {
      state.selectedSlot = slot;
      elements.slotsContainer.querySelectorAll('.agenda__slot').forEach((b) => b.classList.remove('is-selected'));
      button.classList.add('is-selected');
      updateSummary();
    });
    elements.slotsContainer.append(button);
  });
}

// === Resumen de cita ==========================================================
function updateSummary() {
  if (!elements.summary) return;
  const { selectedProfessional, selectedDate, selectedSlot } = state;

  if (!selectedProfessional || !selectedDate) {
    resetAgendaActions();
    elements.summary.innerHTML = '<p>Selecciona opciones para ver el resumen.</p>';
    updateAgendaFeedback();
    return;
  }

  const date = new Date(selectedDate);
  const formattedDate = formatters.longDate.format(date);
  const slotText = selectedSlot ? ` a las <strong>${selectedSlot}</strong>` : '';
  const availabilityNote = selectedSlot ? '' : '<p class="form-helper">Selecciona un horario para confirmar tu cita.</p>';

  if (!selectedSlot) {
    resetAgendaActions();
    updateAgendaFeedback();
  }

  elements.summary.innerHTML = `
    <p><strong>Profesional:</strong> ${selectedProfessional.name}</p>
    <p><strong>Fecha:</strong> ${formattedDate}${slotText}</p>
    ${availabilityNote}
  `;
}

// === Utilidad: generar archivo .ics ==========================================
function createICS({ title, description, startDate, durationMinutes, location }) {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dent Pro//Agenda Inteligente//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@dentprocol.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

// === Feedback y acciones (descarga/compartir) =================================
function updateAgendaFeedback(message = '', type = 'info') {
  if (!elements.feedback) return;
  if (!message) {
    elements.feedback.textContent = '';
    elements.feedback.hidden = true;
    elements.feedback.removeAttribute('data-state');
    return;
  }
  elements.feedback.textContent = message;
  elements.feedback.dataset.state = type;
  elements.feedback.hidden = false;
}

function resetAgendaActions() {
  if (!elements.actionsContainer) return;
  if (actionState.downloadUrl) {
    URL.revokeObjectURL(actionState.downloadUrl);
    actionState.downloadUrl = null;
  }
  const downloadLink = elements.actionsContainer.querySelector('[data-action="download"]');
  if (downloadLink) downloadLink.remove();

  if (elements.shareButton) {
    elements.shareButton.hidden = true;
    elements.shareButton.setAttribute('aria-hidden', 'true');
  }
  elements.actionsContainer.hidden = true;
  shareState.details = null;
}

function showShareButton(details) {
  if (!navigator.share || !elements.shareButton) return;
  shareState.details = details;
  elements.shareButton.hidden = false;
  elements.shareButton.setAttribute('aria-hidden', 'false');
}

function renderAgendaActions({ downloadUrl, downloadFilename, shareDetails }) {
  if (!elements.actionsContainer) return;
  elements.actionsContainer.hidden = false;

  let downloadLink = elements.actionsContainer.querySelector('[data-action="download"]');
  if (!downloadLink) {
    downloadLink = document.createElement('a');
    downloadLink.dataset.action = 'download';
    downloadLink.className = 'btn btn--ghost';
    elements.actionsContainer.prepend(downloadLink);
  }
  downloadLink.href = downloadUrl;
  downloadLink.download = downloadFilename;
  downloadLink.textContent = 'Descargar recordatorio (.ics)';
  downloadLink.setAttribute('aria-label', 'Descargar recordatorio en formato calendario');

  actionState.downloadUrl = downloadUrl;

  if (navigator.share && elements.shareButton && shareDetails) {
    showShareButton(shareDetails);
  }
}

async function handleShareClick() {
  if (!navigator.share || !shareState.details) return;
  const { patientName, specialty, professionalName, formattedDate, location } = shareState.details;

  try {
    await navigator.share({
      title: 'Cita Dent Pro confirmada',
      text: `${patientName} - ${specialty} con ${professionalName} · ${formattedDate} · ${location}`,
      url: `${window.location.origin}${window.location.pathname}#agenda`
    });
    updateAgendaFeedback('Compartiste tu cita correctamente. Nos vemos pronto.', 'success');
  } catch (error) {
    if (error.name !== 'AbortError') {
      updateAgendaFeedback('No pudimos compartir la confirmación. Intenta nuevamente.', 'warning');
    }
  }
}

function setupShareButton() {
  if (!elements.actionsContainer) return;

  if (!navigator.share && elements.shareButton) {
    elements.shareButton.remove();
    elements.shareButton = null;
  }

  if (navigator.share && elements.shareButton) {
    elements.shareButton.hidden = true;
    elements.shareButton.setAttribute('aria-hidden', 'true');
    elements.shareButton.addEventListener('click', handleShareClick);
  }

  elements.actionsContainer.hidden = true;
}

// === Historial en localStorage + panel mini-app ==============================
function getStoredAppointments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments) || '[]');
  } catch (error) {
    console.warn('No fue posible recuperar el historial de citas', error);
    return [];
  }
}

function persistHistory(entry) {
  try {
    const history = getStoredAppointments();
    history.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(history.slice(0, 5)));
  } catch (error) {
    console.warn('No fue posible guardar el historial de citas', error);
  }
  renderHistory();
}

function renderHistory() {
  if (!elements.history) return;
  const history = getStoredAppointments();
  elements.history.innerHTML = '';
  if (history.length === 0) {
    elements.history.innerHTML = '<li>Aún no tienes solicitudes recientes.</li>';
    renderClientAppointments(history);
    return;
  }

  history.forEach((item) => {
    const date = new Date(item.dateTime);
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${item.professional}</strong><br>
      ${formatters.history.format(date)} · ${item.specialty}
    `;
    elements.history.append(li);
  });
  renderClientAppointments(history);
}

function renderClientAppointments(history) {
  if (!elements.clientAppointments) return;
  elements.clientAppointments.innerHTML = '';

  if (!history || history.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'app-card__empty';
    empty.textContent = 'Agenda tu próxima cita para verla aquí.';
    elements.clientAppointments.append(empty);
    return;
  }

  history.slice(0, 3).forEach((item) => {
    const date = new Date(item.dateTime);
    const el = document.createElement('li');
    el.innerHTML = `
      <span><strong>${formatters.shortDate.format(date)}</strong> · ${item.specialty}</span>
      <span>${formatters.time.format(date)} · ${item.professional}</span>
    `;
    elements.clientAppointments.append(el);
  });
}

// === Envío del formulario de agenda =========================================
function handleFormSubmit(event) {
  event.preventDefault();
  updateAgendaFeedback();

  if (!state.selectedSlot || !state.selectedProfessional) {
    updateAgendaFeedback('Selecciona un horario disponible para confirmar tu cita.', 'warning');
    return;
  }

  const formData = new FormData(elements.form);
  const name = (formData.get('paciente') || '').trim();
  const contact = (formData.get('contacto') || '').trim();
  const specialty = formData.get('especialidad');
  const dateString = formData.get('fecha');

  if (!dateString) {
    updateAgendaFeedback('Selecciona una fecha válida para continuar.', 'warning');
    return;
  }

  const [hours, minutes] = state.selectedSlot.split(':');
  // Nota: zona horaria fija -05:00. Ajusta si tu backend requiere UTC u otra TZ.
  const startDate = new Date(`${dateString}T${hours}:${minutes}:00-05:00`);
  const professionalName = state.selectedProfessional.name;

  const icsContent = createICS({
    title: `Cita Dent Pro - ${professionalName}`,
    description: `Paciente: ${name}. Especialidad: ${specialty}. Contacto: ${contact}.`,
    startDate,
    durationMinutes: 50,
    location: AGENDA_LOCATION
  });

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const formattedDateTime = formatters.longDateTime.format(startDate);

  elements.summary.innerHTML = `
    <p><strong>¡Cita agendada!</strong></p>
    <p>${name || 'Paciente'}, te esperamos el ${formattedDateTime} con ${professionalName}.</p>
    <p>Te enviaremos confirmación y recordatorios automáticos por WhatsApp y correo.</p>
  `;

  renderAgendaActions({
    downloadUrl: url,
    downloadFilename: `dentpro-${dateString}-${state.selectedProfessional.id}.ics`,
    shareDetails: {
      patientName: name || 'Paciente Dent Pro',
      specialty,
      professionalName,
      formattedDate: formattedDateTime,
      location: AGENDA_LOCATION
    }
  });

  persistHistory({
    specialty,
    professional: professionalName,
    dateTime: startDate.toISOString()
  });

  // Reset de formulario y estado de selección
  elements.form.reset();
  elements.specialtySelect.value = '';
  elements.dateInput.value = '';
  resetProfessionals();
  state.selectedSlot = null;
  state.selectedDate = null;
  state.selectedProfessional = null;
  elements.slotsContainer.innerHTML = '';
  updateAgendaFeedback('Te enviamos la confirmación a tu correo y WhatsApp.', 'success');

  // Liberar URL del blob al cabo de 60s
  setTimeout(() => {
    if (actionState.downloadUrl === url) {
      URL.revokeObjectURL(url);
      actionState.downloadUrl = null;
    } else {
      URL.revokeObjectURL(url);
    }
  }, 60_000);
}

// === Cambios de fecha ========================================================
function handleDateChange(event) {
  state.selectedDate = event.target.value || null;
  renderSlots();
  updateSummary();
}

// === Modal de recordatorio personalizado (.ics rápido) =======================
function initReminderModal() {
  if (!elements.reminderButton || !elements.reminderModal) return;

  const closeModal = () => {
    elements.reminderModal.hidden = true;
    document.body.style.overflow = '';
  };

  elements.reminderButton.addEventListener('click', () => {
    elements.reminderModal.hidden = false;
    document.body.style.overflow = 'hidden';
    elements.reminderResult.textContent = '';
    elements.reminderForm.reset();
    const firstField = elements.reminderForm.querySelector('input, textarea');
    if (firstField) firstField.focus();
  });

  elements.reminderModal.querySelector('.reminder-modal__close')?.addEventListener('click', closeModal);

  elements.reminderModal.addEventListener('click', (e) => {
    if (e.target === elements.reminderModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.reminderModal.hidden) closeModal();
  });

  elements.reminderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.reminderForm);
    const email = formData.get('recordatorio-contacto');
    const message = formData.get('recordatorio-mensaje');
    const date = formData.get('recordatorio-fecha');
    const reminderDate = new Date(date);

    const icsContent = createICS({
      title: 'Recordatorio personalizado Dent Pro',
      description: message,
      startDate: reminderDate,
      durationMinutes: 30,
      location: email
    });

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    elements.reminderResult.innerHTML = `
      <p>Recordatorio programado para <strong>${new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'full', timeStyle: 'short'
      }).format(reminderDate)}</strong>.</p>
      <p>Guárdalo en tu calendario:</p>
    `;

    const link = document.createElement('a');
    link.href = url;
    link.download = `recordatorio-dentpro-${date.replace(/[:T-]/g, '')}.ics`;
    link.textContent = 'Descargar recordatorio (.ics)';
    link.className = 'btn btn--primary';
    elements.reminderResult.append(link);

    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  });
}

// === Notificaciones locales (permiso y preferencia) ==========================
function updateNotificationStatus({ enabled, message }) {
  if (!elements.notificationToggle || !elements.notificationStatus) return;
  elements.notificationToggle.classList.toggle('is-active', enabled);
  elements.notificationToggle.textContent = enabled ? 'Activadas' : 'Activar';
  elements.notificationToggle.setAttribute('aria-pressed', String(enabled));
  if (message) elements.notificationStatus.textContent = message;
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.warn('No fue posible solicitar permiso de notificaciones', error);
    return 'default';
  }
}

function initNotifications() {
  if (!elements.notificationToggle || !elements.notificationStatus) return;

  const isSupported = 'Notification' in window;
  const storedPreference = localStorage.getItem(STORAGE_KEYS.notifications) === 'enabled';

  if (!isSupported) {
    updateNotificationStatus({
      enabled: false,
      message: 'Tu navegador no soporta notificaciones push. Mantendremos los recordatorios por correo y WhatsApp.'
    });
    elements.notificationToggle.disabled = true;
    return;
  }

  if (Notification.permission === 'granted' && storedPreference) {
    updateNotificationStatus({
      enabled: true,
      message: 'Notificaciones activas: recibirás alertas 48 y 12 horas antes de tu turno.'
    });
  } else if (Notification.permission === 'denied') {
    updateNotificationStatus({
      enabled: false,
      message: 'Habilita las notificaciones desde tu navegador para recibir alertas automáticas.'
    });
  } else {
    updateNotificationStatus({
      enabled: storedPreference,
      message: storedPreference
        ? 'Notificaciones activas: recibirás alertas 48 y 12 horas antes de tu turno.'
        : 'Recibe avisos 48 y 12 horas antes de cada turno cuando actives las notificaciones.'
    });
  }

  elements.notificationToggle.addEventListener('click', async () => {
    elements.notificationToggle.disabled = true;
    const currentlyEnabled = elements.notificationToggle.classList.contains('is-active');

    if (currentlyEnabled) {
      localStorage.setItem(STORAGE_KEYS.notifications, 'disabled');
      updateNotificationStatus({
        enabled: false,
        message: 'Las notificaciones en el dispositivo están desactivadas. Puedes volver a activarlas cuando quieras.'
      });
      elements.notificationToggle.disabled = false;
      return;
    }

    const permission = await requestNotificationPermission();

    if (permission === 'granted') {
      localStorage.setItem(STORAGE_KEYS.notifications, 'enabled');
      updateNotificationStatus({
        enabled: true,
        message: 'Notificaciones activadas. Te enviaremos recordatorios 48 y 12 horas antes de tu cita.'
      });
      try {
        new Notification('Dent Pro', {
          body: 'Ejemplo de recordatorio: tu cita está confirmada y recibirás alertas automáticas.',
          icon: 'images/dentpro-logo.svg'
        });
      } catch (error) {
        console.warn('No fue posible mostrar la notificación de prueba', error);
      }
    } else if (permission === 'denied') {
      updateNotificationStatus({
        enabled: false,
        message: 'No pudimos activar las notificaciones. Ajusta los permisos de tu navegador para recibir alertas.'
      });
      localStorage.setItem(STORAGE_KEYS.notifications, 'disabled');
    } else if (permission === 'unsupported') {
      updateNotificationStatus({
        enabled: false,
        message: 'Tu dispositivo no soporta notificaciones push, pero te enviaremos recordatorios por correo y WhatsApp.'
      });
    } else {
      updateNotificationStatus({
        enabled: false,
        message: 'No se completó la activación. Puedes intentarlo nuevamente.'
      });
    }

    elements.notificationToggle.disabled = false;
  });
}

// === Tabs del portal y formularios simulados =================================
function initPortalTabs() {
  if (!portalTabs.length || !portalPanels.length) return;
  portalTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.portalTab;
      portalTabs.forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      portalPanels.forEach((panel) => {
        const isTarget = panel.dataset.portalPanel === target;
        panel.hidden = !isTarget;
        panel.classList.toggle('is-active', isTarget);
        if (!isTarget) panel.querySelector('.portal__feedback')?.textContent = '';
      });
    });
  });
}

function initPortalForms() {
  const forms = document.querySelectorAll('.portal__form');
  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const panel = form.closest('.portal__panel');
      const feedback = panel?.querySelector('.portal__feedback');
      if (!feedback) return;

      const role = panel?.dataset.portalPanel;
      let message = '';
      if (role === 'pacientes') message = 'Listo, autenticamos tu cuenta y puedes continuar con la gestión de turnos.';
      else if (role === 'equipo') message = 'Acceso verificado. Carga tus evoluciones y consulta tu agenda en tiempo real.';
      else if (role === 'admin') message = 'Bienvenida/o al centro de operaciones. Los dashboards están listos.';
      feedback.textContent = message;
    });
  });
}

// === PWA: registro de service worker (opcional) ===============================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) =>
      console.warn('No fue posible registrar el service worker', e)
    );
  }
}

// === Inicialización ===========================================================
function init() {
  initNavigation();
  populateSpecialties();
  setDateMinimum();
  renderHistory();
  setupShareButton();
  resetAgendaActions();

  elements.specialtySelect?.addEventListener('change', (e) => {
    populateProfessionals(e.target.value);
    updateSummary();
  });

  elements.professionalSelect?.addEventListener('change', (e) => {
    updateProfessionalDetail(e.target.value);
  });

  elements.dateInput?.addEventListener('change', handleDateChange);
  elements.form?.addEventListener('submit', handleFormSubmit);

  initReminderModal();
  initNotifications();
  initPortalTabs();
  initPortalForms();
  updateSummary();
  updateAgendaFeedback();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
