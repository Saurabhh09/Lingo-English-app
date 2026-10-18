/**
 * Lingo. Phase 11 Practice Catalog
 * Listening Comprehension, Speaking Practice, Pronunciation Feedback, and AI Conversation Scenarios.
 * Isolated solution keys for server-side evaluation.
 */

export const LISTENING_MODULES = [
  {
    id: 'list_pre_a1_01',
    level: 'Pre-A1',
    title: 'Introducing Anna',
    subtitle: 'Greetings & Personal Details',
    audioUrl: '/audio/pre-a1-listening-01.wav',
    passage: 'Hello! My name is Anna. I am a student. I like apples and books. Nice to meet you!',
    durationSec: 10,
    xp: 25,
    questions: [
      {
        prompt: 'What is the speaker’s name?',
        options: ['Anna', 'Emma', 'Sarah', 'Lucy'],
        explanation: 'She clearly introduces herself: “My name is Anna.”'
      },
      {
        prompt: 'What is Anna’s role or occupation?',
        options: ['A doctor', 'A student', 'A teacher', 'A chef'],
        explanation: 'She says: “I am a student.”'
      },
      {
        prompt: 'What does Anna like?',
        options: ['Apples and books', 'Cars and bikes', 'Tea and coffee', 'Cats and dogs'],
        explanation: 'She mentions: “I like apples and books.”'
      }
    ],
    solutions: [0, 1, 0]
  },
  {
    id: 'list_pre_a1_02',
    level: 'Pre-A1',
    title: 'Classroom Instructions',
    subtitle: 'Following Spoken Commands',
    audioUrl: '/audio/pre-a1-listening-02.wav',
    passage: 'Good morning. Please open your books to page ten. Listen to the teacher and write your name.',
    durationSec: 9,
    xp: 25,
    questions: [
      {
        prompt: 'Which page should students open?',
        options: ['Page two', 'Page ten', 'Page twelve', 'Page twenty'],
        explanation: 'The teacher announces: “Please open your books to page ten.”'
      },
      {
        prompt: 'What should the students write?',
        options: ['Their name', 'The date', 'A story', 'The numbers'],
        explanation: 'The instruction is: “write your name.”'
      }
    ],
    solutions: [1, 0]
  },
  {
    id: 'list_a1_01',
    level: 'A1',
    title: 'At the Green Café',
    subtitle: 'Menu & Breakfast Hours',
    audioUrl: '/audio/a1-listening-01.wav',
    passage: 'Welcome to the Green Café! We have fresh coffee, tea, and warm croissants. Breakfast is served until eleven in the morning.',
    durationSec: 11,
    xp: 30,
    questions: [
      {
        prompt: 'Which baked item is offered at the café?',
        options: ['Warm bagels', 'Warm croissants', 'Fruit pancakes', 'Fresh donuts'],
        explanation: 'The server announces: “We have fresh coffee, tea, and warm croissants.”'
      },
      {
        prompt: 'Until what time is breakfast served?',
        options: ['9:30 AM', '10:00 AM', '11:00 AM', '12:00 PM'],
        explanation: 'The announcement states breakfast is served until eleven in the morning.'
      }
    ],
    solutions: [1, 2]
  },
  {
    id: 'list_a1_02',
    level: 'A1',
    title: 'Finding the Train Station',
    subtitle: 'Street Directions',
    audioUrl: '/audio/a1-listening-02.wav',
    passage: 'Excuse me, where is the train station? Walk straight for two blocks, then turn left at the library. It is next to the post office.',
    durationSec: 12,
    xp: 30,
    questions: [
      {
        prompt: 'Where should the person turn left?',
        options: ['At the bank', 'At the library', 'At the traffic light', 'At the park'],
        explanation: 'The guide says: “turn left at the library.”'
      },
      {
        prompt: 'What building is next to the train station?',
        options: ['The supermarket', 'The hotel', 'The post office', 'The city hall'],
        explanation: 'The speaker explains: “It is next to the post office.”'
      }
    ],
    solutions: [1, 2]
  },
  {
    id: 'list_a2_01',
    level: 'A2',
    title: 'Weekend at the Museum',
    subtitle: 'Past Events & Travel Experience',
    audioUrl: '/audio/a2-listening-01.wav',
    passage: 'Last weekend, I visited the city museum with my brother. We took the subway and arrived at ten o’clock. The history exhibition was fascinating, but the museum café was quite crowded.',
    durationSec: 15,
    xp: 35,
    questions: [
      {
        prompt: 'How did they travel to the museum?',
        options: ['By bus', 'By subway', 'By bicycle', 'By taxi'],
        explanation: 'The speaker states: “We took the subway and arrived at ten o’clock.”'
      },
      {
        prompt: 'What was crowded at the museum?',
        options: ['The entrance line', 'The history hall', 'The museum café', 'The gift shop'],
        explanation: 'The speaker notes: “the museum café was quite crowded.”'
      }
    ],
    solutions: [1, 2]
  },
  {
    id: 'list_b1_01',
    level: 'B1',
    title: 'Dental Clinic Voicemail',
    subtitle: 'Office Hours & Urgent Protocol',
    audioUrl: '/audio/b1-listening-01.wav',
    passage: 'Thank you for calling City Dental Clinic. Our office is open Monday through Friday from eight thirty AM to five PM. If you are experiencing a medical emergency, please hang up and call nine one one.',
    durationSec: 15,
    xp: 40,
    questions: [
      {
        prompt: 'What are the clinic’s regular operating days?',
        options: ['Tuesday to Saturday', 'Monday through Friday', 'Seven days a week', 'Weekends only'],
        explanation: 'The recorded message states: “open Monday through Friday.”'
      },
      {
        prompt: 'What instruction is given for medical emergencies?',
        options: ['Leave an urgent message', 'Wait for the next agent', 'Call 911', 'Send an email'],
        explanation: 'The message instructs callers to “hang up and call 911.”'
      }
    ],
    solutions: [1, 2]
  },
  {
    id: 'list_b2_01',
    level: 'B2',
    title: 'Urban Ecology Seminar',
    subtitle: 'Infrastructure & Long-term Efficiency',
    audioUrl: '/audio/b2-listening-01.wav',
    passage: 'In today’s seminar, we will examine the environmental impact of renewable urban infrastructure. While initial capital expenditure remains high, long-term operational efficiency consistently offsets municipal costs.',
    durationSec: 16,
    xp: 45,
    questions: [
      {
        prompt: 'What factor offsets municipal costs in the long run?',
        options: ['Government subsidies', 'Operational efficiency', 'Higher resident taxes', 'Voluntary grants'],
        explanation: 'The speaker emphasizes: “long-term operational efficiency consistently offsets municipal costs.”'
      },
      {
        prompt: 'What characteristic of the project is initially elevated?',
        options: ['Capital expenditure', 'Public protest', 'Regulatory complexity', 'Maintenance fees'],
        explanation: 'The speaker notes: “While initial capital expenditure remains high...”'
      }
    ],
    solutions: [1, 0]
  },
  {
    id: 'list_c1_01',
    level: 'C1',
    title: 'The Automation Paradox',
    subtitle: 'Cognitive Burden & Oversight',
    audioUrl: '/audio/c1-listening-01.wav',
    passage: 'The paradox of modern automation lies in the subtle shifting of cognitive burden. Rather than rendering human oversight redundant, complex algorithms inadvertently elevate the necessity of critical judgment.',
    durationSec: 14,
    xp: 50,
    questions: [
      {
        prompt: 'What is the unintended effect of complex algorithms according to the passage?',
        options: ['Eliminating human supervisors', 'Elevating the necessity of critical judgment', 'Slowing operational cycles', 'Decreasing procedural variance'],
        explanation: 'The speaker argues algorithms “inadvertently elevate the necessity of critical judgment.”'
      }
    ],
    solutions: [1]
  },
  {
    id: 'list_c2_01',
    level: 'C2',
    title: 'Linguistic Nuance & Pragmatics',
    subtitle: 'Computational Ambiguity in Lexicon',
    audioUrl: '/audio/c2-listening-01.wav',
    passage: 'Linguistic nuance frequently eludes rigid computational taxonomy. Semantic ambiguity and socio-pragmatic undertones often convey precisely what explicit lexical choices leave unsaid.',
    durationSec: 14,
    xp: 50,
    questions: [
      {
        prompt: 'What communicative layer conveys what explicit words leave unsaid?',
        options: ['Syntactic phrase markers', 'Phonological prosody alone', 'Socio-pragmatic undertones', 'Grammatical case inflection'],
        explanation: 'The passage explicitly states: “Semantic ambiguity and socio-pragmatic undertones often convey precisely what explicit lexical choices leave unsaid.”'
      }
    ],
    solutions: [2]
  }
];

