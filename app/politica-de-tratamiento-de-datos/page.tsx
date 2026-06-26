import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  EnvelopeSimple,
  Phone,
  MapPin,
  CheckCircle,
  FileText,
  UserCircle,
  Clock,
  Users,
} from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Política de Tratamiento de Datos Personales | DentPro Colombia",
  description:
    "Consulta la Política de Tratamiento de Datos Personales de DentPro Colombia S.A.S., conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.",
};

const tocItems = [
  { id: "identificacion", label: "Identificación del responsable" },
  { id: "marco-legal", label: "Marco legal" },
  { id: "definiciones", label: "Definiciones" },
  { id: "datos-recopilados", label: "Datos que recopilamos" },
  { id: "bases-legales", label: "Bases legales y finalidades" },
  { id: "datos-sensibles", label: "Datos sensibles — régimen especial" },
  { id: "derechos", label: "Derechos del titular" },
  { id: "procedimiento", label: "Procedimiento para ejercer derechos" },
  { id: "seguridad", label: "Seguridad de la información" },
  { id: "transferencia", label: "Transferencia a terceros" },
  { id: "conservacion", label: "Tiempo de conservación" },
  { id: "modificaciones", label: "Modificaciones a la política" },
  { id: "contacto", label: "Contacto y canal de atención" },
];

