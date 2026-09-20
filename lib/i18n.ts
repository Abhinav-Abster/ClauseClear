import { SupportedLanguage } from "./validation";

export interface Translations {
  appName: string;
  tagline: string;
  disclaimerTitle: string;
  disclaimerText: string;
  tabs: {
    simplify: string;
    analyze: string;
    ask: string;
    checklist: string;
    compare: string;
  };
  input: {
    title: string;
    subtitle: string;
    pastePlaceholder: string;
    charCount: string;
    maxLimitNotice: string;
    dropzoneText: string;
    orClickUpload: string;
    sampleDocsTitle: string;
    sampleLeaseStandard: string;
    sampleLeaseStrict: string;
    sampleSaasTos: string;
    clearButton: string;
  };
  actions: {
    simplifyBtn: string;
    analyzeBtn: string;
    askBtn: string;
    generateChecklistBtn: string;
    compareBtn: string;
    loading: string;
    copy: string;
    copied: string;
    print: string;
  };
  simplify: {
    title: string;
    docType: string;
    executiveSummary: string;
    sectionsTitle: string;
    keyTakeaway: string;
    originalExcerpt: string;
    glossaryTitle: string;
    glossarySubtitle: string;
  };
  analyze: {
    title: string;
    overallRisk: string;
    executiveSummary: string;
    filterAll: string;
    filterObligations: string;
    filterDeadlines: string;
    filterRisks: string;
    severityLow: string;
    severityMed: string;
    severityHigh: string;
    sourceQuote: string;
    practicalImpact: string;
    whatToVerify: string;
    deadlinesTitle: string;
  };
  ask: {
    title: string;
    subtitle: string;
    placeholder: string;
    sendBtn: string;
    suggestedQuestionsTitle: string;
    groundedInDoc: string;
    notInDocAlert: string;
    sourceEvidence: string;
  };
  checklist: {
    title: string;
    actionsTitle: string;
    deadlinesTitle: string;
    lawyerQuestionsTitle: string;
    lawyerQuestionsSubtitle: string;
    priorityUrgent: string;
    priorityImportant: string;
    priorityRecommended: string;
    whyAsk: string;
    potentialRedFlag: string;
  };
  compare: {
    title: string;
    subtitle: string;
    docALabel: string;
    docBLabel: string;
    comparisonSummary: string;
    topic: string;
    moreFavorable: string;
    favorableA: string;
    favorableB: string;
    equalOrBalanced: string;
    omittedInOtherDoc: string;
    keyReviewAdvice: string;
  };
  accessibility: {
    textSize: string;
    normal: string;
    large: string;
    extraLarge: string;
    highContrast: string;
    language: string;
  };
}

