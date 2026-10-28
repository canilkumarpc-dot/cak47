import {
  AssistantSettings,
  CallerScenario,
  CallRecord,
  PlaybookRule,
  SupportedLanguage,
} from '../types';

export const AVATAR_VAANI = '/src/assets/images/assistant_vaani_avatar_1793182884851.jpg';
export const AVATAR_DELIVERY = '/src/assets/images/caller_delivery_avatar_1793182888386.jpg';
export const AVATAR_EXECUTIVE = '/src/assets/images/caller_executive_avatar_1793182887446.jpg';

export const INITIAL_SETTINGS: AssistantSettings = {
  ownerName: 'Anil Kumar',
  assistantName: 'Vaani',
  voiceName: 'Kore',
  statusMode: 'In a Meeting',
  customContextNote:
    'Flat 402, Tower B, Aparna Serene Park. Deliveries can be left at MyGate security desk with Guard Ramesh. Available for callbacks after 5:30 PM.',
  greetingMode: 'Trilingual Auto',
  preferredReadingLang: SupportedLanguage.ENGLISH,
  autoBlockHighSpam: true,
  carrier: 'Jio',
  virtualBridgeNumber: '+91 40 7101 4820',
};

export const INITIAL_PLAYBOOK_RULES: PlaybookRule[] = [
  {
    id: 'rule-delivery',
    title: 'Smart Parcel & Food Drop-Off',
    category: 'Delivery',
    instruction:
      'For Flipkart, Amazon, Swiggy, or Zomato riders in Telugu, Hindi, or English: instruct them to leave prepaid parcels at Tower B MyGate desk. Never invent an OTP; ask them to wait if an OTP is required.',
    enabled: true,
  },
  {
    id: 'rule-otp-guard',
    title: 'Zero-Trust OTP & Banking Shield',
    category: 'Security',
    instruction:
      'Strictly refuse any request for OTP, UPI PIN, CVV, Aadhaar, or netbanking verification codes in any language. Ask the caller for their official employee ID and reference number.',
    enabled: true,
  },
  {
    id: 'rule-spam',
    title: 'Instant Loan & Telemarketing Dismissal',
    category: 'Spam',
    instruction:
      'If the caller pitches pre-approved personal loans, credit card upgrades, holiday memberships, or real estate plots, politely state the owner is not interested and end the call.',
    enabled: true,
  },
  {
    id: 'rule-scheduling',
    title: 'Structured Work Callback Capture',
    category: 'Scheduling',
    instruction:
      'For colleagues, clients, or clinics: share that Anil is in a meeting until 5:30 PM, ask for the specific agenda and preferred callback slot, and log an action item.',
    enabled: true,
  },
];

