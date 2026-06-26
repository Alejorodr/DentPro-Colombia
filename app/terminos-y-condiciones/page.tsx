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
  CalendarBlank,
} from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Términos y condiciones — DentPro Colombia",
  description:
    "Condiciones generales de uso de la plataforma y los servicios de DentPro Colombia S.A.S., conforme a la Ley 1480 de 2011 (Estatuto del Consumidor).",
};

const sections = [
  { id: "objeto", label: "Objeto y aceptación" },
  { id: "definiciones", label: "Definiciones" },
  { id: "registro", label: "Registro y cuenta" },
  { id: "servicios", label: "Servicios ofrecidos" },
  { id: "agendamiento", label: "Agendamiento de citas" },
  { id: "cancelacion", label: "Cancelación y reprogramación" },
  { id: "retracto", label: "Derecho de retracto" },
  { id: "precios", label: "Precios y pagos" },
  { id: "responsabilidad-usuario", label: "Responsabilidad del usuario" },
  { id: "propiedad-intelectual", label: "Propiedad intelectual" },
  { id: "limitacion", label: "Limitación de responsabilidad" },
  { id: "privacidad", label: "Privacidad y datos" },
  { id: "modificaciones", label: "Modificaciones" },
  { id: "suspension", label: "Suspensión y terminación" },
  { id: "ley-aplicable", label: "Ley aplicable y disputas" },
  { id: "contacto", label: "Contacto" },
];

