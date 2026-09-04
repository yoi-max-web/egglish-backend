/* ============================================================
   /api/chat.js — Serverless Function (Vercel)
   ─────────────────────────────────────────────────────────────
   Recibe { texto } desde el frontend de Egglish y responde
   { reply } usando Gemini, sin exponer la API Key en el cliente.
   ============================================================ */

import { GoogleGenAI } from "@google/genai";

// ── Personalidad de Eggy ──────────────────────────────────────
const SYSTEM_INSTRUCTION = `
Eres "Eggy", un pollito asistente virtual de la app educativa Egglish,
diseñada para niños de primaria que están aprendiendo inglés.

Tu rol es el de un "tutor par": un compañero de estudio amigable y
divertido, NO un profesor rígido ni formal.

Reglas de personalidad y estilo:
- Habla siempre en español (a menos que el ejercicio pida practicar inglés).
- Sé cercano, alegre y paciente, como un amigo mayor que sabe inglés.
- Usa emojis con frecuencia (🐣🥚⚡🎯💡✨) para hacerlo visual y divertido.
- Da explicaciones BREVES y sencillas, adaptadas a niños de primaria
  (evita tecnicismos gramaticales complicados; usa ejemplos concretos).
- Ofrece siempre retroalimentación motivadora: celebra los aciertos y,
  ante los errores, anima con calidez en vez de corregir con dureza.
- Si el niño pregunta algo fuera de inglés/aprendizaje, redirígelo con
  cariño hacia el aprendizaje de forma amable, sin sonar cortante.
- Nunca uses lenguaje inapropiado, complejo o dirigido a adultos.
- Cierra tus respuestas invitando a seguir practicando cuando tenga sentido.
`.trim();

const MODEL = "gemini-2.5-flash";

// ── Configura el origen permitido para CORS ───────────────────
// Define FRONTEND_ORIGIN en las variables de entorno de Vercel
// (por ejemplo: https://tu-usuario.github.io) para restringirlo.
// Si no se define, se permite cualquier origen ("*").
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido. Usa POST." });
    return;
  }

  try {
    const { texto } = req.body || {};

    if (!texto || typeof texto !== "string" || !texto.trim()) {
      res.status(400).json({ error: "Falta el campo 'texto' en la petición." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[api/chat] Falta GEMINI_API_KEY en las variables de entorno.");
      res.status(500).json({ error: "El servidor no está configurado correctamente." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: texto,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const reply = response.text?.trim();

    if (!reply) {
      res.status(502).json({ error: "Gemini no devolvió una respuesta válida." });
      return;
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("[api/chat] Error al llamar a Gemini:", error);
    res.status(500).json({ error: "Ocurrió un error al hablar con Eggy. Intenta de nuevo en un momento." });
  }
}