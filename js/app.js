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
  reminderResult: document.getElementById('recordatorio-resultado')
};

const navToggle = document.querySelector('.main-nav__toggle');
const navLinks = document.getElementById('menu-principal');

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

function persistHistory(entry) {
  try {
    const history = JSON.parse(localStorage.getItem('dentpro-agenda') || '[]');
    history.unshift(entry);
    localStorage.setItem('dentpro-agenda', JSON.stringify(history.slice(0, 5)));
  } catch (error) {
    console.warn('No fue posible guardar el historial de citas', error);
  }
  renderHistory();
}

function renderHistory() {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('dentpro-agenda') || '[]');
  } catch (error) {
    console.warn('No fue posible recuperar el historial de citas', error);
  }
  elements.history.innerHTML = '';
  if (history.length === 0) {
    elements.history.innerHTML = '<li>Aún no tienes solicitudes recientes.</li>';
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

  elements.reminderModal.querySelector('.reminder-modal__close').addEventListener('click', closeModal);

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

function init() {
  initNavigation();
  populateSpecialties();
  setDateMinimum();
  renderHistory();

  elements.specialtySelect.addEventListener('change', (event) => {
    populateProfessionals(event.target.value);
    updateSummary();
  });

  elements.professionalSelect.addEventListener('change', (event) => {
    updateProfessionalDetail(event.target.value);
  });

  elements.dateInput.addEventListener('change', handleDateChange);
  elements.form.addEventListener('submit', handleFormSubmit);

  initReminderModal();
  updateSummary();
}

document.addEventListener('DOMContentLoaded', init);