export const CALLER_SCENARIOS: CallerScenario[] = [
  {
    id: 'scen-telugu-delivery',
    callerName: 'Raju · Flipkart Logistics',
    callerNumber: '+91 98480 41209',
    callerRole: 'Delivery Partner · Hyderabad',
    primaryLanguage: 'Telugu',
    nativeBadge: 'తెలుగు · Telugu',
    callerVoice: 'Puck',
    avatar: AVATAR_DELIVERY,
    personaPrompt:
      'You are Raju, a polite Flipkart delivery executive in Hyderabad speaking natural conversational Telugu (తెలుగు script). You have a prepaid electronics parcel for Anil Kumar (Flat 402, Tower B). You are standing at the main security gate and want to know whether to come up to the 4th floor or leave it with the security guard.',
    openingLine:
      'నమస్తే మేడం, నేను ఫ్లిప్‌కార్ట్ డెలివరీ నుండి రాజు మాట్లాడుతున్నాను. అనిల్ కుమార్ గారికి పార్సెల్ వచ్చింది, మెయిన్ గేట్ దగ్గర ఉన్నాను. పైకి రావాలా లేక సెక్యూరిటీ దగ్గర ఇవ్వమంటారా?',
    openingTranslations: {
      English:
        'Hello madam, this is Raju from Flipkart delivery. There is a parcel for Anil Kumar and I am at the main gate. Should I come upstairs or leave it at security?',
      Hindi:
        'नमस्ते मैडम, मैं फ़्लिपकार्ट डिलीवरी से राजू बोल रहा हूँ। अनिल कुमार जी का पार्सल आया है, मैं मेन गेट पर हूँ। ऊपर आऊँ या सिक्योरिटी पर दे दूँ?',
      Telugu:
        'నమస్తే మేడం, నేను ఫ్లిప్‌కార్ట్ డెలివరీ నుండి రాజు మాట్లాడుతున్నాను. అనిల్ కుమార్ గారికి పార్సెల్ వచ్చింది, మెయిన్ గేట్ దగ్గర ఉన్నాను. పైకి రావాలా లేక సెక్యూరిటీ దగ్గర ఇవ్వమంటారా?',
    },
  },
  {
    id: 'scen-hindi-bank',
    callerName: 'Vikram Malhotra',
    callerNumber: '+91 98112 73904',
    callerRole: 'Relationship Manager · Mumbai',
    primaryLanguage: 'Hindi',
    nativeBadge: 'हिन्दी · Hindi',
    callerVoice: 'Charon',
    avatar: AVATAR_EXECUTIVE,
    personaPrompt:
      'You are Vikram Malhotra, a senior bank relationship manager speaking polite professional Hindi (Devanagari script). You are calling Anil Kumar regarding an international inward wire transfer declaration (FIRC document) that needs confirmation before 4 PM tomorrow so funds settle without delay. You do NOT ask for any OTP; you only want to let him know to approve the advice in his corporate portal.',
    openingLine:
      'नमस्ते, मैं एचडीएफसी कॉर्पोरेट बैंकिंग से विक्रम मल्होत्रा बात कर रहा हूँ। अनिल जी के खाते में एक इंटरनेशनल वायर ट्रांसफर आया है, जिसके प्रूफ की पुष्टि कल शाम चार बजे से पहले पोर्टल पर करनी है।',
    openingTranslations: {
      English:
        'Hello, this is Vikram Malhotra from HDFC Corporate Banking. An international wire transfer has arrived in Anil’s account, and its purpose confirmation needs to be completed on the portal before 4 PM tomorrow.',
      Hindi:
        'नमस्ते, मैं एचडीएफसी कॉर्पोरेट बैंकिंग से विक्रम मल्होत्रा बात कर रहा हूँ। अनिल जी के खाते में एक इंटरनेशनल वायर ट्रांसफर आया है, जिसके प्रूफ की पुष्टि कल शाम चार बजे से पहले पोर्टल पर करनी है।',
      Telugu:
        'నమస్తే, నేను హెచ్‌డిఎఫ్‌సి కార్పొరేట్ బ్యాంకింగ్ నుండి విక్రమ్ మల్హోత్రా మాట్లాడుతున్నాను. అనిల్ గారి ఖాతాకు ఇంటర్నేషనల్ వైర్ ట్రాన్స్‌ఫర్ వచ్చింది, రేపు సాయంత్రం 4 గంటలలోపు పోర్టల్‌లో ధృవీకరించాలి.',
    },
  },
  {
    id: 'scen-english-work',
    callerName: 'Meera Krishnan',
    callerNumber: '+91 99001 58210',
    callerRole: 'VP Engineering · Bengaluru',
    primaryLanguage: 'English',
    nativeBadge: 'English',
    callerVoice: 'Zephyr',
    personaPrompt:
      'You are Meera Krishnan, VP of Engineering speaking crisp professional English. You are calling Anil to ask if the Q4 architecture sign-off meeting can move from 4:00 PM to 6:00 PM today because the cloud security audit team wants to join.',
    openingLine:
      'Hi there, this is Meera Krishnan calling for Anil. Could you let him know we need to push today’s Q4 architecture sign-off to 6:00 PM so the security audit lead can join?',
    openingTranslations: {
      English:
        'Hi there, this is Meera Krishnan calling for Anil. Could you let him know we need to push today’s Q4 architecture sign-off to 6:00 PM so the security audit lead can join?',
      Hindi:
        'नमस्ते, मैं मीरा कृष्णन अनिल के लिए कॉल कर रही हूँ। क्या आप उन्हें बता सकती हैं कि हमें आज की Q4 आर्किटेक्चर मीटिंग शाम 6:00 बजे करनी होगी ताकि सिक्योरिटी ऑडिट लीड जुड़ सकें?',
      Telugu:
        'హాయ్, నేను మీరా కృష్ణన్ అనిల్ గారి కోసం కాల్ చేస్తున్నాను. సెక్యూరిటీ ఆడిట్ లీడ్ జాయిన్ అవ్వడానికి ఈరోజు Q4 ఆర్కిటెక్చర్ మీటింగ్‌ను సాయంత్రం 6:00 గంటలకు మార్చాలని వారికి చెబుతారా?',
    },
  },
  {
    id: 'scen-spam-loan',
    callerName: 'Unknown Telemarketer',
    callerNumber: '+91 140 9920 811',
    callerRole: 'Suspected Telemarketing · 140 Series',
    primaryLanguage: 'Hindi',
    nativeBadge: 'हिन्दी · Spam Test',
    callerVoice: 'Fenrir',
    personaPrompt:
      'You are a pushy telemarketer speaking fast Hindi/Hinglish trying to sell an instant 15-lakh personal loan with zero processing fee and asking if the customer wants the link right now.',
    openingLine:
      'नमस्ते जी! सर के नंबर पर पंद्रह लाख रुपये का प्री-अप्रूव्ड पर्सनल लोन जीरो प्रोसेसिंग फीस पर आज ही एक्टिवेट हो रहा है, अभी डॉक्यूमेंट वेरिफाई करवा दें?',
    openingTranslations: {
      English:
        'Hello! A pre-approved personal loan of 15 lakh rupees at zero processing fee is being activated on sir’s number today—shall we verify documents right now?',
      Hindi:
        'नमस्ते जी! सर के नंबर पर पंद्रह लाख रुपये का प्री-अप्रूव्ड पर्सनल लोन जीरो प्रोसेसिंग फीस पर आज ही एक्टिवेट हो रहा है, अभी डॉक्यूमेंट वेरिफाई करवा दें?',
      Telugu:
        'నమస్తే అండీ! సార్ నంబర్‌పై 15 లక్షల ప్రీ-అప్రూవ్డ్ పర్సనల్ లోన్ జీరో ప్రాసెసింగ్ ఫీజుతో ఈరోజే యాక్టివేట్ అవుతోంది, ఇప్పుడే డాక్యుమెంట్లు వెరిఫై చేయమంటారా?',
    },
  },
];