export default function PoliticaTratamientoDatos() {
  return (
    <div className="min-h-dvh bg-hero-light dark:bg-hero-dark">
      {/* Frosted header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-surface-muted dark:bg-surface-base/80">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:text-brand-indigo dark:text-accent-cyan"
          >
            <ArrowLeft className="h-4 w-4" weight="bold" />
            Inicio
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="mb-12 max-w-3xl space-y-3">
          <span className="badge">Legal</span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Política de Tratamiento de Datos Personales
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400">
            Última actualización: junio de 2026 · Vigente desde: junio de 2026
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:items-start">
          {/* Sticky Table of Contents */}
          <nav
            className="hidden lg:block lg:sticky lg:top-24 space-y-1"
            aria-label="Tabla de contenidos"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Contenido
            </p>
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-surface-elevated dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Main content */}
          <div className="space-y-10">
            {/* 1. Identificación del responsable */}
            <section
              id="identificacion"
              className="scroll-mt-28 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <UserCircle className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  1. Identificación del responsable del tratamiento
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, DentPro Colombia
                S.A.S. actúa como <strong>responsable del tratamiento</strong> de los datos personales
                que recopila, almacena, usa, circula y suprime en el marco de su actividad clínica y
                comercial.
              </p>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Datos del responsable
                </p>
                <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <li>
                    <span className="font-semibold">Razón social:</span> DentPro Colombia S.A.S.
                  </li>
                  <li>
                    <span className="font-semibold">Actividad:</span> Clínica odontológica especializada
                  </li>
                  <li>
                    <span className="font-semibold">Dirección:</span> Cra. 7 #13-180, Chía, Cundinamarca
                  </li>
                  <li>
                    <span className="font-semibold">Correo electrónico:</span>{" "}
                    <a
                      href="mailto:dentprocolombia@gmail.com"
                      className="text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                    >
                      dentprocolombia@gmail.com
                    </a>
                  </li>
                  <li>
                    <span className="font-semibold">Teléfono / WhatsApp:</span>{" "}
                    <a
                      href="tel:+573237968435"
                      className="text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                    >
                      +57 323 796 8435
                    </a>
                  </li>
                  <li>
                    <span className="font-semibold">Horario de atención:</span> Lunes–Sábado 8:00–19:00
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. Marco legal */}
            <section id="marco-legal" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  2. Marco legal aplicable
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Esta política se desarrolla en el marco del ordenamiento jurídico colombiano en materia
                de protección de datos personales y privacidad:
              </p>
              <ul className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                  <span>
                    <strong>Constitución Política de Colombia, artículo 15.</strong> Reconoce el derecho
                    fundamental a la intimidad personal y familiar y al buen nombre, y consagra el habeas
                    data como derecho autónomo de toda persona para conocer, actualizar y rectificar la
                    información recopilada sobre ella.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                  <span>
                    <strong>Ley 1266 de 2008</strong> (Ley de Habeas Data). Regula el manejo de
                    información contenida en bases de datos personales, especialmente en el sector
                    financiero y crediticio.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                  <span>
                    <strong>Ley 1581 de 2012</strong> (Ley Estatutaria de Protección de Datos
                    Personales). Marco general que establece los principios, derechos, obligaciones y
                    procedimientos para el tratamiento de datos personales en Colombia.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                  <span>
                    <strong>Decreto 1377 de 2013</strong> (compilado en el Decreto Único Reglamentario
                    1074 de 2015). Reglamenta la Ley 1581 de 2012, precisando aspectos sobre
                    autorización, aviso de privacidad y procedimientos para el ejercicio de derechos.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                  <span>
                    <strong>Resolución 1995 de 1999 del Ministerio de Salud.</strong> Establece las
                    normas para el manejo de la historia clínica, incluyendo obligaciones de
                    confidencialidad y tiempos de conservación.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                  <span>
                    <strong>Superintendencia de Industria y Comercio (SIC)</strong> como autoridad de
                    protección de datos personales en Colombia, facultada para vigilar, inspeccionar e
                    imponer sanciones por infracción al régimen de protección de datos.
                  </span>
                </li>
              </ul>
            </section>

            {/* 3. Definiciones */}
            <section id="definiciones" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  3. Definiciones
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Para los efectos de esta política, los siguientes términos tendrán el significado que
                se les atribuye a continuación, conforme a la Ley 1581 de 2012:
              </p>
              <div className="space-y-4">
                {[
                  {
                    term: "Dato personal",
                    definition:
                      "Cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables.",
                  },
                  {
                    term: "Dato sensible",
                    definition:
                      "Dato que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación. Son sensibles, entre otros, los datos sobre salud, historia clínica, origen racial o étnico, orientación sexual y convicciones religiosas o políticas.",
                  },
                  {
                    term: "Titular",
                    definition:
                      "Persona natural cuyos datos personales son objeto de tratamiento. En DentPro Colombia, los titulares son principalmente pacientes, acudientes y colaboradores.",
                  },
                  {
                    term: "Responsable del tratamiento",
                    definition:
                      "Persona natural o jurídica, pública o privada, que por sí misma o en asocio con otros, decida sobre la base de datos y el tratamiento de los datos. En este caso: DentPro Colombia S.A.S.",
                  },
                  {
                    term: "Encargado del tratamiento",
                    definition:
                      "Persona natural o jurídica que realiza el tratamiento de datos personales por cuenta del responsable. Son encargados, por ejemplo, los proveedores de software clínico y los laboratorios de referencia con los que DentPro Colombia tenga contratos.",
                  },
                  {
                    term: "Tratamiento",
                    definition:
                      "Cualquier operación o conjunto de operaciones sobre datos personales, tales como la recolección, almacenamiento, uso, circulación, transferencia, transmisión o supresión.",
                  },
                  {
                    term: "Base de datos",
                    definition:
                      "Conjunto organizado de datos personales que sea objeto de tratamiento. DentPro Colombia mantiene bases de datos de pacientes, colaboradores y proveedores.",
                  },
                  {
                    term: "Autorización",
                    definition:
                      "Consentimiento previo, expreso e informado del titular para llevar a cabo el tratamiento de datos personales. Para datos sensibles, la autorización debe ser explícita e informada sobre la naturaleza sensible del dato y la finalidad del tratamiento.",
                  },
                  {
                    term: "Aviso de privacidad",
                    definition:
                      "Comunicación verbal o escrita generada por el responsable, dirigida al titular para informarle sobre la existencia de la política de tratamiento de datos que le será aplicable, la forma de acceder a la misma y las finalidades del tratamiento.",
                  },
                ].map(({ term, definition }) => (
                  <div
                    key={term}
                    className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/50"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      {term}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {definition}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Datos que recopilamos */}
            <section id="datos-recopilados" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  4. Datos que recopilamos
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia recopila únicamente los datos personales necesarios para el
                cumplimiento de sus fines clínicos, legales y administrativos, de acuerdo con el
                principio de minimización de datos.
              </p>

              <div className="space-y-4">
                {/* Datos de identificación */}
                <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                    a) Datos de identificación y contacto
                  </p>
                  <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    Son datos de carácter general que permiten identificar y contactar al titular:
                  </p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {[
                      "Nombre completo",
                      "Número de cédula de ciudadanía, tarjeta de identidad o pasaporte",
                      "Fecha de nacimiento",
                      "Dirección de residencia",
                      "Número de teléfono fijo y/o móvil",
                      "Correo electrónico",
                      "Nombre y datos de contacto del acudiente o representante legal (para menores de edad)",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal dark:bg-accent-cyan" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Datos sensibles de salud */}
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    b) Datos sensibles de salud — artículo 5 Ley 1581 de 2012
                  </p>
                  <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    En razón de nuestra actividad clínica odontológica, recopilamos datos de salud que
                    tienen la categoría de <strong>datos sensibles</strong> bajo el artículo 5 de la
                    Ley 1581 de 2012. Su tratamiento requiere autorización explícita e informada del
                    titular:
                  </p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {[
                      "Historia clínica odontológica completa",
                      "Diagnósticos clínicos y odontológicos",
                      "Planes de tratamiento y evoluciones clínicas",
                      "Radiografías e imágenes odontológicas (panorámicas, periapicales, cefalométricas)",
                      "Fotografías intraorales y extraorales con fines diagnósticos y de seguimiento",
                      "Medicamentos prescritos, alergias y reacciones adversas",
                      "Antecedentes médicos, enfermedades sistémicas y condiciones de salud general",
                      "Consentimientos informados firmados para procedimientos clínicos",
                      "Resultados de exámenes de laboratorio o estudios paraclínicos",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* 5. Bases legales y finalidades */}
            <section id="bases-legales" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  5. Bases legales y finalidades del tratamiento
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Todo tratamiento de datos realizado por DentPro Colombia cuenta con al menos una
                base legal que lo sustenta, de acuerdo con el artículo 10 de la Ley 1581 de 2012:
              </p>
              <div className="space-y-3">
                {[
                  {
                    base: "Ejecución de la relación contractual",
                    finalidades: [
                      "Agendar, gestionar y hacer seguimiento a las citas odontológicas.",
                      "Elaborar y mantener actualizada la historia clínica del paciente.",
                      "Prestar los servicios de salud oral contratados de forma eficiente y segura.",
                      "Emitir facturas, recibos de pago y soportes de los servicios prestados.",
                    ],
                  },
                  {
                    base: "Cumplimiento de obligaciones legales",
                    finalidades: [
                      "Conservar la historia clínica por el tiempo mínimo exigido por la Resolución 1995 de 1999 del Ministerio de Salud.",
                      "Reportar a las autoridades sanitarias cuando la ley lo exija (enfermedades de notificación obligatoria, etc.).",
                      "Conservar registros contables y fiscales conforme al Código de Comercio y las directrices de la DIAN.",
                      "Cumplir órdenes judiciales o de autoridades administrativas competentes.",
                    ],
                  },
                  {
                    base: "Consentimiento del titular",
                    finalidades: [
                      "Enviar recordatorios de citas, instrucciones postoperatorias y recomendaciones de salud oral por correo electrónico o WhatsApp.",
                      "Compartir resultados clínicos y radiografías con el paciente a través de canales digitales.",
                      "Realizar encuestas de satisfacción y retroalimentación sobre los servicios recibidos.",
                      "Comunicar promociones, programas de fidelización u ofertas de servicios de la clínica.",
                    ],
                  },
                  {
                    base: "Consentimiento explícito (datos sensibles de salud)",
                    finalidades: [
                      "Compartir información de la historia clínica con especialistas de remisión o laboratorios para continuidad asistencial.",
                      "Usar imágenes clínicas con fines educativos o de investigación científica, siempre de forma anonimizada.",
                      "Coordinar la atención con aseguradoras o planes de salud del paciente.",
                    ],
                  },
                ].map(({ base, finalidades }) => (
                  <div
                    key={base}
                    className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/50"
                  >
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      Base legal: {base}
                    </p>
                    <ul className="space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {finalidades.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal dark:bg-accent-cyan" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Datos sensibles — régimen especial */}
            <section id="datos-sensibles" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  6. Datos sensibles — régimen especial
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los datos de salud que DentPro Colombia recopila en el marco de la atención clínica
                constituyen <strong>datos sensibles</strong> en los términos del artículo 5 de la Ley
                1581 de 2012. Por su naturaleza, estos datos gozan de un régimen de protección
                reforzado:
              </p>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Garantías especiales para datos de salud
                </p>
                <ul className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {[
                    "Los datos sensibles de salud no serán tratados sin la autorización previa, expresa e informada del titular. En el caso de menores de edad, la autorización debe provenir del acudiente o representante legal.",
                    "Al momento de solicitar la autorización, DentPro Colombia informará explícitamente al titular que los datos que va a proporcionar son de carácter sensible, la finalidad específica del tratamiento y sus derechos.",
                    "El titular tiene derecho a negarse al tratamiento de sus datos sensibles sin que ello conlleve consecuencias en el acceso a los servicios de salud oral que no requieran dicho tratamiento.",
                    "El acceso a los datos sensibles está restringido exclusivamente al personal clínico y administrativo que requiera conocerlos para el cumplimiento de sus funciones, bajo compromiso de confidencialidad.",
                    "DentPro Colombia no comercializará, venderá ni cederá bases de datos de salud a terceros no vinculados directamente con la prestación de los servicios clínicos.",
                    "Las autorizaciones de tratamiento de datos sensibles se conservarán por el mismo período que la historia clínica correspondiente, como mínimo cinco (5) años.",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 7. Derechos del titular */}
            <section id="derechos" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  7. Derechos del titular — habeas data
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El artículo 8 de la Ley 1581 de 2012 reconoce a todo titular de datos personales los
                siguientes derechos, que DentPro Colombia se compromete a garantizar y facilitar:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Conocer",
                    desc: "Acceder de forma gratuita a los datos personales que sobre usted reposen en nuestras bases de datos, así como a la información sobre el tratamiento al que han sido sometidos.",
                  },
                  {
                    title: "Actualizar",
                    desc: "Solicitar la actualización de sus datos personales cuando estos resulten parciales, fraccionados o incompletos.",
                  },
                  {
                    title: "Rectificar",
                    desc: "Solicitar la corrección de sus datos cuando sean inexactos, desactualizados o cuando no correspondan a la realidad.",
                  },
                  {
                    title: "Suprimir",
                    desc: "Solicitar la eliminación de sus datos personales cuando considere que no están siendo tratados conforme a los principios y disposiciones de la Ley 1581 de 2012. La supresión no procede cuando exista una obligación legal de conservar los datos (por ejemplo, la historia clínica).",
                  },
                  {
                    title: "Revocar la autorización",
                    desc: "Retirar en cualquier momento el consentimiento otorgado para el tratamiento de sus datos, siempre que no exista otra base legal que lo sustente. La revocación no tendrá efectos retroactivos.",
                  },
                  {
                    title: "Solicitar prueba de autorización",
                    desc: "Obtener copia del documento o registro que acredite la autorización que otorgó para el tratamiento de sus datos personales.",
                  },
                  {
                    title: "Ser informado",
                    desc: "Recibir información sobre el uso que se le da a sus datos personales, previa solicitud dirigida a nuestro canal de atención.",
                  },
                  {
                    title: "Presentar quejas ante la SIC",
                    desc: "Presentar ante la Superintendencia de Industria y Comercio (SIC), en su calidad de autoridad de protección de datos, quejas por infracciones a lo dispuesto en la ley, una vez agotado el trámite de consulta o reclamo ante DentPro Colombia.",
                  },
                ].map(({ title, desc }) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/50"
                  >
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      {title}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 8. Procedimiento para ejercer derechos */}
            <section id="procedimiento" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  8. Procedimiento para ejercer derechos
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El titular o su representante legal puede ejercer sus derechos a través del canal
                designado por DentPro Colombia:
              </p>

              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Canal de atención
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  Correo electrónico:{" "}
                  <a
                    href="mailto:dentprocolombia@gmail.com"
                    className="font-semibold text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                  >
                    dentprocolombia@gmail.com
                  </a>
                  {" "}con asunto: <em>&quot;Ejercicio de derechos — Ley 1581 de 2012&quot;</em>
                </p>
              </div>

              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Consultas
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Cuando el titular solicite información sobre sus datos o el tratamiento que se les da,
                DentPro Colombia dará respuesta dentro de los <strong>diez (10) días hábiles</strong>{" "}
                siguientes a la recepción de la solicitud. Si no fuere posible atender la consulta en
                dicho plazo, se informará al titular expresando los motivos de la demora y señalando
                la fecha en que se atenderá, la cual no podrá superar los cinco (5) días hábiles
                siguientes al vencimiento del primer plazo.
              </p>

              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Reclamos
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Cuando el titular considere que la información debe ser corregida, actualizada,
                suprimida o revocada, DentPro Colombia atenderá el reclamo en un plazo de{" "}
                <strong>quince (15) días hábiles</strong> contados desde el día siguiente a la fecha
                de recepción. Cuando no fuere posible atender el reclamo en dicho plazo, se informará
                al interesado los motivos de la demora y la fecha en que se atenderá el reclamo, la
                cual en ningún caso podrá superar los ocho (8) días hábiles siguientes al vencimiento
                del primer término.
              </p>

              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Requisitos mínimos de la solicitud
              </h3>
              <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  "Nombre completo e identificación del titular o de su representante legal.",
                  "Descripción clara y precisa del derecho que desea ejercer (consulta, rectificación, actualización, supresión, revocación).",
                  "Documentos de soporte o prueba que estime pertinentes, cuando aplique.",
                  "Dirección física o electrónica para enviar la respuesta.",
                  "Firma o huella cuando se trate de solicitudes físicas.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal dark:bg-accent-cyan" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 9. Seguridad de la información */}
            <section id="seguridad" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  9. Seguridad de la información
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia adopta las medidas técnicas, humanas y administrativas necesarias
                para proteger los datos personales de sus titulares y evitar su adulteración, pérdida,
                consulta, uso o acceso no autorizado, de conformidad con el artículo 17, literal (d),
                de la Ley 1581 de 2012.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Cifrado y transmisión segura",
                    desc: "Las comunicaciones entre el usuario y la plataforma digital de DentPro Colombia se realizan mediante protocolos de cifrado TLS. Los archivos clínicos almacenados digitalmente cuentan con cifrado en reposo.",
                  },
                  {
                    title: "Control de acceso",
                    desc: "El acceso a las bases de datos de pacientes y la historia clínica está restringido mediante credenciales individuales, perfiles de usuario con principio de mínimo privilegio, y autenticación de múltiples factores para el personal administrativo.",
                  },
                  {
                    title: "Copias de seguridad",
                    desc: "Se realizan copias de seguridad periódicas de todas las bases de datos clínicas y administrativas. Las copias se almacenan en ubicaciones seguras, geográficamente separadas del servidor primario.",
                  },
                  {
                    title: "Capacitación del personal",
                    desc: "Todo el personal de DentPro Colombia que tenga acceso a datos personales recibe formación sobre protección de datos, confidencialidad clínica y ciberseguridad, y firma acuerdos de confidencialidad.",
                  },
                  {
                    title: "Gestión de incidentes",
                    desc: "DentPro Colombia cuenta con un protocolo de respuesta a incidentes de seguridad. En caso de una violación de datos que afecte a los titulares, se notificará a la SIC y a los afectados en los términos de la ley.",
                  },
                  {
                    title: "Auditorías y revisión periódica",
                    desc: "Las medidas de seguridad son revisadas y actualizadas periódicamente, considerando las amenazas tecnológicas vigentes y las mejores prácticas del sector de la salud.",
                  },
                ].map(({ title, desc }) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/50"
                  >
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      {title}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 10. Transferencia a terceros */}
            <section id="transferencia" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  10. Transferencia y transmisión de datos a terceros
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia puede compartir datos personales con terceros únicamente en los
                siguientes casos y bajo las condiciones que se indican:
              </p>
              <div className="space-y-3">
                {[
                  {
                    titulo: "Laboratorios de referencia",
                    desc: "Se comparte información clínica mínima y necesaria (nombre del paciente, tipo de muestra, análisis solicitado) con laboratorios especializados para la realización de exámenes diagnósticos ordenados por el odontólogo tratante. Esta transmisión se sustenta en la ejecución de la relación asistencial.",
                  },
                  {
                    titulo: "Especialistas de remisión",
                    desc: "Cuando el plan de tratamiento requiere la interconsulta con un especialista (endodoncista, periodoncista, ortodoncista, etc.), se comparte la historia clínica relevante con el profesional receptor, previo consentimiento del paciente. El especialista actúa como encargado del tratamiento bajo obligación de confidencialidad.",
                  },
                  {
                    titulo: "Proveedores de software clínico",
                    desc: "Los sistemas de gestión de historia clínica electrónica y agendamiento utilizados por DentPro Colombia tienen acceso a datos personales de pacientes en calidad de encargados del tratamiento, vinculados mediante contratos de procesamiento de datos que exigen niveles de seguridad equivalentes a los de esta política.",
                  },
                  {
                    titulo: "Aseguradoras y entidades del sistema de salud",
                    desc: "Cuando el paciente cuente con seguro médico o pertenezca a una entidad del sistema de salud que cofinancie los servicios, se compartirá la información requerida por dicha entidad, siempre que el titular haya otorgado su autorización o que la comunicación sea exigida por ley.",
                  },
                  {
                    titulo: "Autoridades públicas y judiciales",
                    desc: "DentPro Colombia podrá revelar datos personales a autoridades gubernamentales, judiciales o administrativas cuando así lo exija la ley colombiana, sin necesidad de consentimiento del titular.",
                  },
                ].map(({ titulo, desc }) => (
                  <div
                    key={titulo}
                    className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/50"
                  >
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      {titulo}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan mb-2">
                  Prohibición expresa
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  DentPro Colombia no vende, arrienda, cede ni comercializa bases de datos de
                  pacientes o colaboradores a terceros con fines distintos a los descritos en esta
                  política. Cualquier transferencia internacional de datos cumplirá con los requisitos
                  del artículo 26 de la Ley 1581 de 2012.
                </p>
              </div>
            </section>

            {/* 11. Tiempo de conservación */}
            <section id="conservacion" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  11. Tiempo de conservación de los datos
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los datos personales serán conservados durante el tiempo necesario para cumplir con
                las finalidades de su tratamiento y las obligaciones legales aplicables:
              </p>
              <div className="space-y-3">
                {[
                  {
                    tipo: "Historia clínica odontológica",
                    plazo: "Mínimo 5 años",
                    detalle:
                      "Conforme a la Resolución 1995 de 1999 del Ministerio de Salud, la historia clínica debe conservarse por un mínimo de cinco (5) años contados desde la última atención. DentPro Colombia conserva la historia clínica electrónica de forma indefinida para garantizar la continuidad asistencial, salvo solicitud de supresión que no contravenga la obligación legal.",
                  },
                  {
                    tipo: "Datos de facturación y contables",
                    plazo: "10 años",
                    detalle:
                      "Los registros contables, facturas y soportes de pago se conservan durante diez (10) años, conforme a las obligaciones tributarias y contables establecidas por la DIAN y el Código de Comercio colombiano.",
                  },
                  {
                    tipo: "Datos de contacto y comunicación",
                    plazo: "Vigencia de la relación + 2 años",
                    detalle:
                      "Los datos de identificación y contacto del paciente (correo, teléfono, dirección) se conservan mientras exista la relación clínica activa y durante los dos (2) años siguientes a la última atención, salvo que el titular solicite su supresión antes de ese plazo.",
                  },
                  {
                    tipo: "Autorizaciones de tratamiento de datos",
                    plazo: "Igual período que el dato autorizado",
                    detalle:
                      "Los registros de autorización para el tratamiento de datos personales se conservan por el mismo período que los datos a los que corresponden, para poder acreditar su existencia ante el titular o ante la SIC si fuera necesario.",
                  },
                  {
                    tipo: "Datos de empleados y colaboradores",
                    plazo: "Vigencia de la relación + 5 años",
                    detalle:
                      "Los datos personales del personal vinculado se conservan durante la relación laboral o contractual y por cinco (5) años adicionales, en cumplimiento de las obligaciones laborales y de seguridad social.",
                  },
                ].map(({ tipo, plazo, detalle }) => (
                  <div
                    key={tipo}
                    className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                        {tipo}
                      </p>
                      <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand-indigo dark:bg-surface-elevated dark:text-accent-cyan">
                        {plazo}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {detalle}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 12. Modificaciones */}
            <section id="modificaciones" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  12. Modificaciones a la política
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia se reserva el derecho de modificar esta Política de Tratamiento de
                Datos Personales en cualquier momento, siempre que los cambios sean acordes con la
                normativa vigente en Colombia.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Cuando se realicen cambios sustanciales a esta política, DentPro Colombia procederá
                de la siguiente manera:
              </p>
              <ul className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  "La versión actualizada de la política se publicará en el sitio web de DentPro Colombia con al menos diez (10) días calendario de antelación a la fecha de entrada en vigencia.",
                  "Los titulares registrados con correo electrónico recibirán una notificación informativa sobre los cambios realizados y la fecha de vigencia de la nueva versión.",
                  "Si los cambios afectan el tratamiento de datos sensibles o implican nuevas finalidades que requieran consentimiento, se solicitará al titular una nueva autorización expresa antes de iniciar el nuevo tratamiento.",
                  'La fecha de "Última actualización" visible en la parte superior de esta página refleja siempre la versión vigente de la política.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El uso continuado de los servicios de DentPro Colombia después de la fecha de vigencia
                de la nueva política se entenderá como aceptación de los cambios realizados, siempre
                que no se requiera un nuevo consentimiento expreso.
              </p>
            </section>

            {/* 13. Contacto */}
            <section id="contacto" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5">
                <EnvelopeSimple className="h-5 w-5 text-brand-teal dark:text-accent-cyan" weight="bold" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  13. Contacto y canal de atención
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Para ejercer sus derechos, presentar consultas, reclamos o solicitudes relacionadas
                con el tratamiento de sus datos personales, el titular puede comunicarse con
                DentPro Colombia a través de los siguientes canales:
              </p>

              {/* Contact card */}
              <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 dark:border-surface-muted/60 dark:bg-surface-base/90">
                <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
                  Canales de contacto — DentPro Colombia S.A.S.
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                      <EnvelopeSimple className="h-4 w-4 text-brand-teal dark:text-accent-cyan" weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Correo electrónico
                      </p>
                      <a
                        href="mailto:dentprocolombia@gmail.com"
                        className="text-sm font-medium text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                      >
                        dentprocolombia@gmail.com
                      </a>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Canal principal para solicitudes de datos personales
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                      <Phone className="h-4 w-4 text-brand-teal dark:text-accent-cyan" weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Teléfono / WhatsApp
                      </p>
                      <a
                        href="tel:+573237968435"
                        className="text-sm font-medium text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                      >
                        +57 323 796 8435
                      </a>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lun–Sáb 8:00–19:00
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                      <MapPin className="h-4 w-4 text-brand-teal dark:text-accent-cyan" weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Dirección física
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Cra. 7 #13-180, Chía, Cundinamarca
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Atención presencial con cita previa
                      </p>
                    </div>
                  </li>
                </ul>

                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-surface-muted">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Autoridad de control
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Si considera que DentPro Colombia no ha atendido su solicitud de manera adecuada,
                    puede acudir ante la{" "}
                    <strong>Superintendencia de Industria y Comercio (SIC)</strong>, autoridad nacional
                    de protección de datos personales en Colombia:
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <li>
                      Sitio web:{" "}
                      <a
                        href="https://www.sic.gov.co"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                      >
                        www.sic.gov.co
                      </a>
                    </li>
                    <li>
                      Línea gratuita nacional:{" "}
                      <a
                        href="tel:018000910165"
                        className="text-brand-teal underline underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
                      >
                        01-8000-910165
                      </a>
                    </li>
                    <li>
                      Dirección: Carrera 13 # 27-00, Bogotá D.C., Colombia
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Esta política fue adoptada por DentPro Colombia S.A.S. conforme a lo establecido en
                la Ley 1581 de 2012, el Decreto 1377 de 2013 y las instrucciones impartidas por la
                Superintendencia de Industria y Comercio. Vigente a partir de junio de 2026.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