export const UI_TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    appName: "ClauseClear",
    tagline: "Accessible Legal Document Comprehension & Navigation",
    disclaimerTitle: "Informational Legal Assistance — Not Legal Advice",
    disclaimerText:
      "ClauseClear translates complex legal documents into plain language, highlights obligations, and identifies potential risks. All analyses are strictly educational and informational. ClauseClear does not provide legal advice and cannot replace consultation with a licensed attorney.",
    tabs: {
      simplify: "Plain-Language Simplifier",
      analyze: "Clause & Risk Analyzer",
      ask: "Document Q&A",
      checklist: "Action Checklist",
      compare: "Compare Documents",
    },
    input: {
      title: "Document Workspace",
      subtitle: "Paste your contract, agreement, or lease once to activate all analysis tools.",
      pastePlaceholder: "Paste document text here (up to 50,000 characters)...",
      charCount: "characters",
      maxLimitNotice: "Maximum 50,000 characters",
      dropzoneText: "Drag & drop a .txt or .pdf document here",
      orClickUpload: "or browse file (up to 5MB)",
      sampleDocsTitle: "Try a synthetic sample document:",
      sampleLeaseStandard: "Standard Lease",
      sampleLeaseStrict: "Strict Lease (High Risk)",
      sampleSaasTos: "SaaS Terms of Service",
      clearButton: "Clear Document",
    },
    actions: {
      simplifyBtn: "Simplify Document",
      analyzeBtn: "Analyze Clauses & Risks",
      askBtn: "Ask Question",
      generateChecklistBtn: "Generate Action Checklist",
      compareBtn: "Compare Both Documents",
      loading: "Analyzing with Gemini...",
      copy: "Copy",
      copied: "Copied!",
      print: "Export / Print",
    },
    simplify: {
      title: "Plain-Language Breakdown",
      docType: "Document Type",
      executiveSummary: "Executive Summary",
      sectionsTitle: "Section-by-Section Translation",
      keyTakeaway: "Key Takeaway",
      originalExcerpt: "Original Text Excerpt",
      glossaryTitle: "Legal Terms Glossary",
      glossarySubtitle: "Plain definitions of legal terms found in this document",
    },
    analyze: {
      title: "Clause & Risk Analysis",
      overallRisk: "Overall Risk Level",
      executiveSummary: "Risk Assessment",
      filterAll: "All Clauses",
      filterObligations: "Obligations",
      filterDeadlines: "Deadlines",
      filterRisks: "Risks & Unusual Terms",
      severityLow: "Low Severity",
      severityMed: "Medium Severity",
      severityHigh: "High Severity",
      sourceQuote: "Source Quote from Document",
      practicalImpact: "Practical Impact",
      whatToVerify: "What to Verify",
      deadlinesTitle: "Critical Dates & Deadlines",
    },
    ask: {
      title: "Grounded Document Q&A",
      subtitle: "Ask questions answered strictly from the contents of this document.",
      placeholder: "Ask something about the document (e.g., 'What is the security deposit amount?')...",
      sendBtn: "Ask",
      suggestedQuestionsTitle: "Suggested Questions:",
      groundedInDoc: "Verified from document content",
      notInDocAlert: "Not Covered in Document",
      sourceEvidence: "Direct Source Excerpts",
    },
    checklist: {
      title: "Action Checklist & Legal Preparation",
      actionsTitle: "Immediate Action Items",
      deadlinesTitle: "Upcoming Milestones & Deadlines",
      lawyerQuestionsTitle: "Questions to Bring to a Lawyer",
      lawyerQuestionsSubtitle: "Sharp, targeted questions to ask a legal professional before signing",
      priorityUrgent: "Urgent",
      priorityImportant: "Important",
      priorityRecommended: "Recommended",
      whyAsk: "Why this matters",
      potentialRedFlag: "Potential Red Flag",
    },
    compare: {
      title: "Document Comparison Engine",
      subtitle: "Compare two agreements side-by-side to identify differences, omissions, and favorability.",
      docALabel: "Document A (e.g., Standard Offer)",
      docBLabel: "Document B (e.g., Alternative Offer)",
      comparisonSummary: "Comparison Summary",
      topic: "Clause Topic",
      moreFavorable: "More Favorable To You",
      favorableA: "Document A is More Favorable",
      favorableB: "Document B is More Favorable",
      equalOrBalanced: "Roughly Equal / Neutral",
      omittedInOtherDoc: "Terms Present in Only One Document",
      keyReviewAdvice: "Recommendations for Legal Review",
    },
    accessibility: {
      textSize: "Text Size",
      normal: "Default",
      large: "Large",
      extraLarge: "Extra Large",
      highContrast: "High Contrast",
      language: "Language",
    },
  },
  es: {
    appName: "ClauseClear",
    tagline: "Comprensión y Navegación Accesible de Documentos Legales",
    disclaimerTitle: "Asistencia Legal Informativa — No es Asesoramiento Legal",
    disclaimerText:
      "ClauseClear traduce documentos legales complejos a lenguaje sencillo, destaca obligaciones e identifica riesgos potenciales. Todos los análisis son estrictamente educativos e informativos y no reemplazan la consulta con un abogado matriculado.",
    tabs: {
      simplify: "Simplificador en Lenguaje Sencillo",
      analyze: "Analizador de Cláusulas y Riesgos",
      ask: "Preguntas y Respuestas del Documento",
      checklist: "Lista de Acciones",
      compare: "Comparar Documentos",
    },
    input: {
      title: "Área de Trabajo del Documento",
      subtitle: "Pegue su contrato o contrato de arrendamiento una sola vez para activar todas las herramientas.",
      pastePlaceholder: "Pegue el texto del documento aquí (hasta 50,000 caracteres)...",
      charCount: "caracteres",
      maxLimitNotice: "Máximo 50,000 caracteres",
      dropzoneText: "Arrastre y suelte un archivo .txt o .pdf aquí",
      orClickUpload: "o examine un archivo (hasta 5MB)",
      sampleDocsTitle: "Pruebe con un documento de muestra sintético:",
      sampleLeaseStandard: "Arrendamiento Estándar",
      sampleLeaseStrict: "Arrendamiento Estricto (Alto Riesgo)",
      sampleSaasTos: "Términos de Servicio SaaS",
      clearButton: "Borrar Documento",
    },
    actions: {
      simplifyBtn: "Simplificar Documento",
      analyzeBtn: "Analizar Cláusulas y Riesgos",
      askBtn: "Hacer Pregunta",
      generateChecklistBtn: "Generar Lista de Acciones",
      compareBtn: "Comparar Ambos Documentos",
      loading: "Analizando con Gemini...",
      copy: "Copiar",
      copied: "¡Copiado!",
      print: "Exportar / Imprimir",
    },
    simplify: {
      title: "Desglose en Lenguaje Sencillo",
      docType: "Tipo de Documento",
      executiveSummary: "Resumen Ejecutivo",
      sectionsTitle: "Traducción Sección por Sección",
      keyTakeaway: "Punto Clave",
      originalExcerpt: "Extracto Original",
      glossaryTitle: "Glosario de Términos Legales",
      glossarySubtitle: "Definiciones claras de términos legales encontrados en este documento",
    },
    analyze: {
      title: "Análisis de Cláusulas y Riesgos",
      overallRisk: "Nivel de Riesgo General",
      executiveSummary: "Evaluación de Riesgos",
      filterAll: "Todas las Cláusulas",
      filterObligations: "Obligaciones",
      filterDeadlines: "Plazos",
      filterRisks: "Riesgos y Términos Inusuales",
      severityLow: "Severidad Baja",
      severityMed: "Severidad Media",
      severityHigh: "Severidad Alta",
      sourceQuote: "Cita Textual del Documento",
      practicalImpact: "Impacto Práctico",
      whatToVerify: "Qué Verificar",
      deadlinesTitle: "Fechas y Plazos Críticos",
    },
    ask: {
      title: "Preguntas y Respuestas Fundamentadas",
      subtitle: "Haga preguntas respondidas estrictamente a partir del texto de este documento.",
      placeholder: "¿Cuál es el monto del depósito de garantía?...",
      sendBtn: "Preguntar",
      suggestedQuestionsTitle: "Preguntas Sugeridas:",
      groundedInDoc: "Verificado a partir del documento",
      notInDocAlert: "No Cubierto en el Documento",
      sourceEvidence: "Citas Textuales del Documento",
    },
    checklist: {
      title: "Lista de Acciones y Preparación Legal",
      actionsTitle: "Acciones Inmediatas",
      deadlinesTitle: "Próximos Hitos y Plazos",
      lawyerQuestionsTitle: "Preguntas para Llevar a un Abogado",
      lawyerQuestionsSubtitle: "Preguntas precisas para consultar con un profesional antes de firmar",
      priorityUrgent: "Urgente",
      priorityImportant: "Importante",
      priorityRecommended: "Recomendado",
      whyAsk: "Por qué es importante",
      potentialRedFlag: "Posible Alerta",
    },
    compare: {
      title: "Motor de Comparación de Documentos",
      subtitle: "Compare dos acuerdos lado a lado para identificar diferencias, omisiones y ventajas.",
      docALabel: "Documento A (ej. Oferta Estándar)",
      docBLabel: "Documento B (ej. Oferta Alternativa)",
      comparisonSummary: "Resumen Comparativo",
      topic: "Tema de la Cláusula",
      moreFavorable: "Más Favorable Para Usted",
      favorableA: "El Documento A es más favorable",
      favorableB: "El Documento B es más favorable",
      equalOrBalanced: "Aproximadamente Equitativo",
      omittedInOtherDoc: "Términos Presentes en un Solo Documento",
      keyReviewAdvice: "Recomendaciones para Revisión Legal",
    },
    accessibility: {
      textSize: "Tamaño de Texto",
      normal: "Predeterminado",
      large: "Grande",
      extraLarge: "Muy Grande",
      highContrast: "Alto Contraste",
      language: "Idioma",
    },
  },
  fr: {
    appName: "ClauseClear",
    tagline: "Compréhension et Navigation Accessibles des Documents Juridiques",
    disclaimerTitle: "Assistance Juridique Informative — Pas un Conseil Juridique",
    disclaimerText:
      "ClauseClear traduit les documents juridiques complexes en langage clair, met en évidence les obligations et identifie les risques potentiels. Toutes les analyses sont strictement éducatives et informatives et ne remplacent pas la consultation d'un avocat agréé.",
    tabs: {
      simplify: "Simplificateur en Langage Clair",
      analyze: "Analyseur de Clauses & Risques",
      ask: "Questions & Réponses du Document",
      checklist: "Liste d'Actions",
      compare: "Comparer les Documents",
    },
    input: {
      title: "Espace de Travail du Document",
      subtitle: "Collez votre contrat ou bail une seule fois pour activer tous les outils d'analyse.",
      pastePlaceholder: "Collez le texte du document ici (jusqu'à 50 000 caractères)...",
      charCount: "caractères",
      maxLimitNotice: "Maximum 50 000 caractères",
      dropzoneText: "Glissez-déposez un fichier .txt ou .pdf ici",
      orClickUpload: "ou parcourez un fichier (jusqu'à 5 Mo)",
      sampleDocsTitle: "Essayez un document d'exemple synthétique :",
      sampleLeaseStandard: "Bail Standard",
      sampleLeaseStrict: "Bail Strict (Risque Élevé)",
      sampleSaasTos: "Conditions d'Utilisation SaaS",
      clearButton: "Effacer le Document",
    },
    actions: {
      simplifyBtn: "Simplifier le Document",
      analyzeBtn: "Analyser Clauses & Risques",
      askBtn: "Poser la Question",
      generateChecklistBtn: "Générer la Liste d'Actions",
      compareBtn: "Comparer les Deux Documents",
      loading: "Analyse avec Gemini...",
      copy: "Copier",
      copied: "Copié !",
      print: "Exporter / Imprimer",
    },
    simplify: {
      title: "Explication en Langage Clair",
      docType: "Type de Document",
      executiveSummary: "Résumé Exécutif",
      sectionsTitle: "Traduction Section par Section",
      keyTakeaway: "Point Clé",
      originalExcerpt: "Extrait Original",
      glossaryTitle: "Glossaire des Termes Juridiques",
      glossarySubtitle: "Définitions simples des termes juridiques trouvés dans ce document",
    },
    analyze: {
      title: "Analyse des Clauses & Risques",
      overallRisk: "Niveau de Risque Global",
      executiveSummary: "Évaluation des Risques",
      filterAll: "Toutes les Clauses",
      filterObligations: "Obligations",
      filterDeadlines: "Délais",
      filterRisks: "Risques & Termes Inhabituels",
      severityLow: "Gravité Faible",
      severityMed: "Gravité Moyenne",
      severityHigh: "Gravité Élevée",
      sourceQuote: "Citation Source du Document",
      practicalImpact: "Impact Pratique",
      whatToVerify: "Ce qu'il Faut Vérifier",
      deadlinesTitle: "Dates et Délais Critiques",
    },
    ask: {
      title: "Questions & Réponses Factuelles",
      subtitle: "Posez des questions auxquelles il est répondu strictement à partir du document.",
      placeholder: "Quel est le montant du dépôt de garantie ?...",
      sendBtn: "Demander",
      suggestedQuestionsTitle: "Questions Suggérées :",
      groundedInDoc: "Vérifié à partir du texte du document",
      notInDocAlert: "Non Couvert dans le Document",
      sourceEvidence: "Extraits Directs du Document",
    },
    checklist: {
      title: "Liste d'Actions & Préparation Juridique",
      actionsTitle: "Actions Immédiates",
      deadlinesTitle: "Échéances et Délais à Venir",
      lawyerQuestionsTitle: "Questions à Poser à un Avocat",
      lawyerQuestionsSubtitle: "Questions précises à poser à un professionnel du droit avant de signer",
      priorityUrgent: "Urgent",
      priorityImportant: "Important",
      priorityRecommended: "Recommandé",
      whyAsk: "Pourquoi c'est important",
      potentialRedFlag: "Signal d'Alarme Potentiel",
    },
    compare: {
      title: "Moteur de Comparaison de Documents",
      subtitle: "Comparez deux accords côte à côte pour repérer les différences, omissions et avantages.",
      docALabel: "Document A (ex. Offre Standard)",
      docBLabel: "Document B (ex. Offre Alternative)",
      comparisonSummary: "Résumé Comparatif",
      topic: "Sujet de la Clause",
      moreFavorable: "Plus Favorable Pour Vous",
      favorableA: "Le Document A est plus favorable",
      favorableB: "Le Document B est plus favorable",
      equalOrBalanced: "Équivalent / Équilibré",
      omittedInOtherDoc: "Termes Présents dans un Seul Document",
      keyReviewAdvice: "Recommandations pour Examen Juridique",
    },
    accessibility: {
      textSize: "Taille du Texte",
      normal: "Standard",
      large: "Grand",
      extraLarge: "Très Grand",
      highContrast: "Contraste Élevé",
      language: "Langue",
    },
  },
  pt: {
    appName: "ClauseClear",
    tagline: "Compreensão e Navegação Acessível de Documentos Jurídicos",
    disclaimerTitle: "Assistência Jurídica Informativa — Não é Aconselhamento Jurídico",
    disclaimerText:
      "O ClauseClear traduz documentos jurídicos complexos para linguagem simples, destaca obrigações e identifica riscos potenciais. Todas as análises são estritamente educativas e informativas, não substituindo a consulta com um advogado habilitado.",
    tabs: {
      simplify: "Simplificador em Linguagem Simples",
      analyze: "Analisador de Cláusulas e Riscos",
      ask: "Perguntas e Respostas do Documento",
      checklist: "Lista de Ações",
      compare: "Comparar Documentos",
    },
    input: {
      title: "Área de Trabalho do Documento",
      subtitle: "Cole seu contrato ou termo uma única vez para ativar todas as ferramentas de análise.",
      pastePlaceholder: "Cole o texto do documento aqui (até 50.000 caracteres)...",
      charCount: "caracteres",
      maxLimitNotice: "Máximo de 50.000 caracteres",
      dropzoneText: "Arraste e solte um documento .txt ou .pdf aqui",
      orClickUpload: "ou escolha um arquivo (até 5MB)",
      sampleDocsTitle: "Experimente um documento de exemplo sintético:",
      sampleLeaseStandard: "Locação Padrão",
      sampleLeaseStrict: "Locação Estrita (Alto Risco)",
      sampleSaasTos: "Termos de Serviço SaaS",
      clearButton: "Limpar Documento",
    },
    actions: {
      simplifyBtn: "Simplificar Documento",
      analyzeBtn: "Analisar Cláusulas e Riscos",
      askBtn: "Fazer Pergunta",
      generateChecklistBtn: "Gerar Lista de Ações",
      compareBtn: "Comparar Ambos os Documentos",
      loading: "Analisando com Gemini...",
      copy: "Copiar",
      copied: "Copiado!",
      print: "Exportar / Imprimir",
    },
    simplify: {
      title: "Divisão em Linguagem Simples",
      docType: "Tipo de Documento",
      executiveSummary: "Resumo Executivo",
      sectionsTitle: "Tradução Seção por Seção",
      keyTakeaway: "Ponto Principal",
      originalExcerpt: "Trecho Original",
      glossaryTitle: "Glossário de Termos Jurídicos",
      glossarySubtitle: "Definições claras de termos jurídicos encontrados neste documento",
    },
    analyze: {
      title: "Análise de Cláusulas e Riscos",
      overallRisk: "Nível de Risco Geral",
      executiveSummary: "Avaliação de Riscos",
      filterAll: "Todas as Cláusulas",
      filterObligations: "Obrigações",
      filterDeadlines: "Prazos",
      filterRisks: "Riscos e Termos Incomuns",
      severityLow: "Baixa Gravidade",
      severityMed: "Média Gravidade",
      severityHigh: "Alta Gravidade",
      sourceQuote: "Citação Fonte do Documento",
      practicalImpact: "Impacto Prático",
      whatToVerify: "O que Verificar",
      deadlinesTitle: "Datas e Prazos Críticos",
    },
    ask: {
      title: "Perguntas e Respostas Fundamentadas",
      subtitle: "Faça perguntas respondidas estritamente com base no texto deste documento.",
      placeholder: "Qual é o valor do depósito caução?...",
      sendBtn: "Perguntar",
      suggestedQuestionsTitle: "Perguntas Sugeridas:",
      groundedInDoc: "Verificado a partir do texto do documento",
      notInDocAlert: "Não Consta no Documento",
      sourceEvidence: "Trechos Exatos do Documento",
    },
    checklist: {
      title: "Lista de Ações e Preparação Jurídica",
      actionsTitle: "Itens de Ação Imediata",
      deadlinesTitle: "Próximos Prazos e Marcos",
      lawyerQuestionsTitle: "Perguntas para Levar a um Advogado",
      lawyerQuestionsSubtitle: "Perguntas direcionadas para consultar um profissional antes de assinar",
      priorityUrgent: "Urgente",
      priorityImportant: "Importante",
      priorityRecommended: "Recomendado",
      whyAsk: "Por que isso importa",
      potentialRedFlag: "Possível Sinal de Alerta",
    },
    compare: {
      title: "Mecanismo de Comparação de Documentos",
      subtitle: "Compare dois acordos lado a lado para identificar diferenças, omissões e vantagens.",
      docALabel: "Documento A (ex. Proposta Padrão)",
      docBLabel: "Documento B (ex. Proposta Alternativa)",
      comparisonSummary: "Resumo Comparativo",
      topic: "Tema da Cláusula",
      moreFavorable: "Mais Favorável Para Você",
      favorableA: "Documento A é Mais Favorável",
      favorableB: "Documento B é Mais Favorável",
      equalOrBalanced: "Aproximadamente Igual / Equilibrado",
      omittedInOtherDoc: "Termos Presentes em Apenas Um Documento",
      keyReviewAdvice: "Recomendações para Revisão Jurídica",
    },
    accessibility: {
      textSize: "Tamanho do Texto",
      normal: "Padrão",
      large: "Grande",
      extraLarge: "Muito Grande",
      highContrast: "Alto Contraste",
      language: "Idioma",
    },
  },
};