export const INITIAL_CALL_HISTORY: CallRecord[] = [
  {
    id: 'call-101',
    callerName: 'Srinivas · BlueDart Express',
    callerNumber: '+91 98492 11840',
    callerAvatar: AVATAR_DELIVERY,
    startedAt: 'Today · 14:18',
    durationSeconds: 46,
    outcome: 'AI Handled',
    primaryLanguage: 'Telugu',
    intentCategory: 'Delivery',
    urgency: 'Normal',
    spamConfidence: 4,
    extractedFacts: [
      'BlueDart document envelope from ICICI Lombard',
      'Left at Tower B MyGate desk with Guard Ramesh',
      'MyGate passcode logged: #7841',
    ],
    actionItems: [
      {
        id: 'act-1',
        text: 'Collect BlueDart envelope from Tower B security desk (Passcode #7841)',
        completed: false,
      },
    ],
    summary: {
      headline: 'BlueDart envelope left safely at Tower B security desk',
      English:
        'Srinivas from BlueDart called in Telugu regarding a prepaid ICICI Lombard document envelope. Vaani instructed him per your Delivery Playbook to deposit it with Guard Ramesh at Tower B MyGate desk.',
      Hindi:
        'ब्लूडार्ट से श्रीनिवास ने तेलुगु में आईसीआईसीआई लोम्बार्ड के दस्तावेज़ लिफाफे के लिए कॉल किया। वाणी ने आपके डिलीवरी नियम के अनुसार पार्सल टॉवर B के मायगेट सिक्योरिटी डेस्क पर गार्ड रमेश के पास रखवा दिया।',
      Telugu:
        'ఐసిఐసిఐ లాంబార్డ్ డాక్యుమెంట్ కవర్ కోసం బ్లూడార్ట్ నుండి శ్రీనివాస్ తెలుగులో కాల్ చేశారు. మీ డెలివరీ రూల్ ప్రకారం టవర్ B మైగేట్ సెక్యూరిటీ డెస్క్ వద్ద గార్డ్ రమేష్ గారికి ఇవ్వమని వాణి సూచించింది.',
      sentiment: 'Cooperative',
      spamVerdict: 'Safe',
      timeSavedSeconds: 75,
    },
    transcript: [
      {
        id: 't-101-1',
        speaker: 'assistant',
        speakerLabel: 'Vaani AI',
        text: 'Hello, this is Vaani, Anil Kumar’s AI assistant. He is currently in a meeting—you may speak in English, Hindi, or Telugu.',
        language: 'English',
        translations: {
          English:
            'Hello, this is Vaani, Anil Kumar’s AI assistant. He is currently in a meeting—you may speak in English, Hindi, or Telugu.',
          Hindi:
            'नमस्ते, मैं अनिल कुमार की एआई असिस्टेंट वाणी हूँ। वे अभी मीटिंग में हैं—आप अंग्रेज़ी, हिंदी या तेलुगु में बात कर सकते हैं।',
          Telugu:
            'నమస్తే, నేను అనిల్ కుమార్ గారి AI అసిస్టెంట్ వాణిని. వారు ప్రస్తుతం మీటింగ్‌లో ఉన్నారు—మీరు ఇంగ్లీష్, హిందీ లేదా తెలుగులో మాట్లాడవచ్చు.',
        },
        timestamp: '14:18:04',
      },
      {
        id: 't-101-2',
        speaker: 'caller',
        speakerLabel: 'Srinivas · BlueDart',
        text: 'మేడం, బ్లూడార్ట్ కొరియర్ నుండి శ్రీనివాస్ మాట్లాడుతున్నాను. అనిల్ గారికి డాక్యుమెంట్ కవర్ ఉంది, OTP ఏమీ లేదు. టవర్ B సెక్యూరిటీ దగ్గర ఇవ్వమంటారా?',
        language: 'Telugu',
        translations: {
          English:
            'Madam, Srinivas speaking from BlueDart courier. There is a document cover for Anil sir, no OTP required. Should I hand it over at Tower B security?',
          Hindi:
            'मैडम, ब्लूडार्ट कूरियर से श्रीनिवास बोल रहा हूँ। अनिल सर के लिए डॉक्यूमेंट कवर है, कोई OTP नहीं चाहिए। क्या टॉवर B सिक्योरिटी पर दे दूँ?',
          Telugu:
            'మేడం, బ్లూడార్ట్ కొరియర్ నుండి శ్రీనివాస్ మాట్లాడుతున్నాను. అనిల్ గారికి డాక్యుమెంట్ కవర్ ఉంది, OTP ఏమీ లేదు. టవర్ B సెక్యూరిటీ దగ్గర ఇవ్వమంటారా?',
        },
        timestamp: '14:18:17',
      },
      {
        id: 't-101-3',
        speaker: 'assistant',
        speakerLabel: 'Vaani AI',
        text: 'అవును శ్రీనివాస్ గారు, దయచేసి టవర్ B మైగేట్ సెక్యూరిటీ డెస్క్ దగ్గర గార్డ్ రమేష్ గారికి ఫ్లాట్ 402 పేరుతో ఇచ్చేయండి. ధన్యవాదాలు!',
        language: 'Telugu',
        translations: {
          English:
            'Yes Srinivas garu, please leave it under Flat 402 with Guard Ramesh at the Tower B MyGate security desk. Thank you!',
          Hindi:
            'जी श्रीनिवास जी, कृपया इसे फ्लैट 402 के नाम से टॉवर B मायगेट सिक्योरिटी डेस्क पर गार्ड रमेश जी को दे दीजिए। धन्यवाद!',
          Telugu:
            'అవును శ్రీనివాస్ గారు, దయచేసి టవర్ B మైగేట్ సెక్యూరిటీ డెస్క్ దగ్గర గార్డ్ రమేష్ గారికి ఫ్లాట్ 402 పేరుతో ఇచ్చేయండి. ధన్యవాదాలు!',
        },
        timestamp: '14:18:31',
      },
    ],
  },
  {
    id: 'call-102',
    callerName: 'Dr. Ananya Rao’s Desk · Apollo',
    callerNumber: '+91 40 2360 7777',
    startedAt: 'Today · 11:42',
    durationSeconds: 58,
    outcome: 'Action Needed',
    primaryLanguage: 'Hindi',
    intentCategory: 'Personal / VIP',
    urgency: 'High',
    spamConfidence: 2,
    extractedFacts: [
      'Annual cardiac & lipid checkup rescheduled to Saturday 9:15 AM',
      '12-hour fasting required from Friday 9:00 PM',
    ],
    actionItems: [
      {
        id: 'act-2',
        text: 'Confirm Saturday 9:15 AM slot with Apollo Jubilee Hills desk',
        completed: false,
      },
    ],
    summary: {
      headline: 'Apollo checkup moved to Saturday 9:15 AM; confirm slot',
      English:
        'Apollo Jubilee Hills reception called in Hindi to inform that Dr. Ananya Rao’s Friday clinic moved to Saturday at 9:15 AM with 12-hour fasting required.',
      Hindi:
        'अपोलो जुबली हिल्स रिसेप्शन से हिंदी में कॉल आया कि डॉ. अनन्या राव का शुक्रवार का अपॉइंटमेंट शनिवार सुबह 9:15 बजे कर दिया गया है और 12 घंटे का उपवास आवश्यक है।',
      Telugu:
        'డాక్టర్ అనన్య రావు గారి శుక్రవారం అపాయింట్‌మెంట్ శనివారం ఉదయం 9:15 గంటలకు మారిందని, 12 గంటల ఉపవాసం అవసరమని అపోలో జూబ్లీహిల్స్ రిసెప్షన్ నుండి హిందీలో కాల్ వచ్చింది.',
      sentiment: 'Polite',
      spamVerdict: 'Safe',
      timeSavedSeconds: 90,
    },
    transcript: [
      {
        id: 't-102-1',
        speaker: 'caller',
        speakerLabel: 'Apollo Reception',
        text: 'नमस्ते, मैं अपोलो हॉस्पिटल जुबली हिल्स से बोल रही हूँ। अनिल कुमार जी का कल का हेल्थ चेकअप शनिवार सुबह सवा नौ बजे शिफ्ट किया गया है।',
        language: 'Hindi',
        translations: {
          English:
            'Hello, I am calling from Apollo Hospital Jubilee Hills. Anil Kumar’s health checkup scheduled for tomorrow has been shifted to Saturday at 9:15 AM.',
          Hindi:
            'नमस्ते, मैं अपोलो हॉस्पिटल जुबली हिल्स से बोल रही हूँ। अनिल कुमार जी का कल का हेल्थ चेकअप शनिवार सुबह सवा नौ बजे शिफ्ट किया गया है।',
          Telugu:
            'నమస్తే, నేను అపోలో హాస్పిటల్ జూబ్లీహిల్స్ నుండి మాట్లాడుతున్నాను. అనిల్ కుమార్ గారి రేపటి హెల్త్ చెకప్ శనివారం ఉదయం 9:15 గంటలకు మార్చబడింది.',
        },
        timestamp: '11:42:12',
      },
      {
        id: 't-102-2',
        speaker: 'assistant',
        speakerLabel: 'Vaani AI',
        text: 'जी धन्यवाद, मैंने शनिवार सुबह 9:15 बजे का समय नोट कर लिया है। क्या अनिल जी को इस जांच से पहले फास्टिंग रखनी होगी?',
        language: 'Hindi',
        translations: {
          English:
            'Thank you, I have noted the Saturday 9:15 AM timing. Does Anil need to fast prior to this checkup?',
          Hindi:
            'जी धन्यवाद, मैंने शनिवार सुबह 9:15 बजे का समय नोट कर लिया है। क्या अनिल जी को इस जांच से पहले फास्टिंग रखनी होगी?',
          Telugu:
            'ధన్యవాదాలు, శనివారం ఉదయం 9:15 సమయాన్ని నోట్ చేసుకున్నాను. ఈ చెకప్‌కు ముందు అనిల్ గారు ఫాస్టింగ్ ఉండాలా?',
        },
        timestamp: '11:42:28',
      },
      {
        id: 't-102-3',
        speaker: 'caller',
        speakerLabel: 'Apollo Reception',
        text: 'हाँ जी, शुक्रवार रात नौ बजे के बाद बारह घंटे की फास्टिंग ज़रूरी है, केवल सादा पानी ले सकते हैं।',
        language: 'Hindi',
        translations: {
          English:
            'Yes, 12 hours of fasting after 9:00 PM Friday is required; plain water is allowed.',
          Hindi:
            'हाँ जी, शुक्रवार रात नौ बजे के बाद बारह घंटे की फास्टिंग ज़रूरी है, केवल सादा पानी ले सकते हैं।',
          Telugu:
            'అవునండీ, శుక్రవారం రాత్రి 9 గంటల తర్వాత 12 గంటల ఫాస్టింగ్ తప్పనిసరి, సాధారణ నీరు మాత్రమే తీసుకోవచ్చు.',
        },
        timestamp: '11:42:44',
      },
    ],
  },
  {
    id: 'call-103',
    callerName: '140-8841 Telemarketing',
    callerNumber: '+91 140 8841 290',
    startedAt: 'Yesterday · 17:05',
    durationSeconds: 19,
    outcome: 'Spam Blocked',
    primaryLanguage: 'Hindi',
    intentCategory: 'Telemarketing / Spam',
    urgency: 'Low',
    spamConfidence: 96,
    extractedFacts: [
      'Unsolicited zero-fee lifetime credit card pitch',
      'Auto-declined and added to spam filter in 19s',
    ],
    actionItems: [],
    summary: {
      headline: 'Blocked unsolicited credit card telemarketing call',
      English:
        'Automated telemarketer pitched a lifetime-free credit card in Hindi. Vaani identified commercial spam (96% confidence), politely declined, and ended the call without ringing your phone.',
      Hindi:
        'टेलीमार्केटर ने हिंदी में लाइफटाइम-फ्री क्रेडिट कार्ड का ऑफर दिया। वाणी ने स्पैम (96%) पहचान कर विनम्रता से मना किया और आपका फोन बजाए बिना कॉल समाप्त कर दी।',
      Telugu:
        'టెలిమార్కెటర్ హిందీలో లైఫ్‌టైమ్-ఫ్రీ క్రెడిట్ కార్డ్ ఆఫర్ ఇచ్చారు. వాణి దీనిని స్పామ్‌గా (96%) గుర్తించి, మర్యాదగా తిరస్కరించి మీ ఫోన్ రింగ్ అవ్వకుండానే కాల్ ముగించింది.',
      sentiment: 'Pushy/Spam',
      spamVerdict: 'Suspected Spam',
      timeSavedSeconds: 120,
    },
    transcript: [
      {
        id: 't-103-1',
        speaker: 'caller',
        speakerLabel: '140-8841 Caller',
        text: 'सर आपके पैन कार्ड पर लाइफटाइम फ्री प्लैटिनम क्रेडिट कार्ड अप्रूव हुआ है, पांच लाख लिमिट के साथ—',
        language: 'Hindi',
        translations: {
          English:
            'Sir, a lifetime-free Platinum credit card has been approved on your PAN card with a 5 lakh limit—',
          Hindi:
            'सर आपके पैन कार्ड पर लाइफटाइम फ्री प्लैटिनम क्रेडिट कार्ड अप्रूव हुआ है, पांच लाख लिमिट के साथ—',
          Telugu:
            'సార్ మీ పాన్ కార్డ్‌పై 5 లక్షల లిమిట్‌తో లైఫ్‌టైమ్ ఫ్రీ ప్లాటినం క్రెడిట్ కార్డ్ అప్రూవ్ అయింది—',
        },
        timestamp: '17:05:06',
      },
      {
        id: 't-103-2',
        speaker: 'assistant',
        speakerLabel: 'Vaani AI',
        text: 'क्षमा करें, अनिल जी को किसी क्रेडिट कार्ड या लोन ऑफर की आवश्यकता नहीं है। कृपया इस नंबर को अपनी कॉल सूची से हटा दें। धन्यवाद।',
        language: 'Hindi',
        translations: {
          English:
            'Sorry, Anil does not require any credit card or loan offers. Please remove this number from your calling list. Thank you.',
          Hindi:
            'क्षमा करें, अनिल जी को किसी क्रेडिट कार्ड या लोन ऑफर की आवश्यकता नहीं है। कृपया इस नंबर को अपनी कॉल सूची से हटा दें। धन्यवाद।',
          Telugu:
            'క్షమించండి, అనిల్ గారికి ఎలాంటి క్రెడిట్ కార్డ్ లేదా లోన్ ఆఫర్లు అవసరం లేదు. దయచేసి ఈ నంబర్‌ను మీ కాల్ జాబితా నుండి తొలగించండి.',
        },
        timestamp: '17:05:14',
      },
    ],
  },
];