export default function TerminosYCondicionesPage() {
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
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Términos y condiciones
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="mb-12 max-w-3xl space-y-3">
          <span className="badge">Legal</span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Términos y condiciones
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400">
            Última actualización: junio de 2026
          </p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            El uso de la plataforma y los servicios de DentPro Colombia S.A.S.
            implica la aceptación plena de las condiciones aquí establecidas,
            conforme a la{" "}
            <strong>Ley 1480 de 2011 (Estatuto del Consumidor)</strong> y demás
            normas concordantes del ordenamiento jurídico colombiano.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:items-start">
          {/* Sticky ToC */}
          <nav
            className="hidden lg:block lg:sticky lg:top-24 space-y-1"
            aria-label="Tabla de contenidos"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Contenido
            </p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-surface-elevated dark:hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </nav>

          {/* Sections */}
          <div className="space-y-10">
            {/* 1. Objeto y aceptación */}
            <section id="objeto" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <FileText
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  1. Objeto y aceptación
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los presentes Términos y Condiciones Generales de Uso (en
                adelante, «los Términos») regulan el acceso y la utilización de
                la plataforma digital de{" "}
                <strong>DentPro Colombia S.A.S.</strong>, sociedad por acciones
                simplificada constituida conforme a la legislación colombiana,
                con domicilio en Cra. 7 #13-180, Chía, Cundinamarca (en
                adelante, «la Clínica» o «DentPro Colombia»), así como la
                contratación de los servicios de salud oral disponibles a través
                de dicha plataforma.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Las partes de la relación jurídica que se establece por virtud
                de estos Términos son: (i){" "}
                <strong>DentPro Colombia S.A.S.</strong>, en calidad de
                prestador del servicio; y (ii) el <strong>Usuario</strong>,
                definido como toda persona natural mayor de dieciocho (18) años
                que acceda, navegue o utilice la plataforma, ya sea para
                informarse, registrarse, agendar citas o acceder al portal
                clínico.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El simple acceso a la plataforma, el registro de una cuenta de
                usuario o el agendamiento de cualquier cita constituyen
                manifestación inequívoca de la aceptación plena, libre e
                informada de la totalidad de estos Términos, así como de la{" "}
                <Link
                  href="/politica-de-privacidad"
                  className="font-medium text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
                >
                  Política de Tratamiento de Datos Personales
                </Link>{" "}
                de DentPro Colombia. Si el Usuario no está de acuerdo con
                cualquiera de las condiciones aquí establecidas, deberá
                abstenerse de utilizar la plataforma y los servicios asociados.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Estos Términos se rigen por la Ley 1480 de 2011 (Estatuto del
                Consumidor), la Ley 1581 de 2012 (Protección de Datos
                Personales), la Ley 1751 de 2015 (Derecho Fundamental a la
                Salud), la Resolución 1995 de 1999 del Ministerio de Salud sobre
                historias clínicas, y demás normas concordantes del derecho
                colombiano.
              </p>
            </section>

            {/* 2. Definiciones */}
            <section id="definiciones" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <FileText
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  2. Definiciones
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Para los efectos de la interpretación y aplicación de los
                presentes Términos, los siguientes términos tendrán el
                significado que se indica a continuación:
              </p>
              <dl className="space-y-3">
                {[
                  {
                    term: "Usuario",
                    def: "Toda persona natural mayor de dieciocho (18) años que acceda a la plataforma o haga uso de cualquiera de sus funcionalidades, con independencia de que se encuentre o no registrada.",
                  },
                  {
                    term: "Paciente",
                    def: "Usuario que ha establecido o mantiene una relación de atención en salud oral con DentPro Colombia S.A.S., y cuya historia clínica reposa en el sistema de información de la Clínica.",
                  },
                  {
                    term: "Plataforma",
                    def: "Sitio web, portal clínico y aplicaciones digitales administradas por DentPro Colombia S.A.S., a través de los cuales se prestan los servicios digitales descritos en estos Términos.",
                  },
                  {
                    term: "Servicio",
                    def: "Prestación de salud oral ofrecida de manera presencial en las instalaciones de la Clínica, cuyo acceso y gestión puede realizarse, en todo o en parte, mediante la Plataforma.",
                  },
                  {
                    term: "Cuenta",
                    def: "Espacio virtual de acceso restringido, asociado a un conjunto de credenciales únicas (correo electrónico y contraseña), mediante el cual el Usuario interactúa con el portal clínico.",
                  },
                  {
                    term: "Cita",
                    def: "Reserva de un bloque de tiempo en la agenda de un Profesional de salud de DentPro Colombia, efectuada a través de la Plataforma o por cualquier otro canal habilitado por la Clínica.",
                  },
                  {
                    term: "Profesional de salud",
                    def: "Odontólogo u otro profesional del área de la salud oral debidamente habilitado ante el Ministerio de Salud y Protección Social, vinculado a DentPro Colombia S.A.S. para la prestación de los servicios.",
                  },
                ].map(({ term, def }) => (
                  <div
                    key={term}
                    className="rounded-xl border border-slate-100 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/40"
                  >
                    <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      {term}
                    </dt>
                    <dd className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {def}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* 3. Registro y cuenta */}
            <section id="registro" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <UserCircle
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  3. Registro y cuenta de usuario
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El acceso a determinadas funcionalidades del portal clínico
                requiere la creación de una cuenta de usuario. Para tal efecto,
                el Usuario deberá proporcionar información completa, exacta,
                actualizada y veraz, en cumplimiento del deber de información
                consagrado en el artículo 23 de la Ley 1480 de 2011.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los requisitos mínimos para el registro son: nombre completo,
                número de documento de identidad, fecha de nacimiento, correo
                electrónico válido, número de teléfono móvil activo y,
                opcionalmente, información de cobertura de salud (EPS o seguro
                privado). El Usuario es el único responsable de la
                confidencialidad y seguridad de sus credenciales de acceso. Toda
                actividad realizada desde su Cuenta se presumirá efectuada por
                el Usuario titular.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia podrá implementar mecanismos de verificación de
                identidad, tales como el envío de un código de confirmación al
                correo electrónico o al número de teléfono registrado. El
                incumplimiento del proceso de verificación impedirá el acceso
                completo al portal.
              </p>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Datos falsos o inexactos
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  El suministro de información falsa, incompleta o desactualizada
                  faculta a DentPro Colombia para suspender o cancelar la Cuenta
                  de forma inmediata, sin perjuicio de las acciones legales que
                  pudieran corresponder conforme al artículo 219 del Código Penal
                  colombiano y las disposiciones del Estatuto del Consumidor.
                </p>
              </div>
            </section>

            {/* 4. Servicios ofrecidos */}
            <section id="servicios" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <CheckCircle
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  4. Servicios ofrecidos
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                A través de la Plataforma, DentPro Colombia pone a disposición
                del Usuario los siguientes servicios digitales de apoyo a la
                atención en salud oral:
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  "Portal de gestión de citas: agendamiento, confirmación, reprogramación y cancelación de citas presenciales.",
                  "Historial clínico digital: consulta de registros de atención, diagnósticos, tratamientos y evoluciones, en los términos permitidos por la Resolución 1995 de 1999.",
                  "Comunicación con profesionales: envío de mensajes a través del portal para seguimiento post-consulta, aclaraciones sobre tratamientos y solicitud de información no urgente.",
                  "Recordatorios automáticos: notificaciones por correo electrónico o SMS con anticipación a las citas programadas.",
                  "Acceso a consentimientos informados: firma digital y consulta de documentos de consentimiento informado, conforme a los requisitos del Sistema Obligatorio de Garantía de Calidad en Salud.",
                  "Carga y consulta de resultados: visualización de estudios de laboratorio, imágenes diagnósticas y otros documentos clínicos habilitados por el Profesional de salud.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan"
                      weight="fill"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Naturaleza de la Plataforma
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  La Plataforma es exclusivamente un canal de acceso y gestión
                  administrativa. La relación médico-paciente, el acto clínico y
                  la responsabilidad derivada de la prestación de los servicios
                  de salud oral se rigen por las normas especiales del Sistema
                  General de Seguridad Social en Salud, la Ley 1164 de 2007 y
                  demás disposiciones del derecho sanitario colombiano. La
                  Plataforma no sustituye la consulta presencial ni debe
                  utilizarse para la atención de urgencias o emergencias médicas.
                  En caso de urgencia, el Usuario debe contactar la línea de
                  emergencias 123 o acudir al servicio de urgencias más cercano.
                </p>
              </div>
            </section>

            {/* 5. Agendamiento de citas */}
            <section id="agendamiento" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <CalendarBlank
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  5. Agendamiento de citas
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El proceso de reserva de una cita se inicia con la selección del
                servicio, el Profesional de salud y el bloque horario disponible
                en la agenda de la Plataforma. Una vez completado el formulario
                de agendamiento y confirmada la solicitud, el sistema enviará al
                correo electrónico registrado una notificación de confirmación
                con los datos de la cita (fecha, hora, profesional y servicio).
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                La disponibilidad de horarios está sujeta a la agenda de cada
                Profesional de salud y puede variar en tiempo real. La
                visualización de un horario en la Plataforma no garantiza su
                disponibilidad hasta que se reciba la confirmación por parte de
                la Clínica.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El Paciente se obliga a: (i) presentarse puntualmente a la cita
                confirmada; (ii) informar con anticipación mínima de veinticuatro
                (24) horas si no puede asistir; (iii) proporcionar información
                clínica veraz al momento de la consulta; y (iv) seguir las
                instrucciones de preparación pre-consulta que le sean
                comunicadas.
              </p>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Política de no presentación (no-show)
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  La inasistencia a una cita confirmada sin previo aviso dentro
                  del plazo establecido constituye un incumplimiento de las
                  obligaciones del Usuario. Tras dos (2) inasistencias sin aviso
                  en un período de seis (6) meses, DentPro Colombia se reserva
                  el derecho de requerir un depósito de reserva o de limitar
                  temporalmente la posibilidad de agendar nuevas citas a través
                  de la Plataforma, lo cual será comunicado al Usuario por correo
                  electrónico con al menos cuarenta y ocho (48) horas de
                  anticipación.
                </p>
              </div>
            </section>

            {/* 6. Cancelación y reprogramación */}
            <section id="cancelacion" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <Clock
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  6. Cancelación y reprogramación
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El Usuario podrá cancelar o reprogramar una cita sin penalidad
                alguna, siempre que lo haga con una antelación mínima de{" "}
                <strong>veinticuatro (24) horas</strong> respecto a la hora de
                inicio de la cita. Este procedimiento puede realizarse a través
                del portal clínico (sección «Mis citas»), enviando un correo
                electrónico a{" "}
                <a
                  href="mailto:dentprocolombia@gmail.com"
                  className="font-medium text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
                >
                  dentprocolombia@gmail.com
                </a>{" "}
                o contactando a la recepción por WhatsApp al{" "}
                <strong>+57 323 796 8435</strong>.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                En caso de cancelaciones motivadas por circunstancias de fuerza
                mayor o caso fortuito debidamente documentadas (calamidad
                doméstica, hospitalización, eventos de orden público), DentPro
                Colombia evaluará la situación y facilitará la reprogramación sin
                penalidad, independientemente del plazo de notificación.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia podrá cancelar o reprogramar una cita por
                razones de fuerza mayor, ausencia imprevista del Profesional de
                salud o situaciones clínicas de emergencia. En tales casos, la
                Clínica notificará al Paciente con la mayor anticipación posible
                por los medios de contacto registrados y ofrecerá una nueva
                fecha en un plazo no superior a cinco (5) días hábiles, o la
                devolución íntegra de cualquier pago anticipado realizado.
              </p>
            </section>

            {/* 7. Derecho de retracto */}
            <section id="retracto" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <ShieldCheck
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  7. Derecho de retracto (Art. 47 Ley 1480 de 2011)
                </h2>
              </div>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Aplicabilidad
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  El derecho de retracto aplica exclusivamente a los servicios
                  pagados a través de canales digitales (en línea), conforme al
                  artículo 47 de la Ley 1480 de 2011. No aplica a servicios de
                  salud que hayan sido efectivamente prestados ni a situaciones
                  de urgencia clínica.
                </p>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Cuando el Usuario haya pagado total o parcialmente por un
                servicio de salud oral a través de la Plataforma y el servicio no
                haya sido prestado, podrá ejercer el derecho de retracto dentro
                de los{" "}
                <strong>cinco (5) días hábiles</strong> siguientes a la fecha en
                que se realizó el pago en línea, sin necesidad de invocar causa
                alguna.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Para ejercer este derecho, el Usuario deberá remitir comunicación
                escrita al correo electrónico{" "}
                <a
                  href="mailto:dentprocolombia@gmail.com"
                  className="font-medium text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
                >
                  dentprocolombia@gmail.com
                </a>
                , indicando: (i) nombre completo y número de documento de
                identidad; (ii) fecha y referencia del pago; (iii) servicio
                objeto del retracto; y (iv) número de cuenta bancaria o
                instrucción para la devolución del dinero.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia efectuará la devolución íntegra de los valores
                pagados dentro de los{" "}
                <strong>cinco (5) días hábiles</strong> siguientes a la recepción
                de la solicitud de retracto, a través del mismo medio de pago
                utilizado o por transferencia bancaria a la cuenta indicada por
                el Usuario. Los costos de transacción asociados al medio de pago
                original no serán deducidos del reembolso, salvo que la entidad
                financiera los aplique de forma automática.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El derecho de retracto no procede cuando: (i) el servicio de
                salud haya sido efectivamente prestado; (ii) el pago corresponda
                a una urgencia clínica ya atendida; (iii) el Usuario haya
                expresamente renunciado a este derecho en los términos permitidos
                por la ley.
              </p>
            </section>

            {/* 8. Precios y pagos */}
            <section id="precios" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <FileText
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  8. Precios y pagos
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Todos los precios publicados en la Plataforma se expresan en{" "}
                <strong>pesos colombianos (COP)</strong>, conforme a las
                disposiciones de la Circular Única de la Superintendencia de
                Industria y Comercio sobre información de precios al consumidor.
                El IVA y demás impuestos aplicables se indicarán de forma
                expresa cuando corresponda, según la naturaleza del servicio y la
                normativa tributaria vigente (Estatuto Tributario, artículos 476
                y ss.).
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los medios de pago habilitados incluyen: tarjeta de crédito o
                débito (Visa, Mastercard, American Express), PSE (Pago Seguro en
                Línea), transferencia bancaria y efectivo en las instalaciones de
                la Clínica. DentPro Colombia no almacena datos de tarjetas de
                crédito ni débito; dicha información es procesada directamente
                por las pasarelas de pago certificadas y que cumplen el estándar
                PCI-DSS.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                La facturación electrónica se emite conforme a los requisitos de
                la DIAN (Resolución 000042 de 2020 y normativa concordante). El
                Usuario recibirá su factura electrónica de venta al correo
                registrado dentro de los dos (2) días hábiles siguientes a la
                prestación del servicio o al pago anticipado, según corresponda.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los Usuarios afiliados al Sistema General de Seguridad Social en
                Salud podrán estar sujetos al pago de copagos y cuotas
                moderadoras, conforme a lo establecido en el Acuerdo 260 de 2004
                del Consejo Nacional de Seguridad Social en Salud y las
                resoluciones que lo modifiquen. La liquidación de dichos valores
                corresponde a la EPS del Paciente y no a DentPro Colombia.
              </p>
            </section>

            {/* 9. Responsabilidad del usuario */}
            <section
              id="responsabilidad-usuario"
              className="scroll-mt-28 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <Users
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  9. Responsabilidad del usuario
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El Usuario se compromete a hacer uso de la Plataforma de forma
                lícita, responsable y conforme a los presentes Términos, a la
                buena fe contractual y a las normas de convivencia. En particular,
                el Usuario se obliga a:
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  "No compartir sus credenciales de acceso con terceros ni permitir el uso de su Cuenta por personas distintas a él.",
                  "Notificar de forma inmediata a DentPro Colombia cualquier acceso no autorizado a su Cuenta o uso indebido de sus credenciales, a través del correo dentprocolombia@gmail.com.",
                  "No intentar acceder a cuentas, datos o sistemas de otros usuarios, ni a secciones restringidas de la Plataforma para las que no cuente con autorización expresa.",
                  "Abstenerse de realizar cualquier actividad que pueda dañar, sobrecargar, inutilizar o deteriorar la Plataforma, sus servidores o infraestructura tecnológica asociada.",
                  "No realizar scraping, minería de datos, ingeniería inversa ni ninguna técnica automatizada de extracción de contenidos o datos de la Plataforma sin autorización escrita de DentPro Colombia.",
                  "Tratar con respeto y dignidad al personal de la Clínica, ya sea en las instalaciones físicas o a través de los canales de comunicación digital habilitados.",
                  "Proporcionar información clínica veraz y completa, dado que la calidad de la atención en salud depende directamente de la precisión de los datos suministrados.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan"
                      weight="fill"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 10. Propiedad intelectual */}
            <section
              id="propiedad-intelectual"
              className="scroll-mt-28 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <Lock
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  10. Propiedad intelectual
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                La Plataforma, su código fuente, diseño, estructura, interfaz,
                base de datos, marca, logotipos, fotografías, textos, iconografía
                y demás contenidos son propiedad exclusiva de DentPro Colombia
                S.A.S. o de sus licenciantes, y se encuentran protegidos por la
                Ley 23 de 1982 sobre derechos de autor, la Decisión Andina 351
                de 1993 y los Tratados Internacionales sobre propiedad
                intelectual suscritos por Colombia.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia otorga al Usuario una licencia personal,
                intransferible, no exclusiva y revocable para acceder y utilizar
                la Plataforma exclusivamente para los fines previstos en estos
                Términos. Esta licencia no implica cesión de derechos de
                propiedad intelectual de ninguna naturaleza.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Queda expresamente prohibida la reproducción total o parcial,
                distribución, transformación, comunicación pública, puesta a
                disposición o cualquier otra forma de explotación de los
                contenidos de la Plataforma sin la autorización previa y escrita
                de DentPro Colombia S.A.S. La infracción de estas prohibiciones
                podrá dar lugar al ejercicio de las acciones civiles y penales
                contempladas en la legislación colombiana sobre propiedad
                intelectual.
              </p>
            </section>

            {/* 11. Limitación de responsabilidad */}
            <section id="limitacion" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <ShieldCheck
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  11. Limitación de responsabilidad
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia se obliga a mantener la Plataforma operativa con
                un nivel de disponibilidad razonable y a implementar medidas de
                seguridad tecnológica adecuadas. No obstante, no garantiza la
                disponibilidad ininterrumpida del servicio ni responde por:
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  "Interrupciones, fallos o demoras derivados de fuerza mayor, caso fortuito, fallas en la infraestructura de telecomunicaciones de terceros o ataques cibernéticos externos.",
                  "El uso indebido de credenciales de acceso por parte del Usuario o de terceros a quienes el Usuario haya facilitado dicha información.",
                  "Daños o perjuicios derivados del uso de la Plataforma en condiciones distintas a las previstas en estos Términos.",
                  "Contenido de terceros, sitios web externos enlazados desde la Plataforma o aplicaciones de terceros integradas.",
                  "Decisiones médicas o clínicas adoptadas por el Usuario basadas en información consultada en la Plataforma sin la supervisión de un Profesional de salud.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan"
                      weight="fill"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                En ningún caso la responsabilidad total de DentPro Colombia
                frente al Usuario, derivada del uso de la Plataforma, excederá el
                valor del servicio pagado por el que se origina la reclamación.
              </p>
              <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  Obligaciones de medio en servicios de salud
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  Conforme a la jurisprudencia del Consejo de Estado y la Corte
                  Suprema de Justicia colombiana, los servicios de salud oral
                  generan, en general, obligaciones de medio y no de resultado.
                  DentPro Colombia y sus Profesionales de salud actúan con la
                  diligencia, cuidado y pericia exigibles conforme a la lex
                  artis de la odontología, sin garantizar un resultado clínico
                  específico, salvo en los casos en que la naturaleza del
                  procedimiento permita pactar expresamente una obligación de
                  resultado.
                </p>
              </div>
            </section>

            {/* 12. Privacidad y datos */}
            <section id="privacidad" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <Lock
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  12. Privacidad y datos personales
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El tratamiento de los datos personales del Usuario se rige por la{" "}
                <Link
                  href="/politica-de-privacidad"
                  className="font-medium text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
                >
                  Política de Tratamiento de Datos Personales
                </Link>{" "}
                de DentPro Colombia, disponible en la Plataforma, la cual forma
                parte integral de estos Términos y debe ser leída conjuntamente
                con ellos.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Al registrarse en la Plataforma, el Usuario otorga su
                consentimiento informado, previo, expreso y específico para el
                tratamiento de sus datos personales con las finalidades
                descritas en la Política, conforme a lo exigido por la Ley 1581
                de 2012 y el Decreto 1377 de 2013.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los datos relativos a la salud del Usuario (diagnósticos,
                tratamientos, historia clínica, imágenes diagnósticas, entre
                otros) son considerados{" "}
                <strong>datos sensibles</strong> en los términos del artículo 5
                de la Ley 1581 de 2012, y recibirán el nivel de protección
                reforzado que dicha calificación impone. Su tratamiento se
                realizará únicamente para las finalidades directamente
                relacionadas con la prestación de los servicios de salud oral y
                las obligaciones legales de custodia de la historia clínica.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                El Usuario podrá ejercer sus derechos de acceso, corrección,
                supresión, portabilidad, oposición y revocación del
                consentimiento, conforme al procedimiento descrito en la Política
                de Tratamiento de Datos Personales. DentPro Colombia actúa como
                responsable del tratamiento de datos personales ante la
                Superintendencia de Industria y Comercio (SIC).
              </p>
            </section>

            {/* 13. Modificaciones */}
            <section id="modificaciones" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <FileText
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  13. Modificaciones a los términos
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia se reserva el derecho de modificar, actualizar
                o complementar los presentes Términos en cualquier momento, con
                el fin de adaptarlos a cambios normativos, tecnológicos o en los
                servicios ofrecidos. Las modificaciones serán notificadas al
                Usuario con al menos{" "}
                <strong>diez (10) días calendario de anticipación</strong> a su
                entrada en vigor, mediante correo electrónico enviado a la
                dirección registrada en la Cuenta.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                La versión actualizada de los Términos será publicada en la
                Plataforma con indicación expresa de la fecha de la última
                modificación. El uso continuado de la Plataforma o de cualquiera
                de sus servicios con posterioridad a la entrada en vigor de los
                nuevos Términos implicará la aceptación plena de las
                modificaciones introducidas.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Si el Usuario no acepta las modificaciones introducidas, deberá
                notificarlo a DentPro Colombia antes de la fecha de entrada en
                vigor y proceder al cierre de su Cuenta. Las citas ya agendadas y
                los pagos realizados con anterioridad a la modificación se
                regirán por los Términos vigentes en el momento de su
                contratación.
              </p>
            </section>

            {/* 14. Suspensión y terminación */}
            <section id="suspension" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <UserCircle
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  14. Suspensión y terminación de cuenta
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia podrá suspender preventivamente o cancelar
                definitivamente la Cuenta de un Usuario cuando se configure
                alguna de las siguientes causales:
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  "Incumplimiento de cualquiera de las obligaciones establecidas en los presentes Términos.",
                  "Suministro de información personal falsa, inexacta, desactualizada o incompleta.",
                  "Conducta inapropiada, irrespetuosa o abusiva hacia el personal de DentPro Colombia en cualquier canal de comunicación.",
                  "Uso de la Plataforma con fines ilícitos, fraudulentos o contrarios al orden público y las buenas costumbres.",
                  "Intento de acceso no autorizado a sistemas, datos de otros usuarios o recursos de la infraestructura tecnológica de DentPro Colombia.",
                  "Recomendación o indicación judicial o de autoridad competente.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan"
                      weight="fill"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Salvo en los casos que requieran actuación inmediata por su
                gravedad, DentPro Colombia notificará al Usuario por correo
                electrónico la causal imputada y le concederá un plazo de{" "}
                <strong>cinco (5) días hábiles</strong> para que presente sus
                descargos o subsane el incumplimiento. Vencido dicho plazo sin
                respuesta satisfactoria, se procederá a la suspensión o
                cancelación definitiva.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                La cancelación de la Cuenta no afectará la historia clínica del
                Paciente, la cual permanecerá custodiada por DentPro Colombia
                conforme a los plazos establecidos por la Resolución 1995 de
                1999 del Ministerio de Salud y demás normas sobre archivo de
                documentos clínicos.
              </p>
            </section>

            {/* 15. Ley aplicable */}
            <section id="ley-aplicable" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <ShieldCheck
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  15. Ley aplicable y resolución de disputas
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Los presentes Términos se rigen en su integridad por las leyes de
                la República de Colombia. Para cualquier controversia derivada de
                la interpretación, ejecución o incumplimiento de estos Términos,
                las partes acuerdan someterse a la jurisdicción ordinaria de los
                juzgados y tribunales competentes del municipio de{" "}
                <strong>Chía, Cundinamarca</strong>, con renuncia a cualquier
                otro fuero que pudiera corresponderles.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Sin perjuicio de lo anterior, las partes acuerdan agotar el
                siguiente mecanismo de resolución gradual de disputas antes de
                acudir a la vía judicial:
              </p>
              <ol className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {[
                  {
                    step: "1. Reclamación directa",
                    desc: "El Usuario podrá presentar su reclamación por escrito a DentPro Colombia a través de los canales indicados en la sección de Contacto. La Clínica responderá dentro de los quince (15) días hábiles siguientes a la recepción, conforme al artículo 49 de la Ley 1480 de 2011.",
                  },
                  {
                    step: "2. Superintendencia de Industria y Comercio (SIC)",
                    desc: "Si la reclamación directa no se resuelve satisfactoriamente, el Usuario podrá acudir a la SIC (www.sic.gov.co), entidad competente para conocer las reclamaciones de los consumidores en materia del Estatuto del Consumidor.",
                  },
                  {
                    step: "3. Superintendencia de Salud",
                    desc: "Para las controversias específicamente relacionadas con la prestación de servicios de salud, el Usuario podrá acudir también a la Superintendencia de Salud (www.supersalud.gov.co).",
                  },
                  {
                    step: "4. Vía judicial",
                    desc: "Agotados los mecanismos anteriores o cuando la urgencia del caso lo amerite, cualquiera de las partes podrá acudir a los jueces colombianos competentes conforme a las reglas de competencia del Código General del Proceso.",
                  },
                ].map(({ step, desc }) => (
                  <li
                    key={step}
                    className="rounded-xl border border-slate-100 bg-white/70 p-4 dark:border-surface-muted dark:bg-surface-elevated/40"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      {step}
                    </p>
                    <p>{desc}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* 16. Contacto */}
            <section id="contacto" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light dark:bg-surface-elevated">
                  <EnvelopeSimple
                    className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                    weight="bold"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  16. Contacto y reclamaciones
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Para ejercer los derechos contemplados en estos Términos,
                presentar reclamaciones, solicitar información o comunicar
                cualquier incidencia relacionada con la Plataforma o los
                servicios, el Usuario puede contactar a DentPro Colombia a través
                de los siguientes canales:
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white/70 p-5 dark:border-surface-muted dark:bg-surface-elevated/40">
                  <div className="mb-3 flex items-center gap-2">
                    <EnvelopeSimple
                      className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                      weight="bold"
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      Correo electrónico
                    </p>
                  </div>
                  <a
                    href="mailto:dentprocolombia@gmail.com"
                    className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-200"
                  >
                    dentprocolombia@gmail.com
                  </a>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/70 p-5 dark:border-surface-muted dark:bg-surface-elevated/40">
                  <div className="mb-3 flex items-center gap-2">
                    <Phone
                      className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                      weight="bold"
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      WhatsApp / Teléfono
                    </p>
                  </div>
                  <a
                    href="https://wa.me/573237968435"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-200"
                  >
                    +57 323 796 8435
                  </a>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/70 p-5 dark:border-surface-muted dark:bg-surface-elevated/40">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin
                      className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                      weight="bold"
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      Dirección física
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Cra. 7 #13-180, Chía, Cundinamarca
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/70 p-5 dark:border-surface-muted dark:bg-surface-elevated/40">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock
                      className="h-4 w-4 text-brand-teal dark:text-accent-cyan"
                      weight="bold"
                    />
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                      Horario de atención
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Lun–Sáb 8:00–19:00
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Domingos y festivos con cita previa
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                DentPro Colombia también es objeto de vigilancia y control por
                parte de la{" "}
                <strong>Superintendencia de Salud</strong> (
                <a
                  href="https://www.supersalud.gov.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
                >
                  www.supersalud.gov.co
                </a>
                ) y la{" "}
                <strong>Superintendencia de Industria y Comercio</strong> (
                <a
                  href="https://www.sic.gov.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
                >
                  www.sic.gov.co
                </a>
                ) en el ámbito de sus respectivas competencias.
              </p>
            </section>

            {/* Footer note */}
            <div className="rounded-2xl border border-brand-sky/20 bg-brand-light/40 p-5 dark:border-surface-muted dark:bg-surface-elevated/60">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Estos Términos y Condiciones fueron redactados conforme a la Ley
                1480 de 2011 (Estatuto del Consumidor), la Ley 1581 de 2012
                (Habeas Data), la Ley 1751 de 2015 (Derecho Fundamental a la
                Salud), la Resolución 1995 de 1999 del Ministerio de Salud, la
                Ley 23 de 1982 sobre derechos de autor y demás normas
                concordantes del ordenamiento jurídico colombiano vigente al
                momento de su redacción. DentPro Colombia S.A.S. recomienda al
                Usuario conservar una copia de estos Términos para su consulta
                futura.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
