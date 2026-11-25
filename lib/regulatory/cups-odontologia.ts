/**
 * Catálogo CUPS odontológico (DOG-42).
 *
 * Fuente: Resolución 2706 de 2025 del Ministerio de Salud y Protección Social, vigente desde el
 * 1 de enero de 2026. Los 177 códigos odontológicos se tomaron del directorio de DentOS
 * (dentos.co/cups) el 25 nov 2026. Quien factura en la clínica debe confirmarlos contra el anexo
 * oficial antes de usarlos en facturas o RIPS.
 *
 * Los grupos son solo para navegar el árbol en el admin; no son parte de la norma. Algunos
 * códigos se movieron de la sección donde los lista la fuente a un grupo más fácil de encontrar
 * (por ejemplo, los blanqueamientos a "Estética" y los controles de ortodoncia a "Ortodoncia").
 */

export type CupsProcedure = {
  /** Código CUPS de 6 dígitos. */
  code: string;
  name: string;
};

export type CupsGroup = {
  id: string;
  label: string;
  procedures: readonly CupsProcedure[];
};

export const CUPS_SOURCE = "Resolución 2706 de 2025 (MinSalud)";

export const CUPS_GROUPS: readonly CupsGroup[] = [
  {
    id: "consulta",
    label: "Consulta",
    procedures: [
      { code: "890203", name: "Consulta de primera vez por odontología general" },
      { code: "890204", name: "Consulta de primera vez por odontología especializada" },
      { code: "890303", name: "Consulta de control o de seguimiento por odontología general" },
      { code: "890304", name: "Consulta de control o de seguimiento por odontología especializada" },
      { code: "890703", name: "Consulta de urgencias por odontología general" },
      { code: "890704", name: "Consulta de urgencias por odontología especializada" },
      { code: "890403", name: "Interconsulta por odontología general" },
      { code: "890404", name: "Interconsulta por odontología especializada" },
      { code: "890103", name: "Atención domiciliaria por odontología general" },
      { code: "890503", name: "Participación en junta médica u odontológica" },
      { code: "890603", name: "Evaluación odontológica en donante potencial de órganos" },
      { code: "890604", name: "Atención intrahospitalaria por odontología especializada" },
    ],
  },
  {
    id: "diagnostico",
    label: "Diagnóstico e imágenes",
    procedures: [
      { code: "893101", name: "Impresión de arco dentario con modelo de estudio" },
      { code: "893102", name: "Fotografía clínica diagnóstica" },
      { code: "893104", name: "Estudio de oclusión y articulación temporomandibular" },
      { code: "893109", name: "Examen de mucosa oral y periodontal" },
      { code: "893110", name: "Elaboración de aparato ortésico intraoral" },
      { code: "870440", name: "Radiografía oclusal intraoral" },
      { code: "870450", name: "Radiografía periapical milimetrada" },
      { code: "870451", name: "Radiografía periapical de dientes anteriores superiores" },
      { code: "870452", name: "Radiografía periapical de dientes anteriores inferiores" },
      { code: "870453", name: "Radiografía periapical de zona de caninos" },
      { code: "870454", name: "Radiografía periapical de premolares" },
      { code: "870455", name: "Radiografía periapical de molares" },
      { code: "870456", name: "Juego completo de radiografías periapicales" },
      { code: "870460", name: "Radiografía coronal (aleta de mordida)" },
    ],
  },
  {
    id: "prevencion",
    label: "Prevención e higiene oral",
    procedures: [
      { code: "997001", name: "Profilaxis dental o pulido coronal" },
      { code: "997301", name: "Detartraje supragingival" },
      { code: "997002", name: "Control de placa dental" },
      { code: "997107", name: "Aplicación de sellantes" },
      { code: "997105", name: "Aplicación de resina preventiva" },
      { code: "997103", name: "Topicación de flúor en gel" },
      { code: "997104", name: "Topicación de flúor en solución" },
      { code: "997106", name: "Topicación de flúor en barniz" },
      { code: "990203", name: "Educación individual en salud, por odontología" },
      { code: "990212", name: "Educación individual en salud, por higiene oral" },
      { code: "990103", name: "Educación grupal en salud, por odontología" },
      { code: "990112", name: "Educación grupal en salud, por higiene oral" },
    ],
  },
  {
    id: "operatoria",
    label: "Operatoria y restauraciones",
    procedures: [
      { code: "232102", name: "Obturación dental con resina de fotocurado" },
      { code: "232101", name: "Obturación dental con amalgama" },
      { code: "232103", name: "Obturación dental con ionómero de vidrio" },
      { code: "232104", name: "Obturación dental (código genérico)" },
      { code: "232201", name: "Obturación temporal por diente" },
      { code: "232301", name: "Colocación de pin intradentinario" },
      { code: "232401", name: "Reconstrucción de ángulo incisal" },
      { code: "232402", name: "Reconstrucción de tercio incisal" },
      { code: "232403", name: "Reconstrucción dental (código genérico)" },
    ],
  },
  {
    id: "estetica",
    label: "Estética",
    procedures: [
      { code: "237903", name: "Blanqueamiento dental extrínseco" },
      { code: "237901", name: "Blanqueamiento dental intrínseco" },
    ],
  },
  {
    id: "endodoncia",
    label: "Endodoncia",
    procedures: [
      { code: "237301", name: "Terapia de conducto en diente unirradicular" },
      { code: "237302", name: "Terapia de conducto en diente birradicular" },
      { code: "237303", name: "Terapia de conducto en diente multirradicular" },
      { code: "237304", name: "Terapia de conducto en diente temporal unirradicular" },
      { code: "237305", name: "Terapia de conducto en diente temporal multirradicular" },
      { code: "237307", name: "Desobturación de conducto radicular" },
      { code: "237102", name: "Pulpotomía" },
      { code: "237103", name: "Pulpectomía" },
      { code: "237201", name: "Apexificación (inducción del cierre apical)" },
      { code: "237202", name: "Revascularización pulpar" },
      { code: "237203", name: "Recubrimiento pulpar directo" },
      { code: "237204", name: "Recubrimiento pulpar indirecto" },
      { code: "237401", name: "Apicectomía" },
      { code: "237501", name: "Tratamiento correctivo de reabsorción radicular" },
      { code: "237502", name: "Tratamiento correctivo de fracturas radiculares" },
      { code: "237503", name: "Sellado quirúrgico de perforación endodóntica" },
      { code: "237504", name: "Sellado no quirúrgico de perforación endodóntica" },
      { code: "237505", name: "Remoción de retenedor intrarradicular" },
      { code: "237601", name: "Fistulización endodóntica por trepanación" },
      { code: "237602", name: "Fistulización endodóntica por incisión" },
      { code: "237604", name: "Fistulización endodóntica por descompresión" },
      { code: "237603", name: "Fistulización endodóntica (código genérico)" },
      { code: "237701", name: "Radectomía (amputación radicular) de una raíz" },
      { code: "237702", name: "Radectomía (amputación radicular) de múltiples raíces" },
      { code: "237703", name: "Radectomía (código genérico)" },
      { code: "237801", name: "Hemisección del diente" },
    ],
  },
  {
    id: "periodoncia",
    label: "Periodoncia",
    procedures: [
      { code: "240201", name: "Detartraje subgingival" },
      { code: "240301", name: "Alisado radicular, campo cerrado" },
      { code: "240401", name: "Drenaje de colección periodontal" },
      { code: "242201", name: "Curetaje a campo abierto" },
      { code: "242202", name: "Cirugía a colgajo con resección radicular" },
      { code: "242101", name: "Plastia mucogingival con injerto pediculado" },
      { code: "242102", name: "Plastia mucogingival con injerto libre" },
      { code: "242103", name: "Plastia mucogingival (código genérico)" },
      { code: "242204", name: "Aumento de reborde edéntulo sin injerto" },
      { code: "242205", name: "Aumento de reborde edéntulo con injerto" },
      { code: "242301", name: "Plastias preprotésicas (aumento de corona clínica)" },
      { code: "242401", name: "Reparación periodontal regenerativa" },
      { code: "243401", name: "Gingivectomía" },
      { code: "243501", name: "Cuña distal" },
      { code: "243502", name: "Operculectomía" },
      { code: "241101", name: "Biopsia incisional de encía" },
      { code: "241102", name: "Biopsia escisional de encía con cierre primario" },
      { code: "241103", name: "Biopsia escisional de encía con colgajo o injerto" },
      { code: "241104", name: "Biopsia de encía (código genérico)" },
      { code: "241201", name: "Biopsia de pared alveolar" },
    ],
  },
  {
    id: "cirugia",
    label: "Cirugía oral",
    procedures: [
      { code: "230101", name: "Exodoncia de diente permanente unirradicular" },
      { code: "230102", name: "Exodoncia de diente permanente multirradicular" },
      { code: "230103", name: "Exodoncia de dientes permanentes (código genérico)" },
      { code: "230201", name: "Exodoncia de diente temporal unirradicular" },
      { code: "230202", name: "Exodoncia de diente temporal multirradicular" },
      { code: "230203", name: "Exodoncia de dientes temporales (código genérico)" },
      { code: "231101", name: "Exodoncia quirúrgica unirradicular" },
      { code: "231201", name: "Exodoncia quirúrgica multirradicular" },
      { code: "231303", name: "Exodoncia de diente incluido" },
      { code: "231301", name: "Exodoncia de diente incluido ectópico (abordaje intraoral)" },
      { code: "231302", name: "Exodoncia de diente incluido ectópico (abordaje extraoral)" },
      { code: "231401", name: "Exodoncias múltiples con alveoloplastia, por cuadrante" },
      { code: "231501", name: "Colgajo desplazado para abordaje quirúrgico" },
      { code: "249101", name: "Control de hemorragia dental posquirúrgica" },
      { code: "245101", name: "Regularización de rebordes" },
      { code: "245201", name: "Alveolectomía" },
      { code: "235101", name: "Reimplante de diente" },
      { code: "235201", name: "Autotrasplante dental intencional" },
      { code: "237902", name: "Exploración y movilización del nervio dentario inferior" },
      { code: "243201", name: "Sutura de laceración de encía menor de 3 cm" },
      { code: "243202", name: "Sutura de laceración de encía mayor de 3 cm" },
      { code: "243203", name: "Sutura de laceración de encía (código genérico)" },
      { code: "243101", name: "Escisión de lesión benigna encapsulada de encía hasta 3 cm" },
      { code: "243102", name: "Escisión de lesión benigna encapsulada de encía mayor de 3 cm" },
      { code: "243103", name: "Escisión de lesión benigna no encapsulada de encía hasta 3 cm" },
      { code: "243104", name: "Escisión de lesión benigna no encapsulada de encía mayor de 3 cm" },
      { code: "243110", name: "Resección de lesión de encía (código genérico)" },
      { code: "243105", name: "Escisión de lesión maligna de encía sin vaciamiento" },
      { code: "243106", name: "Escisión de lesión maligna de encía con vaciamiento ganglionar" },
      { code: "243107", name: "Vaciamiento ganglionar de piso de boca" },
      { code: "243108", name: "Escisión de lesión maligna de encía con resección ósea" },
      { code: "243109", name: "Escisión de lesión maligna de encía con reconstrucción" },
      { code: "243301", name: "Enucleación de quiste epidermoide (abordaje intraoral)" },
      { code: "243302", name: "Enucleación de quiste epidermoide (abordaje extraoral)" },
      { code: "243303", name: "Enucleación de quiste epidermoide (código genérico)" },
      { code: "244101", name: "Enucleación de quiste odontogénico de los maxilares hasta 3 cm" },
      { code: "244102", name: "Enucleación de quiste odontogénico de los maxilares mayor de 3 cm" },
      { code: "244108", name: "Marsupialización de quiste" },
      { code: "244103", name: "Resección de tumor odontogénico" },
      { code: "244104", name: "Resección de tumor con reconstrucción con injerto óseo libre" },
      { code: "244105", name: "Resección de tumor con reconstrucción con colgajo óseo pediculado" },
      { code: "244106", name: "Resección de tumor con reconstrucción con colgajo óseo libre" },
      { code: "244107", name: "Resección de tumor con reconstrucción con placa" },
      { code: "244109", name: "Resección de lesión odontogénica de los maxilares (código genérico)" },
    ],
  },
  {
    id: "rehabilitacion",
    label: "Rehabilitación oral e implantes",
    procedures: [
      { code: "236301", name: "Implante dental oseointegrado" },
      { code: "236101", name: "Implante cerámico" },
      { code: "236201", name: "Implante metálico (código genérico)" },
      { code: "234201", name: "Prótesis fija, cada unidad (pilar y pónticos)" },
      { code: "234202", name: "Reconstrucción de muñones" },
      { code: "234205", name: "Inserción de retenedor intrarradicular (perno o núcleo)" },
      { code: "234204", name: "Reparación de prótesis fija" },
      { code: "234105", name: "Inserción de corona (código genérico)" },
      { code: "234106", name: "Corona provisional" },
      { code: "234103", name: "Corona en forma plástica" },
      { code: "234101", name: "Corona en acero inoxidable (dentición temporal)" },
      { code: "234102", name: "Corona en policarboxilato (dentición temporal)" },
      { code: "233101", name: "Incrustación metálica" },
      { code: "233201", name: "Incrustación no metálica (cerámica, resina indirecta)" },
      { code: "234301", name: "Prótesis removible parcial mucosoportada" },
      { code: "234302", name: "Prótesis removible parcial dentomucosoportada o implantosoportada" },
      { code: "234303", name: "Reparación de prótesis removible parcial" },
      { code: "234401", name: "Prótesis total mucosoportada (medio caso)" },
      { code: "234402", name: "Prótesis total mucosoportada (caso completo)" },
      { code: "234403", name: "Prótesis total implantoasistida (medio caso)" },
      { code: "234404", name: "Prótesis total implantoasistida (caso completo)" },
    ],
  },
  {
    id: "ortodoncia",
    label: "Ortodoncia y ortopedia",
    procedures: [
      { code: "893103", name: "Evaluación y medición ortodóntica u ortopédica oral" },
      { code: "893106", name: "Control de ortodoncia fija, removible u ortopedia funcional" },
      { code: "893108", name: "Control de crecimiento y desarrollo dentomaxilofacial" },
      { code: "247101", name: "Aparatología fija de ortodoncia por arcada" },
      { code: "247201", name: "Aparatología removible intraoral" },
      { code: "247202", name: "Aparatología removible extraoral" },
      { code: "247301", name: "Aparatos de retención posortodoncia" },
      { code: "247001", name: "Anclaje temporal esquelético (miniimplantes)" },
      { code: "893107", name: "Elaboración y adaptación de aparato ortopédico" },
      { code: "893105", name: "Máscara facial diagnóstica (ortodoncia u ortopedia)" },
      { code: "248801", name: "Máscara facial terapéutica" },
      { code: "248101", name: "Cierre de diastema" },
      { code: "248201", name: "Tallado selectivo o ajuste oclusal" },
      { code: "248401", name: "Reparación de aparatología fija o removible" },
      { code: "247401", name: "Ferulización rígida" },
      { code: "247402", name: "Ferulización semirrígida" },
      { code: "247403", name: "Ferulización (código genérico)" },
    ],
  },
];

const PROCEDURES_BY_CODE = new Map<string, CupsProcedure & { groupId: string }>(
  CUPS_GROUPS.flatMap((group) => group.procedures.map((procedure) => [procedure.code, { ...procedure, groupId: group.id }])),
);

export function isCatalogCupsCode(code: unknown): code is string {
  return typeof code === "string" && PROCEDURES_BY_CODE.has(code);
}

export function findCupsProcedure(code: string) {
  return PROCEDURES_BY_CODE.get(code) ?? null;
}

export const CUPS_PROCEDURE_COUNT = PROCEDURES_BY_CODE.size;