export const SPEAKING_PROMPTS = [
  {
    id: 'spk_intro_01',
    level: 'Pre-A1 / A1',
    title: 'Friendly Self-Introduction',
    objective: 'State your name, where you live or come from, and a hobby you enjoy.',
    minWords: 5,
    suggestedKeywords: ['name', 'from', 'like', 'hello', 'am', 'live'],
    exampleResponse: 'Hello, my name is Alex. I am from Chicago and I like learning English.',
    xp: 30
  },
  {
    id: 'spk_daily_01',
    level: 'A2',
    title: 'Morning Routine',
    objective: 'Describe two or three actions you do every morning to prepare for your day.',
    minWords: 8,
    suggestedKeywords: ['wake', 'morning', 'coffee', 'breakfast', 'brush', 'shower', 'work', 'study'],
    exampleResponse: 'I wake up at seven o’clock, make a hot cup of tea, and read the news before work.',
    xp: 35
  },
  {
    id: 'spk_opinion_01',
    level: 'B1 / B2',
    title: 'Workplace Preferences',
    objective: 'Explain whether you prefer remote work or working in an office, giving at least two clear reasons.',
    minWords: 12,
    suggestedKeywords: ['prefer', 'because', 'remote', 'office', 'focus', 'commute', 'collaborate'],
    exampleResponse: 'I prefer working remotely because it saves commuting time and helps me concentrate on complex tasks.',
    xp: 40
  },
  {
    id: 'spk_complex_01',
    level: 'C1 / C2',
    title: 'Technological Impact on Language',
    objective: 'Discuss how digital communication tools are influencing everyday English vocabulary and tone.',
    minWords: 15,
    suggestedKeywords: ['technology', 'communication', 'influence', 'vocabulary', 'informal', 'impact', 'perspective'],
    exampleResponse: 'Digital platforms have significantly accelerated lexical borrowing and favored brevity, occasionally blurring the distinction between formal and informal discourse.',
    xp: 50
  }
];

