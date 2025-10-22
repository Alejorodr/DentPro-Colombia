export const dynamic = "force-dynamic";

import { InfoBar } from "./(marketing)/components/InfoBar";
import { Navbar } from "./(marketing)/components/Navbar";
import { Hero } from "./(marketing)/components/Hero";
import { ServicesSection } from "./(marketing)/components/Services";
import { SpecialistsSlider } from "./(marketing)/components/SpecialistsSlider";
import { BookingFormSection } from "./(marketing)/components/BookingForm";
import { ContactSection } from "./(marketing)/components/ContactSection";
import { FloatingActions } from "./(marketing)/components/FloatingActions";

const marketingContent = {
  infoBar: {
    location: "📍 Av. Principal 123, Bogotá",
    schedule: "⏰ Lun–Vie 9:00-18:00 · Sáb 9:00-13:00",
    whatsapp: {
      href: "https://wa.me/573001112233",
      label: "Escríbenos por WhatsApp",
    },
    email: {
      href: "mailto:info@dentpro.co",
      label: "info@dentpro.co",
    },
    socials: [
      {
        href: "https://www.instagram.com/dentpro",
        label: "Instagram",
        icon: "camera_alt",
      },
      {
        href: "https://www.facebook.com/dentpro",
        label: "Facebook",
        icon: "thumb_up",
      },
      {
        href: "https://www.linkedin.com/company/dentpro",
        label: "LinkedIn",
        icon: "public",
      },
    ],
  },
  navbar: {
    brand: {
      href: "#inicio",
      name: "DentPro",
      initials: "DP",
    },
    links: [
      { href: "#servicios", label: "Servicios" },
      { href: "#especialistas", label: "Especialistas" },
      { href: "#agenda", label: "Agenda" },
      { href: "#contacto", label: "Contacto" },
    ],
    cta: {
      href: "#agenda",
      label: "Agenda ahora",
    },
    login: {
      href: "/login",
      label: "Iniciar sesión",
    },
  },
  hero: {
    badge: "Odontología integral en Bogotá",
    title: "Sonrisas sanas con tecnología de última generación",
    description:
      "Diagnóstico digital, especialistas certificados y acompañamiento personalizado en cada etapa del tratamiento.",
    primaryCta: {
      href: "#agenda",
      label: "Reservar valoración",
    },
    secondaryCta: {
      href: "#servicios",
      label: "Ver servicios",
    },
    stats: [
      { label: "+1.200 pacientes", description: "confían en DentPro cada año" },
      { label: "98% satisfacción", description: "en tratamientos completados" },
      { label: "12 especialistas", description: "con subespecialidades clínicas" },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
      alt: "Paciente sonriente recibiendo atención dental",
    },
    testimonial: {
      quote:
        "Me acompañaron desde la valoración inicial hasta la retención. La atención es cálida y muy profesional.",
      author: "Mariana López",
      role: "Paciente de ortodoncia",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
    },
    highlight: {
      title: "97% seguimiento efectivo",
      description: "Monitorización continua de casos complejos",
    },
  },
  services: {
    title: "Tratamientos personalizados para cada etapa",
    description:
      "Desde prevención hasta rehabilitación avanzada, diseñamos planes odontológicos a tu medida.",
    services: [
      {
        title: "Limpieza y profilaxis",
        description: "Higiene profesional con ultrasonido y pulido remineralizante.",
        icon: "sparkles",
        highlights: [
          "Profilaxis guiada por imagen",
          "Educación en hábitos de cuidado",
          "Revisión preventiva semestral",
        ],
      },
      {
        title: "Ortodoncia digital",
        description: "Alineadores invisibles y brackets autoligables según tus objetivos.",
        icon: "sentiment_satisfied",
        highlights: [
          "Escaneo 3D en la primera visita",
          "Planificación con simulación virtual",
          "Controles mensuales personalizados",
        ],
      },
      {
        title: "Implantes y cirugía",
        description: "Rehabilitación fija con implantes guiados por computadora.",
        icon: "health_metrics",
        highlights: [
          "Guías quirúrgicas impresas en 3D",
          "Implantes certificados internacionales",
          "Sedación consciente disponible",
        ],
      },
      {
        title: "Estética dental",
        description: "Carillas cerámicas, blanqueamiento y diseño de sonrisa armónico.",
        icon: "diamond",
        highlights: [
          "Mockup digital previo al tratamiento",
          "Laboratorio especializado premium",
          "Resultados naturales y duraderos",
        ],
      },
      {
        title: "Endodoncia avanzada",
        description: "Tratamientos de conducto con microscopio y obturación termoplástica.",
        icon: "psychology",
        highlights: [
          "Diagnóstico por CBCT",
          "Instrumentación rotatoria",
          "Seguimiento clínico postoperatorio",
        ],
      },
      {
        title: "Odontopediatría",
        description: "Prevención y tratamientos amigables para los más pequeños.",
        icon: "toys",
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
          src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
          alt: "Dr. Daniel Kim, odontólogo estético",
        },
      },
    ],
  },
  booking: {
    title: "Agenda tu valoración integral",
    description: "Responde este formulario y nuestro equipo de Patient Care te contactará en menos de 30 minutos hábiles.",
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
      {
        icon: "calendar_month",
        text: "Horarios extendidos y recordatorios automáticos",
      },
      {
        icon: "verified",
        text: "Especialistas certificados por asociaciones internacionales",
      },
      {
        icon: "groups",
        text: "Acompañamiento del equipo de Patient Care en todo momento",
      },
      {
        icon: "payments",
        text: "Planes de financiación y convenios empresariales",
      },
    ],
    scheduleNote: "Disponibilidad de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 13:00 en nuestra sede principal.",
    consentNote: "Al enviar este formulario autorizas el tratamiento de tus datos según nuestra política de privacidad.",
  },
  contact: {
    title: "Estamos para ayudarte",
    description: "Comunícate con nosotros por el canal que prefieras o visítanos en nuestra sede central.",
    channels: [
      {
        icon: "call",
        label: "Teléfono",
        value: "+57 300 111 2233",
        href: "tel:+573001112233",
      },
      {
        icon: "chat",
        label: "WhatsApp",
        value: "+57 300 111 2233",
        href: "https://wa.me/573001112233",
      },
      {
        icon: "mail",
        label: "Email",
        value: "info@dentpro.co",
        href: "mailto:info@dentpro.co",
      },
      {
        icon: "pin_drop",
        label: "Ubicación",
        value: "Av. Principal 123, Bogotá",
      },
    ],
    socials: [
      {
        href: "https://www.instagram.com/dentpro",
        label: "Instagram",
        text: "IG",
      },
      {
        href: "https://www.facebook.com/dentpro",
        label: "Facebook",
        text: "FB",
      },
      {
        href: "https://www.linkedin.com/company/dentpro",
        label: "LinkedIn",
        text: "IN",
      },
    ],
    supportTitle: "Patient Care DentPro",
    supportItems: [
      { icon: "support_agent", text: "Coordinación de citas y especialistas" },
      { icon: "insights", text: "Seguimiento de tu evolución clínica" },
      { icon: "workspace_premium", text: "Garantía extendida en tratamientos" },
    ],
    locationsTitle: "Nuestras sedes",
    locations: [
      {
        name: "Sede Chico Norte",
        description: "Av. Principal 123, consultorio 502. Parqueadero para pacientes.",
      },
      {
        name: "Sede Cedritos",
        description: "Calle 140 #12-45. Atención previa cita.",
      },
    ],
    legalLinks: [
      { href: "/politica-de-tratamiento-de-datos", label: "Política de datos" },
      { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
    ],
    brand: "DentPro",
  },
  floatingActions: {
    actions: [
      {
        href: "https://wa.me/573001112233",
        label: "Chat en WhatsApp",
        icon: "chat",
        className: "whatsapp",
        external: true,
      },
      {
        href: "tel:+573001112233",
        label: "Llamar a DentPro",
        icon: "call",
        className: "phone",
      },
      {
        href: "#agenda",
        label: "Ir a agenda",
        icon: "calendar_month",
      },
    ],
  },
} as const;

export default function Home() {
  return (
    <>
      <InfoBar {...marketingContent.infoBar} />
      <Navbar {...marketingContent.navbar} />
      <main id="inicio">
        <Hero {...marketingContent.hero} />
        <ServicesSection {...marketingContent.services} />
        <SpecialistsSlider {...marketingContent.specialists} />
        <BookingFormSection {...marketingContent.booking} />
        <ContactSection {...marketingContent.contact} />
      </main>
      <FloatingActions {...marketingContent.floatingActions} />
    </>
  );
}
