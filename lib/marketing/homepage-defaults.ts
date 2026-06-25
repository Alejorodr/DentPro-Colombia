import {
  MARKETING_ICON_KEYS,
  type HomepageNormalizedContent,
  type MarketingIconKey,
} from "@/lib/marketing/homepage-types";

const DEFAULT_MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3975.459116389726!2d-74.06081971538144!3d4.862466127650842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f87c4f73bb481%3A0x4fe68db55a29fdf4!2sOdontolog%C3%ADa%20chia%20DENTPRO!5e0!3m2!1ses!2sar!4v1761166520702!5m2!1ses!2sar";

export const HOMEPAGE_SETTINGS_SINGLETON_ID = "homepage-main";

export const HOMEPAGE_DEFAULT_CONTENT: HomepageNormalizedContent = {
  brand: {
    name: "DentPro Colombia",
    initials: "DP",
    logoUrl: null,
  },
  infoBar: {
    location: { text: "Cra. 7 #13-180, Chía, Cundinamarca", icon: "MapPin" },
    schedule: { text: "Lun–Sáb 8:00-19:00 · Domingos y festivos con cita previa", icon: "Clock" },
    whatsapp: { href: "https://wa.me/573237968435", label: "Agenda por WhatsApp", icon: "ChatCircleDots" },
    email: { href: "mailto:dentprocolombia@gmail.com", label: "dentprocolombia@gmail.com", icon: "EnvelopeSimple" },
    socials: [
      { href: "https://www.instagram.com/dentprocol", label: "Instagram", icon: "InstagramLogo" },
      { href: "https://www.facebook.com/dentprocol", label: "Facebook", icon: "FacebookLogo" },
      { href: "https://www.tiktok.com/@dentprocol", label: "TikTok", icon: "TiktokLogo" },
    ],
  },
  hero: {
    badge: "Odontología general y especializada en Chía",
    title: "Cuidamos tu sonrisa con tecnología y calidez humana",
    description:
      "Agenda tu valoración en DentPro Colombia y accede a tratamientos preventivos y especializados sin salir de Chía.",
    primaryCta: { href: "/appointments/new", label: "Reservar turno" },
    secondaryCta: { href: "#agenda", label: "Te contactamos" },
    stats: [
      { label: "Chía · Cundinamarca", description: "consultorio propio en el municipio" },
      { label: "Agendamiento en línea", description: "citas confirmadas en minutos" },
      { label: "Horario extendido", description: "Lun–Sáb 8:00 am a 7:00 pm" },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
      alt: "Paciente sonriente recibiendo atención dental en DentPro Chía",
    },
    testimonial: {
      quote:
        "Desde que llegué a DentPro Chía me guiaron en todo el proceso. El equipo es cercano y muy profesional.",
      author: "Paciente de DentPro",
      role: "Ortodoncia",
      avatar: "",
    },
    highlight: {
      title: "Seguimiento personalizado",
      description: "Control clínico y acompañamiento en cada etapa",
    },
  },
  services: {
    badge: "SERVICIOS",
    title: "Tratamientos personalizados para cada etapa",
    description:
      "Desde prevención hasta rehabilitación avanzada, diseñamos planes odontológicos a tu medida.",
    services: [
      {
        title: "Limpieza y profilaxis",
        description: "Higiene profesional con ultrasonido y pulido remineralizante.",
        icon: "Sparkle",
        highlights: [
          "Profilaxis guiada por imagen",
          "Educación en hábitos de cuidado",
          "Revisión preventiva semestral",
        ],
      },
      {
        title: "Ortodoncia digital",
        description: "Alineadores invisibles y brackets autoligables según tus objetivos.",
        icon: "Smiley",
        highlights: [
          "Escaneo 3D en la primera visita",
          "Planificación con simulación virtual",
          "Controles mensuales personalizados",
        ],
      },
      {
        title: "Implantes y cirugía",
        description: "Rehabilitación fija con implantes guiados por computadora.",
        icon: "Stethoscope",
        highlights: [
          "Guías quirúrgicas impresas en 3D",
          "Implantes certificados internacionales",
          "Sedación consciente disponible",
        ],
      },
      {
        title: "Estética dental",
        description: "Carillas cerámicas, blanqueamiento y diseño de sonrisa armónico.",
        icon: "DiamondsFour",
        highlights: [
          "Mockup digital previo al tratamiento",
          "Laboratorio especializado premium",
          "Resultados naturales y duraderos",
        ],
      },
      {
        title: "Endodoncia avanzada",
        description: "Tratamientos de conducto con microscopio y obturación termoplástica.",
        icon: "Tooth",
        highlights: [
          "Diagnóstico por CBCT",
          "Instrumentación rotatoria",
          "Seguimiento clínico postoperatorio",
        ],
      },
      {
        title: "Odontopediatría",
        description: "Prevención y tratamientos amigables para los más pequeños.",
        icon: "Baby",
        highlights: [
          "Ambientes adaptados para niños",
          "Sellantes y flúor profesional",
          "Educación en hábitos de higiene",
        ],
      },
    ],
  },
  specialists: {
    badge: "Equipo clínico",
    title: "Especialistas que cuidan tu sonrisa",
    description:
      "Conoce a nuestro equipo multidisciplinario, listo para acompañarte en cada fase del tratamiento.",
    specialists: [
      {
        name: "Dra. Laura López",
        specialty: "Ortodoncia",
        description: "Máster en ortodoncia digital y certificada en alineadores invisibles.",
        image: {
          src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
          alt: "Dra. Laura López, ortodoncista",
        },
      },
      {
        name: "Dr. Andrés Pérez",
        specialty: "Implantología",
        description: "Especialista en cirugía oral con más de 10 años de experiencia en rehabilitación fija.",
        image: {
          src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
          alt: "Dr. Andrés Pérez, implantólogo",
        },
      },
      {
        name: "Dra. Camila Ruiz",
        specialty: "Endodoncia",
        description: "Tratamientos mínimamente invasivos apoyados en microscopía clínica.",
        image: {
          src: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=600&q=80",
          alt: "Dra. Camila Ruiz, endodoncista",
        },
      },
      {
        name: "Dr. Daniel Kim",
        specialty: "Estética dental",
        description: "Especialista en diseño de sonrisa integral y rehabilitación estética.",
        image: {
          src: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=600&q=80",
          alt: "Dr. Daniel Kim, odontólogo estético",
        },
      },
    ],
  },
  booking: {
    title: "Agenda tu valoración integral",
    description:
      "Revisa la disponibilidad inicial y elige si prefieres reservar tu turno ahora o que nuestro equipo te contacte para ayudarte.",
    selectLabel: "¿Qué tratamiento te interesa?",
    options: [
      { value: "limpieza", label: "Limpieza y profilaxis" },
      { value: "ortodoncia", label: "Ortodoncia" },
      { value: "implantes", label: "Implantes" },
      { value: "estetica", label: "Estética dental" },
      { value: "endodoncia", label: "Endodoncia" },
      { value: "odontopediatria", label: "Odontopediatría" },
    ],
    benefitsTitle: "Beneficios de agendar con nosotros",
    benefits: [
      { icon: "CalendarCheck", text: "Horarios extendidos y recordatorios automáticos" },
      { icon: "ShieldCheck", text: "Especialistas certificados por asociaciones internacionales" },
      { icon: "UsersThree", text: "Acompañamiento del equipo de Patient Care en todo momento" },
      { icon: "CreditCard", text: "Planes de financiación y convenios empresariales" },
    ],
    scheduleNote:
      "Disponibilidad de lunes a sábado de 8:00 a 19:00 y domingos o festivos con cita previa en nuestra sede de Chía.",
    consentNote:
      "Al enviar este formulario autorizas el tratamiento de tus datos según nuestra política de privacidad.",
  },
  contact: {
    title: "Estamos para ayudarte",
    description:
      "Comunícate con nuestro equipo y programa tu cita en la sede DentPro Colombia de Chía.",
    channels: [
      { icon: "Phone", label: "Teléfono", value: "+57 323 796 8435", href: "tel:+573237968435" },
      { icon: "WhatsappLogo", label: "WhatsApp", value: "323 796 8435", href: "https://wa.me/573237968435" },
      {
        icon: "EnvelopeSimple",
        label: "Email",
        value: "dentprocolombia@gmail.com",
        href: "mailto:dentprocolombia@gmail.com",
      },
      { icon: "MapPin", label: "Ubicación", value: "Cra. 7 #13-180, Chía, Cundinamarca" },
    ],
    socials: [
      { href: "https://www.instagram.com/dentprocol", label: "Instagram", icon: "InstagramLogo" },
      { href: "https://www.facebook.com/dentprocol", label: "Facebook", icon: "FacebookLogo" },
      { href: "https://www.tiktok.com/@dentprocol", label: "TikTok", icon: "TiktokLogo" },
    ],
    supportTitle: "Patient Care DentPro",
    supportItems: [
      { icon: "Headset", text: "Coordinación de citas y especialistas" },
      { icon: "ChartLineUp", text: "Seguimiento de tu evolución clínica" },
      { icon: "Medal", text: "Garantía extendida en tratamientos" },
    ],
    locationsTitle: "Nuestra sede",
    locations: [
      {
        name: "Chía - Cundinamarca",
        description: "Cra. 7 #13-180. Domingos y festivos con cita previa.",
      },
    ],
    legalLinks: [
      { href: "/politica-de-tratamiento-de-datos", label: "Política de datos" },
      { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
    ],
    brand: "DentPro",
    mapEmbedUrl: DEFAULT_MAP_EMBED_URL,
  },
  floatingActions: {
    whatsappNumber: "573237968435",
    phoneNumber: "+573237968435",
  },
  faqs: [
    {
      question: "¿Cómo agendo una cita en DentPro?",
      answer:
        "Podés reservar tu turno directamente en línea desde el botón 'Reservar turno' de esta página — el sistema confirma disponibilidad en tiempo real y te envía un correo de confirmación. También podés escribirnos por WhatsApp al 323 796 8435 o llamarnos al mismo número.",
    },
    {
      question: "¿Cuánto cuesta la primera consulta?",
      answer:
        "La valoración inicial incluye revisión clínica completa, diagnóstico y plan de tratamiento personalizado. Consultá el valor actualizado escribiéndonos por WhatsApp — los precios varían según el especialista y el tratamiento requerido.",
    },
    {
      question: "¿Atienden urgencias dentales?",
      answer:
        "Sí. Reservamos cupos de urgencia todos los días de la semana. Si tenés dolor intenso, fractura o pérdida de una pieza, escribinos por WhatsApp y te damos turno el mismo día o al siguiente.",
    },
    {
      question: "¿Tienen convenios con seguros o EPS?",
      answer:
        "Trabajamos principalmente como clínica particular. Para convenios empresariales o con aseguradoras, contactanos directamente a dentprocolombia@gmail.com y evaluamos opciones según tu caso.",
    },
    {
      question: "¿Qué debo llevar a mi primera cita?",
      answer:
        "Documento de identidad, radiografías recientes (si tenés), y cualquier tratamiento o medicación que estés tomando actualmente. Si sos menor de edad, un acudiente debe acompañarte.",
    },
    {
      question: "¿Ofrecen planes de pago o financiación?",
      answer:
        "Sí, manejamos planes de pago para tratamientos de mayor valor como ortodoncia, implantes y rehabilitación. Conversalo con nuestro equipo al momento de la valoración inicial.",
    },
  ],
  seo: {
    metaTitle: null,
    metaDescription: null,
  },
};

const VALID_ICON_SET = new Set<string>(MARKETING_ICON_KEYS);

export function sanitizeMarketingIcon(icon: string, fallback: MarketingIconKey): MarketingIconKey {
  return VALID_ICON_SET.has(icon) ? (icon as MarketingIconKey) : fallback;
}