export const PRONUNCIATION_ITEMS = [
  {
    id: 'pron_hello',
    level: 'Pre-A1',
    targetPhrase: 'Hello, nice to meet you.',
    phonetic: '/həˈloʊ naɪs tuː miːt juː/',
    referenceAudioUrl: '/audio/pron-hello.wav',
    focusSounds: 'Short vowel /ɪ/, diphthong /oʊ/',
    xp: 20
  },
  {
    id: 'pron_weather',
    level: 'A1',
    targetPhrase: 'The weather is lovely and warm today.',
    phonetic: '/ðə ˈwɛðər ɪz ˈlʌvli ænd wɔːrm təˈdeɪ/',
    referenceAudioUrl: '/audio/pron-weather.wav',
    focusSounds: 'Voiced dental fricative /ð/, vowel /ʌ/',
    xp: 25
  },
  {
    id: 'pron_coffee',
    level: 'A2',
    targetPhrase: 'Could I please have a cup of black coffee?',
    phonetic: '/kʊd aɪ pliːz hæv ə kʌp ʌv blæk ˈkɔːfi/',
    referenceAudioUrl: '/audio/pron-coffee.wav',
    focusSounds: 'Polite intonation, vowel /ʊ/, /æ/',
    xp: 25
  },
  {
    id: 'pron_directions',
    level: 'B1',
    targetPhrase: 'Excuse me, where is the nearest subway station?',
    phonetic: '/ɪkˈskjuːz miː wɛər ɪz ðə ˈnɪrɪst ˈsʌbweɪ ˈsteɪʃən/ ',
    referenceAudioUrl: '/audio/pron-directions.wav',
    focusSounds: 'Linking /z miː/, cluster /st/',
    xp: 30
  },
  {
    id: 'pron_interview',
    level: 'B2',
    targetPhrase: 'I have five years of experience in project management.',
    phonetic: '/aɪ hæv faɪv jɪərz ʌv ɪkˈspɪəriəns ɪn ˈprɒdʒɛkt ˈmænɪdʒmənt/',
    referenceAudioUrl: '/audio/pron-interview.wav',
    focusSounds: 'Stress on /ɪkˈspɪəriəns/ and /ˈmænɪdʒmənt/',
    xp: 35
  },
  {
    id: 'pron_nuance',
    level: 'C1 / C2',
    targetPhrase: 'Subtle linguistic nuance enriches human communication.',
    phonetic: '/ˈsʌtl lɪŋˈɡwɪstɪk ˈnjuːɑːns ɪnˈrɪtʃɪz ˈhjuːmən kəˌmjuːnɪˈkeɪʃən/',
    referenceAudioUrl: '/audio/pron-nuance.wav',
    focusSounds: 'Silent “b” in subtle /ˈsʌtl/, velar nasal /ŋ/',
    xp: 40
  }
];

