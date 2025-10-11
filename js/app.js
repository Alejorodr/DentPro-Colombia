const professionals = [
  {
    id: 'laura-martinez',
    name: 'Dra. Laura Martínez',
    specialties: ['Estética y Diseño de Sonrisa', 'Odontología Preventiva'],
    detail: 'Consultorio 2 · Diseño de sonrisa digital',
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

const specialties = Array.from(
  new Set(professionals.flatMap((professional) => professional.specialties))
).map((name) => ({
  id: name.toLowerCase().replace(/[^a-záéíóúñ0-9]+/gi, '-'),
  name
}));

const STORAGE_KEYS = {
  appointments: 'dentpro-agenda',
  notifications: 'dentpro-notifications'
};

const state = {
  selectedSlot: null,
  selectedDate: null,
  selectedProfessional: null
};

const elements = {
  specialtySelect: document.getElementById('especialidad'),
  professionalSelect: document.getElementById('profesional'),
  professionalDetail: document.getElementById('profesional-detalle'),
  dateInput: document.getElementById('fecha'),
  slotsContainer: document.getElementById('horarios'),
  form: document.getElementById('form-agenda'),
  summary: document.getElementById('agenda-resumen'),
  history: document.getElementById('agenda-historial'),
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
const portalTabs = Array.from(document.querySelectorAll('[data-portal-tab]'));
const portalPanels = Array.from(document.querySelectorAll('[data-portal-panel]'));

function initNavigation() {
  if (!navToggle || !navLinks) return;
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navLinks.classList.toggle('is-open', !expanded);
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('is-open');
    });
  });
}

function populateSpecialties() {
  specialties.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  specialties.forEach((specialty) => {
    const option = document.createElement('option');
    option.value = specialty.name;
    option.textContent = specialty.name;
    elements.specialtySelect.append(option);
  });
}

function resetProfessionals() {
  elements.professionalSelect.innerHTML = '<option value="" disabled selected>Selecciona un profesional</option>';
  elements.professionalDetail.textContent = '';
  state.selectedProfessional = null;
}

function populateProfessionals(specialtyName) {
  resetProfessionals();
  const filtered = professionals.filter((professional) => professional.specialties.includes(specialtyName));
  filtered.forEach((professional) => {
    const option = document.createElement('option');
    option.value = professional.id;
    option.textContent = professional.name;
    elements.professionalSelect.append(option);
  });

  if (filtered.length === 1) {
    elements.professionalSelect.value = filtered[0].id;
    updateProfessionalDetail(filtered[0].id);
  }
}

function updateProfessionalDetail(professionalId) {
  const professional = professionals.find((item) => item.id === professionalId);
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

function setDateMinimum() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  elements.dateInput.min = `${year}-${month}-${day}`;
}

function renderSlots() {
  elements.slotsContainer.innerHTML = '';
  state.selectedSlot = null;
  const { selectedProfessional, selectedDate } = state;
  if (!selectedProfessional || !selectedDate) {
    elements.slotsContainer.innerHTML = '<p class="form-helper">Selecciona una fecha y profesional para ver los horarios.</p>';
    return;
  }

  const date = new Date(selectedDate);
  const weekday = date.getDay();
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
      elements.slotsContainer.querySelectorAll('.agenda__slot').forEach((slotButton) => {
        slotButton.classList.remove('is-selected');
      });
      button.classList.add('is-selected');
      updateSummary();
    });
    elements.slotsContainer.append(button);
  });
}

function updateSummary() {
  const { selectedProfessional, selectedDate, selectedSlot } = state;
  if (!selectedProfessional || !selectedDate) {
    elements.summary.innerHTML = '<p>Selecciona opciones para ver el resumen.</p>';
    return;
  }

  const date = new Date(selectedDate);
  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);

  const slotText = selectedSlot ? ` a las <strong>${selectedSlot}</strong>` : '';
  const availabilityNote = selectedSlot
    ? ''
    : '<p class="form-helper">Selecciona un horario para confirmar tu cita.</p>';

  elements.summary.innerHTML = `
    <p><strong>Profesional:</strong> ${selectedProfessional.name}</p>
    <p><strong>Fecha:</strong> ${formattedDate}${slotText}</p>
    ${availabilityNote}
  `;
}

function createICS({ title, description, startDate, durationMinutes, location }) {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const formatDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
    const element = document.createElement('li');
    element.innerHTML = `
      <span><strong>${new Intl.DateTimeFormat('es-CO', {
        month: 'short',
        day: 'numeric'
      }).format(date)}</strong> · ${item.specialty}</span>
      <span>${new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)} · ${item.professional}</span>
    `;
    elements.clientAppointments.append(element);
  });
}

