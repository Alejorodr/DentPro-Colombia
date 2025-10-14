import { BookingFormSection } from "./components/BookingForm";
import { ContactSection } from "./components/ContactSection";
import { FloatingActions } from "./components/FloatingActions";
import { Hero } from "./components/Hero";
import { InfoBar } from "./components/InfoBar";
import { Navbar } from "./components/Navbar";
import { ServicesSection } from "./components/Services";
import { SpecialistsSlider } from "./components/SpecialistsSlider";

export default function MarketingPage() {
  return (
    <>
      <InfoBar
        location="Chía, Cundinamarca"
        schedule="Lunes a Sábado 7:00 a.m. - 8:00 p.m."
        whatsapp={{ href: "https://wa.me/573212345678", label: "+57 321 234 5678" }}
        email={{ href: "mailto:agenda@dentprocol.com", label: "agenda@dentprocol.com" }}
        socials={[
          { href: "https://www.instagram.com/dentprocol/", label: "Instagram DentPro", icon: "photo_camera" },
          { href: "https://www.facebook.com/", label: "Facebook DentPro", icon: "thumb_up" },
        ]}
      />
      <Navbar
        brand={{ href: "#", name: "DentPro Colombia", initials: "DP" }}
        links={[
          { href: "#servicios", label: "Servicios" },
          { href: "#especialistas", label: "Especialistas" },
          { href: "#agenda", label: "Agenda tu cita" },
          { href: "#contacto", label: "Contacto" },
        ]}
        cta={{ href: "#agenda", label: "Agenda ahora" }}
      />
      <main>
        <Hero
          badge="Calidad internacional"
          title="Cuidamos tu sonrisa con tecnología de vanguardia y especialistas certificados."
          description="Vive una experiencia odontológica cálida, humana y precisa. Desde odontología preventiva hasta rehabilitación oral, te acompañamos en cada paso."
          primaryCta={{ href: "#agenda", label: "Agenda tu valoración" }}
          secondaryCta={{ href: "#servicios", label: "Explora servicios" }}
          stats={[
            { label: "+20 años", description: "de experiencia clínica" },
            { label: "12 sedes", description: "en las principales ciudades" },
            { label: "98% satisfacción", description: "según pacientes atendidos" },
          ]}
          image={{
            src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=900&q=80",
            alt: "Odontóloga atendiendo a paciente",
          }}
          testimonial={{
            quote:
              "Me siento segura y acompañada en cada cita. El equipo de DentPro es cercano y profesional. ¡Mi sonrisa nunca estuvo mejor!",
            author: "Laura Gómez",
            role: "Paciente de ortodoncia invisible",
            avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
          }}
          highlight={{
            title: "+4.800 sonrisas rehabilitadas",
          }}
        />
        <ServicesSection
          title="Servicios integrales para cada necesidad"
          description="Integramos especialidades odontológicas con equipos de última generación para garantizar diagnósticos precisos y resultados duraderos."
          services={[
            {
              title: "Odontología preventiva",
              description:
                "Limpiezas profundas, sellantes, fluorizaciones y educación en higiene oral para mantener tus dientes sanos desde la raíz.",
              icon: "dental_services",
              highlights: ["Valoraciones digitales", "Planes familiares", "Seguimiento personalizado"],
            },
            {
              title: "Ortodoncia avanzada",
              description:
                "Alineadores invisibles, ortopedia maxilar y brackets de última generación con planes flexibles y cómodos.",
              icon: "orthodontics",
              highlights: ["Escaneo 3D", "Simulaciones digitales", "Control de progreso en app"],
            },
            {
              title: "Rehabilitación oral",
              description:
                "Implantes, carillas y prótesis de alta estética fabricadas en laboratorio certificado para resultados naturales.",
              icon: "dentistry",
              highlights: ["Diagnóstico interdisciplinar", "Laboratorio propio", "Garantía extendida"],
            },
          ]}
        />
        <SpecialistsSlider
          badge="Conoce al equipo"
          title="Especialistas que se conectan contigo"
          description="Nuestro staff multidisciplinario participa en programas de actualización continua y aplica protocolos internacionales para cada tratamiento."
          specialists={[
            {
              name: "Dr. Santiago Herrera",
              specialty: "Rehabilitación oral y estética",
              description:
                "Más de 12 años creando sonrisas funcionales y estéticas con sistemas guiados por computador y sedación asistida.",
              image: {
                src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80",
                alt: "Odontólogo especialista",
              },
            },
            {
              name: "Dra. Natalia Rincón",
              specialty: "Ortodoncia invisible",
              description:
                "Certificada Invisalign Diamond. Combina ortodoncia digital y acompañamiento personalizado para resultados rápidos.",
              image: {
                src: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
                alt: "Odontóloga especialista",
              },
            },
            {
              name: "Dra. Camila Torres",
              specialty: "Odontopediatría integral",
              description:
                "Experta en acompañar a niños y adolescentes con técnicas de manejo del miedo y programas de prevención temprana.",
              image: {
                src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
                alt: "Odontopediatra",
              },
            },
          ]}
        />
        <BookingFormSection
          title="Agenda tu primera valoración"
          description="Cuéntanos qué necesitas y un asesor de DentPro te contactará en menos de 30 minutos hábiles para asignar tu cita en la sede más cercana."
          selectLabel="Servicio de interés"
          options={[
            { value: "preventiva", label: "Odontología preventiva" },
            { value: "ortodoncia", label: "Ortodoncia" },
            { value: "rehabilitacion", label: "Rehabilitación oral" },
            { value: "estetica", label: "Estética dental" },
          ]}
          benefitsTitle="Beneficios DentPro"
          benefits={[
            {
              icon: "check",
              text: "Diagnóstico digital con radiología de baja dosis y escáner intraoral.",
            },
            {
              icon: "check",
              text: "Planes de financiación y alianzas empresariales con tarifas preferenciales.",
            },
            {
              icon: "check",
              text: "Protocolos estrictos de bioseguridad certificados bajo la norma Icontec.",
            },
          ]}
          scheduleNote="Lunes a sábado de 7:00 a. m. a 8:00 p. m. Domingos con cita previa."
          consentNote="Al enviar este formulario aceptas nuestro manejo responsable de datos y autorizas el contacto por WhatsApp o llamada."
        />
        <ContactSection
          title="Visítanos en nuestras sedes"
          description="Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Pereira, Manizales y más. Agenda tu cita en la sede que prefieras."
          channels={[
            { icon: "call", label: "Teléfono", value: "(601) 540 9876" },
            { icon: "chat", label: "WhatsApp", value: "+57 310 456 7890" },
            { icon: "mail", label: "Correo", value: "contacto@dentpro.co", href: "mailto:contacto@dentpro.co" },
          ]}
          socials={[
            { href: "https://www.instagram.com", label: "Instagram", text: "IG" },
            { href: "https://www.facebook.com", label: "Facebook", text: "FB" },
            { href: "https://www.youtube.com", label: "YouTube", text: "YT" },
          ]}
          supportTitle="Atención preferencial"
          supportItems={[
            { icon: "calendar_month", text: "Coordinación de citas y recordatorios automáticos." },
            { icon: "favorite", text: "Acompañamiento emocional para pacientes pediátricos y con ansiedad." },
            { icon: "health_and_safety", text: "Cobertura en urgencias odontológicas 24/7." },
          ]}
          locationsTitle="Ubicaciones destacadas"
          locations={[
            { name: "Zona T - Bogotá", description: "Cra. 13 #83-19 Piso 5. Parqueaderos aliados." },
            { name: "El Poblado - Medellín", description: "Calle 8 #43A-89. Torre médica con acceso Smart Parking." },
            { name: "Ciudad Jardín - Cali", description: "Av. Pasoancho #105-32. Clínica integral con imagenología." },
          ]}
          legalLinks={[
            { href: "#", label: "Política de privacidad" },
            { href: "#", label: "Términos y condiciones" },
            { href: "#", label: "Mapa del sitio" },
          ]}
          brand="DentPro Colombia"
        />
      </main>
      <FloatingActions
        actions={[
          {
            href: "https://wa.me/573104567890?text=Hola%20DentPro%2C%20quiero%20más%20información%20sobre%20sus%20servicios",
            label: "Chatear por WhatsApp",
            icon: "chat_bubble",
            className: "floating-action-btn--whatsapp",
            external: true,
          },
          {
            href: "#agenda",
            label: "Reservar una cita",
            icon: "event_available",
            className: "floating-action-btn--booking",
          },
          {
            href: "tel:+573104567890",
            label: "Llamar a DentPro",
            icon: "call",
            className: "floating-action-btn--call",
          },
        ]}
      />
    </>
  );
}