export const CONVERSATION_SCENARIOS = [
  {
    id: 'conv_greet_01',
    level: 'Pre-A1 / A1',
    title: 'A Warm Welcome',
    role: 'Friendly Neighbor',
    aiPersona: 'You are Jamie, a friendly and cheerful neighbor in an apartment building. You speak in simple, warm, everyday English, keeping sentences short (1–2 sentences). Encourage the learner and ask friendly questions.',
    scenario: 'You just moved in next door and meet your neighbor in the lobby.',
    starterPrompt: 'Hi there! I don’t think we’ve met yet. Are you new to the building?',
    suggestedReplies: [
      'Yes, I just moved in yesterday! Nice to meet you.',
      'Hello! My name is Sam. Nice to meet you.',
      'Hi! Yes, I live on the third floor.'
    ]
  },
  {
    id: 'conv_cafe_01',
    level: 'A2',
    title: 'Ordering at a Cozy Café',
    role: 'Café Barista',
    aiPersona: 'You are Charlie, a barista at a popular neighborhood café. You speak natural, polite conversational English. Ask what they would like, offer pastry choices, and confirm their order kindly.',
    scenario: 'You walk up to the café counter to order a drink and something to eat.',
    starterPrompt: 'Good morning! Welcome to the Corner Café. What can I get started for you today?',
    suggestedReplies: [
      'Could I please get a medium latte with oat milk?',
      'Hello! Do you have any fresh croissants today?',
      'I would like an iced Americano and a blueberry muffin, please.'
    ]
  },
  {
    id: 'conv_hotel_01',
    level: 'B1',
    title: 'Hotel Check-in & Inquiries',
    role: 'Front Desk Receptionist',
    aiPersona: 'You are Morgan, the front desk receptionist at City Grand Hotel. You are courteous, helpful, and professional. Confirm reservation details, answer questions about breakfast hours and WiFi, and assist with luggage.',
    scenario: 'You have just arrived at your hotel in London after a long flight.',
    starterPrompt: 'Good afternoon! Welcome to the City Grand Hotel. Are you checking in with us today?',
    suggestedReplies: [
      'Yes, I have a reservation under the name Taylor.',
      'Hello! Yes, checking in for three nights. Is breakfast included?',
      'Good afternoon! I have a booking. Could you also tell me what time checkout is?'
    ]
  },
  {
    id: 'conv_interview_01',
    level: 'B2',
    title: 'Job Interview Simulation',
    role: 'Senior Hiring Manager',
    aiPersona: 'You are Elena, a senior engineering and product manager conducting an introductory job interview. You ask insightful behavioral questions, listen attentively, acknowledge good points, and ask constructive follow-ups in a supportive, professional tone.',
    scenario: 'You are interviewing for an English-speaking international team.',
    starterPrompt: 'Welcome! It’s a pleasure to speak with you today. To begin, could you tell me a little about your background and what motivated you to apply for this role?',
    suggestedReplies: [
      'Thank you for having me. Over the past three years, I’ve worked on web applications and really enjoy collaborative problem solving.',
      'Pleasure to meet you. I have experience managing projects and I am excited to contribute to an international team.',
      'Thank you! I am passionate about language learning and building scalable software that helps people learn.'
    ]
  },
  {
    id: 'conv_debate_01',
    level: 'C1 / C2',
    title: 'Tech & Workplace Discourse',
    role: 'Director of Technology Strategy',
    aiPersona: 'You are Dr. Marcus Vance, a technology strategist. You engage in sophisticated, intellectually rigorous discourse on AI ethics, remote work dynamics, and societal transformation. Use nuanced vocabulary and challenge premises diplomatically.',
    scenario: 'You are participating in a roundtable discussion on the future of autonomous systems and human labor.',
    starterPrompt: 'A central paradox we observe with advanced automation is that as systems grow more reliable, the consequence of human disengagement becomes disproportionately severe. What is your perspective on balancing automation with cognitive readiness?',
    suggestedReplies: [
      'I believe automation shouldn’t replace critical oversight; rather, interfaces must be designed to keep operators meaningfully in the loop.',
      'The key challenge is preventing skill degradation when routine processes are completely delegated to algorithms.',
      'From my perspective, institutional governance and regular simulation drills are vital to maintaining cognitive readiness.'
    ]
  }
];

