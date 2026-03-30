// Input validation and sanitization

// Strip HTML tags to prevent XSS
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email) && email.length <= 255;
}

// Validate Italian phone number
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  // Italian numbers: 10 digits, optionally with +39 prefix
  return /^(39)?3\d{8,9}$/.test(cleaned);
}

// Validate UUID format
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Validate date format (YYYY-MM-DD)
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(date);
}

// Validate segmento value
const VALID_SEGMENTS = ["lotina", "nuova", "lead", "inattiva", "vip"] as const;
export function isValidSegmento(seg: string): boolean {
  return (VALID_SEGMENTS as readonly string[]).includes(seg);
}

// Validate fonte value
const VALID_FONTI = ["instagram", "whatsapp", "passaparola", "meta_ads", "walk_in", "altro"] as const;
export function isValidFonte(fonte: string): boolean {
  return (VALID_FONTI as readonly string[]).includes(fonte);
}

// Limit string length
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength);
}

// Validate and sanitize client input
export function validateClientInput(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
} {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  // Required fields
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    errors.push("Nome obbligatorio");
  } else {
    sanitized.nome = truncate(sanitizeString(data.nome as string), 100);
  }

  if (!data.cognome || typeof data.cognome !== "string" || data.cognome.trim().length === 0) {
    errors.push("Cognome obbligatorio");
  } else {
    sanitized.cognome = truncate(sanitizeString(data.cognome as string), 100);
  }

  // Optional fields
  if (data.telefono && typeof data.telefono === "string" && data.telefono.trim()) {
    if (!isValidPhone(data.telefono)) {
      errors.push("Numero di telefono non valido");
    } else {
      sanitized.telefono = data.telefono.replace(/\D/g, "").replace(/^39/, "");
    }
  }

  if (data.email && typeof data.email === "string" && data.email.trim()) {
    if (!isValidEmail(data.email)) {
      errors.push("Email non valida");
    } else {
      sanitized.email = data.email.toLowerCase().trim();
    }
  }

  if (data.dataNascita && typeof data.dataNascita === "string" && data.dataNascita.trim()) {
    if (!isValidDate(data.dataNascita)) {
      errors.push("Data di nascita non valida");
    } else {
      sanitized.dataNascita = data.dataNascita;
    }
  }

  if (data.segmento && typeof data.segmento === "string") {
    if (!isValidSegmento(data.segmento)) {
      errors.push("Segmento non valido");
    } else {
      sanitized.segmento = data.segmento;
    }
  }

  if (data.fonte && typeof data.fonte === "string" && data.fonte.trim()) {
    if (!isValidFonte(data.fonte)) {
      errors.push("Fonte non valida");
    } else {
      sanitized.fonte = data.fonte;
    }
  }

  if (data.indirizzo && typeof data.indirizzo === "string") {
    sanitized.indirizzo = truncate(sanitizeString(data.indirizzo), 500);
  }

  if (data.note && typeof data.note === "string") {
    sanitized.note = truncate(sanitizeString(data.note), 2000);
  }

  if (data.tags && Array.isArray(data.tags)) {
    sanitized.tags = (data.tags as string[])
      .filter((t) => typeof t === "string")
      .map((t) => truncate(sanitizeString(t), 50))
      .slice(0, 20); // Max 20 tags
  }

  return { valid: errors.length === 0, errors, sanitized };
}
