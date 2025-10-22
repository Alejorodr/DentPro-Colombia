export const dynamic = "force-dynamic";

import { InfoBar } from "./(marketing)/components/InfoBar";
import { Navbar } from "./(marketing)/components/Navbar";
import { Hero } from "./(marketing)/components/Hero";
import { ServicesSection } from "./(marketing)/components/Services";
import { SpecialistsSlider } from "./(marketing)/components/SpecialistsSlider";
import { BookingFormSection } from "./(marketing)/components/BookingForm";
import { ContactSection } from "./(marketing)/components/ContactSection";
import { FloatingActions } from "./(marketing)/components/FloatingActions";

type MarketingContent = {
  infoBar: Parameters<typeof InfoBar>[0];
  navbar: Parameters<typeof Navbar>[0];
  hero: Parameters<typeof Hero>[0];
  services: Parameters<typeof ServicesSection>[0];
  specialists: Parameters<typeof SpecialistsSlider>[0];
  booking: Parameters<typeof BookingFormSection>[0];
  contact: Parameters<typeof ContactSection>[0];
  floatingActions: Parameters<typeof FloatingActions>[0];
};

const marketingContent: MarketingContent = {
  infoBar: {
    location: {
      text: "Cra. 7 #13-180, Chía, Cundinamarca",
      icon: "MapPin",
    },
    schedule: {
      text: "Lun–Sáb 8:00-19:00 · Domingos y festivos con cita previa",
      icon: "Clock",
    },
    whatsapp: {
      href: "https://wa.me/573237968435",
      label: "Agenda por WhatsApp",
      icon: "ChatCircleDots",
    },
    email: {
      href: "mailto:dentprocolombia@gmail.com",
      label: "dentprocolombia@gmail.com",
      icon: "EnvelopeSimple",
    },
    socials: [
      {
        href: "https://www.instagram.com/dentprocol",
        label: "Instagram",
        icon: "InstagramLogo",
      },
      {
        href: "https://www.facebook.com/dentprocol",
        label: "Facebook",
        icon: "FacebookLogo",
      },
      {
        href: "https://www.tiktok.com/@dentprocol",
        label: "TikTok",
        icon: "TiktokLogo",
      },
    ],
  },
  navbar: {
    brand: {
      href: "#inicio",
      name: "DentPro Colombia",
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
      label: "Agenda tu cita",
    },
    login: {
      href: "/login",
      label: "Iniciar sesión",
    },
  },
  hero: {
    badge: "Odontología general y especializada en Chía",
    title: "Cuidamos tu sonrisa con tecnología y calidez humana",
    description:
      "Agenda tu valoración en DentPro Colombia y accede a tratamientos preventivos y especializados sin salir de Chía.",
    primaryCta: {
      href: "#agenda",
      label: "Agenda tu cita",
    },
    secondaryCta: {
      href: "#contacto",
      label: "Cómo llegar",
    },
    stats: [
      { label: "+2.500 sonrisas", description: "atendidas en Cundinamarca" },
      { label: "98% satisfacción", description: "de nuestros pacientes" },
      { label: "Horario extendido", description: "Lun–Sáb 8:00 am a 7:00 pm" },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
      alt: "Paciente sonriente recibiendo atención dental en DentPro Chía",
    },
    testimonial: {
      quote:
        "Desde que llegué a DentPro Chía me guiaron en todo el proceso. El equipo es cercano y muy profesional.",
      author: "Mariana López",
      role: "Paciente de ortodoncia",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
    },
    highlight: {
      title: "Seguimiento personalizado",
      description: "Control clínico y acompañamiento en cada etapa",
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
          src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
          alt: "Dr. Daniel Kim, odontólogo estético",
        },
      },
    ],
  },
  booking: {
    title: "Agenda tu valoración integral",
    description: "Responde este formulario y nuestro equipo de Patient Care se comunicará contigo en minutos para confirmar tu cita.",
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
        icon: "CalendarCheck",
        text: "Horarios extendidos y recordatorios automáticos",
      },
      {
        icon: "ShieldCheck",
        text: "Especialistas certificados por asociaciones internacionales",
      },
      {
        icon: "UsersThree",
        text: "Acompañamiento del equipo de Patient Care en todo momento",
      },
      {
        icon: "CreditCard",
        text: "Planes de financiación y convenios empresariales",
      },
    ],
    scheduleNote: "Disponibilidad de lunes a sábado de 8:00 a 19:00 y domingos o festivos con cita previa en nuestra sede de Chía.",
    consentNote: "Al enviar este formulario autorizas el tratamiento de tus datos según nuestra política de privacidad.",
  },
  contact: {
    title: "Estamos para ayudarte",
    description: "Comunícate con nuestro equipo y programa tu cita en la sede DentPro Colombia de Chía.",
    channels: [
      {
        icon: "Phone",
        label: "Teléfono",
        value: "+57 323 796 8435",
        href: "tel:+573237968435",
      },
      {
        icon: "WhatsappLogo",
        label: "WhatsApp",
        value: "323 796 8435",
        href: "https://wa.me/573237968435",
      },
      {
        icon: "EnvelopeSimple",
        label: "Email",
        value: "dentprocolombia@gmail.com",
        href: "mailto:dentprocolombia@gmail.com",
      },
      {
        icon: "MapPin",
        label: "Ubicación",
        value: "Cra. 7 #13-180, Chía, Cundinamarca",
      },
    ],
    socials: [
      {
        href: "https://www.instagram.com/dentprocol",
        label: "Instagram",
        icon: "InstagramLogo",
      },
      {
        href: "https://www.facebook.com/dentprocol",
        label: "Facebook",
        icon: "FacebookLogo",
      },
      {
        href: "https://www.tiktok.com/@dentprocol",
        label: "TikTok",
        icon: "TiktokLogo",
      },
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
    mapEmbed:
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3975.459116389726!2d-74.06081971538144!3d4.862466127650842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f87c4f73bb481%3A0x4fe68db55a29fdf4!2sOdontolog%C3%ADa%20chia%20DENTPRO!5e0!3m2!1ses!2sar!4v1761166520702!5m2!1ses!2sar" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>',
  },
  floatingActions: {
    actions: [
      {
        href: "https://wa.me/573237968435",
        label: "Chat en WhatsApp",
        icon: "WhatsappLogo",
        className: "whatsapp",
        external: true,
      },
      {
        href: "tel:+573237968435",
        label: "Llamar a DentPro",
        icon: "Phone",
        className: "phone",
      },
      {
        href: "#agenda",
        label: "Ir a agenda",
        icon: "CalendarCheck",
      },
    ],
  },
};

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