/**
 * Returns public view of practice catalog (strictly without solution keys).
 */
export function getPublicPracticeCatalog() {
  return {
    listening: LISTENING_MODULES.map(m => ({
      id: m.id,
      level: m.level,
      title: m.title,
      subtitle: m.subtitle,
      audioUrl: m.audioUrl,
      passage: m.passage,
      durationSec: m.durationSec,
      xp: m.xp,
      questions: m.questions.map(q => ({
        prompt: q.prompt,
        options: q.options,
        explanation: q.explanation
        // Solutions omitted
      }))
    })),
    speaking: SPEAKING_PROMPTS.map(s => ({
      id: s.id,
      level: s.level,
      title: s.title,
      objective: s.objective,
      minWords: s.minWords,
      suggestedKeywords: s.suggestedKeywords,
      exampleResponse: s.exampleResponse,
      xp: s.xp
    })),
    pronunciation: PRONUNCIATION_ITEMS.map(p => ({
      id: p.id,
      level: p.level,
      targetPhrase: p.targetPhrase,
      phonetic: p.phonetic,
      referenceAudioUrl: p.referenceAudioUrl,
      focusSounds: p.focusSounds,
      xp: p.xp
    })),
    scenarios: CONVERSATION_SCENARIOS.map(c => ({
      id: c.id,
      level: c.level,
      title: c.title,
      role: c.role,
      scenario: c.scenario,
      starterPrompt: c.starterPrompt,
      suggestedReplies: c.suggestedReplies
    }))
  };
}

export function getListeningSolutionKeys(moduleId) {
  const mod = LISTENING_MODULES.find(m => m.id === moduleId);
  if (!mod) return null;
  return mod.solutions;
}

export const PRACTICE_CATALOG = {
  listening: LISTENING_MODULES,
  speaking: SPEAKING_PROMPTS,
  pronunciation: PRONUNCIATION_ITEMS,
  conversation: CONVERSATION_SCENARIOS
};
