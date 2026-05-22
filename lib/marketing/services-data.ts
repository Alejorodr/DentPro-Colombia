export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface ServiceData {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  keywords: string[];
  highlights: { title: string; description: string }[];
  faqs: ServiceFAQ[];
  image: { src: string; alt: string };
  ctaLabel: string;
}

export const SERVICES: ServiceData[] = [
  {
    slug: "ortodoncia",
    name: "Ortodoncia digital",
    tagline: "Alineadores invisibles y brackets en Chía",
    description:
      "Corregimos la posición de tus dientes con tecnología de escaneo 3D y planificación digital. Trabajamos con alineadores invisibles y brackets autoligables para resultados predecibles desde la primera consulta.",
    keywords: [
      "ortodoncia Chía",
      "ortodoncia Cundinamarca",
      "alineadores invisibles Chía",
      "brackets Chía",
      "dentista ortodoncia Chía",
    ],
    highlights: [
      {
        title: "Escaneo 3D en la primera visita",
        description: "Sin impresiones incómodas. Obtenemos un modelo digital preciso en minutos.",
      },
      {
        title: "Simulación virtual del resultado",
        description: "Antes de iniciar el tratamiento podés ver cómo quedarán tus dientes.",
      },
      {
        title: "Alineadores invisibles o brackets",
        description: "Te asesoramos sobre la opción más adecuada según tu caso y estilo de vida.",
      },
      {
        title: "Controles mensuales personalizados",
        description: "Seguimiento cercano con el especialista en cada etapa del tratamiento.",
      },
    ],
    faqs: [
      {
        question: "¿Cuánto dura el tratamiento de ortodoncia?",
        answer:
          "Depende de la complejidad del caso. Los tratamientos van desde 12 meses para casos leves hasta 24–30 meses para casos más complejos. En la valoración inicial te damos una estimación precisa.",
      },
      {
        question: "¿Los alineadores invisibles son tan efectivos como los brackets?",
        answer:
          "Para la mayoría de los casos, sí. Los alineadores tienen la ventaja de ser removibles y casi invisibles. Los brackets son preferibles para casos de alta complejidad. Nuestro ortodoncista evaluará cuál es mejor para vos.",
      },
      {
        question: "¿A partir de qué edad se puede hacer ortodoncia?",
        answer:
          "El momento ideal para la primera evaluación es a los 7 años, cuando ya hay una mezcla de dientes permanentes y de leche. Los tratamientos correctivos suelen iniciarse entre los 11 y 14 años, aunque los adultos también pueden hacerse ortodoncia.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80",
      alt: "Ortodoncia digital con alineadores invisibles en DentPro Chía",
    },
    ctaLabel: "Agendar valoración de ortodoncia",
  },
  {
    slug: "implantes",
    name: "Implantes dentales",
    tagline: "Rehabilitación fija permanente en Chía",
    description:
      "Reemplazamos piezas dentales perdidas con implantes guiados por computadora. Usamos implantes certificados internacionalmente y cirugías mínimamente invasivas para una recuperación rápida.",
    keywords: [
      "implantes dentales Chía",
      "implantes Cundinamarca",
      "rehabilitación dental Chía",
      "implantes fijos Chía",
      "cirugía oral Chía",
    ],
    highlights: [
      {
        title: "Guías quirúrgicas impresas en 3D",
        description: "Precisión milimétrica en la colocación del implante, menor tiempo de cirugía.",
      },
      {
        title: "Implantes certificados internacionalmente",
        description: "Trabajamos con sistemas de implantes con respaldo clínico a largo plazo.",
      },
      {
        title: "Sedación consciente disponible",
        description: "Para pacientes con ansiedad dental, ofrecemos sedación para mayor comodidad.",
      },
      {
        title: "Seguimiento postoperatorio completo",
        description: "Acompañamiento durante la cicatrización y hasta la colocación de la corona.",
      },
    ],
    faqs: [
      {
        question: "¿Cuánto tiempo dura un implante dental?",
        answer:
          "Con el cuidado adecuado, un implante puede durar toda la vida. La clave está en mantener buena higiene oral y realizar controles periódicos. La tasa de éxito a 10 años supera el 95%.",
      },
      {
        question: "¿El proceso de implantes es doloroso?",
        answer:
          "La cirugía se realiza con anestesia local, por lo que no sentís dolor durante el procedimiento. En los días posteriores puede haber molestias leves que se manejan con analgésicos comunes.",
      },
      {
        question: "¿Cuánto tiempo tarda el proceso completo?",
        answer:
          "Desde la colocación del implante hasta la corona definitiva, el proceso toma entre 3 y 6 meses, dependiendo de la cicatrización ósea. Existen casos en los que se puede colocar una corona provisional el mismo día.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80",
      alt: "Implantes dentales guiados por computadora en DentPro Chía",
    },
    ctaLabel: "Agendar valoración de implantes",
  },
  {
    slug: "estetica-dental",
    name: "Estética dental",
    tagline: "Diseño de sonrisa en Chía, Cundinamarca",
    description:
      "Transformamos tu sonrisa con carillas cerámicas, blanqueamiento profesional y diseño digital. Cada tratamiento se planifica con un mockup previo para que veas el resultado antes de empezar.",
    keywords: [
      "estética dental Chía",
      "diseño de sonrisa Chía",
      "carillas dentales Cundinamarca",
      "blanqueamiento dental Chía",
      "odontología estética Chía",
    ],
    highlights: [
      {
        title: "Mockup digital previo",
        description: "Simulamos el resultado en tu boca antes de comenzar cualquier tratamiento.",
      },
      {
        title: "Carillas cerámicas premium",
        description: "Finas láminas de porcelana que mejoran color, forma y tamaño de los dientes.",
      },
      {
        title: "Blanqueamiento profesional",
        description: "Resultados visibles desde la primera sesión, con seguimiento clínico.",
      },
      {
        title: "Resultados naturales y duraderos",
        description: "Utilizamos materiales de laboratorio especializado para máxima estética.",
      },
    ],
    faqs: [
      {
        question: "¿Cuánto dura el blanqueamiento dental?",
        answer:
          "El blanqueamiento profesional en consultorio tiene resultados que duran entre 1 y 3 años dependiendo de los hábitos (café, vino, tabaco). Se puede reforzar con kits de mantenimiento en casa.",
      },
      {
        question: "¿Las carillas dañan los dientes naturales?",
        answer:
          "El procedimiento requiere un desgaste mínimo del esmalte (0.3–0.7 mm). Es un procedimiento irreversible, por lo que evaluamos cuidadosamente cada caso antes de recomendarlas.",
      },
      {
        question: "¿Puedo ver cómo quedaré antes de empezar?",
        answer:
          "Sí. Trabajamos con diseño digital de sonrisa y mockup en resina que podés probar físicamente en la boca. Así confirmás el resultado antes de cualquier procedimiento definitivo.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=1200&q=80",
      alt: "Diseño de sonrisa y estética dental en DentPro Chía",
    },
    ctaLabel: "Agendar diseño de sonrisa",
  },
  {
    slug: "endodoncia",
    name: "Endodoncia avanzada",
    tagline: "Tratamiento de conducto con microscopio en Chía",
    description:
      "Salvamos dientes con infección o daño pulpar usando microscopía clínica e instrumentación rotatoria. Un tratamiento de conducto moderno es indoloro y preserva tu diente natural.",
    keywords: [
      "endodoncia Chía",
      "tratamiento de conducto Chía",
      "endodoncia Cundinamarca",
      "dentista endodoncia Chía",
      "dolor de muela Chía",
    ],
    highlights: [
      {
        title: "Diagnóstico por CBCT",
        description: "Tomografía 3D para ver con precisión la anatomía del conducto radicular.",
      },
      {
        title: "Microscopía clínica",
        description: "Mayor precisión y menor invasividad gracias a la magnificación óptica.",
      },
      {
        title: "Instrumentación rotatoria",
        description: "Limas motorizadas para una limpieza completa y rápida del conducto.",
      },
      {
        title: "Seguimiento postoperatorio",
        description: "Control clínico para confirmar la cicatrización del tejido periapical.",
      },
    ],
    faqs: [
      {
        question: "¿Un tratamiento de conducto duele?",
        answer:
          "Con la anestesia moderna, el procedimiento es prácticamente indoloro. Podés sentir presión pero no dolor agudo. Después de la sesión puede haber sensibilidad leve que cede en 1–3 días.",
      },
      {
        question: "¿Cuándo necesito un tratamiento de conducto?",
        answer:
          "Cuando hay infección o inflamación de la pulpa dental: dolor intenso y espontáneo, sensibilidad al calor o frío que persiste, hinchazón, o cuando una radiografía muestra lesión periapical.",
      },
      {
        question: "¿Puedo salvar un diente con mucha caries?",
        answer:
          "En muchos casos sí. La endodoncia elimina la infección y permite restaurar el diente con una corona. La decisión depende de cuánta estructura dental queda sana.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
      alt: "Endodoncia con microscopio en DentPro Chía",
    },
    ctaLabel: "Agendar consulta de endodoncia",
  },
  {
    slug: "limpieza-dental",
    name: "Limpieza y profilaxis",
    tagline: "Higiene profesional con ultrasonido en Chía",
    description:
      "Eliminamos sarro, placa y manchas con ultrasonido y pulido remineralizante. La profilaxis semestral es la mejor inversión en la salud de tu boca y la prevención de enfermedades más costosas.",
    keywords: [
      "limpieza dental Chía",
      "profilaxis dental Chía",
      "limpieza dental Cundinamarca",
      "higiene dental Chía",
      "sarro dental Chía",
    ],
    highlights: [
      {
        title: "Profilaxis guiada por imagen",
        description: "Evaluamos el estado de tu higiene bucal antes y después de la limpieza.",
      },
      {
        title: "Ultrasonido + pulido remineralizante",
        description: "Eliminación de sarro y placa bacteriana con refuerzo del esmalte.",
      },
      {
        title: "Educación en hábitos de cuidado",
        description: "El especialista te enseña técnica de cepillado e hilo dental personalizada.",
      },
      {
        title: "Revisión preventiva incluida",
        description: "Detección temprana de caries, problemas periodontales y lesiones orales.",
      },
    ],
    faqs: [
      {
        question: "¿Cada cuánto debo hacerme una limpieza dental?",
        answer:
          "Lo recomendado es cada 6 meses. Pacientes con enfermedad periodontal o mayor acumulación de sarro pueden necesitar controles cada 3–4 meses.",
      },
      {
        question: "¿La limpieza con ultrasonido daña el esmalte?",
        answer:
          "No. Los equipos modernos de ultrasonido están calibrados para eliminar el sarro sin dañar el esmalte. Es un procedimiento seguro y efectivo.",
      },
      {
        question: "¿Duele la limpieza dental?",
        answer:
          "En la mayoría de los casos no. Puede haber sensibilidad si hay mucho sarro acumulado o encías inflamadas, pero es tolerable. Si tenés mucha sensibilidad te aplicamos gel anestésico previo.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80",
      alt: "Limpieza dental profesional con ultrasonido en DentPro Chía",
    },
    ctaLabel: "Agendar limpieza dental",
  },
  {
    slug: "odontopediatria",
    name: "Odontopediatría",
    tagline: "Dentista para niños en Chía, Cundinamarca",
    description:
      "Atendemos a los más pequeños en un ambiente diseñado para ellos, con tratamientos preventivos y curativos adaptados a cada edad. Nuestra prioridad es que los niños tengan una experiencia positiva con el dentista.",
    keywords: [
      "odontopediatría Chía",
      "dentista niños Chía",
      "dentista pediátrico Cundinamarca",
      "sellantes dentales niños Chía",
      "caries niños Chía",
    ],
    highlights: [
      {
        title: "Ambientes adaptados para niños",
        description: "Consultorios amigables diseñados para reducir la ansiedad dental infantil.",
      },
      {
        title: "Sellantes y flúor profesional",
        description: "Protección preventiva en los molares para evitar la aparición de caries.",
      },
      {
        title: "Técnicas de manejo conductual",
        description: "Especialistas capacitados para trabajar con niños de todas las edades y temperamentos.",
      },
      {
        title: "Educación en higiene desde temprano",
        description: "Enseñamos a niños y padres hábitos de cuidado que duran toda la vida.",
      },
    ],
    faqs: [
      {
        question: "¿A qué edad debo llevar a mi hijo por primera vez al dentista?",
        answer:
          "La primera visita debe ser cuando aparece el primer diente de leche, aproximadamente al año de vida. Si no hay dientes visibles, a más tardar a los 12 meses. La visita temprana establece una relación positiva con el dentista.",
      },
      {
        question: "¿Los dientes de leche necesitan tratamiento si se van a caer?",
        answer:
          "Sí. Los dientes de leche son importantes para la masticación, el habla y mantener el espacio para los dientes permanentes. Una caries no tratada puede infectarse y afectar el diente permanente que viene debajo.",
      },
      {
        question: "¿Mi hijo necesita anestesia para un tratamiento?",
        answer:
          "Depende del procedimiento. Para limpiezas y sellantes no se necesita. Para tratamientos de caries usamos anestesia tópica y local para que el niño no sienta dolor. Priorizamos la comodidad y confianza del paciente.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
      alt: "Odontopediatría y dentista para niños en DentPro Chía",
    },
    ctaLabel: "Agendar cita pediátrica",
  },
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
