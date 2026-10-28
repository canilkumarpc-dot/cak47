import dotenv from "dotenv";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { FunctionDeclaration, LiveServerMessage } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getCleanApiKey(): string | null {
  let raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    "";

  if (!raw || raw === "MY_GEMINI_API_KEY") {
    // Re-read .env in case secrets were injected after process startup
    dotenv.config({ override: true });
    raw =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      "";
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed === "MY_GEMINI_API_KEY") {
    return null;
  }
  return trimmed;
}

function getAIClient(): GoogleGenAI | null {
  const apiKey = getCleanApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function detectScriptLanguage(text: string): "Telugu" | "Hindi" | "English" {
  if (/[\u0C00-\u0C7F]/.test(text)) return "Telugu";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  const lower = text.toLowerCase();
  if (/\b(cheppandi|vachindi|ekkada|unnanu|ivvamantara|namaste andi|garu)\b/.test(lower)) {
    return "Telugu";
  }
  if (/\b(namaste|bol raha|aaya hai|kijiye|karwa|ji|hai|loan|poonch)\b/.test(lower)) {
    return "Hindi";
  }
  return "English";
}

function buildFallbackAssistantTurn(params: {
  settings?: {
    ownerName?: string;
    assistantName?: string;
    statusMode?: string;
    customContextNote?: string;
    greetingMode?: string;
  };
  callerName?: string;
  callerUtterance?: string;
  ownerWhisper?: string;
  isOpeningGreeting?: boolean;
}) {
  const owner = params.settings?.ownerName || "Anil Kumar";
  const assistant = params.settings?.assistantName || "Vaani";
  const status = params.settings?.statusMode || "In a Meeting";
  const greetingMode = params.settings?.greetingMode || "Trilingual Auto";

  if (params.isOpeningGreeting) {
    const en = `Hello, this is ${assistant}, ${owner}'s AI call assistant. ${owner} is currently ${status.toLowerCase()}—you may speak in English, Hindi, or Telugu.`;
    const hi = `नमस्ते, मैं ${owner} की एआई कॉल असिस्टेंट ${assistant} हूँ। वे अभी व्यस्त (${status}) हैं—आप अंग्रेज़ी, हिंदी या तेलुगु में बात कर सकते हैं।`;
    const te = `నమస్తే, నేను ${owner} గారి AI కాల్ అసిస్టెంట్ ${assistant}ని. వారు ప్రస్తుతం ${status}లో ఉన్నారు—మీరు ఇంగ్లీష్, హిందీ లేదా తెలుగులో మాట్లాడవచ్చు.`;

    const replyLanguage =
      greetingMode === "Telugu First"
        ? "Telugu"
        : greetingMode === "Hindi First"
          ? "Hindi"
          : "English";
    const assistantReply =
      replyLanguage === "Telugu" ? te : replyLanguage === "Hindi" ? hi : en;

    return {
      assistantReply,
      replyLanguage,
      assistantTranslations: { English: en, Hindi: hi, Telugu: te },
      callerTranslations: { English: "", Hindi: "", Telugu: "" },
      detectedLanguage: replyLanguage,
      intentCategory: "Incoming Screening",
      urgency: "Normal",
      spamConfidence: 4,
      extractedFacts: [],
      otpGuardTriggered: false,
      suggestedWhispers: [
        "Ask what this call is regarding",
        "Leave parcel at Tower B MyGate desk",
        "Ask them to call back after 5:30 PM",
      ],
      shouldEndCall: false,
      geminiConfigured: false,
    };
  }

  const combinedInput = `${params.callerUtterance || ""} ${params.ownerWhisper || ""}`;
  const lang = detectScriptLanguage(params.callerUtterance || params.ownerWhisper || "");
  const lower = combinedInput.toLowerCase();

  // Handle explicit owner whisper
  if (params.ownerWhisper) {
    const w = params.ownerWhisper.trim();
    const en = `Regarding ${owner}'s instruction: ${w}. Could you please confirm?`;
    const hi = `${owner} जी के निर्देशानुसार: ${w}। कृपया पुष्टि करें।`;
    const te = `${owner} గారి సూచన ప్రకారం: ${w}. దయచేసి నిర్ధారించగలరా?`;
    const reply = lang === "Telugu" ? te : lang === "Hindi" ? hi : en;
    return {
      assistantReply: reply,
      replyLanguage: lang,
      assistantTranslations: { English: en, Hindi: hi, Telugu: te },
      callerTranslations: {
        English: params.callerUtterance || "",
        Hindi: params.callerUtterance || "",
        Telugu: params.callerUtterance || "",
      },
      detectedLanguage: lang,
      intentCategory: "Owner Guided Screening",
      urgency: "Normal",
      spamConfidence: 5,
      extractedFacts: [`Owner instruction relayed: ${w}`],
      otpGuardTriggered: false,
      suggestedWhispers: [
        "Thank them and wrap up the call",
        "Ask for their callback number",
        "Confirm gate drop-off details",
      ],
      shouldEndCall: false,
      geminiConfigured: false,
    };
  }

  // OTP / PIN Security Check
  if (/otp|pin|cvv|password|ओटीपी|पासवर्ड|ఓటీపీ/.test(lower)) {
    const en = `For security reasons, I never share OTPs, PINs, or verification codes. Please share your official reference ID so ${owner} can review directly.`;
    const hi = `सुरक्षा कारणों से मैं कभी भी ओटीपी, पिन या वेरिफिकेशन कोड साझा नहीं करती। कृपया अपना आधिकारिक रेफरेंस नंबर बताएं ताकि ${owner} स्वयं जांच सकें।`;
    const te = `భద్రతా కారణాల దృష్ట్యా నేను OTP, PIN లేదా వెరిఫికేషన్ కోడ్‌లను షేర్ చేయను. దయచేసి మీ అధికారిక రిఫరెన్స్ ఐడి చెప్పండి, ${owner} గారు స్వయంగా పరిశీలిస్తారు.`;
    return {
      assistantReply: lang === "Telugu" ? te : lang === "Hindi" ? hi : en,
      replyLanguage: lang,
      assistantTranslations: { English: en, Hindi: hi, Telugu: te },
      callerTranslations: {
        English: params.callerUtterance || "",
        Hindi: params.callerUtterance || "",
        Telugu: params.callerUtterance || "",
      },
      detectedLanguage: lang,
      intentCategory: "Security / OTP Request",
      urgency: "High",
      spamConfidence: 78,
      extractedFacts: ["Caller requested sensitive OTP/verification code — blocked by OTP Shield"],
      otpGuardTriggered: true,
      suggestedWhispers: [
        "Refuse and end call immediately",
        "Ask which company & branch they represent",
        "Tell them I will check in the official app",
      ],
      shouldEndCall: false,
      geminiConfigured: false,
    };
  }

  // Spam / Personal Loan / Credit Card Check
  if (
    /loan|credit card|pre-approved|पर्सनल लोन|क्रेडिट कार्ड|प्री-अप्रूव्ड|లోన్|క్రెడిట్ కార్డ్|140/.test(
      lower + " " + (params.callerName || "").toLowerCase()
    )
  ) {
    const en = `Thank you for calling, but ${owner} is not interested in any personal loan or credit card offers. Please remove this number from your calling list. Goodbye.`;
    const hi = `कॉल करने के लिए धन्यवाद, लेकिन ${owner} जी को किसी भी पर्सनल लोन या क्रेडिट कार्ड ऑफर में रुचि नहीं है। कृपया इस नंबर को अपनी सूची से हटा दें। नमस्ते।`;
    const te = `కాల్ చేసినందుకు ధన్యవాదాలు, కానీ ${owner} గారికి పర్సనల్ లోన్ లేదా క్రెడిట్ కార్డ్ ఆఫర్లలో ఆసక్తి లేదు. దయచేసి ఈ నంబర్‌ను మీ జాబితా నుండి తొలగించండి.`;
    return {
      assistantReply: lang === "Telugu" ? te : lang === "Hindi" ? hi : en,
      replyLanguage: lang,
      assistantTranslations: { English: en, Hindi: hi, Telugu: te },
      callerTranslations: {
        English: params.callerUtterance || "",
        Hindi: params.callerUtterance || "",
        Telugu: params.callerUtterance || "",
      },
      detectedLanguage: lang,
      intentCategory: "Telemarketing / Spam",
      urgency: "Low",
      spamConfidence: 94,
      extractedFacts: [
        "Commercial personal loan / credit card pitch detected",
        "Auto-declined per Spam Playbook",
      ],
      otpGuardTriggered: false,
      suggestedWhispers: ["Block caller immediately", "Ask for DND registry removal"],
      shouldEndCall: true,
      geminiConfigured: false,
    };
  }

  // Delivery / Parcel Check
  if (
    /parcel|delivery|flipkart|amazon|gate|security|पार्सल|डिलीवरी|गेट|सिक्योरिटी|పార్సెల్|డెలివరీ|గేట్|సెక్యూరిటీ/.test(
      lower
    )
  ) {
    const en = `Thank you! Since ${owner} is ${status.toLowerCase()}, please leave the prepaid parcel at the Tower B MyGate security desk with Guard Ramesh under Flat 402. Is an OTP required?`;
    const hi = `धन्यवाद! चूंकि ${owner} जी अभी व्यस्त हैं, कृपया प्रीपेड पार्सल टॉवर B के मायगेट सिक्योरिटी डेस्क पर गार्ड रमेश के पास फ्लैट 402 के नाम से रख दें। क्या इसके लिए किसी OTP की आवश्यकता है?`;
    const te = `ధన్యవాదాలు! ${owner} గారు ప్రస్తుతం మీటింగ్‌లో ఉన్నందున, దయచేసి పార్సెల్‌ను టవర్ B మైగేట్ సెక్యూరిటీ డెస్క్ వద్ద గార్డ్ రమేష్ గారికి ఫ్లాట్ 402 పేరుతో ఇవ్వండి. దీనికి ఏదైనా OTP అవసరమా?`;
    return {
      assistantReply: lang === "Telugu" ? te : lang === "Hindi" ? hi : en,
      replyLanguage: lang,
      assistantTranslations: { English: en, Hindi: hi, Telugu: te },
      callerTranslations: {
        English: params.callerUtterance || "",
        Hindi: params.callerUtterance || "",
        Telugu: params.callerUtterance || "",
      },
      detectedLanguage: lang,
      intentCategory: "Delivery",
      urgency: "Normal",
      spamConfidence: 4,
      extractedFacts: [
        "Parcel delivery caller at apartment gate",
        "Directed to Tower B MyGate desk (Flat 402, Guard Ramesh)",
      ],
      otpGuardTriggered: false,
      suggestedWhispers: [
        "Ask if parcel is prepaid or cash-on-delivery",
        "Tell him I am coming down in 2 minutes",
        "Thank him and confirm MyGate entry",
      ],
      shouldEndCall: false,
      geminiConfigured: false,
    };
  }

  // Banking / Corporate Wire Check
  if (/bank|wire|portal|transfer|बैंक|ट्रांसफर|पोर्टल|బ్యాంక్|ట్రాన్స్‌ఫర్|పోర్టల్/.test(lower)) {
    const en = `Thank you for the update. I have logged that the international wire confirmation is needed on the corporate portal before 4:00 PM tomorrow, and I will notify ${owner} right after this meeting.`;
    const hi = `जानकारी के लिए धन्यवाद। मैंने नोट कर लिया है कि कल शाम 4:00 बजे से पहले कॉर्पोरेट पोर्टल पर वायर ट्रांसफर की पुष्टि करनी है। मीटिंग समाप्त होते ही मैं ${owner} जी को सूचित कर दूँगी।`;
    const te = `సమాచారానికి ధన్యవాదాలు. రేపు సాయంత్రం 4:00 గంటలలోపు కార్పొరేట్ పోర్టల్‌లో వైర్ ట్రాన్స్‌ఫర్ ధృవీకరించాలని నోట్ చేసుకున్నాను. మీటింగ్ ముగియగానే ${owner} గారికి తెలియజేస్తాను.`;
    return {
      assistantReply: lang === "Telugu" ? te : lang === "Hindi" ? hi : en,
      replyLanguage: lang,
      assistantTranslations: { English: en, Hindi: hi, Telugu: te },
      callerTranslations: {
        English: params.callerUtterance || "",
        Hindi: params.callerUtterance || "",
        Telugu: params.callerUtterance || "",
      },
      detectedLanguage: lang,
      intentCategory: "Banking & Finance",
      urgency: "High",
      spamConfidence: 8,
      extractedFacts: [
        "Corporate banking wire transfer advice pending",
        "Portal confirmation deadline: Tomorrow 4:00 PM",
      ],
      otpGuardTriggered: false,
      suggestedWhispers: [
        "Ask for the wire reference number",
        "Confirm I will approve it by 6:00 PM today",
        "Ask for a direct callback number",
      ],
      shouldEndCall: false,
      geminiConfigured: false,
    };
  }

  // Work / Meeting / General Inquiry
  const en = `Got it—I have noted your message for ${owner}, who will be free after 5:30 PM. Shall I confirm the updated timing and have ${owner} follow up shortly?`;
  const hi = `जी समझ गई—मैंने ${owner} जी के लिए आपका संदेश नोट कर लिया है, वे शाम 5:30 बजे के बाद उपलब्ध होंगे। क्या मैं यह समय कन्फर्म कर दूँ?`;
  const te = `అర్థమైంది—${owner} గారి కోసం మీ సందేశాన్ని నోట్ చేసుకున్నాను, వారు సాయంత్రం 5:30 తర్వాత అందుబాటులో ఉంటారు. ఈ సమయాన్ని ఖరారు చేయమంటారా?`;

  return {
    assistantReply: lang === "Telugu" ? te : lang === "Hindi" ? hi : en,
    replyLanguage: lang,
    assistantTranslations: { English: en, Hindi: hi, Telugu: te },
    callerTranslations: {
      English: params.callerUtterance || "",
      Hindi: params.callerUtterance || "",
      Telugu: params.callerUtterance || "",
    },
    detectedLanguage: lang,
    intentCategory: "Work & Scheduling",
    urgency: "Normal",
    spamConfidence: 6,
    extractedFacts: [
      `Caller message logged during ${status}`,
      "Callback window shared: After 5:30 PM",
    ],
    otpGuardTriggered: false,
    suggestedWhispers: [
      "Confirm 6:00 PM works for me",
      "Ask them to send a calendar invite",
      "Say I can step out in 5 minutes if urgent",
    ],
    shouldEndCall: false,
    geminiConfigured: false,
  };
}

function buildAssistantSystemPrompt(params: {
  ownerName?: string;
  assistantName?: string;
  statusMode?: string;
  customContextNote?: string;
  greetingMode?: string;
  rules?: Array<{ title: string; instruction: string; enabled: boolean }>;
  callerName?: string;
  callerNumber?: string;
}): string {
  const owner = params.ownerName || "Anil";
  const assistant = params.assistantName || "Vaani";
  const status = params.statusMode || "In a Meeting";
  const note =
    params.customContextNote ||
    "Flat 402, Block B. Packages can be left at MyGate security desk.";
  const greetingMode = params.greetingMode || "Trilingual Auto";
  const activeRules = (params.rules || [])
    .filter((r) => r.enabled)
    .map((r, idx) => `${idx + 1}. ${r.title}: ${r.instruction}`)
    .join("\n");

  return `You are ${assistant}, an ultra-intelligent, warm, and decisive AI Call Assistant answering an incoming phone call on behalf of ${owner} (far smarter than Equal AI).

CALLER CONTEXT:
- Caller Display: ${params.callerName || "Unknown Caller"} (${params.callerNumber || "+91 98480 00000"})
- Owner Current Availability: ${status}
- Owner Personal Context & Notes: ${note}
- Greeting Preference: ${greetingMode}

MULTILINGUAL FLUENCY (CRITICAL):
- You speak native, natural, idiomatic English (Indian & global), Hindi (हिन्दी in Devanagari script), and Telugu (తెలుగు in Telugu script), as well as natural Hinglish and Tenglish code-switching.
- AUTOMATICALLY DETECT the language the caller uses and reply in THAT EXACT LANGUAGE!
  * If the caller speaks Telugu (even mixed with English words like "parcel", "gate", "OTP"), reply in polite, natural conversational Telugu (తెలుగు script).
  * If the caller speaks Hindi or Hinglish, reply in polite, natural conversational Hindi (हिन्दी Devanagari script).
  * If the caller speaks English, reply in crisp, natural conversational English.
- Keep your spoken responses concise and phone-natural (1 to 3 short sentences max per turn). Never sound robotic or long-winded on a phone call.

SMART GUARDRAILS & PLAYBOOKS:
${activeRules || "1. Never reveal OTPs, PINs, or banking codes unless the owner explicitly whispers approval.\n2. Politely decline telemarketing, personal loans, credit card sales, and spam."}

BEHAVIORAL INTELLIGENCE:
- Identify who is calling, why they are calling, and whether anything urgent is needed.
- If it is a delivery partner, use the Owner Personal Context to guide drop-off smoothly, and NEVER make up an OTP.
- If the owner sends a [OWNER LIVE WHISPER], immediately weave that exact instruction naturally into your spoken response in the caller's language without saying "the owner whispered".`;
}

const reportCallIntelDeclaration: FunctionDeclaration = {
  name: "reportCallIntelligence",
  description:
    "Update the live screen for the phone owner whenever you detect the caller's language, intent category, urgency, spam risk, or key facts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      detectedLanguage: {
        type: Type.STRING,
        description: "Detected spoken language: English, Hindi, Telugu, Hinglish, or Tenglish.",
      },
      intentCategory: {
        type: Type.STRING,
        description:
          "Category such as Delivery, Banking & Finance, Work & Scheduling, Personal / VIP, or Telemarketing / Spam.",
      },
      urgency: {
        type: Type.STRING,
        description: "Low, Normal, High, or Critical.",
      },
      spamConfidence: {
        type: Type.NUMBER,
        description: "Spam probability from 0 to 100.",
      },
      extractedFact: {
        type: Type.STRING,
        description: "Short concise fact learned from caller, e.g., 'Flipkart parcel at Main Gate'.",
      },
    },
    required: ["detectedLanguage", "intentCategory", "urgency", "spamConfidence"],
  },
};