function renderHistory() {
  const history = getStoredAppointments();
  elements.history.innerHTML = '';
  if (history.length === 0) {
    elements.history.innerHTML = '<li>Aún no tienes solicitudes recientes.</li>';
    renderClientAppointments(history);
    return;
  }

  history.forEach((item) => {
    const date = new Date(item.dateTime);
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <strong>${item.professional}</strong><br>
      ${new Intl.DateTimeFormat('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)} · ${item.specialty}
    `;
    elements.history.append(listItem);
  });
  renderClientAppointments(history);
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (!state.selectedSlot || !state.selectedProfessional) {
    alert('Por favor selecciona un horario disponible antes de confirmar.');
    return;
  }

  const formData = new FormData(elements.form);
  const name = formData.get('paciente');
  const contact = formData.get('contacto');
  const specialty = formData.get('especialidad');
  const dateString = formData.get('fecha');
  const [hours, minutes] = state.selectedSlot.split(':');
  const startDate = new Date(`${dateString}T${hours}:${minutes}:00-05:00`);

  const icsContent = createICS({
    title: `Cita Dent Pro - ${state.selectedProfessional.name}`,
    description: `Paciente: ${name}. Especialidad: ${specialty}. Contacto: ${contact}.`,
    startDate,
    durationMinutes: 50,
    location: 'Dent Pro · Cra. 11 # 10-38, Centro Empresarial Sabana, Chía'
  });

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  elements.summary.innerHTML = `
    <p><strong>¡Cita agendada!</strong></p>
    <p>${name}, te esperamos el ${new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(startDate)} con ${state.selectedProfessional.name}.</p>
    <p>Te enviaremos confirmación y recordatorios automáticos por WhatsApp y correo.</p>
  `;

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `dentpro-${dateString}-${state.selectedProfessional.id}.ics`;
  downloadLink.textContent = 'Descargar recordatorio (.ics)';
  downloadLink.className = 'btn btn--ghost';
  downloadLink.style.marginTop = '1rem';
  elements.summary.append(downloadLink);

  persistHistory({
    specialty,
    professional: state.selectedProfessional.name,
    dateTime: startDate.toISOString()
  });

  elements.form.reset();
  elements.specialtySelect.value = '';
  resetProfessionals();
  state.selectedSlot = null;
  state.selectedDate = null;
  state.selectedProfessional = null;
  elements.slotsContainer.innerHTML = '';
  updateSummary();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}

function handleDateChange(event) {
  state.selectedDate = event.target.value || null;
  renderSlots();
  updateSummary();
}

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
    if (firstField) {
      firstField.focus();
    }
  });

  elements.reminderModal.querySelector('.reminder-modal__close')?.addEventListener('click', closeModal);

  elements.reminderModal.addEventListener('click', (event) => {
    if (event.target === elements.reminderModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.reminderModal.hidden) {
      closeModal();
    }
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
        dateStyle: 'full',
        timeStyle: 'short'
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

function updateNotificationStatus({ enabled, message }) {
  if (!elements.notificationToggle || !elements.notificationStatus) return;
  elements.notificationToggle.classList.toggle('is-active', enabled);
  elements.notificationToggle.textContent = enabled ? 'Activadas' : 'Activar';
  elements.notificationToggle.setAttribute('aria-pressed', String(enabled));
  if (message) {
    elements.notificationStatus.textContent = message;
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

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
        message: 'No se completó la activación. Puedes intentarlo nuevamente cuando estés listo.'
      });
    }

    elements.notificationToggle.disabled = false;
  });
}

function initPortalTabs() {
  if (!portalTabs.length || !portalPanels.length) return;

  portalTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.portalTab;
      portalTabs.forEach((item) => {
        item.classList.toggle('is-active', item === tab);
        item.setAttribute('aria-selected', String(item === tab));
      });

      portalPanels.forEach((panel) => {
        const isTarget = panel.dataset.portalPanel === target;
        panel.hidden = !isTarget;
        panel.classList.toggle('is-active', isTarget);
        if (!isTarget) {
          const feedback = panel.querySelector('.portal__feedback');
          if (feedback) {
            feedback.textContent = '';
          }
        }
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
      const feedback = panel ? panel.querySelector('.portal__feedback') : null;
      if (!feedback) return;

      const role = panel?.dataset.portalPanel;
      let message = '';

      if (role === 'pacientes') {
        message = 'Listo, autenticamos tu cuenta y puedes continuar con la gestión de turnos.';
      } else if (role === 'equipo') {
        message = 'Acceso verificado. Carga tus evoluciones y consulta tu agenda en tiempo real.';
      } else if (role === 'admin') {
        message = 'Bienvenida/o al centro de operaciones. Los dashboards están listos.';
      }

      feedback.textContent = message;
    });
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('sw.js')
      .catch((error) => console.warn('No fue posible registrar el service worker', error));
  }
}

function init() {
  initNavigation();
  populateSpecialties();
  setDateMinimum();
  renderHistory();

  elements.specialtySelect?.addEventListener('change', (event) => {
    populateProfessionals(event.target.value);
    updateSummary();
  });

  elements.professionalSelect?.addEventListener('change', (event) => {
    updateProfessionalDetail(event.target.value);
  });

  elements.dateInput?.addEventListener('change', handleDateChange);
  elements.form?.addEventListener('submit', handleFormSubmit);

  initReminderModal();
  initNotifications();
  initPortalTabs();
  initPortalForms();
  updateSummary();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);