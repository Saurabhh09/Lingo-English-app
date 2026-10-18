import fs from 'node:fs';
import { B1_OBJECTIVES } from './build_b1_objectives.mjs';

export const B1_SECTIONS = [
  {
    id: 'b1-s1',
    sectionNumber: '01',
    title: 'Life Narratives, Memories & Personal Transitions',
    tagline: 'Connect your past experiences, turning points, and future aspirations',
    description: 'Master nuanced past narratives, express changed habits with "used to" and "would", sequence events with the past perfect, and articulate personal ambitions.',
    units: [
      {
        id: 'b1-u1',
        unitNumber: '01',
        title: 'Memories, Milestones & Life Transitions',
        eyebrow: 'INTERMEDIATE · THRESHOLD NARRATIVES',
        objective: 'Relate personal experiences, contrast past habits with present reality, and explain the motivation behind major life decisions.',
        lessons: [
          {
            id: 'b1-u1-l1',
            title: 'Memories & Habits: Used to & Would',
            subtitle: 'Contrasting past routines with present life',
            lessonType: 'standard',
            pedagogicalFocus: 'Grammar & Spoken Narrative',
            icon: '🕰️',
            accentColor: 'lime',
            xp: 75,
            estimatedDurationMin: 5,
            description: 'Learn how to describe discontinued routines, childhood memories, and past states using "used to" and "would".',
            prerequisites: ['a2-u5-l4'],
            objectives: ['obj_b1_used_to'],
            vocabulary: [
              { term: 'upbringing', definition: 'The care and training of a child throughout their youth', example: 'Her countryside upbringing gave her a love for nature.' },
              { term: 'reminisce', definition: 'To indulge in enjoyable recollection of past events', example: 'We often sit together and reminisce about our school years.' },
              { term: 'milestone', definition: 'An important stage or event in the development or life of someone', example: 'Graduating from university was a crucial milestone for him.' },
              { term: 'nostalgia', definition: 'A sentimental longing or wistful affection for the past', example: 'Looking at old family photos filled her with nostalgia.' }
            ],
            grammar: {
              pattern: 'Subject + used to / would + base verb (state verbs with used to only)',
              rule: 'Use "used to" for past habits and past states that are no longer true. Use "would" only for recurring past actions, never for past states (e.g., say "I used to have long hair", not "I would have long hair").',
              example: 'We used to live near the coast, and my father would take us fishing every Saturday morning.'
            },
            explanation: 'When narrating your background, English distinguishes between actions repeated in the past and former states. "Used to" works for both actions and states (like beliefs, feelings, or residence), whereas "would" expresses fond or habitual past activities.',
            workedExamples: [
              {
                prompt: 'Combine: "I lived in Rome as a child. I no longer live there."',
                solution: 'I used to live in Rome as a child.',
                reason: '"Living" is a state of residence, so "used to" is correct, while "would live" is ungrammatical.'
              },
              {
                prompt: 'Describe a summer childhood habit of visiting your grandparents on Sundays.',
                solution: 'Every summer, we would visit our grandparents on Sundays.',
                reason: '"Would" naturally describes repeated past routines that evoke nostalgic memories.'
              }
            ],
            guidedPractice: 'Contrast two childhood habits with what you currently do today.',
            independentPractice: 'Write a short four-sentence paragraph describing where you used to live and what you would do during school holidays.',
            review: 'Key takeaway: Use "used to" for past habits and states. Use "would" strictly for recurring past actions.',
            exercises: [
              {
                id: 'ex_b1_u1_l1_1',
                exerciseType: 'multiple_choice',
                prompt: 'Which sentence correctly expresses a past state that is no longer true?',
                options: [
                  'She used to have a fear of heights, but now she climbs mountains.',
                  'She would have a fear of heights, but now she climbs mountains.',
                  'She is used to have a fear of heights in her past.',
                  'She used to having a fear of heights when younger.'
                ],
                explanation: '“Used to” is required for past states (such as emotions, beliefs, or ownership). “Would” cannot be used with state verbs like “have”.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l1_2',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "When we were kids, my grandfather ___ tell us captivating stories before bedtime."',
                options: [
                  'would',
                  'was used to',
                  'got used to',
                  'would to'
                ],
                explanation: '“Would” expresses repeated past actions and habits in a nostalgic narrative.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l1_3',
                exerciseType: 'multiple_choice',
                prompt: 'Choose the correct negative form:',
                options: [
                  'I didn’t use to enjoy classical music, but now I adore it.',
                  'I didn’t used to enjoy classical music, but now I adore it.',
                  'I wouldn’t to enjoy classical music in the past.',
                  'I wasn’t used enjoy classical music years ago.'
                ],
                explanation: 'After the auxiliary “didn’t”, the base form “use to” is the standard grammatical form.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l1_4',
                exerciseType: 'multiple_choice',
                prompt: 'What is the error in: "My family would own a cottage by the lake"?',
                options: [
                  '“Own” is a state verb, so “used to own” must be used instead of “would own”.',
                  '“Would” must always be followed by the past participle “owned”.',
                  '“Cottage” is an uncountable noun and cannot take “a”.',
                  '“By the lake” cannot be used with the past tense.'
                ],
                explanation: '“Own” expresses a state of possession, not an action. State verbs cannot be used with “would” to express past habits.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l1_5',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "Marcus ___ live in Berlin, but he relocated to Munich last year."',
                options: [
                  'used to',
                  'would',
                  'is used to',
                  'was using to'
                ],
                explanation: '“Used to” is correct because living in a city is a state/residence, which cannot be expressed with “would”.',
                solutionKey: { correctIndex: 0 }
              }
            ]
          },
          {
            id: 'b1-u1-l2',
            title: 'Sequencing Past Events: Past Perfect & Past Simple',
            subtitle: 'Clear chronological order in storytelling',
            lessonType: 'standard',
            pedagogicalFocus: 'Grammar & Discourse Sequencing',
            icon: '⏳',
            accentColor: 'blue',
            xp: 75,
            estimatedDurationMin: 5,
            description: 'Master the past perfect ("had done") to make the timeline of past stories clear and avoid chronological confusion.',
            prerequisites: ['b1-u1-l1'],
            objectives: ['obj_b1_past_perfect'],
            vocabulary: [
              { term: 'beforehand', definition: 'Before an action or event takes place; in advance', example: 'Luckily, we had prepared our documents beforehand.' },
              { term: 'abruptly', definition: 'Suddenly and unexpectedly', example: 'The meeting ended abruptly when the fire alarm sounded.' },
              { term: 'sequence', definition: 'A particular order in which related events follow each other', example: 'The detective pieced together the exact sequence of events.' },
              { term: 'prior to', definition: 'Before a specific time or event', example: 'Prior to arriving in London, she had never traveled abroad alone.' }
            ],
            grammar: {
              pattern: 'Past Perfect (had + past participle) for the earlier event + Past Simple for the later event',
              rule: 'When narrating two events that both occurred in the past, use the past perfect to clarify which event happened first.',
              example: 'By the time the train pulled into the station, the rain had already stopped.'
            },
            explanation: 'In narrative English, we often recount events out of strict chronological order. The past perfect acts as a "past before the past", ensuring listeners understand background causes and preceding conditions.',
            workedExamples: [
              {
                prompt: 'Event 1: Sarah finished her degree. Event 2: She applied for international jobs.',
                solution: 'After Sarah had finished her degree, she applied for international jobs.',
                reason: 'Finishing the degree happened earlier in the past, requiring "had finished".'
              },
              {
                prompt: 'Explain why you were not hungry when dinner was served at 8 PM.',
                solution: 'I was not hungry because I had eaten a substantial lunch earlier.',
                reason: '"Had eaten" explains the prior circumstance that affected the later past state.'
              }
            ],
            guidedPractice: 'Connect two past events using "by the time" and the past perfect.',
            independentPractice: 'Write a short story about an unexpected arrival where someone had already left.',
            review: 'Key takeaway: Past Perfect = had + past participle. It identifies the earlier of two past moments.',
            exercises: [
              {
                id: 'ex_b1_u1_l2_1',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "When Elena arrived at the cinema, the movie ___."',
                options: [
                  'had already started',
                  'already started',
                  'has already started',
                  'was already start'
                ],
                explanation: 'The movie started before Elena arrived; therefore, the earlier past action requires the past perfect “had already started”.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l2_2',
                exerciseType: 'multiple_choice',
                prompt: 'Choose the sentence that clearly indicates which event happened first:',
                options: [
                  'By the time the firefighters arrived, the neighbors had put out the flames.',
                  'The firefighters arrived and the neighbors put out the flames.',
                  'When the firefighters had arrived, the neighbors put out the flames.',
                  'The neighbors put out the flames after the firefighters had arrived.'
                ],
                explanation: '“Had put out” clarifies that the neighbors extinguished the fire before the firefighters arrived.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l2_3',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "He couldn’t board the plane because he ___ his passport at home."',
                options: [
                  'had left',
                  'has left',
                  'was left',
                  'leaves'
                ],
                explanation: 'Leaving the passport at home occurred before the attempt to board the plane, requiring “had left”.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l2_4',
                exerciseType: 'multiple_choice',
                prompt: 'Which time conjunction is most commonly used with the past perfect to show completion before a deadline?',
                options: [
                  'by the time',
                  'while',
                  'as long as',
                  'whereas'
                ],
                explanation: '“By the time” introduces a point in the past before which another action had already completed.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l2_5',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "She was exhausted because she ___ without a break for twelve hours."',
                options: [
                  'had been driving',
                  'has driven',
                  'is driving',
                  'drives'
                ],
                explanation: 'The past perfect continuous “had been driving” emphasizes the ongoing prior action leading up to the past exhaustion.',
                solutionKey: { correctIndex: 0 }
              }
            ]
          },
          {
            id: 'b1-u1-l3',
            title: 'Life Turning Points & Key Choices',
            subtitle: 'Sharing significant decisions and their results',
            lessonType: 'standard',
            pedagogicalFocus: 'Speaking & Personal Reflection',
            icon: '🛤️',
            accentColor: 'purple',
            xp: 75,
            estimatedDurationMin: 5,
            description: 'Discuss major life decisions, turning points, career moves, and their ongoing consequences.',
            prerequisites: ['b1-u1-l2'],
            objectives: ['obj_b1_life_decisions'],
            vocabulary: [
              { term: 'turning point', definition: 'A time at which a decisive change in a situation occurs', example: 'Taking that apprenticeship was a major turning point in his life.' },
              { term: 'leap of faith', definition: 'An act of believing or doing something without prior proof of its success', example: 'Moving abroad alone was a true leap of faith.' },
              { term: 'pursue', definition: 'To follow or continue with a course of action with a view to its completion', example: 'She decided to pursue a master’s degree in environmental science.' },
              { term: 'regret', definition: 'A feeling of sadness or disappointment over an occurrence or omission', example: 'He made the bold choice and never had any regrets.' }
            ],
            grammar: {
              pattern: 'Present Perfect Continuous (have/has been + verb-ing) vs. Present Perfect Simple (have/has + past participle)',
              rule: 'Use the present perfect continuous to emphasize the duration of an ongoing life path or endeavor. Use the present perfect simple when focusing on the completed achievement.',
              example: 'I have been studying architecture for three years, and I have completed twelve major design projects.'
            },
            explanation: 'When discussing your life journey, balance achievements with the continuous effort behind them. Contrast actions that started in the past and continue today with finished milestones.',
            workedExamples: [
              {
                prompt: 'Describe your current career transition that started six months ago.',
                solution: 'I have been retraining as a web developer since last autumn.',
                reason: 'The continuous form stresses the duration of the ongoing learning process.'
              },
              {
                prompt: 'State the total number of countries you have visited during your travels.',
                solution: 'I have visited fourteen countries so far.',
                reason: 'The simple form focuses on the cumulative completed quantity, not the ongoing process.'
              }
            ],
            guidedPractice: 'Describe a turning point in your education or career using "decided to" and "have been".',
            independentPractice: 'Write three sentences about an important choice you made and how long you have been living with the outcome.',
            review: 'Key takeaway: Continuous forms emphasize ongoing dedication; simple forms highlight concrete results and milestones.',
            exercises: [
              {
                id: 'ex_b1_u1_l3_1',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "Changing my career was scary, but it turned out to be the best ___ of my life."',
                options: [
                  'turning point',
                  'reminisce',
                  'upbringing',
                  'itinerary'
                ],
                explanation: 'A “turning point” is a decisive moment of transformation that redirects one’s life path.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l3_2',
                exerciseType: 'multiple_choice',
                prompt: 'Which sentence emphasizes the ongoing effort of learning a new language?',
                options: [
                  'I have been learning German for eight months now.',
                  'I learned German eight months ago.',
                  'I was learning German yesterday at two.',
                  'I had learned German before visiting Berlin.'
                ],
                explanation: 'The present perfect continuous “have been learning” emphasizes the duration of an ongoing endeavor extending into the present.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l3_3',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "Since moving to Montreal, she ___ in a bilingual marketing agency."',
                options: [
                  'has been working',
                  'works already',
                  'had worked since',
                  'is working since'
                ],
                explanation: 'Actions starting in the past with “since” and continuing into the present require the present perfect continuous.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l3_4',
                exerciseType: 'multiple_choice',
                prompt: '“Taking a leap of faith” means…',
                options: [
                  'Taking a bold risk despite uncertainty',
                  'Jumping from a high physical structure',
                  'Refusing to make any major changes',
                  'Following a guaranteed safe path'
                ],
                explanation: 'A “leap of faith” is an idiom for taking a courageous, uncertain step trusting that things will turn out well.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l3_5',
                exerciseType: 'multiple_choice',
                prompt: 'Choose the correct sentence:',
                options: [
                  'How long have you been considering this career change?',
                  'How long are you considering this career change?',
                  'How long did you considering this career change?',
                  'How long have you consider this career change?'
                ],
                explanation: 'Questions about duration of an ongoing state or action use “How long have you been + -ing?”.',
                solutionKey: { correctIndex: 0 }
              }
            ]
          },
          {
            id: 'b1-u1-l4',
            title: 'Expressing Feelings, Hopes & Long-Term Ambitions',
            subtitle: 'Articulating aspirations and justifying dreams',
            lessonType: 'standard',
            pedagogicalFocus: 'Speaking & Writing Fluency',
            icon: '🎯',
            accentColor: 'yellow',
            xp: 80,
            estimatedDurationMin: 5,
            description: 'Learn verb patterns with gerunds and infinitives to discuss future ambitions, career goals, and personal hopes.',
            prerequisites: ['b1-u1-l3'],
            objectives: ['obj_b1_ambitions_hopes'],
            vocabulary: [
              { term: 'aspiration', definition: 'A hope or ambition of achieving something worthwhile', example: 'His primary aspiration is to manage international conservation projects.' },
              { term: 'fulfill', definition: 'To achieve or realize something desired, promised, or predicted', example: 'She worked tirelessly to fulfill her lifelong dream.' },
              { term: 'look forward to', definition: 'To anticipate something pleasant with eagerness and excitement', example: 'I look forward to starting my new research fellowship.' },
              { term: 'long-term', definition: 'Occurring over or relating to a long period of time', example: 'Our long-term strategy focuses on renewable energy investments.' }
            ],
            grammar: {
              pattern: 'Verb + infinitive (aim to, hope to, plan to) vs. Verb + preposition + gerund (dream of -ing, look forward to -ing)',
              rule: 'Certain aspiration verbs take the full infinitive with "to" (e.g. "I plan to relocate"), while prepositions always govern a gerund (e.g. "She dreams of opening a bookstore"). Note that "look forward to" takes an -ing verb because "to" is a preposition here.',
              example: 'I aim to complete my certification this winter, and I look forward to leading cross-functional teams.'
            },
            explanation: 'Expressing ambition at the B1 level requires grammatical precision with verb complements. Notice the difference between verbs followed by "to + base verb" and expressions where "to" is a preposition requiring an "-ing" form.',
            workedExamples: [
              {
                prompt: 'Express your desire to live near the mountains using "dream of".',
                solution: 'I dream of living near the mountains in a small wooden cabin.',
                reason: '"Of" is a preposition, so it must be followed by the gerund "living".'
              },
              {
                prompt: 'State your intention to launch an independent consultancy using "aim".',
                solution: 'I aim to launch an independent consultancy within the next two years.',
                reason: '"Aim" is followed by the to-infinitive "to launch".'
              }
            ],
            guidedPractice: 'Write two ambition statements: one with "hope to" and one with "look forward to -ing".',
            independentPractice: 'Describe your five-year professional vision, mentioning three specific milestones you aim to accomplish.',
            review: 'Key takeaway: Watch out for "look forward to + -ing" — the "to" is a preposition, not an infinitive marker.',
            exercises: [
              {
                id: 'ex_b1_u1_l4_1',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "I am really looking forward to ___ my new position next Monday."',
                options: [
                  'starting',
                  'start',
                  'started',
                  'have started'
                ],
                explanation: 'In the phrasal verb “look forward to”, “to” is a preposition and must be followed by a gerund (“starting”).',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l4_2',
                exerciseType: 'multiple_choice',
                prompt: 'Which verb is followed by an infinitive with “to”?',
                options: [
                  'aim',
                  'dream of',
                  'think about',
                  'succeed in'
                ],
                explanation: '“Aim” takes a full infinitive: “I aim to achieve…”. The others include prepositions requiring a gerund.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l4_3',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "She has always dreamed of ___ her own sustainable fashion brand."',
                options: [
                  'creating',
                  'create',
                  'to create',
                  'created'
                ],
                explanation: 'The preposition “of” must be followed by the gerund “creating”.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l4_4',
                exerciseType: 'multiple_choice',
                prompt: 'Complete: "Our long-term objective is ___ global greenhouse gas emissions."',
                options: [
                  'to reduce',
                  'reducing for',
                  'reduce to',
                  'reduced'
                ],
                explanation: 'The predicate noun phrase “Our objective is…” is complemented by the infinitive “to reduce”.',
                solutionKey: { correctIndex: 0 }
              },
              {
                id: 'ex_b1_u1_l4_5',
                exerciseType: 'multiple_choice',
                prompt: 'Which sentence correctly expresses an ambition?',
                options: [
                  'I hope to gain valuable international experience in marketing.',
                  'I hope gaining valuable international experience in marketing.',
                  'I dream to gaining valuable international experience in marketing.',
                  'I look forward to gain valuable international experience in marketing.'
                ],
                explanation: '“Hope” is followed by the to-infinitive: “I hope to gain…”.',
                solutionKey: { correctIndex: 0 }
              }
            ]
          }
        ]
      }
    ]
  }
];

console.log('Section 1 built successfully.');