const terminateSpamDeclaration: FunctionDeclaration = {
  name: "terminateSpamCall",
  description:
    "Politely end and block the call if it is clearly unsolicited telemarketing, loan spam, or scam.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: "Reason for terminating the spam call.",
      },
    },
    required: ["reason"],
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(getCleanApiKey()),
    });
  });

  // 1. Interactive AI Assistant Turn Endpoint
  app.post("/api/call/respond", async (req, res) => {
    const {
      settings,
      rules,
      callerName,
      callerNumber,
      history,
      callerUtterance,
      ownerWhisper,
      isOpeningGreeting,
    } = req.body || {};

    const ai = getAIClient();
    if (!ai) {
      res.json(
        buildFallbackAssistantTurn({
          settings,
          callerName,
          callerUtterance,
          ownerWhisper,
          isOpeningGreeting,
        })
      );
      return;
    }

    try {
      const systemInstruction = buildAssistantSystemPrompt({
        ownerName: settings?.ownerName,
        assistantName: settings?.assistantName,
        statusMode: settings?.statusMode,
        customContextNote: settings?.customContextNote,
        greetingMode: settings?.greetingMode,
        rules,
        callerName,
        callerNumber,
      });

      const transcriptContext = Array.isArray(history)
        ? history
            .map((t: { speaker: string; text: string }) => `${t.speaker.toUpperCase()}: ${t.text}`)
            .join("\n")
        : "";

      let promptText = "";
      if (isOpeningGreeting) {
        const greetHint =
          settings?.greetingMode === "Telugu First"
            ? "Answer the call primarily in polite Telugu while noting they can speak Telugu, Hindi, or English."
            : settings?.greetingMode === "Hindi First"
              ? "Answer the call primarily in polite Hindi while noting they can speak Hindi, Telugu, or English."
              : settings?.greetingMode === "English First"
                ? "Answer the call in crisp polite English."
                : "Answer the call warmly in crisp Indian English and welcome them to speak in English, Hindi (हिन्दी), or Telugu (తెలుగు).";

        promptText = `The phone just rang and you picked up on behalf of ${settings?.ownerName || "the owner"}.
${greetHint}
Generate your spoken opening greeting (1-2 sentences) and trilingual translations.`;
      } else {
        promptText = `CONVERSATION SO FAR:
${transcriptContext || "(Call just started)"}

${callerUtterance ? `NEW CALLER SPOKEN TURN: "${callerUtterance}"` : ""}
${ownerWhisper ? `[OWNER LIVE WHISPER INSTRUCTION TO ASSISTANT]: "${ownerWhisper}" — Immediately convey this to the caller naturally in the caller's language!` : ""}

Respond as the AI Call Assistant in the caller's language (English, Hindi in Devanagari, or Telugu in Telugu script). Also provide accurate English, Hindi, and Telugu translations of both the caller's new turn (if present) and your reply, update call intelligence, and suggest 3 smart 1-tap whispers for the phone owner.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assistantReply: { type: Type.STRING },
              replyLanguage: { type: Type.STRING },
              assistantTranslations: {
                type: Type.OBJECT,
                properties: {
                  English: { type: Type.STRING },
                  Hindi: { type: Type.STRING },
                  Telugu: { type: Type.STRING },
                },
                required: ["English", "Hindi", "Telugu"],
              },
              callerTranslations: {
                type: Type.OBJECT,
                properties: {
                  English: { type: Type.STRING },
                  Hindi: { type: Type.STRING },
                  Telugu: { type: Type.STRING },
                },
                required: ["English", "Hindi", "Telugu"],
              },
              detectedLanguage: { type: Type.STRING },
              intentCategory: { type: Type.STRING },
              urgency: { type: Type.STRING },
              spamConfidence: { type: Type.NUMBER },
              extractedFacts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              otpGuardTriggered: { type: Type.BOOLEAN },
              suggestedWhispers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              shouldEndCall: { type: Type.BOOLEAN },
            },
            required: [
              "assistantReply",
              "replyLanguage",
              "assistantTranslations",
              "callerTranslations",
              "detectedLanguage",
              "intentCategory",
              "urgency",
              "spamConfidence",
              "extractedFacts",
              "otpGuardTriggered",
              "suggestedWhispers",
              "shouldEndCall",
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ ...parsed, geminiConfigured: true });
    } catch {
      res.json(
        buildFallbackAssistantTurn({
          settings,
          callerName,
          callerUtterance,
          ownerWhisper,
          isOpeningGreeting,
        })
      );
    }
  });

  // 2. Dynamic Caller Persona Simulator Endpoint
  app.post("/api/call/simulate-caller", async (req, res) => {
    const { personaPrompt, primaryLanguage, history } = req.body || {};
    const ai = getAIClient();

    if (!ai) {
      if (primaryLanguage === "Telugu") {
        res.json({
          callerText:
            "సరే మేడం, ఇది ప్రీపెయిడ్ పార్సెల్ కాబట్టి OTP అవసరం లేదు. టవర్ B సెక్యూరిటీ గార్డ్ రమేష్ గారి దగ్గర ఇచ్చి మైగేట్‌లో ఎంట్రీ వేస్తాను. ధన్యవాదాలు!",
          language: "Telugu",
          translations: {
            English:
              "Okay madam, since this is a prepaid parcel no OTP is needed. I will hand it to Guard Ramesh at Tower B security and log it in MyGate. Thank you!",
            Hindi:
              "ठीक है मैडम, यह प्रीपेड पार्सल है इसलिए ओटीपी नहीं चाहिए। मैं टॉवर B सिक्योरिटी गार्ड रमेश जी को देकर मायगेट में एंट्री कर देता हूँ। धन्यवाद!",
            Telugu:
              "సరే మేడం, ఇది ప్రీపెయిడ్ పార్సెల్ కాబట్టి OTP అవసరం లేదు. టవర్ B సెక్యూరిటీ గార్డ్ రమేష్ గారి దగ్గర ఇచ్చి మైగేట్‌లో ఎంట్రీ వేస్తాను. ధన్యవాదాలు!",
          },
          callerSatisfiedOrDone: true,
        });
      } else if (primaryLanguage === "Hindi") {
        res.json({
          callerText:
            "जी बहुत धन्यवाद। रेफरेंस नंबर टू-फोर-नाइन-एट है, अनिल जी शाम को पोर्टल पर अप्रूव कर देंगे तो फंड्स कल सुबह क्लियर हो जाएंगे। नमस्ते।",
          language: "Hindi",
          translations: {
            English:
              "Thank you very much. The reference number is 2498; once Anil approves on the portal this evening, funds will clear tomorrow morning. Goodbye.",
            Hindi:
              "जी बहुत धन्यवाद। रेफरेंस नंबर टू-फोर-नाइन-एट है, अनिल जी शाम को पोर्टल पर अप्रूव कर देंगे तो फंड्स कल सुबह क्लियर हो जाएंगे। नमस्ते।",
            Telugu:
              "చాలా ధన్యవాదాలు. రిఫరెన్స్ నంబర్ 2498; అనిల్ గారు ఈ సాయంత్రం పోర్టల్‌లో అప్రూవ్ చేస్తే రేపు ఉదయం ఫండ్స్ క్లియర్ అవుతాయి. నమస్తే.",
          },
          callerSatisfiedOrDone: true,
        });
      } else {
        res.json({
          callerText:
            "Perfect, I will send over the updated 6:00 PM calendar invite right away. Appreciate your help!",
          language: "English",
          translations: {
            English:
              "Perfect, I will send over the updated 6:00 PM calendar invite right away. Appreciate your help!",
            Hindi:
              "बहुत बढ़िया, मैं अभी शाम 6:00 बजे का अपडेटेड कैलेंडर इनवाइट भेज देती हूँ। आपकी मदद के लिए धन्यवाद!",
            Telugu:
              "చాలా మంచిది, సాయంత్రం 6:00 గంటల అప్‌డేట్ చేసిన క్యాలెండర్ ఇన్వైట్‌ను వెంటనే పంపిస్తాను. ధన్యవాదాలు!",
          },
          callerSatisfiedOrDone: true,
        });
      }
      return;
    }

    try {
      const transcriptContext = Array.isArray(history)
        ? history
            .map((t: { speaker: string; text: string }) => `${t.speaker.toUpperCase()}: ${t.text}`)
            .join("\n")
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `CALL TRANSCRIPT SO FAR:\n${transcriptContext}\n\nGenerate the caller's next realistic spoken reply (1-2 short natural phone sentences) in ${primaryLanguage}, along with English, Hindi, and Telugu translations.`,
        config: {
          systemInstruction: `You are roleplaying a realistic phone caller speaking to an AI call assistant in India.
CALLER PERSONA: ${personaPrompt}
PRIMARY LANGUAGE: ${primaryLanguage} (Use authentic native script: Telugu script for Telugu, Devanagari for Hindi, Latin for English/Hinglish).
React directly and realistically to whatever the AI assistant or phone owner just said! If your goal is resolved (e.g. drop-off instruction given or callback scheduled), thank them briefly and say goodbye.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              callerText: { type: Type.STRING },
              language: { type: Type.STRING },
              translations: {
                type: Type.OBJECT,
                properties: {
                  English: { type: Type.STRING },
                  Hindi: { type: Type.STRING },
                  Telugu: { type: Type.STRING },
                },
                required: ["English", "Hindi", "Telugu"],
              },
              callerSatisfiedOrDone: { type: Type.BOOLEAN },
            },
            required: ["callerText", "language", "translations", "callerSatisfiedOrDone"],
          },
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch {
      res.json({
        callerText: "Thank you, I have noted that down. Goodbye!",
        language: primaryLanguage || "English",
        translations: {
          English: "Thank you, I have noted that down. Goodbye!",
          Hindi: "धन्यवाद, मैंने नोट कर लिया है। नमस्ते!",
          Telugu: "ధన్యవాదాలు, నేను నోట్ చేసుకున్నాను. నమస్తే!",
        },
        callerSatisfiedOrDone: true,
      });
    }
  });

  // 3. Multilingual Speech Synthesis (Gemini 3.8 Flash Lite TTS with Browser Speech Fallback)
  app.post("/api/call/tts", async (req, res) => {
    const { text, voiceName = "Kore", style = "Warm, natural, clear phone conversation" } =
      req.body || {};
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required for speech synthesis." });
      return;
    }

    const ai = getAIClient();
    if (!ai) {
      res.json({ audioBase64: null, useBrowserSpeech: true });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text,
                // @ts-ignore speechMetadata supported on Gemini 3.8 TTS
                speechMetadata: { style },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.json({ audioBase64: null, useBrowserSpeech: true });
        return;
      }
      res.json({ audioBase64: base64Audio, mimeType: "audio/wav", useBrowserSpeech: false });
    } catch {
      res.json({ audioBase64: null, useBrowserSpeech: true });
    }
  });

  // 4. Post-Call Trilingual Executive Summary Endpoint
  app.post("/api/call/summarize", async (req, res) => {
    const { transcript, callerName, callerNumber, durationSeconds } = req.body || {};
    const ai = getAIClient();

    if (!ai) {
      const allText = Array.isArray(transcript)
        ? transcript.map((t: { text?: string }) => t.text || "").join(" ")
        : "";
      const primaryLanguage = detectScriptLanguage(allText);
      const isSpam = /loan|credit card|140|प्री-अप्रूव्ड|లోన్/i.test(
        allText + " " + (callerName || "")
      );
      const isDelivery = /parcel|flipkart|amazon|gate|पार्सल|పార్సెల్/i.test(allText);

      res.json({
        headline: isSpam
          ? `Blocked unsolicited telemarketing call from ${callerName || "Unknown"}`
          : isDelivery
            ? `Guided ${callerName || "courier"} to leave parcel at security desk`
            : `Screened ${primaryLanguage} call with ${callerName || "caller"} & logged message`,
        English: `Vaani answered the call from ${callerName || "the caller"} in ${primaryLanguage} and handled the conversation per your active playbooks.`,
        Hindi: `वाणी ने ${callerName || "कॉलर"} की कॉल का ${primaryLanguage} में उत्तर दिया और आपके नियमों के अनुसार बातचीत संभाली।`,
        Telugu: `వాణి ${callerName || "కాలర్"} నుండి వచ్చిన కాల్‌కు ${primaryLanguage}లో సమాధానం ఇచ్చి మీ రూల్స్ ప్రకారం సంభాషణను నిర్వహించింది.`,
        sentiment: isSpam ? "Pushy/Spam" : "Polite",
        spamVerdict: isSpam ? "Suspected Spam" : "Safe",
        actionItems: isSpam
          ? []
          : isDelivery
            ? ["Collect parcel from Tower B MyGate security desk"]
            : [`Review call message from ${callerName || "caller"} after 5:30 PM`],
        extractedFacts: [`Call duration: ${durationSeconds || 20}s`, `Primary language: ${primaryLanguage}`],
        primaryLanguage,
        intentCategory: isSpam ? "Telemarketing / Spam" : isDelivery ? "Delivery" : "Work & Scheduling",
      });
      return;
    }

    try {
      const formatted = Array.isArray(transcript)
        ? transcript
            .map((t: { speakerLabel: string; text: string }) => `${t.speakerLabel}: ${t.text}`)
            .join("\n")
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Summarize this phone call with ${callerName || "Unknown"} (${callerNumber || ""}), duration ${durationSeconds || 30}s:\n\n${formatted}`,
        config: {
          systemInstruction:
            "You generate crisp, executive post-call intelligence briefs in English, Hindi (हिन्दी), and Telugu (తెలుగు), plus concrete action items and spam verdict.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              English: { type: Type.STRING },
              Hindi: { type: Type.STRING },
              Telugu: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              spamVerdict: { type: Type.STRING },
              actionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedFacts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              primaryLanguage: { type: Type.STRING },
              intentCategory: { type: Type.STRING },
            },
            required: [
              "headline",
              "English",
              "Hindi",
              "Telugu",
              "sentiment",
              "spamVerdict",
              "actionItems",
              "extractedFacts",
              "primaryLanguage",
              "intentCategory",
            ],
          },
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch {
      res.json({
        headline: `Call with ${callerName || "Caller"} summarized`,
        English: "Call transcript and details were saved to your inbox.",
        Hindi: "कॉल ट्रांसक्रिप्ट और विवरण आपके इनबॉक्स में सहेजे गए हैं।",
        Telugu: "కాల్ ట్రాన్స్‌క్రిప్ట్ మరియు వివరాలు మీ ఇన్‌బాక్స్‌లో సేవ్ చేయబడ్డాయి.",
        sentiment: "Polite",
        spamVerdict: "Safe",
        actionItems: [],
        extractedFacts: [],
        primaryLanguage: "English",
        intentCategory: "General",
      });
    }
  });

  const server = http.createServer(app);

  // 5. Real-Time Gemini Live API WebSocket Bridge (/ws/live-call)
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const pathname = new URL(request.url || "/", "http://localhost").pathname;
      if (pathname === "/ws/live-call") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (clientWs: WebSocket) => {
    let liveSessionPromise: ReturnType<GoogleGenAI["live"]["connect"]> | null = null;
    let isClosed = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    clientWs.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "start" && !liveSessionPromise) {
          const ai = getAIClient();
          if (!ai) {
            safeSend({
              type: "fallbackSpeechMode",
              info: "Using browser speech recognition until GEMINI_API_KEY is selected in Settings > Secrets.",
            });
            return;
          }

          const cfg = msg.config || {};
          const systemInstruction = buildAssistantSystemPrompt({
            ownerName: cfg.ownerName,
            assistantName: cfg.assistantName,
            statusMode: cfg.statusMode,
            customContextNote: cfg.customContextNote,
            greetingMode: cfg.greetingMode,
            rules: cfg.rules,
            callerName: cfg.callerName,
            callerNumber: cfg.callerNumber,
          });

          liveSessionPromise = ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: cfg.voiceName || "Kore",
                  },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              tools: [
                {
                  functionDeclarations: [reportCallIntelDeclaration, terminateSpamDeclaration],
                },
              ],
              systemInstruction,
            },
            callbacks: {
              onopen: () => {
                safeSend({ type: "ready" });
              },
              onmessage: (serverMsg: LiveServerMessage) => {
                if (isClosed) return;

                const parts = serverMsg.serverContent?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      safeSend({ type: "audio", data: part.inlineData.data });
                    }
                  }
                }

                const sc = serverMsg.serverContent as Record<string, unknown> | undefined;
                const inputTranscript = (sc?.inputTranscription as { text?: string } | undefined)
                  ?.text;
                if (inputTranscript) {
                  safeSend({ type: "inputTranscript", text: inputTranscript });
                }

                const outputTranscript = (sc?.outputTranscription as { text?: string } | undefined)
                  ?.text;
                if (outputTranscript) {
                  safeSend({ type: "outputTranscript", text: outputTranscript });
                }

                if (serverMsg.serverContent?.interrupted) {
                  safeSend({ type: "interrupted" });
                }

                if (serverMsg.serverContent?.turnComplete) {
                  safeSend({ type: "turnComplete" });
                }

                const toolCalls = serverMsg.toolCall?.functionCalls;
                if (toolCalls && toolCalls.length > 0 && liveSessionPromise) {
                  const responses = toolCalls.map((call) => {
                    if (call.name === "reportCallIntelligence") {
                      safeSend({ type: "intel", intel: call.args });
                    } else if (call.name === "terminateSpamCall") {
                      safeSend({
                        type: "spamTerminated",
                        reason:
                          (call.args as { reason?: string })?.reason || "Unsolicited spam call",
                      });
                    }
                    return {
                      id: call.id,
                      name: call.name,
                      response: { status: "acknowledged" },
                    };
                  });
                  liveSessionPromise
                    .then((s) => s.sendToolResponse({ functionResponses: responses }))
                    .catch(() => {});
                }
              },
              onerror: (err: unknown) => {
                const errText =
                  err instanceof Error ? err.message : "Live voice connection error.";
                safeSend({ type: "error", error: errText });
              },
              onclose: () => {
                safeSend({ type: "closed" });
              },
            },
          });

          const session = await liveSessionPromise;
          if (!isClosed) {
            session.sendClientContent({
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: "[INCOMING CALL CONNECTED: Pick up and greet the caller warmly in 1-2 short natural sentences on behalf of the owner. Mention they may speak in English, Hindi, or Telugu.]",
                    },
                  ],
                },
              ],
              turnComplete: true,
            });
          }
          return;
        }

        if (msg.type === "audio" && liveSessionPromise && msg.data) {
          liveSessionPromise
            .then((s) => {
              if (!isClosed) {
                s.sendRealtimeInput({
                  audio: {
                    data: msg.data,
                    mimeType: "audio/pcm;rate=16000",
                  },
                });
              }
            })
            .catch(() => {});
        } else if (msg.type === "whisper" && liveSessionPromise && msg.instruction) {
          liveSessionPromise
            .then((s) => {
              if (!isClosed) {
                s.sendClientContent({
                  turns: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: `[OWNER LIVE WHISPER TO ASSISTANT: "${msg.instruction}". Convey this immediately and naturally to the caller in the language the caller is speaking! Do NOT mention it was a whisper.]`,
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                });
              }
            })
            .catch(() => {});
        } else if (msg.type === "callerText" && liveSessionPromise && msg.text) {
          liveSessionPromise
            .then((s) => {
              if (!isClosed) {
                s.sendClientContent({
                  turns: [{ role: "user", parts: [{ text: msg.text }] }],
                  turnComplete: true,
                });
              }
            })
            .catch(() => {});
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Live session failure.";
        safeSend({ type: "error", error: message });
      }
    });

    clientWs.on("close", () => {
      isClosed = true;
      if (liveSessionPromise) {
        liveSessionPromise.then((s) => s.close()).catch(() => {});
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        // @ts-ignore Vite 8 server.ws attaches module-runner WS to HTTP server so client doesn't use port 24678
        ws: { server },
        hmr: process.env.DISABLE_HMR === "true" ? false : { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Vaani AI Call Assistant server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
