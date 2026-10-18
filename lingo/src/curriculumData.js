/**
 * Lingo. Curriculum Data Architecture (Phase 1)
 *
 * Hierarchy:
 * Course -> CEFR Level -> Section -> Unit -> Lesson / Checkpoint
 *
 * Real lessons map directly to content.js IDs ('hello', 'everyday', 'sentences',
 * 'food', 'past', 'confidence') to preserve full interactive quiz functionality.
 * Upcoming stages and units provide a structured demonstration curriculum for Phase 1.
 */
import { lessons as realLessons } from '../content.js';
export { realLessons };
export const CEFR_LEVELS = [
  {
    id: 'pre-a1',
    code: 'Pre-A1',
    name: 'English Starter',
    badge: 'Starter',
    tagline: 'Your very first steps into English',
    objective: 'Build essential foundations: letters, greetings, everyday objects, and simple sentence structures.',
    accent: 'lime',
    isDemoOnly: false,
    estimatedHours: '15 hrs',
    sections: [
      {
        id: 'pre-a1-s1',
        sectionNumber: '01',
        title: 'Discover English',
        tagline: 'The little foundations that open every door',
        description: 'Meet basic greetings, understand everyday words, and construct your first real sentences.',
        units: [
          {
            id: 'pre-a1-u1',
            unitNumber: '01',
            title: 'The Little Foundations',
            eyebrow: 'BEGINNER · FIND YOUR FEET',
            objective: 'Master everyday greetings, introduce yourself, and build simple English sentences.',
            lessons: [
              {
                id: 'hello',
                realLessonId: 'hello',
                levelLabel: 'LEVEL 01',
                title: 'Hello, world!',
                subtitle: 'Greetings & introductions',
                type: 'Vocabulary & Speaking',
                icon: '👋',
                color: 'lime',
                xp: 50,
                duration: '3–5 min',
                description: 'Every great conversation starts with a hello. Learn friendly morning greetings and polite introductions.'
              },
              {
                id: 'everyday',
                realLessonId: 'everyday',
                levelLabel: 'LEVEL 02',
                title: 'Everyday words',
                subtitle: 'People, places & things',
                type: 'Vocabulary',
                icon: '🎒',
                color: 'blue',
                xp: 60,
                duration: '4–5 min',
                description: 'Discover the little words for common places, daily objects, and people around you.'
              },
              {
                id: 'sentences',
                realLessonId: 'sentences',
                levelLabel: 'LEVEL 03',
                title: 'Build a sentence',
                subtitle: 'Your first grammar superpower',
                type: 'Grammar',
                icon: '🧩',
                color: 'yellow',
                xp: 75,
                duration: '5 min',
                description: 'Put words together with "am", "is", and "are" to make clear, simple English statements.'
              },
              {
                id: 'checkpoint-pre-a1-1',
                isCheckpoint: true,
                title: 'Starter Milestone',
                subtitle: 'Review greetings, daily words & sentences',
                type: 'Milestone Assessment',
                icon: '🏆',
                color: 'lime',
                xp: 40,
                duration: '4 min',
                description: 'Verify your foundation before venturing into new letter patterns and pronunciations.'
              }
            ]
          },
          {
            id: 'pre-a1-u2',
            unitNumber: '02',
            title: 'The English Alphabet & Sounds',
            eyebrow: 'PHONICS · RECOGNITION',
            objective: 'Recognize letter shapes, master vowel sounds, and read your first three-letter words.',
            isDemo: false,
            lessons: [
              {
                id: 'pre-a1-u2-l1',
                realLessonId: 'pre-a1-u2-l1',
                title: 'Meet the Letters',
                subtitle: 'Letter names and alphabet order',
                type: 'Phonics',
                icon: '🔤',
                color: 'mint',
                xp: 40,
                duration: '3 min',
                description: 'Explore the 26 letters of the English alphabet with audio pronunciation and stroke order.'
              },
              {
                id: 'pre-a1-u2-l2',
                realLessonId: 'pre-a1-u2-l2',
                title: 'Uppercase & Lowercase',
                subtitle: 'Letter pairs and handwriting shapes',
                type: 'Reading',
                icon: '📝',
                color: 'soft-yellow',
                xp: 45,
                duration: '4 min',
                description: 'Match capital letters with small letters and learn when to capitalize names and "I".'
              },
              {
                id: 'pre-a1-u2-l3',
                realLessonId: 'pre-a1-u2-l3',
                title: 'First Word Blends',
                subtitle: 'Cat, sun, map & pen',
                type: 'Pronunciation',
                icon: '☀️',
                color: 'peach',
                xp: 50,
                duration: '4 min',
                description: 'Blend short vowel sounds to decode and pronounce simple everyday three-letter words.'
              }
            ]
          }
        ]
      },
      {
        id: 'pre-a1-s2',
        sectionNumber: '02',
        title: 'Classroom, Numbers & Objects',
        tagline: 'Count, identify, and understand everyday directions',
        description: 'Follow simple instructions, count from 1 to 20, and name the common objects around you.',
        units: [
          {
            id: 'pre-a1-u3',
            unitNumber: '03',
            title: 'Classroom Instructions, Numbers & Objects',
            eyebrow: 'DAILY ROUTINES · PRACTICE',
            objective: 'Respond to classroom directions, count quantities from 1 to 20, and name everyday items.',
            isDemo: false,
            lessons: [
              {
                id: 'pre-a1-u3-l1',
                realLessonId: 'pre-a1-u3-l1',
                title: 'Classroom & Daily Instructions',
                subtitle: 'Listen, look, read, write & open',
                type: 'Listening & Action',
                icon: '📖',
                color: 'lime',
                xp: 45,
                duration: '4 min',
                description: 'Learn the essential action words teachers and friends use to give friendly directions.'
              },
              {
                id: 'pre-a1-u3-l2',
                realLessonId: 'pre-a1-u3-l2',
                title: 'Numbers 1 to 10 & Plurals',
                subtitle: 'Count objects and regular -s endings',
                type: 'Vocabulary & Grammar',
                icon: '🔢',
                color: 'blue',
                xp: 50,
                duration: '4 min',
                description: 'Master digits 1 to 10, count items around you, and add -s to talk about more than one.'
              },
              {
                id: 'pre-a1-u3-l3',
                realLessonId: 'pre-a1-u3-l3',
                title: 'Numbers 11 to 20 & Stating Age',
                subtitle: 'Teens numbers and "I am ... years old"',
                type: 'Vocabulary & Speaking',
                icon: '🔟',
                color: 'yellow',
                xp: 50,
                duration: '4 min',
                description: 'Learn eleven through twenty and share your age confidently in English.'
              },
              {
                id: 'pre-a1-u3-l4',
                realLessonId: 'pre-a1-u3-l4',
                title: 'Everyday Objects Around Us',
                subtitle: 'Pen, notebook, desk, chair, phone & clock',
                type: 'Vocabulary',
                icon: '🎒',
                color: 'lime',
                xp: 50,
                duration: '4 min',
                description: 'Name the practical things you use and touch every single day.'
              },
              {
                id: 'checkpoint-pre-a1-2',
                isCheckpoint: true,
                title: 'Objects & Numbers Checkpoint',
                subtitle: 'Verify your counting and instruction comprehension',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'purple',
                xp: 45,
                duration: '4 min',
                description: 'Demonstrate confidence with numbers, objects, and classroom commands.'
              }
            ]
          }
        ]
      },
      {
        id: 'pre-a1-s3',
        sectionNumber: '03',
        title: 'People, Family & Personal Details',
        tagline: 'Colors, family bonds, and sharing who you are',
        description: 'Describe what things look like, introduce family members, and share where you are from.',
        units: [
          {
            id: 'pre-a1-u4',
            unitNumber: '04',
            title: 'Colors, Family & Personal Details',
            eyebrow: 'PEOPLE · CONNECTIONS',
            objective: 'Use colors and descriptions, introduce family members, and share your personal details.',
            isDemo: false,
            lessons: [
              {
                id: 'pre-a1-u4-l1',
                realLessonId: 'pre-a1-u4-l1',
                title: 'Colors & Simple Descriptions',
                subtitle: 'Red, blue, green, big, small & new',
                type: 'Vocabulary',
                icon: '🎨',
                color: 'lime',
                xp: 45,
                duration: '4 min',
                description: 'Add color and size words to bring your sentences to life.'
              },
              {
                id: 'pre-a1-u4-l2',
                realLessonId: 'pre-a1-u4-l2',
                title: 'My Family & People',
                subtitle: 'Mother, father, brother & sister',
                type: 'Vocabulary & Speaking',
                icon: '👨‍👩‍👧',
                color: 'blue',
                xp: 50,
                duration: '4 min',
                description: 'Talk about the people you love and introduce your family members.'
              },
              {
                id: 'pre-a1-u4-l3',
                realLessonId: 'pre-a1-u4-l3',
                title: 'Where Are You From?',
                subtitle: 'Countries, cities & origins',
                type: 'Conversation',
                icon: '🌍',
                color: 'yellow',
                xp: 50,
                duration: '4 min',
                description: 'Ask and answer questions about where people live and where they were born.'
              },
              {
                id: 'pre-a1-u4-l4',
                realLessonId: 'pre-a1-u4-l4',
                title: 'Personal Information & Identity',
                subtitle: 'Name, phone number, email & simple forms',
                type: 'Writing & Speaking',
                icon: '🏷️',
                color: 'lime',
                xp: 50,
                duration: '4 min',
                description: 'Share your phone number, spell your email address, and complete simple contact forms.'
              }
            ]
          }
        ]
      },
      {
        id: 'pre-a1-s4',
        sectionNumber: '04',
        title: 'Daily Life, Time & Communication',
        tagline: 'Food, simple preferences, days of the week, and milestone review',
        description: 'Order simple drinks, express what you like and dislike, talk about days and time, and demonstrate your Pre-A1 mastery.',
        units: [
          {
            id: 'pre-a1-u5',
            unitNumber: '05',
            title: 'Food, Preferences & Daily Life',
            eyebrow: 'DAILY ROUTINES · CELEBRATION',
            objective: 'Talk about common food and drinks, state simple likes, navigate days of the week, and complete Pre-A1.',
            isDemo: false,
            lessons: [
              {
                id: 'pre-a1-u5-l1',
                realLessonId: 'pre-a1-u5-l1',
                title: 'Common Food & Drinks',
                subtitle: 'Water, tea, coffee, bread, apple & rice',
                type: 'Vocabulary',
                icon: '🍵',
                color: 'lime',
                xp: 50,
                duration: '4 min',
                description: 'Learn the staple words for daily nourishment and practice requesting drinks politely.'
              },
              {
                id: 'pre-a1-u5-l2',
                realLessonId: 'pre-a1-u5-l2',
                title: 'Things I Like & Don\'t Like',
                subtitle: 'Simple preferences with like / don\'t like',
                type: 'Grammar & Speaking',
                icon: '❤️',
                color: 'blue',
                xp: 50,
                duration: '4 min',
                description: 'Express what you enjoy and what you prefer to avoid with "I like" and "I don\'t like".'
              },
              {
                id: 'pre-a1-u5-l3',
                realLessonId: 'pre-a1-u5-l3',
                title: 'Days of the Week & Basic Time',
                subtitle: 'Monday to Sunday, morning & evening',
                type: 'Vocabulary',
                icon: '📅',
                color: 'yellow',
                xp: 50,
                duration: '4 min',
                description: 'Learn the seven days of the week and simple words for parts of the day.'
              },
              {
                id: 'pre-a1-u5-l4',
                realLessonId: 'pre-a1-u5-l4',
                title: 'Pre-A1 Starter Review & Milestone',
                subtitle: 'Cumulative practice and starter milestone',
                type: 'Pragmatics & Review',
                icon: '🎓',
                color: 'lime',
                xp: 100,
                duration: '6 min',
                description: 'Celebrate your Starter journey! Bring together greetings, personal info, objects, food, and sentences.'
              },
              {
                id: 'checkpoint-pre-a1-capstone',
                isCheckpoint: true,
                title: 'Pre-A1 Starter Certificate',
                subtitle: 'Comprehensive Pre-A1 mastery evaluation',
                type: 'Level Milestone',
                icon: '🏆',
                color: 'lime',
                xp: 100,
                duration: '6 min',
                description: 'Complete the Starter stage and earn your first proficiency badge!'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'a1',
    code: 'A1',
    name: 'Beginner English',
    badge: 'Beginner',
    tagline: 'Find your voice in everyday situations',
    objective: 'Order food, describe past events, express your opinions, and navigate everyday community life.',
    accent: 'blue',
    isDemoOnly: false,
    estimatedHours: '25 hrs',
    sections: [
      {
        id: 'a1-s1',
        sectionNumber: '01',
        title: 'Personal Life, People & Daily Habits',
        tagline: 'Social introductions, personal questions, family, and daily routines',
        description: 'Build confidence introducing yourself and others, asking personal questions, describing appearances, and talking about your typical day.',
        units: [
          {
            id: 'a1-u1',
            unitNumber: '01',
            title: 'Introductions, Questions & Routines',
            eyebrow: 'BEGINNER · EXPAND YOUR WORLD',
            objective: 'Introduce friends and colleagues, ask Wh- questions, describe physical traits, and describe everyday schedules.',
            isDemo: false,
            lessons: [
              {
                id: 'a1-u1-l1',
                realLessonId: 'a1-u1-l1',
                title: 'Meeting People & Social Introductions',
                subtitle: 'Introductions, occupations & hobbies',
                type: 'Spoken Interaction',
                icon: '🤝',
                color: 'blue',
                xp: 60,
                duration: '4 min',
                description: 'Introduce friends, colleagues, and yourself in social settings while discussing hobbies and professions.'
              },
              {
                id: 'a1-u1-l2',
                realLessonId: 'a1-u1-l2',
                title: 'Asking & Answering Questions',
                subtitle: 'Who, what, where, when & why',
                type: 'Grammar',
                icon: '❓',
                color: 'lime',
                xp: 65,
                duration: '4 min',
                description: 'Master the 5 Ws to gather personal information, locations, and reasons in English.'
              },
              {
                id: 'a1-u1-l3',
                realLessonId: 'a1-u1-l3',
                title: 'Family, Friends & Appearances',
                subtitle: 'Tall, short, hair, eyes & personality',
                type: 'Vocabulary',
                icon: '👥',
                color: 'purple',
                xp: 65,
                duration: '5 min',
                description: 'Describe what people look like and talk about their positive character qualities.'
              },
              {
                id: 'a1-u1-l4',
                realLessonId: 'a1-u1-l4',
                title: 'Daily Routines & Habits',
                subtitle: 'Wake up, work, study & relax',
                type: 'Grammar',
                icon: '⏰',
                color: 'coral',
                xp: 70,
                duration: '5 min',
                description: 'Talk about your everyday morning and evening routines using the present simple tense.'
              },
              {
                id: 'checkpoint-a1-1',
                isCheckpoint: true,
                title: 'Personal Life & Routines Checkpoint',
                subtitle: 'Review introductions, Wh- questions & routines',
                type: 'Milestone Assessment',
                icon: '🏆',
                color: 'blue',
                xp: 70,
                duration: '5 min',
                description: 'Verify your confidence with personal introductions and everyday routine descriptions.'
              }
            ]
          }
        ]
      },
      {
        id: 'a1-s2',
        sectionNumber: '02',
        title: 'Places, Neighborhood & Home',
        tagline: 'Navigate the city, ask for directions, ride transit, and describe your home',
        description: 'Learn vocabulary for community buildings, find your way with directions, use public transportation, and talk about your living space.',
        units: [
          {
            id: 'a1-u2',
            unitNumber: '02',
            title: 'Around the Community & At Home',
            eyebrow: 'COMMUNITY · EXPLORING SPACES',
            objective: 'Identify local places, ask for street directions, ride buses/trains, and describe rooms and furniture.',
            isDemo: false,
            lessons: [
              {
                id: 'a1-u2-l1',
                realLessonId: 'a1-u2-l1',
                title: 'In the Neighborhood & Community',
                subtitle: 'Bank, post office, park & pharmacy',
                type: 'Vocabulary',
                icon: '🏙️',
                color: 'mint',
                xp: 65,
                duration: '4 min',
                description: 'Name essential neighborhood facilities and express what exists using "there is / there are".'
              },
              {
                id: 'a1-u2-l2',
                realLessonId: 'a1-u2-l2',
                title: 'Asking & Giving Directions',
                subtitle: 'Turn left, go straight & next to',
                type: 'Practical English',
                icon: '🗺️',
                color: 'soft-yellow',
                xp: 70,
                duration: '4 min',
                description: 'Navigate unfamiliar places by asking for directions and understanding turn instructions.'
              },
              {
                id: 'a1-u2-l3',
                realLessonId: 'a1-u2-l3',
                title: 'Public Transport & Travel',
                subtitle: 'Bus, train tickets & subway stations',
                type: 'Travel',
                icon: '🚆',
                color: 'peach',
                xp: 70,
                duration: '5 min',
                description: 'Buy transit tickets, ask about departure times, and navigate bus and train platforms.'
              },
              {
                id: 'a1-u2-l4',
                realLessonId: 'a1-u2-l4',
                title: 'Home, Rooms & Living Spaces',
                subtitle: 'Kitchen, bedroom, sofa & table',
                type: 'Vocabulary',
                icon: '🏡',
                color: 'blue',
                xp: 70,
                duration: '4 min',
                description: 'Describe the rooms in a house, common furniture, and where items are located.'
              },
              {
                id: 'checkpoint-a1-2',
                isCheckpoint: true,
                title: 'Places & Transit Checkpoint',
                subtitle: 'Review places, directions & household vocabulary',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'mint',
                xp: 75,
                duration: '5 min',
                description: 'Demonstrate your ability to find your way around town and describe living spaces.'
              }
            ]
          }
        ]
      },
      {
        id: 'a1-s3',
        sectionNumber: '03',
        title: 'Food, Dining & Shopping',
        tagline: 'Order meals, shop at the supermarket, understand prices, and discuss cooking',
        description: 'Learn how to order politely at restaurants, navigate grocery stores, ask how much items cost, and share what you enjoy eating.',
        units: [
          {
            id: 'a1-u3',
            unitNumber: '03',
            title: 'Dining Out, Groceries & Money',
            eyebrow: 'DAILY ESSENTIALS · COMMERCE',
            objective: 'Order food with "I would like", shop for supermarket goods, handle prices, and describe meal habits.',
            isDemo: false,
            lessons: [
              {
                id: 'food',
                realLessonId: 'food',
                title: 'A taste of English',
                subtitle: 'Food & ordering out',
                type: 'Practical English',
                icon: '🥑',
                color: 'lime',
                xp: 75,
                duration: '4–5 min',
                description: 'From your morning coffee to your favorite meal, learn to order politely and ask for the bill.'
              },
              {
                id: 'a1-u3-l2',
                realLessonId: 'a1-u3-l2',
                title: 'At the Supermarket & Groceries',
                subtitle: 'Vegetables, dairy, bottles & packets',
                type: 'Vocabulary',
                icon: '🛒',
                color: 'mint',
                xp: 70,
                duration: '4 min',
                description: 'Navigate grocery aisles, find fresh food, and use quantity containers like bottle, box, and bag.'
              },
              {
                id: 'a1-u3-l3',
                realLessonId: 'a1-u3-l3',
                title: 'Prices, Quantities & Paying',
                subtitle: 'How much is it, cash or card',
                type: 'Functional English',
                icon: '💳',
                color: 'yellow',
                xp: 75,
                duration: '5 min',
                description: 'Inquire about costs, understand price tags, and complete transactions with cash or card.'
              },
              {
                id: 'a1-u3-l4',
                realLessonId: 'a1-u3-l4',
                title: 'Meals, Cooking & Preferences',
                subtitle: 'Breakfast, lunch, dinner & favorite meals',
                type: 'Vocabulary & Speaking',
                icon: '🍲',
                color: 'coral',
                xp: 75,
                duration: '5 min',
                description: 'Discuss your everyday meal schedule, cooking habits, and express what you enjoy making.'
              },
              {
                id: 'checkpoint-a1-3',
                isCheckpoint: true,
                title: 'Dining & Commerce Checkpoint',
                subtitle: 'Review food ordering, supermarkets & prices',
                type: 'Milestone Assessment',
                icon: '🏆',
                color: 'yellow',
                xp: 80,
                duration: '5 min',
                description: 'Test your practical communication across restaurant ordering and supermarket shopping.'
              }
            ]
          }
        ]
      },
      {
        id: 'a1-s4',
        sectionNumber: '04',
        title: 'Time, Abilities, Stories & Synthesis',
        tagline: 'Tell the time, express abilities, share past memories, and achieve A1 mastery',
        description: 'Master the clock and calendar, use "can" for skills, narrate simple past experiences, express opinions, read signs, and complete the A1 capstone.',
        units: [
          {
            id: 'a1-u4',
            unitNumber: '04',
            title: 'Schedules, Abilities & Memories',
            eyebrow: 'TIME & EXPRESSION · NARRATIVE',
            objective: 'Tell the time precisely, express abilities with "can", state future intentions, and share past memories.',
            isDemo: false,
            lessons: [
              {
                id: 'a1-u4-l1',
                realLessonId: 'a1-u4-l1',
                title: 'Clock Time, Dates & Schedules',
                subtitle: 'What time is it & calendar dates',
                type: 'Vocabulary & Grammar',
                icon: '⏱️',
                color: 'blue',
                xp: 75,
                duration: '5 min',
                description: 'Tell clock time using "half past" and "quarter to", and talk about dates and calendar events.'
              },
              {
                id: 'a1-u4-l2',
                realLessonId: 'a1-u4-l2',
                title: 'Abilities & Talents with "Can"',
                subtitle: 'I can swim, speak English & play guitar',
                type: 'Grammar',
                icon: '⚡',
                color: 'lime',
                xp: 75,
                duration: '4 min',
                description: 'Express what you are capable of doing and talk about skills using "can" and "can\'t".'
              },
              {
                id: 'a1-u4-l3',
                realLessonId: 'a1-u4-l3',
                title: 'Needs, Wants & Future Intentions',
                subtitle: 'Need to, want to & going to',
                type: 'Grammar & Speaking',
                icon: '🎯',
                color: 'purple',
                xp: 80,
                duration: '5 min',
                description: 'Differentiate between what you must do (need to), desire to do (want to), and plan to do (going to).'
              },
              {
                id: 'past',
                realLessonId: 'past',
                title: 'Tell your story',
                subtitle: 'Past tense & memories',
                type: 'Grammar',
                icon: '📸',
                color: 'purple',
                xp: 90,
                duration: '5 min',
                description: 'Talk about yesterday, your last trip, and moments worth sharing with simple past verbs.'
              },
              {
                id: 'checkpoint-a1-4',
                isCheckpoint: true,
                title: 'Narrative & Time Checkpoint',
                subtitle: 'Review clock time, abilities & past narrative',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'purple',
                xp: 85,
                duration: '5 min',
                description: 'Verify your ability to narrate past memories and express schedules accurately.'
              }
            ]
          },
          {
            id: 'a1-u5',
            unitNumber: '05',
            title: 'Conversations, Practical Reading & Milestone',
            eyebrow: 'COMMUNICATION · A1 CAPSTONE',
            objective: 'Express opinions politely, read informational signs and notices, handle everyday requests, and complete the A1 milestone.',
            isDemo: false,
            lessons: [
              {
                id: 'confidence',
                realLessonId: 'confidence',
                title: 'Speak your mind',
                subtitle: 'Opinions & conversations',
                type: 'Conversation',
                icon: '💬',
                color: 'coral',
                xp: 100,
                duration: '5 min',
                description: 'Share an opinion, agree or disagree politely, and keep the English conversation flowing.'
              },
              {
                id: 'a1-u5-l2',
                realLessonId: 'a1-u5-l2',
                title: 'Reading Short Notices & Signs',
                subtitle: 'Opening hours, danger, sale & notices',
                type: 'Reading',
                icon: '📋',
                color: 'lime',
                xp: 80,
                duration: '4 min',
                description: 'Understand public notices, store opening signs, warnings, and short informational text messages.'
              },
              {
                id: 'a1-u5-l3',
                realLessonId: 'a1-u5-l3',
                title: 'Everyday Problem Solving & Requests',
                subtitle: 'Could you help me, sorry & thank you',
                type: 'Pragmatics',
                icon: '🤝',
                color: 'blue',
                xp: 85,
                duration: '5 min',
                description: 'Handle unexpected everyday hiccups: apologize politely, ask for repetition, and request assistance.'
              },
              {
                id: 'a1-u5-l4',
                realLessonId: 'a1-u5-l4',
                title: 'A1 Beginner Review & Milestone',
                subtitle: 'Cumulative practice and A1 capstone',
                type: 'Milestone Assessment',
                icon: '🎓',
                color: 'lime',
                xp: 120,
                duration: '6 min',
                description: 'Celebrate your A1 Beginner journey! Synthesize introductions, directions, dining, time, abilities, past stories, and opinions.'
              },
              {
                id: 'checkpoint-a1-capstone',
                isCheckpoint: true,
                title: 'A1 Beginner Certificate',
                subtitle: 'Comprehensive A1 mastery evaluation',
                type: 'Level Milestone',
                icon: '🏆',
                color: 'blue',
                xp: 100,
                duration: '6 min',
                description: 'Complete the Beginner stage and earn your official A1 proficiency badge!'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'a2',
    code: 'A2',
    name: 'Elementary English',
    badge: 'Elementary',
    tagline: 'Expand your everyday horizons',
    objective: 'Describe your background, daily routines, shopping, and handle common travel encounters.',
    accent: 'purple',
    isDemoOnly: false,
    estimatedHours: '35 hrs',
    sections: [
      {
        id: 'a2-s1',
        sectionNumber: '01',
        title: 'Work, Habits & Past Narratives',
        tagline: 'Handle daily workplace situations and past adventures with increasing ease',
        description: 'Talk about your profession, describe workday routines, narrate memorable past trips, and explain reasons for feelings.',
        units: [
          {
            id: 'a2-u1',
            unitNumber: '01',
            title: 'Work Routines, Past Experiences & Feelings',
            eyebrow: 'ELEMENTARY · WORK & MEMORIES',
            objective: 'Describe your job duties, tell chronological past vacation stories, use past continuous, and give reasons with because and so.',
            isDemo: false,
            lessons: [
              {
                id: 'a2-u1-l1',
                realLessonId: 'a2-u1-l1',
                title: 'Workday Routines & Daily Responsibilities',
                subtitle: 'Professional tasks, schedules & frequency adverbs',
                type: 'Spoken Production',
                icon: '💼',
                color: 'purple',
                xp: 70,
                duration: '5 min',
                description: 'Discuss daily work duties, schedules, and professional activities using detailed frequency expressions.'
              },
              {
                id: 'a2-u1-l2',
                realLessonId: 'a2-u1-l2',
                title: 'Narrating Past Holidays & Memorable Events',
                subtitle: 'Sequencing words & detailed past experiences',
                type: 'Spoken Production',
                icon: '🏖️',
                color: 'blue',
                xp: 70,
                duration: '5 min',
                description: 'Narrate past vacation experiences and life events using chronological linkers like first, then, after that, and finally.'
              },
              {
                id: 'a2-u1-l3',
                realLessonId: 'a2-u1-l3',
                title: 'Past Continuous & Interrupted Actions',
                subtitle: 'Describing background actions with when & while',
                type: 'Grammar',
                icon: '⏳',
                color: 'purple',
                xp: 70,
                duration: '5 min',
                description: 'Use the past continuous (was/were + -ing) with the past simple to describe an ongoing action interrupted by a sudden event.'
              },
              {
                id: 'a2-u1-l4',
                realLessonId: 'a2-u1-l4',
                title: 'Feelings, Reactions & Explaining Why',
                subtitle: 'Expressing emotion with because & so',
                type: 'Spoken Interaction',
                icon: '💡',
                color: 'lime',
                xp: 70,
                duration: '5 min',
                description: 'Express emotions, reactions, and justify feelings and actions using causal conjunctions "because" and "so".'
              },
              {
                id: 'checkpoint-a2-1',
                isCheckpoint: true,
                title: 'Work & Past Narratives Checkpoint',
                subtitle: 'Verify work routines, past continuous & causal linkers',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'purple',
                xp: 70,
                duration: '5 min',
                description: 'Verify your mastery of workplace habits, narrative sequencing, and giving reasons.'
              }
            ]
          }
        ]
      },
      {
        id: 'a2-s2',
        sectionNumber: '02',
        title: 'Descriptions, Comparisons & Living Spaces',
        tagline: 'Personality qualities, comparisons, and neighborhood living',
        description: 'Describe character traits, compare items using comparatives and superlatives, and discuss homes and residential amenities.',
        units: [
          {
            id: 'a2-u2',
            unitNumber: '02',
            title: 'People, Comparisons & Homes',
            eyebrow: 'ELEMENTARY · TRAITS & COMPARISONS',
            objective: 'Describe personality qualities, master comparative and superlative adjectives, and describe living spaces and facilities.',
            isDemo: false,
            lessons: [
              {
                id: 'a2-u2-l1',
                realLessonId: 'a2-u2-l1',
                title: 'Personality Traits & Describing People',
                subtitle: 'Character adjectives & social qualities',
                type: 'Vocabulary',
                icon: '👤',
                color: 'teal',
                xp: 70,
                duration: '5 min',
                description: 'Use diverse personality adjectives to describe friends, colleagues, and acquaintances accurately.'
              },
              {
                id: 'a2-u2-l2',
                realLessonId: 'a2-u2-l2',
                title: 'Comparing Things: Comparative Adjectives',
                subtitle: '-er and more with than',
                type: 'Grammar',
                icon: '⚖️',
                color: 'blue',
                xp: 70,
                duration: '5 min',
                description: 'Compare two people, places, or items using short adjectives with -er and longer adjectives with more ... than.'
              },
              {
                id: 'a2-u2-l3',
                realLessonId: 'a2-u2-l3',
                title: 'The Best & The Greatest: Superlatives',
                subtitle: 'the -est and the most with in and of',
                type: 'Grammar',
                icon: '🏆',
                color: 'yellow',
                xp: 70,
                duration: '5 min',
                description: 'Express the highest degree of quality within a group or place using superlative forms (the -est, the most).'
              },
              {
                id: 'a2-u2-l4',
                realLessonId: 'a2-u2-l4',
                title: 'Homes, Apartments & Neighborhood Amenities',
                subtitle: 'Housing features, rent & local facilities',
                type: 'Vocabulary',
                icon: '🏡',
                color: 'lime',
                xp: 70,
                duration: '5 min',
                description: 'Discuss living spaces, rental accommodations, balconies, central heating, and neighborhood amenities like parks and markets.'
              },
              {
                id: 'checkpoint-a2-2',
                isCheckpoint: true,
                title: 'Traits, Comparisons & Homes Checkpoint',
                subtitle: 'Test character qualities, comparatives & housing vocabulary',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'teal',
                xp: 70,
                duration: '5 min',
                description: 'Demonstrate confidence comparing items and describing living environments.'
              }
            ]
          }
        ]
      },
      {
        id: 'a2-s3',
        sectionNumber: '03',
        title: 'Travel, Shopping & Everyday Services',
        tagline: 'Hotel bookings, retail purchases, community desks, and dining out',
        description: 'Build practical fluency for real-world interactions: booking hotels, asking for sizes and refunds in stores, dealing with postal/banking desks, and ordering meals with dietary needs.',
        units: [
          {
            id: 'a2-u3',
            unitNumber: '03',
            title: 'Travel Bookings, Shopping & Community Services',
            eyebrow: 'ELEMENTARY · SERVICES & TRAVEL',
            objective: 'Conduct hotel bookings, manage retail transactions and returns, make requests at banks and post offices, and handle restaurant orders and dietary preferences.',
            isDemo: false,
            lessons: [
              {
                id: 'a2-u3-l1',
                realLessonId: 'a2-u3-l1',
                title: 'Hotel Accommodations & Travel Inquiries',
                subtitle: 'Room reservations, check-in & amenities',
                type: 'Spoken Interaction',
                icon: '🏨',
                color: 'amber',
                xp: 75,
                duration: '5 min',
                description: 'Inquire about room types, breakfast inclusion, check-in times, and confirm hotel bookings politely.'
              },
              {
                id: 'a2-u3-l2',
                realLessonId: 'a2-u3-l2',
                title: 'Clothes Shopping, Sizes & Returns',
                subtitle: 'Fitting rooms, exchanges & receipts',
                type: 'Vocabulary',
                icon: '🛍️',
                color: 'coral',
                xp: 75,
                duration: '5 min',
                description: 'Ask for different clothing sizes, locate fitting rooms, inquire about discounts, and request refunds with receipts.'
              },
              {
                id: 'a2-u3-l3',
                realLessonId: 'a2-u3-l3',
                title: 'Post Offices, Banks & Public Services',
                subtitle: 'Sending mail, parcels & basic banking',
                type: 'Spoken Interaction',
                icon: '📮',
                color: 'blue',
                xp: 75,
                duration: '5 min',
                description: 'Perform transactions at post offices and banks: sending parcels, buying stamps, exchanging currency, and opening accounts.'
              },
              {
                id: 'a2-u3-l4',
                realLessonId: 'a2-u3-l4',
                title: 'Dining Out: Menus, Orders & Dietary Needs',
                subtitle: 'Ingredients, allergies & special requests',
                type: 'Spoken Interaction',
                icon: '🍽️',
                color: 'lime',
                xp: 75,
                duration: '5 min',
                description: 'Ask detailed questions about menu items, state dietary preferences and food allergies, and request simple recipe alterations.'
              },
              {
                id: 'checkpoint-a2-3',
                isCheckpoint: true,
                title: 'Travel, Shopping & Services Checkpoint',
                subtitle: 'Review hotel bookings, retail returns & restaurant orders',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'amber',
                xp: 75,
                duration: '5 min',
                description: 'Confirm your readiness for practical public service interactions in English.'
              }
            ]
          }
        ]
      },
      {
        id: 'a2-s4',
        sectionNumber: '04',
        title: 'Health, Future Plans, Social Connections & Synthesis',
        tagline: 'Wellness, predictions, social arrangements, practical texts, and capstone review',
        description: 'Consolidate elementary fluency: describe physical symptoms, discuss future arrangements, interpret practical notices, compose short emails, and demonstrate comprehensive A2 mastery.',
        units: [
          {
            id: 'a2-u4',
            unitNumber: '04',
            title: 'Health, Well-being & Looking Ahead',
            eyebrow: 'ELEMENTARY · HEALTH & FUTURE',
            objective: 'Describe common medical symptoms and understand health advice with should, discuss fitness routines, and talk about future plans with going to and will.',
            isDemo: false,
            lessons: [
              {
                id: 'a2-u4-l1',
                realLessonId: 'a2-u4-l1',
                title: 'Health Symptoms, Minor Illnesses & Doctor Advice',
                subtitle: 'Expressing aches, colds & giving advice with should',
                type: 'Spoken Interaction',
                icon: '🩺',
                color: 'rose',
                xp: 75,
                duration: '5 min',
                description: 'Explain physical symptoms and aches to a doctor or pharmacist and understand practical health advice with "should" and "shouldn’t".'
              },
              {
                id: 'a2-u4-l2',
                realLessonId: 'a2-u4-l2',
                title: 'Healthy Habits, Fitness & Balanced Lifestyle',
                subtitle: 'Exercise routines, nutrition & staying well',
                type: 'Vocabulary',
                icon: '🏃',
                color: 'lime',
                xp: 75,
                duration: '5 min',
                description: 'Discuss wellness habits, regular physical exercise, balanced diets, and strategies for reducing stress.'
              },
              {
                id: 'a2-u4-l3',
                realLessonId: 'a2-u4-l3',
                title: 'Future Plans: Going to vs. Present Continuous',
                subtitle: 'Intentions vs. fixed social arrangements',
                type: 'Grammar',
                icon: '📅',
                color: 'blue',
                xp: 75,
                duration: '5 min',
                description: 'Distinguish between intentions (be going to) and fixed social appointments with specific times (present continuous).'
              },
              {
                id: 'a2-u4-l4',
                realLessonId: 'a2-u4-l4',
                title: 'Weather Forecasts & Predicting with Will',
                subtitle: 'Meteo conditions, will for predictions & adverbs',
                type: 'Spoken Production',
                icon: '⛅',
                color: 'purple',
                xp: 75,
                duration: '5 min',
                description: 'Describe regional weather patterns and make forecasts about future conditions using "will" and certainty adverbs (probably, definitely).'
              },
              {
                id: 'checkpoint-a2-4',
                isCheckpoint: true,
                title: 'Health & Future Plans Checkpoint',
                subtitle: 'Review medical symptoms, wellness & future structures',
                type: 'Milestone Assessment',
                icon: '⭐',
                color: 'rose',
                xp: 75,
                duration: '5 min',
                description: 'Verify ability to explain health concerns and discuss future plans.'
              }
            ]
          },
          {
            id: 'a2-u5',
            unitNumber: '05',
            title: 'Socializing, Messages & Capstone Synthesis',
            eyebrow: 'ELEMENTARY · SOCIAL & CAPSTONE',
            objective: 'Invite acquaintances and propose leisure activities, extract information from practical signs and notices, compose short informal messages, and synthesize A2 communication abilities.',
            isDemo: false,
            lessons: [
              {
                id: 'a2-u5-l1',
                realLessonId: 'a2-u5-l1',
                title: 'Invitations, Suggestions & Making Plans',
                subtitle: 'Would you like to, How about & responding',
                type: 'Spoken Interaction',
                icon: '🎉',
                color: 'yellow',
                xp: 80,
                duration: '5 min',
                description: 'Make social invitations, accept or decline politely with reasons, and propose alternative arrangements.'
              },
              {
                id: 'a2-u5-l2',
                realLessonId: 'a2-u5-l2',
                title: 'Reading Signs, Notices & Short Brochures',
                subtitle: 'Everyday public information & instructions',
                type: 'Reading',
                icon: '📄',
                color: 'blue',
                xp: 80,
                duration: '5 min',
                description: 'Read and extract key details from public notices, opening hour signs, museum leaflets, and safety warnings.'
              },
              {
                id: 'a2-u5-l3',
                realLessonId: 'a2-u5-l3',
                title: 'Informal Writing: Emails, Notes & Postcards',
                subtitle: 'Friendly greetings, updates & thanking someone',
                type: 'Writing',
                icon: '✉️',
                color: 'coral',
                xp: 80,
                duration: '5 min',
                description: 'Draft short, informal personal messages, postcards, and emails thanking someone, providing life updates, or arranging social meetups.'
              },
              {
                id: 'a2-u5-l4',
                realLessonId: 'a2-u5-l4',
                title: 'A2 Elementary Capstone Review & Synthesis',
                subtitle: 'Cumulative consolidation & milestone check',
                type: 'Milestone Assessment',
                icon: '🎓',
                color: 'purple',
                xp: 100,
                duration: '7 min',
                description: 'Demonstrate comprehensive A2 mastery across narrating past events, comparing objects, arranging travel, and social discussion.'
              },
              {
                id: 'checkpoint-a2-capstone',
                isCheckpoint: true,
                title: 'A2 Elementary Certificate',
                subtitle: 'Comprehensive A2 mastery evaluation',
                type: 'Level Milestone',
                icon: '🏆',
                color: 'purple',
                xp: 120,
                duration: '6 min',
                description: 'Complete the Elementary stage and earn your official A2 proficiency badge!'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'b1',
    code: 'B1',
    name: 'Intermediate English',
    badge: 'Intermediate',
    tagline: 'Connect thoughts, share experiences, and travel freely',
    objective: 'Understand main points on familiar matters, deal with travel situations, and produce connected text.',
    accent: 'yellow',
    isDemoOnly: false,
    estimatedHours: '45 hrs',
    sections: [
      {
            "id": "b1-s1",
            "sectionNumber": "01",
            "title": "Personal Narratives, Past Experiences & Life Changes",
            "tagline": "Narrate past memories, life transitions, habits, and ongoing experiences",
            "description": "Connect your ideas with past continuous vs. past simple, express former habits with \"used to\", and share life experiences using the present perfect continuous.",
            "units": [
                  {
                        "id": "b1-u1",
                        "unitNumber": "01",
                        "title": "Life Stories, Transitions & Backgrounds",
                        "eyebrow": "INTERMEDIATE · NARRATIVE & EXPERIENCES",
                        "objective": "Narrate personal background stories, describe past habits with used to, contrast past simple and continuous in narratives, and discuss recent ongoing activities.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b1-u1-l1",
                                    "realLessonId": "b1-u1-l1",
                                    "title": "Memories & Life Changes: Used To & Would",
                                    "subtitle": "Past habits, former routines & state verbs",
                                    "type": "Grammar & Speaking",
                                    "icon": "⏳",
                                    "color": "yellow",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Learn how to discuss former habits and life changes using \"used to\" and \"would\", and recognize when state verbs require \"used to\"."
                              },
                              {
                                    "id": "b1-u1-l2",
                                    "realLessonId": "b1-u1-l2",
                                    "title": "Storytelling & Backgrounds: Past Continuous vs. Past Simple",
                                    "subtitle": "Setting scenes, interrupted actions & narrative links",
                                    "type": "Spoken Production",
                                    "icon": "📖",
                                    "color": "indigo",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Master narrative pacing by using the past continuous for atmospheric background actions and past simple for interrupting plot events."
                              },
                              {
                                    "id": "b1-u1-l3",
                                    "realLessonId": "b1-u1-l3",
                                    "title": "Life Milestones & Experiences: Present Perfect vs. Past Simple",
                                    "subtitle": "Indefinite life experiences vs. specific finished historical points",
                                    "type": "Grammar & Interaction",
                                    "icon": "🏆",
                                    "color": "amber",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Clearly distinguish between open life experiences (present perfect with ever, never, already) and specific closed past events (past simple with ago, yesterday, in 2021)."
                              },
                              {
                                    "id": "b1-u1-l4",
                                    "realLessonId": "b1-u1-l4",
                                    "title": "Recent & Ongoing Activities: Present Perfect Continuous",
                                    "subtitle": "Duration, recent actions with visible results & for vs. since",
                                    "type": "Grammar & Speaking",
                                    "icon": "🔄",
                                    "color": "teal",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Express activities that began in the past and continue into the present, or explain recent activities with observable physical evidence."
                              },
                              {
                                    "id": "checkpoint-b1-1",
                                    "isCheckpoint": true,
                                    "title": "Life Stories Checkpoint",
                                    "subtitle": "Review past habits, narrative tenses & present perfect",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "yellow",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Demonstrate your ability to narrate personal stories and past routines."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "b1-s2",
            "sectionNumber": "02",
            "title": "Careers, Education, Ambitions & Future Decisions",
            "tagline": "Articulate professional goals, academic paths, possibilities, and conditional choices",
            "description": "Discuss career progression, educational background, future plans with certainty/probability, and hypothesize about situations with second conditionals.",
            "units": [
                  {
                        "id": "b1-u2",
                        "unitNumber": "02",
                        "title": "Workplace Progression, Education & Hypothetical Choices",
                        "eyebrow": "INTERMEDIATE · CAREER & POSSIBILITIES",
                        "objective": "Articulate career ambitions, discuss higher education and professional skills, express degrees of certainty with modals, and debate hypothetical scenarios with second conditionals.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b1-u2-l1",
                                    "realLessonId": "b1-u2-l1",
                                    "title": "Career Paths & Professional Ambitions",
                                    "subtitle": "Promotions, career transitions & vocational goals",
                                    "type": "Spoken Production",
                                    "icon": "💼",
                                    "color": "indigo",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Express your career goals, discuss promotions and professional advancement, and use future intention structures naturally."
                              },
                              {
                                    "id": "b1-u2-l2",
                                    "realLessonId": "b1-u2-l2",
                                    "title": "Higher Education, Training & Lifelong Learning",
                                    "subtitle": "Academic qualifications, apprenticeships & professional development",
                                    "type": "Vocabulary & Reading",
                                    "icon": "🎓",
                                    "color": "blue",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Discuss university degrees, vocational training, practical certifications, and modern lifelong learning opportunities."
                              },
                              {
                                    "id": "b1-u2-l3",
                                    "realLessonId": "b1-u2-l3",
                                    "title": "Possibility, Probability & Deduction: May, Might, Could",
                                    "subtitle": "Degrees of certainty, logical deductions & future speculations",
                                    "type": "Grammar & Speaking",
                                    "icon": "🔮",
                                    "color": "purple",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Assess the probability of events and make logical deductions using modal auxiliaries (must, might, may, could, can't)."
                              },
                              {
                                    "id": "b1-u2-l4",
                                    "realLessonId": "b1-u2-l4",
                                    "title": "Hypothetical Situations & Dreams: Second Conditional",
                                    "subtitle": "Unreal conditions, imaginary choices & \"If I were you\"",
                                    "type": "Grammar & Interaction",
                                    "icon": "💭",
                                    "color": "rose",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Construct hypothetical, unreal, or imaginary scenarios in the present or future using the second conditional, and give friendly advice with \"If I were you\"."
                              },
                              {
                                    "id": "checkpoint-b1-2",
                                    "isCheckpoint": true,
                                    "title": "Ambitions & Decisions Checkpoint",
                                    "subtitle": "Review careers, qualifications, deduction modals & conditionals",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "indigo",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Verify your ability to articulate career ambitions and hypothesize with second conditionals."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "b1-s3",
            "sectionNumber": "03",
            "title": "Independent Travel, Public Encounters & Problem Solving",
            "tagline": "Navigate travel hiccups, resolve service complaints, and manage unexpected events",
            "description": "Handle missed transit, report lost property, negotiate solutions politely with indirect questions, and clarify details in public services.",
            "units": [
                  {
                        "id": "b1-u3",
                        "unitNumber": "03",
                        "title": "Travel Disruptions, Polite Inquiries & Problem Resolution",
                        "eyebrow": "INTERMEDIATE · TRAVEL & PROBLEM SOLVING",
                        "objective": "Manage unexpected travel disruptions, phrase polite indirect questions, articulate service complaints constructively, and report incidents.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b1-u3-l1",
                                    "realLessonId": "b1-u3-l1",
                                    "title": "Travel Delays, Cancellations & Rescheduling",
                                    "subtitle": "Missed connections, rebooking & compensation claims",
                                    "type": "Spoken Interaction",
                                    "icon": "✈️",
                                    "color": "amber",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Communicate with transit agents during flight cancellations, train delays, and missed connections, and inquire about rebooking and hotel vouchers."
                              },
                              {
                                    "id": "b1-u3-l2",
                                    "realLessonId": "b1-u3-l2",
                                    "title": "Lost Property & Incident Reporting",
                                    "subtitle": "Filing reports, describing lost items & physical characteristics",
                                    "type": "Vocabulary & Speaking",
                                    "icon": "🧳",
                                    "color": "blue",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Provide detailed descriptions of misplaced or stolen items, explain exact timelines, and complete incident claim forms."
                              },
                              {
                                    "id": "b1-u3-l3",
                                    "realLessonId": "b1-u3-l3",
                                    "title": "Polite Inquiries & Indirect Questions",
                                    "subtitle": "Softening requests, introductory clauses & affirmative word order",
                                    "type": "Grammar & Pragmatics",
                                    "icon": "🤝",
                                    "color": "teal",
                                    "xp": 80,
                                    "duration": "5 min",
                                    "description": "Transform abrupt direct questions into diplomatic, polite indirect questions using introductory stems and standard affirmative word order."
                              },
                              {
                                    "id": "b1-u3-l4",
                                    "realLessonId": "b1-u3-l4",
                                    "title": "Customer Service, Disputes & Negotiating Solutions",
                                    "subtitle": "Tactful complaints, seeking compromises & resolution language",
                                    "type": "Spoken Interaction",
                                    "icon": "⚖️",
                                    "color": "rose",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Resolve consumer disputes calmly, explain flaws in services or merchandise tactfully, and negotiate fair solutions like refunds or replacements."
                              },
                              {
                                    "id": "checkpoint-b1-3",
                                    "isCheckpoint": true,
                                    "title": "Travel & Public Problem Solving Checkpoint",
                                    "subtitle": "Review travel disruptions, lost property & polite inquiries",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "amber",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Confirm your capability to navigate travel delays and formulate polite indirect questions."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "b1-s4",
            "sectionNumber": "04",
            "title": "Society, Media, Opinions, Practical Texts & Capstone",
            "tagline": "Share perspectives, interpret everyday news, understand complex texts, and demonstrate B1 mastery",
            "description": "Exchange opinions with supporting reasons, report what others said, interpret news reports, understand practical articles, and synthesize B1 communicative competence.",
            "units": [
                  {
                        "id": "b1-u4",
                        "unitNumber": "04",
                        "title": "Opinions, Persuasion & Social Communication",
                        "eyebrow": "INTERMEDIATE · OPINIONS & PERSUASION",
                        "objective": "Exchange nuanced viewpoints with supporting arguments, report statements with reported speech, express polite advice and recommendations, and navigate social conversations.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b1-u4-l1",
                                    "realLessonId": "b1-u4-l1",
                                    "title": "Expressing Opinions, Agreement & Nuanced Disagreement",
                                    "subtitle": "Stating viewpoints, arguing constructively & partial agreement",
                                    "type": "Spoken Production & Interaction",
                                    "icon": "🗣️",
                                    "color": "indigo",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Share your perspective on debatable issues, support opinions with examples, and disagree constructively using phrases like \"up to a point\" and \"I see what you mean, but...\"."
                              },
                              {
                                    "id": "b1-u4-l2",
                                    "realLessonId": "b1-u4-l2",
                                    "title": "Advice, Recommendations & Social Obligations",
                                    "subtitle": "Ought to, had better, be supposed to & recommendations",
                                    "type": "Grammar & Speaking",
                                    "icon": "💡",
                                    "color": "amber",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Offer strong recommendations and social guidance using \"ought to\", express warnings with \"had better\", and discuss expectations with \"be supposed to\"."
                              },
                              {
                                    "id": "b1-u4-l3",
                                    "realLessonId": "b1-u4-l3",
                                    "title": "Reporting What People Said: Reported Speech & Verbs",
                                    "subtitle": "Backshift rules, pronoun changes & reporting verbs",
                                    "type": "Grammar & Writing",
                                    "icon": "📝",
                                    "color": "blue",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Report spoken messages and formal statements using tense backshift rules and reporting verbs like \"explained\", \"reminded\", and \"promised\"."
                              },
                              {
                                    "id": "b1-u4-l4",
                                    "realLessonId": "b1-u4-l4",
                                    "title": "Interpreting Everyday News & Media Reports",
                                    "subtitle": "News headlines, journalistic passive & fact vs. opinion",
                                    "type": "Reading & Critical Thinking",
                                    "icon": "📰",
                                    "color": "teal",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Decipher newspaper headlines, understand the use of the passive voice in news reporting, and separate objective facts from editorial opinion."
                              },
                              {
                                    "id": "checkpoint-b1-4",
                                    "isCheckpoint": true,
                                    "title": "Perspectives & Communication Checkpoint",
                                    "subtitle": "Review opinion debates, advice modals, reported speech & media news",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "teal",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Demonstrate proficiency in expressing opinions, reporting statements, and analyzing news."
                              }
                        ]
                  },
                  {
                        "id": "b1-u5",
                        "unitNumber": "05",
                        "title": "Practical Literacy, Correspondence & B1 Milestone Capstone",
                        "eyebrow": "INTERMEDIATE · PRACTICAL TEXTS & CAPSTONE",
                        "objective": "Comprehend detailed informational articles, compose structured formal and semi-formal letters/emails, integrate connectors for smooth cohesion, and synthesize B1 communicative mastery.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b1-u5-l1",
                                    "realLessonId": "b1-u5-l1",
                                    "title": "Reading Informational Articles & Public Notices",
                                    "subtitle": "Skimming for main points, scanning for data & text structure",
                                    "type": "Reading & Analysis",
                                    "icon": "📖",
                                    "color": "indigo",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Develop skimming and scanning skills to extract key information from consumer reports, public notices, and lifestyle articles efficiently."
                              },
                              {
                                    "id": "b1-u5-l2",
                                    "realLessonId": "b1-u5-l2",
                                    "title": "Formal Emails & Semi-Formal Correspondence",
                                    "subtitle": "Professional salutations, polite phrasing & structured sign-offs",
                                    "type": "Writing & Register",
                                    "icon": "✉️",
                                    "color": "blue",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Compose structured formal emails and business correspondence with appropriate greetings, clear statement of purpose, polite requests, and formal sign-offs."
                              },
                              {
                                    "id": "b1-u5-l3",
                                    "realLessonId": "b1-u5-l3",
                                    "title": "Sentence Connectors & Discourse Cohesion",
                                    "subtitle": "However, although, in addition, consequently & whereas",
                                    "type": "Writing & Grammar",
                                    "icon": "🔗",
                                    "color": "purple",
                                    "xp": 85,
                                    "duration": "5 min",
                                    "description": "Link ideas across sentences and paragraphs using sophisticated cohesive devices to express contrast, addition, cause, and concession."
                              },
                              {
                                    "id": "b1-u5-l4",
                                    "realLessonId": "b1-u5-l4",
                                    "title": "B1 Intermediate Comprehensive Milestone Synthesis",
                                    "subtitle": "Holistic B1 integration, complex communication & milestone review",
                                    "type": "Milestone Assessment",
                                    "icon": "🎓",
                                    "color": "yellow",
                                    "xp": 100,
                                    "duration": "7 min",
                                    "description": "Demonstrate comprehensive B1 mastery across past storytelling, career discussions, travel problem-solving, polite discourse, and cohesive writing."
                              },
                              {
                                    "id": "checkpoint-b1-capstone",
                                    "isCheckpoint": true,
                                    "title": "B1 Intermediate Certificate",
                                    "subtitle": "Comprehensive B1 intermediate mastery evaluation",
                                    "type": "Level Milestone",
                                    "icon": "🏆",
                                    "color": "yellow",
                                    "xp": 120,
                                    "duration": "7 min",
                                    "description": "Complete the Intermediate stage and earn your official B1 proficiency badge!"
                              }
                        ]
                  }
            ]
      }
]
  },
  {
    id: 'b2',
    code: 'B2',
    name: 'Upper-Intermediate',
    badge: 'Upper-Int',
    tagline: 'Fluency, nuance, and spontaneous conversation',
    objective: 'Interact with degree of fluency, understand complex texts, and produce clear, detailed arguments.',
    accent: 'peach',
    isDemoOnly: false,
    estimatedHours: '70 hrs',
    sections: [
      {
            "id": "b2-s1",
            "sectionNumber": "01",
            "title": "Complex Structures, Nuance & Narrative Sophistication",
            "tagline": "Elevate your fluency with mixed conditionals, inversion, participle clauses, and subtle narrative timing",
            "description": "Move beyond standard sentence patterns: hypothesize across time with mixed conditionals, emphasize key ideas with cleft sentences, streamline discourse with participle clauses, and master narrative pacing.",
            "units": [
                  {
                        "id": "b2-u1",
                        "unitNumber": "01",
                        "title": "Hypothetical Reasoning, Emphasis & Discourse Framing",
                        "eyebrow": "UPPER-INTERMEDIATE · ADVANCED GRAMMAR",
                        "objective": "Construct mixed past-present conditionals, invert negative adverbials for rhetorical emphasis, streamline complex sentences with participle clauses, and frame discourse with cleft structures.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b2-u1-l1",
                                    "realLessonId": "b2-u1-l1",
                                    "title": "Mixed Conditionals: Connecting Past Decisions to Present Realities",
                                    "subtitle": "Past conditions with present results & ongoing states with past results",
                                    "type": "Grammar & Spoken Production",
                                    "icon": "⏳",
                                    "color": "peach",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Master mixed conditionals to express how past actions directly shape current realities, and how enduring personal traits influenced specific past events."
                              },
                              {
                                    "id": "b2-u1-l2",
                                    "realLessonId": "b2-u1-l2",
                                    "title": "Inversion & Rhetorical Emphasis: Rarely, Seldom & Not Only",
                                    "subtitle": "Stylistic sentence inversion, negative adverbials & dramatic focus",
                                    "type": "Grammar & Writing",
                                    "icon": "⚡",
                                    "color": "indigo",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Elevate your rhetorical sophistication by placing negative and limiting adverbials at the beginning of sentences to trigger subject-auxiliary inversion."
                              },
                              {
                                    "id": "b2-u1-l3",
                                    "realLessonId": "b2-u1-l3",
                                    "title": "Participle Clauses for Concise & Elegant Writing",
                                    "subtitle": "Present, past & perfect participle clauses for streamlined syntax",
                                    "type": "Writing & Reading",
                                    "icon": "✒️",
                                    "color": "teal",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Construct present, past, and perfect participle clauses to compress lengthy adverbial and relative clauses into concise, academic prose."
                              },
                              {
                                    "id": "b2-u1-l4",
                                    "realLessonId": "b2-u1-l4",
                                    "title": "Cleft Sentences for Focus & Thematic Highlighting",
                                    "subtitle": "It-clefts, wh-pseudo-clefts & discourse focus modulation",
                                    "type": "Grammar & Spoken Production",
                                    "icon": "🎯",
                                    "color": "rose",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Direct listener attention and resolve misunderstandings with precision using \"It is/was... that\" and \"What... is/was\" cleft constructions."
                              },
                              {
                                    "id": "checkpoint-b2-1",
                                    "isCheckpoint": true,
                                    "title": "Advanced Grammar & Framing Checkpoint",
                                    "subtitle": "Review mixed conditionals, inversion, participles & cleft sentences",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "peach",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Demonstrate upper-intermediate syntactic control and rhetorical focus."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "b2-s2",
            "sectionNumber": "02",
            "title": "Professional Leadership, Negotiations & High-Stakes Communication",
            "tagline": "Steer meetings, conduct diplomatic negotiations, pitch proposals, and resolve corporate friction",
            "description": "Develop leadership communication: chair discussions, negotiate contractual compromises, handle hostile questions, and deliver compelling professional pitches.",
            "units": [
                  {
                        "id": "b2-u2",
                        "unitNumber": "02",
                        "title": "Meeting Leadership, Strategic Negotiation & Workplace Diplomacy",
                        "eyebrow": "UPPER-INTERMEDIATE · PROFESSIONAL FLUENCY",
                        "objective": "Chair professional meetings with agenda control, negotiate commercial agreements with diplomatic assertiveness, handle challenging stakeholders, and pitch strategic initiatives.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b2-u2-l1",
                                    "realLessonId": "b2-u2-l1",
                                    "title": "Chairing Meetings, Setting Agendas & Managing Interventions",
                                    "subtitle": "Agenda discipline, turn-taking & consensus synthesis",
                                    "type": "Spoken Interaction & Leadership",
                                    "icon": "📋",
                                    "color": "indigo",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Learn executive meeting management: establish objectives, manage digressions firmly yet politely, invite quieter voices, and synthesize actionable consensus."
                              },
                              {
                                    "id": "b2-u2-l2",
                                    "realLessonId": "b2-u2-l2",
                                    "title": "Principled Negotiation: Bargaining, Concessions & Trade-Offs",
                                    "subtitle": "Conditional bargaining, trading concessions & mutual gain",
                                    "type": "Spoken Interaction & Strategy",
                                    "icon": "🤝",
                                    "color": "blue",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Navigate commercial negotiations using principled bargaining: link concessions conditionally, identify mutual trade-offs, and safeguard strategic interests."
                              },
                              {
                                    "id": "b2-u2-l3",
                                    "realLessonId": "b2-u2-l3",
                                    "title": "Diplomatic Pushback, Tactful Disagreement & Conflict Resolution",
                                    "subtitle": "Depersonalizing critique, softening pushback & defusing tension",
                                    "type": "Pragmatics & Spoken Interaction",
                                    "icon": "🛡️",
                                    "color": "rose",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Deliver diplomatic pushback to senior colleagues, de-escalate interpersonal workplace conflict, and depersonalize criticism through linguistic softening."
                              },
                              {
                                    "id": "b2-u2-l4",
                                    "realLessonId": "b2-u2-l4",
                                    "title": "Persuasive Pitching & Structuring Executive Presentations",
                                    "subtitle": "Problem-solution framing, value propositions & handling scrutiny",
                                    "type": "Spoken Production & Rhetoric",
                                    "icon": "📊",
                                    "color": "teal",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Structure and deliver high-impact executive pitches using problem-solution architecture, compelling value propositions, and agile responses during Q&A scrutiny."
                              },
                              {
                                    "id": "checkpoint-b2-2",
                                    "isCheckpoint": true,
                                    "title": "Professional Fluency Checkpoint",
                                    "subtitle": "Review meeting management, negotiation & persuasive pitches",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "indigo",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Confirm readiness for high-stakes meetings and principled negotiations."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "b2-s3",
            "sectionNumber": "03",
            "title": "Academic Discourse, Critical Reading & Evidence Evaluation",
            "tagline": "Dissect complex research, evaluate hypotheses, detect authorial bias, and analyze data trends",
            "description": "Master critical reading and academic interaction: evaluate methodologies, identify subtle bias and hedging, analyze statistical trends, and express passive reporting structures.",
            "units": [
                  {
                        "id": "b2-u3",
                        "unitNumber": "03",
                        "title": "Critical Analysis, Research Synthesis & Objective Reporting",
                        "eyebrow": "UPPER-INTERMEDIATE · CRITICAL LITERACY",
                        "objective": "Critique academic arguments, identify subtle authorial stance and hedging, describe complex data graphs and trends, and utilize impersonal passive reporting structures.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b2-u3-l1",
                                    "realLessonId": "b2-u3-l1",
                                    "title": "Evaluating Research, Hypotheses & Methodology",
                                    "subtitle": "Empirical validity, correlation vs. causation & methodological critique",
                                    "type": "Reading & Critical Analysis",
                                    "icon": "🔬",
                                    "color": "indigo",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Assess the statistical and empirical rigor of published research, distinguish correlation from causation, and identify methodological limitations in academic papers."
                              },
                              {
                                    "id": "b2-u3-l2",
                                    "realLessonId": "b2-u3-l2",
                                    "title": "Impersonal Passive Reporting: It is claimed that / He is said to be",
                                    "subtitle": "Objective distancing, rumor reporting & formal attribution",
                                    "type": "Grammar & Journalism",
                                    "icon": "📰",
                                    "color": "blue",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Master impersonal passive reporting structures to report rumors, institutional claims, and widespread beliefs without personally vouching for their truth."
                              },
                              {
                                    "id": "b2-u3-l3",
                                    "realLessonId": "b2-u3-l3",
                                    "title": "Detecting Subtle Bias, Tone, Irony & Authorial Stance",
                                    "subtitle": "Reading between the lines, loaded language & editorial intent",
                                    "type": "Reading & Critical Thinking",
                                    "icon": "🔍",
                                    "color": "teal",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Uncover subtle authorial bias, identify ironic undertones, analyze loaded vocabulary choices, and distinguish objective analysis from persuasive spin."
                              },
                              {
                                    "id": "b2-u3-l4",
                                    "realLessonId": "b2-u3-l4",
                                    "title": "Analyzing Complex Data, Charts & Economic Trends",
                                    "subtitle": "Describing charts, trend verbs, qualifiers & financial synthesis",
                                    "type": "Spoken Production & Analysis",
                                    "icon": "📈",
                                    "color": "rose",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Interpret statistical charts, financial trends, and demographic patterns using precise dynamic verbs, adverbs of degree, and qualifying expressions."
                              },
                              {
                                    "id": "checkpoint-b2-3",
                                    "isCheckpoint": true,
                                    "title": "Critical Literacy & Research Checkpoint",
                                    "subtitle": "Review research critique, passive reporting, tone & data trends",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "teal",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Verify capability in evaluating research methodologies and interpreting complex charts."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "b2-s4",
            "sectionNumber": "04",
            "title": "Advanced Written Literacy, Idiomatic Nuance & Capstone Synthesis",
            "tagline": "Author reports, proposals, master natural collocations and phrasals, and synthesize B2 mastery",
            "description": "Draft sophisticated discursive essays and formal proposals, command natural collocations and idiomatic phrasals, and complete the comprehensive B2 milestone assessment.",
            "units": [
                  {
                        "id": "b2-u4",
                        "unitNumber": "04",
                        "title": "Advanced Composition: Reports, Proposals & Discursive Essays",
                        "eyebrow": "UPPER-INTERMEDIATE · FORMAL COMPOSITION",
                        "objective": "Draft structured executive reports with actionable recommendations, write balanced discursive essays evaluating competing viewpoints, and use high-level register transitions.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b2-u4-l1",
                                    "realLessonId": "b2-u4-l1",
                                    "title": "Drafting Formal Reports & Proposals with Recommendations",
                                    "subtitle": "Executive summaries, terms of reference & actionable recommendations",
                                    "type": "Writing & Formal Register",
                                    "icon": "📑",
                                    "color": "indigo",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Structure formal business reports and strategic proposals using executive summaries, terms of reference, objective findings, and prioritized recommendations."
                              },
                              {
                                    "id": "b2-u4-l2",
                                    "realLessonId": "b2-u4-l2",
                                    "title": "Balanced Discursive Essays: Weighing Competing Arguments",
                                    "subtitle": "Thesis statements, concessions, synthesis & balanced conclusions",
                                    "type": "Writing & Academic Discourse",
                                    "icon": "⚖️",
                                    "color": "blue",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Construct balanced discursive essays on controversial societal issues: present competing viewpoints equitably, make nuanced concessions, and reach a reasoned conclusion."
                              },
                              {
                                    "id": "b2-u4-l3",
                                    "realLessonId": "b2-u4-l3",
                                    "title": "Advanced Collocations & Sophisticated Register Control",
                                    "subtitle": "Academic verb-noun pairs, fixed prepositional phrases & register nuance",
                                    "type": "Vocabulary & Style",
                                    "icon": "💎",
                                    "color": "teal",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Elevate natural fluency and register precision by integrating advanced verb-noun, adjective-noun, and prepositional collocations into your active vocabulary."
                              },
                              {
                                    "id": "b2-u4-l4",
                                    "realLessonId": "b2-u4-l4",
                                    "title": "Phrasal Verbs with Multiple Meanings & Idiomatic Expressions",
                                    "subtitle": "Polysemy in phrasals, register awareness & idiomatic precision",
                                    "type": "Vocabulary & Pragmatics",
                                    "icon": "🔄",
                                    "color": "rose",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Master upper-intermediate phrasal verbs with multiple polysemic meanings (e.g., take on, account for, bring about) and integrate authentic idiomatic phrases."
                              },
                              {
                                    "id": "checkpoint-b2-4",
                                    "isCheckpoint": true,
                                    "title": "Advanced Composition & Idioms Checkpoint",
                                    "subtitle": "Review formal reports, discursive essays, collocations & phrasals",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "blue",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Demonstrate mastery in structured executive writing and idiomatic vocabulary."
                              }
                        ]
                  },
                  {
                        "id": "b2-u5",
                        "unitNumber": "05",
                        "title": "Social Fluency, Cross-Cultural Communication & B2 Capstone",
                        "eyebrow": "UPPER-INTERMEDIATE · SOCIAL FLUENCY & CAPSTONE",
                        "objective": "Navigate nuanced cross-cultural social encounters, employ hedging and modal deduction to qualify assertions, debate spontaneously on abstract topics, and demonstrate comprehensive B2 mastery.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "b2-u5-l1",
                                    "realLessonId": "b2-u5-l1",
                                    "title": "Cross-Cultural Communication & Register Calibration",
                                    "subtitle": "Directness spectrums, high vs. low context & communicative adaptability",
                                    "type": "Spoken Interaction & Cultural Literacy",
                                    "icon": "🌍",
                                    "color": "indigo",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Calibrate linguistic directness across international contexts, interpret high- and low-context communicative styles, and avoid cultural missteps."
                              },
                              {
                                    "id": "b2-u5-l2",
                                    "realLessonId": "b2-u5-l2",
                                    "title": "Hedging & Epistemic Stance: Qualifying Certainty",
                                    "subtitle": "Cautious assertions, probability adverbs & epistemic verbs",
                                    "type": "Writing & Academic Discourse",
                                    "icon": "🛡️",
                                    "color": "blue",
                                    "xp": 90,
                                    "duration": "6 min",
                                    "description": "Employ linguistic hedging to qualify academic assertions, express prudent degrees of probability, and avoid over-generalization."
                              },
                              {
                                    "id": "b2-u5-l3",
                                    "realLessonId": "b2-u5-l3",
                                    "title": "Spontaneous Debate: Defending Standpoints & Countering Objections",
                                    "subtitle": "Live rebuttals, logical fallacies & persuasive agility",
                                    "type": "Spoken Interaction & Debate",
                                    "icon": "🎙️",
                                    "color": "teal",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Participate fluently in spontaneous debate: articulate rapid rebuttals, expose logical fallacies, reframe core issues, and defend arguments under scrutiny."
                              },
                              {
                                    "id": "b2-u5-l4",
                                    "realLessonId": "b2-u5-l4",
                                    "title": "B2 Upper-Intermediate Comprehensive Milestone Synthesis",
                                    "subtitle": "Holistic B2 capstone, complex communication & milestone review",
                                    "type": "Milestone Assessment",
                                    "icon": "🎓",
                                    "color": "peach",
                                    "xp": 120,
                                    "duration": "7 min",
                                    "description": "Demonstrate holistic B2 upper-intermediate mastery across mixed conditionals, stylistic inversion, meeting chairing, negotiation diplomacy, critical research, and report composition."
                              },
                              {
                                    "id": "checkpoint-b2-capstone",
                                    "isCheckpoint": true,
                                    "title": "B2 Upper-Intermediate Certificate",
                                    "subtitle": "Comprehensive B2 Vantage level mastery evaluation",
                                    "type": "Level Milestone",
                                    "icon": "🏆",
                                    "color": "peach",
                                    "xp": 130,
                                    "duration": "8 min",
                                    "description": "Complete the Upper-Intermediate Vantage stage and earn your official B2 proficiency badge!"
                              }
                        ]
                  }
            ]
      }
]
  },
  {
    id: 'c1',
    code: 'C1',
    name: 'Advanced English',
    badge: 'Advanced',
    tagline: 'Academic, professional, and cultural mastery',
    objective: 'Express ideas fluently and spontaneously, using language flexibly for social and career goals.',
    accent: 'mint',
    isDemoOnly: false,
    estimatedHours: '80 hrs',
    sections: [
      {
            "id": "c1-s1",
            "sectionNumber": "01",
            "title": "Subtlety, Implication & Advanced Syntactic Flexibility",
            "tagline": "Master the architectural mechanics of high-register English syntax",
            "description": "Deploy rare syntactic forms with confidence: execute mandative subjunctives, invert hypothetical conditionals, condense arguments via nominalisation, and eliminate clausal redundancy through sophisticated ellipsis.",
            "units": [
                  {
                        "id": "c1-u1",
                        "unitNumber": "01",
                        "title": "Advanced Syntax, Subjunctive & Subtle Conditionals",
                        "eyebrow": "ADVANCED · C1 SYNTACTIC MASTERY",
                        "objective": "Deploy the mandative subjunctive, invert conditional clauses for formal emphasis, master nominalisation for information density, and execute nuanced clausal ellipsis.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c1-u1-l1",
                                    "realLessonId": "c1-u1-l1",
                                    "title": "The Mandative Subjunctive and Formulaic Clauses",
                                    "subtitle": "Directives, institutional mandates, and fixed subjunctive idioms",
                                    "type": "Grammar & Formal Directives",
                                    "icon": "⚖️",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Master the mandative subjunctive in high-level administrative, legal, and institutional English, and deploy fixed formulaic expressions like \"be that as it may\" and \"come what may\"."
                              },
                              {
                                    "id": "c1-u1-l2",
                                    "realLessonId": "c1-u1-l2",
                                    "title": "Inverted Conditionals and Rhetorical Clause Fronting",
                                    "subtitle": "Conditional omission of \"if\" with Had, Were, and Should",
                                    "type": "Grammar & Stylistic Inversion",
                                    "icon": "🔀",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Transform hypothetical conditionals into elegant inverted constructions by omitting \"if\", and deploy negative fronted adverbials for dramatic stylistic emphasis."
                              },
                              {
                                    "id": "c1-u1-l3",
                                    "realLessonId": "c1-u1-l3",
                                    "title": "Syntactic Density and Nominalisation in High Register",
                                    "subtitle": "Packaging dynamic processes into authoritative conceptual nouns",
                                    "type": "Writing & Information Density",
                                    "icon": "🧱",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Condense verb-heavy prose into compact, authoritative academic and executive discourse by transforming actions and descriptions into sophisticated nominal structures."
                              },
                              {
                                    "id": "c1-u1-l4",
                                    "realLessonId": "c1-u1-l4",
                                    "title": "Advanced Ellipsis, Clausal Substitution, and Discourse Economy",
                                    "subtitle": "Streamlining complex prose by eliminating redundant clausal elements",
                                    "type": "Grammar & Discourse Cohesion",
                                    "icon": "✂️",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Deploy advanced ellipsis and pro-forms like \"do so\", \"if any\", \"if ever\", and modal auxiliaries to achieve discourse economy without sacrificing clarity or precision."
                              },
                              {
                                    "id": "checkpoint-c1-1",
                                    "isCheckpoint": true,
                                    "title": "Advanced Syntax & Subjunctive Checkpoint",
                                    "subtitle": "Review mandative subjunctive, inverted conditionals & nominalisation",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "mint",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Demonstrate advanced syntactic control and information density."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "c1-s2",
            "sectionNumber": "02",
            "title": "Rhetorical Strategy, Academic Stance & Critical Synthesis",
            "tagline": "Interpret implicit subtext, master semantic prosody, and critique covert bias",
            "description": "Advance beyond literal meaning: analyze understated irony, deploy words with exact connotative awareness, leverage classical and extended metaphors, and uncover ideological bias in sophisticated essays and investigative journalism.",
            "units": [
                  {
                        "id": "c1-u2",
                        "unitNumber": "02",
                        "title": "Nuance, Connotation & Critical Textual Interpretation",
                        "eyebrow": "ADVANCED · CRITICAL LITERACY & SEMANTICS",
                        "objective": "Interpret implicit meaning and litotes, discriminate subtle connotations and semantic prosody, evaluate extended metaphors, and detect covert authorial stance.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c1-u2-l1",
                                    "realLessonId": "c1-u2-l1",
                                    "title": "Deciphering Implicit Meaning, Irony, and Understatement",
                                    "subtitle": "Reading between the lines: litotes, dry humor, and presupposition",
                                    "type": "Reading & Critical Comprehension",
                                    "icon": "🔍",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Learn to decode subtext, detect subtle sarcasm, and interpret deliberate understatements (litotes) in demanding literary, journalistic, and critical discourse."
                              },
                              {
                                    "id": "c1-u2-l2",
                                    "realLessonId": "c1-u2-l2",
                                    "title": "Connotative Precision, Nuance, and Semantic Prosody",
                                    "subtitle": "Discerning semantic prosody and emotional undertones among near-synonyms",
                                    "type": "Vocabulary & Semantic Discrimination",
                                    "icon": "🎯",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Master the delicate boundaries between near-synonyms by analyzing connotative shades, associative value, and semantic prosody (habitual positive or negative collocations)."
                              },
                              {
                                    "id": "c1-u2-l3",
                                    "realLessonId": "c1-u2-l3",
                                    "title": "Extended Metaphor, Literary Resonance, and Idiomatic Idioms",
                                    "subtitle": "Deploying sustained metaphorical frameworks and classical allusions",
                                    "type": "Vocabulary & Stylistic Resonance",
                                    "icon": "🏛️",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Harness extended metaphors and classical cultural allusions (Pyrrhic victory, Gordian knot, Damocles sword) to imbue analytical essays and speeches with depth and imagery."
                              },
                              {
                                    "id": "c1-u2-l4",
                                    "realLessonId": "c1-u2-l4",
                                    "title": "Unmasking Subtext, Authorial Stance, and Covert Bias",
                                    "subtitle": "Critical discourse analysis: scare quotes, evaluative adverbs, and positioning",
                                    "type": "Reading & Critical Discourse Analysis",
                                    "icon": "📰",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Analyze how high-level journalists, academics, and polemicists manipulate framing, scare quotes, and distancing adverbials to project subtle skepticism and ideological bias."
                              },
                              {
                                    "id": "checkpoint-c1-2",
                                    "isCheckpoint": true,
                                    "title": "Nuance & Critical Reading Checkpoint",
                                    "subtitle": "Review subtext, litotes, semantic prosody & covert bias",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "teal",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Verify capability in decoding implicit meaning and analyzing authorial stance."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "c1-s3",
            "sectionNumber": "03",
            "title": "Strategic Negotiation, Diplomatic Influence & Executive Discourse",
            "tagline": "Operate with academic rigor, master scholarly hedging, and synthesize complex paradigms",
            "description": "Command the language of academic inquiry and intellectual debate: critique empirical methodologies, deploy multi-layered epistemic hedging, synthesize contradictory data sources into cohesive literature reviews, and articulate complex theoretical systems.",
            "units": [
                  {
                        "id": "c1-u3",
                        "unitNumber": "03",
                        "title": "Academic Discourse, Stance & Source Synthesis",
                        "eyebrow": "ADVANCED · SCHOLARLY DISCOURSE & METHODOLOGY",
                        "objective": "Critique conflicting research methodologies, calibrate epistemic stance through advanced hedging, synthesize diverse scholarly perspectives, and explain intricate theoretical models.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c1-u3-l1",
                                    "realLessonId": "c1-u3-l1",
                                    "title": "Critical Evaluation of Conflicting Research Paradigms",
                                    "subtitle": "Epistemology, confounding variables, and methodological validity",
                                    "type": "Reading & Epistemology",
                                    "icon": "🔬",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Evaluate scholarly papers by dissecting research designs, recognizing sampling bias, isolating confounding variables, and distinguishing statistical correlation from genuine causality."
                              },
                              {
                                    "id": "c1-u3-l2",
                                    "realLessonId": "c1-u3-l2",
                                    "title": "Epistemic Stance and Multi-Layered Scholarly Hedging",
                                    "subtitle": "Calibrating degrees of certainty, probability, and academic modesty",
                                    "type": "Writing & Academic Precision",
                                    "icon": "🛡️",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Master multi-tiered hedging techniques combining modal verbs, epistemic adverbs, and tentative evaluative verbs to formulate defensible academic claims."
                              },
                              {
                                    "id": "c1-u3-l3",
                                    "realLessonId": "c1-u3-l3",
                                    "title": "Multi-Source Triangulation and Literature Synthesis",
                                    "subtitle": "Weaving conflicting viewpoints into an authoritative literature review",
                                    "type": "Writing & Academic Synthesis",
                                    "icon": "📚",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Synthesize contradictory empirical findings, reconcile theoretical disputes, and weave disparate academic voices into a seamless, critical literature review."
                              },
                              {
                                    "id": "c1-u3-l4",
                                    "realLessonId": "c1-u3-l4",
                                    "title": "Articulating Intricate Theoretical and Abstract Models",
                                    "subtitle": "Structuring multi-layered explanations of complex conceptual systems",
                                    "type": "Spoken Production & Conceptual Framing",
                                    "icon": "🌐",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Deliver structured, lucid explanations of abstract theoretical, scientific, and philosophical paradigms, balancing technical depth with pedagogical analogies."
                              },
                              {
                                    "id": "checkpoint-c1-3",
                                    "isCheckpoint": true,
                                    "title": "Academic Synthesis & Stance Checkpoint",
                                    "subtitle": "Review methodology critique, multi-tiered hedging & literature synthesis",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "indigo",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Demonstrate rigorous academic critique and thematic literature orchestration."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "c1-s4",
            "sectionNumber": "04",
            "title": "Advanced Stylistic Nuance, Textual Cohesion & C1 Milestone Mastery",
            "tagline": "Lead high-stakes negotiations, navigate crises, and command complete stylistic flexibility",
            "description": "Attain operational mastery across executive and academic domains: handle multilateral negotiations, issue high-stakes crisis communications, manipulate classical rhetorical schemes, master Theme-Rheme information flow, draft policy white papers, and achieve comprehensive C1 certification.",
            "units": [
                  {
                        "id": "c1-u4",
                        "unitNumber": "04",
                        "title": "High-Stakes Negotiation, Tact & Diplomatic Persuasion",
                        "eyebrow": "ADVANCED · DIPLOMACY & EXECUTIVE PERSUASION",
                        "objective": "Deploy strategic ambiguity in delicate negotiations, manage multi-party bargaining coalitions, steer corporate communications during crises, and harness classical oratorical schemes.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c1-u4-l1",
                                    "realLessonId": "c1-u4-l1",
                                    "title": "Diplomatic Tact, Euphemism, and Strategic Ambiguity",
                                    "subtitle": "Saving face, constructive vagueness, and de-escalating commercial friction",
                                    "type": "Spoken Interaction & Diplomatic Tact",
                                    "icon": "🕊️",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Deploy intentional strategic ambiguity and diplomatic face-saving formulas to preserve working relationships during high-friction international and commercial disagreements."
                              },
                              {
                                    "id": "c1-u4-l2",
                                    "realLessonId": "c1-u4-l2",
                                    "title": "Multi-Party Coalition Bargaining and Deadlock Resolution",
                                    "subtitle": "Packaging concessions, building consensus, and reframing stalemates",
                                    "type": "Spoken Interaction & Advanced Negotiation",
                                    "icon": "🤝",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Master multi-party negotiations by brokering tripartite trade-offs, orchestrating contingent concessions, and breaking entrenched stalemates through conceptual reframing."
                              },
                              {
                                    "id": "c1-u4-l3",
                                    "realLessonId": "c1-u4-l3",
                                    "title": "Executive Crisis Communication and Reputational Management",
                                    "subtitle": "Steering organizational narrative under public and regulatory scrutiny",
                                    "type": "Spoken Production & Crisis Framing",
                                    "icon": "⚡",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Deliver authoritative crisis statements, address public outrage, navigate regulatory grilling, and acknowledge responsibility without incurring catastrophic legal liability."
                              },
                              {
                                    "id": "c1-u4-l4",
                                    "realLessonId": "c1-u4-l4",
                                    "title": "Classical Rhetorical Architecture and Oratorical Impact",
                                    "subtitle": "Tricolon, chiasmus, antithesis, and periodic sentence build-up",
                                    "type": "Spoken Production & Rhetoric",
                                    "icon": "🏛️",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Harness classical oratorical schemes—including the rule of three (tricolon), syntactic inversion (chiasmus), balanced antithesis, and periodic sentence structures—to deliver unforgettable speeches."
                              },
                              {
                                    "id": "checkpoint-c1-4",
                                    "isCheckpoint": true,
                                    "title": "Diplomatic Influence & Oratory Checkpoint",
                                    "subtitle": "Review strategic ambiguity, multi-party bargaining & rhetorical schemes",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "blue",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Confirm executive capability in high-stakes negotiation and crisis communication."
                              }
                        ]
                  },
                  {
                        "id": "c1-u5",
                        "unitNumber": "05",
                        "title": "Stylistic Precision, Rhetorical Cohesion & C1 Capstone",
                        "eyebrow": "ADVANCED · MASTER COHESION & CERTIFICATION",
                        "objective": "Orchestrate Theme-Rheme information packaging, switch registers across specialized genres, draft high-level policy white papers, and demonstrate comprehensive C1 mastery.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c1-u5-l1",
                                    "realLessonId": "c1-u5-l1",
                                    "title": "Advanced Information Flow, Theme-Rheme, and Cohesive Devices",
                                    "subtitle": "The architecture of prose: given-to-new distribution and macro-cohesion",
                                    "type": "Writing & Textual Dynamics",
                                    "icon": "🌊",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Control the flow of information across paragraphs using functional sentence perspective (Theme-Rheme dynamics), macro-cohesion, and advanced anaphoric chains."
                              },
                              {
                                    "id": "c1-u5-l2",
                                    "realLessonId": "c1-u5-l2",
                                    "title": "Dynamic Register Switching and Contextual Style Shifting",
                                    "subtitle": "Pivoting seamlessly between executive, legal, academic, and colloquial registers",
                                    "type": "Pragmatics & Register Flexibility",
                                    "icon": "🎭",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Demonstrate linguistic chameleonic flexibility: adjust tone, formality, lexical density, and syntactic complexity to suit boardroom, legal, peer, and public media contexts."
                              },
                              {
                                    "id": "c1-u5-l3",
                                    "realLessonId": "c1-u5-l3",
                                    "title": "Authoring Comprehensive Strategic Policy White Papers",
                                    "subtitle": "Structuring executive diagnostics, option matrices, and risk assessments",
                                    "type": "Writing & Strategic Policy",
                                    "icon": "📑",
                                    "color": "mint",
                                    "xp": 95,
                                    "duration": "6 min",
                                    "description": "Structure and compose authoritative policy white papers featuring executive summaries, contextual environmental scanning, option matrices, and prioritized recommendations."
                              },
                              {
                                    "id": "c1-u5-l4",
                                    "realLessonId": "c1-u5-l4",
                                    "title": "C1 Advanced English Comprehensive Milestone Synthesis",
                                    "subtitle": "Holistic operational proficiency across syntax, nuance, and executive communication",
                                    "type": "Milestone Assessment & Holistic Mastery",
                                    "icon": "🎓",
                                    "color": "mint",
                                    "xp": 120,
                                    "duration": "8 min",
                                    "description": "Demonstrate holistic C1 advanced English mastery across mandative subjunctives, inverted conditionals, subtle irony, academic hedging, and high-stakes negotiation."
                              },
                              {
                                    "id": "checkpoint-c1-capstone",
                                    "isCheckpoint": true,
                                    "title": "C1 Advanced English Certificate",
                                    "subtitle": "Comprehensive C1 effective operational proficiency evaluation",
                                    "type": "Level Milestone",
                                    "icon": "🏆",
                                    "color": "mint",
                                    "xp": 150,
                                    "duration": "8 min",
                                    "description": "Complete the Advanced stage and earn your official C1 proficiency badge!"
                              }
                        ]
                  }
            ]
      }
]
  },
  {
    id: 'c2',
    code: 'C2',
    name: 'Mastery English',
    badge: 'Mastery',
    tagline: 'Effortless native-level expression',
    objective: 'Understand with ease virtually everything heard or read, reconstructing arguments coherently.',
    accent: 'coral',
    isDemoOnly: false,
    estimatedHours: '100 hrs',
    sections: [
      {
            "id": "sec-c2-1",
            "sectionNumber": "01",
            "title": "Finer Shades of Meaning, Complex Inference & Subtle Ambiguity",
            "tagline": "Deconstruct profound subtext, decipher multi-layered ambiguity, and calibrate epistemic stance in demanding intellectual discourse.",
            "description": "Deconstruct profound subtext, decipher multi-layered ambiguity, and calibrate epistemic stance in demanding intellectual discourse.",
            "units": [
                  {
                        "id": "u-c2-1",
                        "unitNumber": "01",
                        "title": "Hermeneutics, Subtext & Pragmatic Implicature",
                        "eyebrow": "MASTERY · C2 EXCELLENCE",
                        "objective": "Master reading between the lines of dense literature, resolving syntactical ambiguities, and navigating fine evidential gradients.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c2-u1-l1",
                                    "realLessonId": "c2-u1-l1",
                                    "title": "Deciphering Implicit Meaning & Hermeneutic Depth",
                                    "subtitle": "Unpacking implicit authorial intent and cultural subtext",
                                    "type": "Reading between the lines of dense literary and critical prose to extract oblique authorial commentary and ideological undercurrents.",
                                    "icon": "BookOpen",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Explore the interpretive architecture of complex prose, identifying how syntactic positioning, evocative diction, and selective omission signal deep implicit meaning."
                              },
                              {
                                    "id": "c2-u1-l2",
                                    "realLessonId": "c2-u1-l2",
                                    "title": "Untangling Syntactic & Semantic Ambiguity",
                                    "subtitle": "Resolving structural equivocations and garden-path subtleties",
                                    "type": "Dissecting syntactic equivocations, scope ambiguities, and lexical polysemy in complex legal, philosophical, and literary texts.",
                                    "icon": "GitFork",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Analyze how syntactic modifiers, prepositional attachment, and quantificational scope create competing interpretations, and learn how to disambiguate or wield them purposefully."
                              },
                              {
                                    "id": "c2-u1-l3",
                                    "realLessonId": "c2-u1-l3",
                                    "title": "Hyper-Nuanced Epistemic Gradients & Evidentiality",
                                    "subtitle": "Calibrating minute distinctions in probability and epistemic justification",
                                    "type": "Fine-tuning evidential stance and probabilistic gradation using modal auxiliaries, epistemic adverbs, and lexical hedges.",
                                    "icon": "Gauge",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Master the delicate spectrum between categorical assertion, plausible presumption, tenuous conjecture, and guarded skepticism in high-level intellectual argumentation."
                              },
                              {
                                    "id": "c2-u1-l4",
                                    "realLessonId": "c2-u1-l4",
                                    "title": "Milestone Checkpoint: Interpretive Mastery",
                                    "subtitle": "Synthesizing subtext, syntactic ambiguity, and epistemic gradation",
                                    "type": "Integrated synthesis of hermeneutic interpretation, structural disambiguation, and epistemic stance calibration.",
                                    "icon": "Award",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Assess and consolidate your ability to navigate ambiguous literary prose, identify subtle authorial irony, and evaluate complex epistemic justifications."
                              },
                              {
                                    "id": "checkpoint-c2-1",
                                    "isCheckpoint": true,
                                    "title": "Interpretive & Hermeneutic Checkpoint",
                                    "subtitle": "Review subtext, syntactic ambiguity & epistemic gradients",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Demonstrate advanced interpretive authority and precision."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "sec-c2-2",
            "sectionNumber": "02",
            "title": "Dialectical Architecture, Rhetoric & Counter-Argumentation",
            "tagline": "Critique unstated premises, dissect covert sophistry and fallacies, and manage dialectical tensions in high-stakes intellectual debate.",
            "description": "Critique unstated premises, dissect covert sophistry and fallacies, and manage dialectical tensions in high-stakes intellectual debate.",
            "units": [
                  {
                        "id": "u-c2-2",
                        "unitNumber": "01",
                        "title": "Advanced Dialectics, Fallacy Detection & Rhetorical Framing",
                        "eyebrow": "MASTERY · C2 EXCELLENCE",
                        "objective": "Master logical deconstruction, premise extraction, fallacy identification, and dialectical synthesis.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c2-u2-l1",
                                    "realLessonId": "c2-u2-l1",
                                    "title": "Exposing Hidden Premises & Unstated Assumptions",
                                    "subtitle": "Dismantling enthymemes and uncovering philosophical presuppositions",
                                    "type": "Isolating unarticulated premises (enthymematic reasoning) that underwrite complex policy, legal, and ethical arguments.",
                                    "icon": "Layers",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Learn how to detect when an argument relies upon tacit axioms, excavating unstated presuppositions that determine logical validity."
                              },
                              {
                                    "id": "c2-u2-l2",
                                    "realLessonId": "c2-u2-l2",
                                    "title": "Detecting Sophistry, Cognitive Bias & Rhetorical Fallacies",
                                    "subtitle": "Unmasking subtle fallacies of relevance, equivocation, and framing bias",
                                    "type": "Diagnosing advanced rhetorical fallacies, such as the reification fallacy, motte-and-bailey maneuvers, and covert straw-man distortions.",
                                    "icon": "ShieldAlert",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Develop an acute sensitivity to high-level sophistry where deceptive rhetorical structures mimic legitimate intellectual argumentation."
                              },
                              {
                                    "id": "c2-u2-l3",
                                    "realLessonId": "c2-u2-l3",
                                    "title": "Reframing Paradoxes & Dialectical Tension",
                                    "subtitle": "Synthesizing antithetical propositions into higher-order conceptual harmony",
                                    "type": "Deploying Hegelian dialectical structures (thesis-antithesis-synthesis) to transcend apparent cognitive paradoxes.",
                                    "icon": "Shuffle",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Learn how to frame seemingly contradictory truths not as zero-sum conflicts, but as complementary dimensions of a deeper, systemic reality."
                              },
                              {
                                    "id": "c2-u2-l4",
                                    "realLessonId": "c2-u2-l4",
                                    "title": "Milestone Checkpoint: Dialectical Precision",
                                    "subtitle": "Integrated mastery of premise deconstruction, fallacy exposure, and synthesis",
                                    "type": "Comprehensive assessment of analytical argumentation, logical architecture, and dialectical synthesis.",
                                    "icon": "Award",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Evaluate your capacity to dismantle complex sophistry, expose unstated cultural axioms, and formulate elegant dialectical solutions under rigorous examination."
                              },
                              {
                                    "id": "checkpoint-c2-2",
                                    "isCheckpoint": true,
                                    "title": "Dialectical & Logic Checkpoint",
                                    "subtitle": "Review hidden premises, sophistry & paradoxical reframing",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Demonstrate rigorous fallacy detection and dialectical framing."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "sec-c2-3",
            "sectionNumber": "03",
            "title": "Intertextual Synthesis, Critical Evaluation & Source Reconciliation",
            "tagline": "Reconcile conflicting empirical sources, formulate devastating yet measured methodological critiques, and master high-density syntactic compression.",
            "description": "Reconcile conflicting empirical sources, formulate devastating yet measured methodological critiques, and master high-density syntactic compression.",
            "units": [
                  {
                        "id": "u-c2-3",
                        "unitNumber": "01",
                        "title": "Reconciling Divergent Sources & Epistemic Authority",
                        "eyebrow": "MASTERY · C2 EXCELLENCE",
                        "objective": "Master scholarly synthesis, reconciling divergent data, uncovering methodological flaws, and executing extreme information density.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c2-u3-l1",
                                    "realLessonId": "c2-u3-l1",
                                    "title": "Reconciling Antinomic & Discrepant Source Evidence",
                                    "subtitle": "Synthesizing conflicting empirical datasets and divergent scholarly accounts",
                                    "type": "Synthesizing multiple conflicting primary sources and meta-analyses into a coherent explanatory paradigm.",
                                    "icon": "GitMerge",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Learn how to resolve apparent empirical contradictions between disparate research studies by identifying unstandardized variables, temporal horizons, and cohort differences."
                              },
                              {
                                    "id": "c2-u3-l2",
                                    "realLessonId": "c2-u3-l2",
                                    "title": "Calibrating Epistemic Humility & Methodological Critique",
                                    "subtitle": "Delivering exacting, forensic critiques of research design and claims",
                                    "type": "Evaluating methodological design, statistical power, survivor bias, and p-hacking in academic literature.",
                                    "icon": "CheckCircle2",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Master the rhetoric of methodological peer review, delivering devastatingly accurate critiques with consummate academic decorum and epistemic humility."
                              },
                              {
                                    "id": "c2-u3-l3",
                                    "realLessonId": "c2-u3-l3",
                                    "title": "High-Order Information Density & Syntactic Compression",
                                    "subtitle": "Packaging multi-propositional complexity into concise, elegant prose",
                                    "type": "Mastering absolute constructions, participial reduction, nominalization, and appositive brackets to maximize informational density.",
                                    "icon": "Minimize2",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Learn how to eliminate flab and redundant scaffolding, compressing multiple complex propositions into masterfully balanced, dense periodic sentences."
                              },
                              {
                                    "id": "c2-u3-l4",
                                    "realLessonId": "c2-u3-l4",
                                    "title": "Milestone Checkpoint: Intertextual Synthesis",
                                    "subtitle": "Synthesizing conflicting sources, methodological critique, and syntactic compression",
                                    "type": "Comprehensive assessment of source reconciliation, methodological peer review, and information-dense syntactic compression.",
                                    "icon": "Award",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Demonstrate your ability to reconcile competing academic studies, deliver rigorous methodological critique, and produce dense, authoritative intertextual reviews."
                              },
                              {
                                    "id": "checkpoint-c2-3",
                                    "isCheckpoint": true,
                                    "title": "Intertextual Synthesis Checkpoint",
                                    "subtitle": "Review source reconciliation, peer critique & syntactic compression",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Verify capability in harmonizing divergent data and high-density prose."
                              }
                        ]
                  }
            ]
      },
      {
            "id": "sec-c2-4",
            "sectionNumber": "04",
            "title": "Lexical Virtuosity, Stylistic Polyphony & Ultimate Mastery",
            "tagline": "Attain chameleonic register agility, master biting litotes and cultural idiom, deconstruct ideological frames, and achieve absolute native-level operational command.",
            "description": "Attain chameleonic register agility, master biting litotes and cultural idiom, deconstruct ideological frames, and achieve absolute native-level operational command.",
            "units": [
                  {
                        "id": "u-c2-4",
                        "unitNumber": "01",
                        "title": "Stylistic Chameleonics, Irony & Register Mastery",
                        "eyebrow": "MASTERY · C2 EXCELLENCE",
                        "objective": "Master effortless stylistic shifts between ceremonial grandeur, sardonic irony, and aphoristic native wit.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c2-u4-l1",
                                    "realLessonId": "c2-u4-l1",
                                    "title": "Chameleonic Register Shifts & Stylistic Pastiche",
                                    "subtitle": "Effortless code-switching across formal, vernacular, and academic registers",
                                    "type": "Dynamic sociolinguistic calibration, moving seamlessly between elevated ceremonial prose and colloquial nuance without jarring stylistic dissonance.",
                                    "icon": "Palette",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Explore the social mechanics of register, learning how to adapt lexical choice, sentence cadence, and idiom to micro-shifts in audience, power dynamics, and genre."
                              },
                              {
                                    "id": "c2-u4-l2",
                                    "realLessonId": "c2-u4-l2",
                                    "title": "Socratic Irony, Litotes & Advanced Understatement",
                                    "subtitle": "The art of saying more by saying less: ironic restraint and rhetorical litotes",
                                    "type": "Mastering litotes, antiphrasis, and deadpan British/Anglophone understatement to express supreme critique and subtle wit.",
                                    "icon": "Smile",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Master the understated, ironic modes of expression where negation of the opposite conveys biting praise, devastating skepticism, or quiet confidence."
                              },
                              {
                                    "id": "c2-u4-l3",
                                    "realLessonId": "c2-u4-l3",
                                    "title": "Culturally Entrenched Idiom & Aphoristic Wit",
                                    "subtitle": "Navigating high-culture idioms, literary aphorisms, and cultural shorthand",
                                    "type": "Mastery of obscure, culturally entrenched idioms, classical allusions, and razor-sharp aphoristic wit.",
                                    "icon": "Sparkles",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Acquire native familiarity with culturally dense idioms, classical tropes, and Shakespearean/biblical idioms that permeate sophisticated journalism and debate."
                              },
                              {
                                    "id": "c2-u4-l4",
                                    "realLessonId": "c2-u4-l4",
                                    "title": "Milestone Checkpoint: Stylistic Virtuosity",
                                    "subtitle": "Demonstrating chameleonic register, biting litotes, and cultural idiom",
                                    "type": "Comprehensive evaluation of stylistic agility, ironic subtlety, and idiomatic sophistication.",
                                    "icon": "Award",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Prove your ability to adapt register dynamically, employ devastating understatement, and deploy culturally resonant metaphors with effortless native elegance."
                              },
                              {
                                    "id": "checkpoint-c2-4",
                                    "isCheckpoint": true,
                                    "title": "Stylistic Virtuosity Checkpoint",
                                    "subtitle": "Review chameleonic register, litotes & cultural idiom",
                                    "type": "Milestone Assessment",
                                    "icon": "⭐",
                                    "color": "coral",
                                    "xp": 110,
                                    "duration": "7 min",
                                    "description": "Confirm expressive flexibility, ironic subtlety, and idiomatic wit."
                              }
                        ]
                  },
                  {
                        "id": "u-c2-5",
                        "unitNumber": "02",
                        "title": "Master Synthesis & Effortless Native-Level Command",
                        "eyebrow": "MASTERY · C2 EXCELLENCE",
                        "objective": "The pinnacle of English mastery: deconstructing ideological framing, executing high-stakes diplomacy, and achieving effortless operational command.",
                        "isDemo": false,
                        "lessons": [
                              {
                                    "id": "c2-u5-l1",
                                    "realLessonId": "c2-u5-l1",
                                    "title": "Deconstructing Ideological Framing in High-Stakes Texts",
                                    "subtitle": "Dissecting covert cognitive frames, semantic loading, and presuppositional triggers",
                                    "type": "Forensic discourse analysis of political manifestos, geopolitical treaties, and media narratives to isolate invisible ideological framing.",
                                    "icon": "Eye",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Master the tools of critical discourse analysis, exposing how lexical choices, metaphors, and passive constructions construct reality to favor specific power interests."
                              },
                              {
                                    "id": "c2-u5-l2",
                                    "realLessonId": "c2-u5-l2",
                                    "title": "Consummate Diplomatic Finesse & Ambiguity by Design",
                                    "subtitle": "The craft of constructive ambiguity, face-saving, and multilateral consensus",
                                    "type": "Crafting international communiqués, bilateral treaties, and executive arbitration where strategic ambiguity bridges seemingly irreconcilable demands.",
                                    "icon": "Globe",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Master the delicate art of international diplomacy, learning how to engineer language that allows two antagonistic parties to sign the same document under competing domestic interpretations."
                              },
                              {
                                    "id": "c2-u5-l3",
                                    "realLessonId": "c2-u5-l3",
                                    "title": "Spontaneous Rhetorical Counter-Positioning",
                                    "subtitle": "Real-time argument deconstruction, pivot mastery, and intellectual agility",
                                    "type": "Dynamic debate tactics, spontaneous reframing, turning an opponent’s metaphor against them, and rhetorical jujitsu.",
                                    "icon": "Zap",
                                    "color": "coral",
                                    "xp": 100,
                                    "duration": "6 min",
                                    "description": "Develop the spontaneous reflexes required to seize an opponent’s strongest argument in live debate, invert its premises, and turn its momentum into your decisive victory."
                              },
                              {
                                    "id": "c2-u5-l4",
                                    "realLessonId": "c2-u5-l4",
                                    "title": "C2 Grand Capstone: Absolute Operational Mastery",
                                    "subtitle": "The comprehensive culmination of native-level CEFR C2 proficiency",
                                    "type": "Comprehensive, holistic synthesis of interpretation, logic, rhetoric, stylistic virtuosity, and native-level communicative mastery.",
                                    "icon": "Crown",
                                    "color": "coral",
                                    "xp": 150,
                                    "duration": "10 min",
                                    "description": "The definitive milestone of the Lingo English-learning platform. Synthesize complex hermeneutics, dialectical logic, forensic critique, and stylistic polyphony across all domains of human discourse."
                              },
                              {
                                    "id": "checkpoint-c2-capstone",
                                    "isCheckpoint": true,
                                    "title": "C2 Mastery English Grand Certificate",
                                    "subtitle": "Ultimate CEFR C2 operational proficiency evaluation",
                                    "type": "Level Milestone",
                                    "icon": "👑",
                                    "color": "coral",
                                    "xp": 200,
                                    "duration": "10 min",
                                    "description": "Complete the Mastery level and earn the highest CEFR C2 English diploma!"
                              }
                        ]
                  }
            ]
      }
]
  }
];

/**
 * Checks whether a curriculum item is an actual interactive lesson (not a milestone/checkpoint).
 */
export function isActualLesson(item) {
  return !!item && !item.isCheckpoint;
}

/**
 * Returns all actual lessons in a unit.
 */
export function getUnitLessons(unit) {
  return (unit?.lessons || []).filter(isActualLesson);
}

/**
 * Returns all actual lessons in a section.
 */
export function getSectionLessons(section) {
  return (section?.units || []).flatMap(getUnitLessons);
}

/**
 * Returns all actual lessons in a CEFR level.
 */
export function getLevelLessons(level) {
  return (level?.sections || []).flatMap(getSectionLessons);
}

/**
 * Returns all actual lessons across all active (non-demo) levels.
 */
export function getAllActiveLessons(levels = CEFR_LEVELS) {
  return levels.filter(lvl => !lvl.isDemoOnly).flatMap(getLevelLessons);
}

/**
 * Calculates level stats given the user's completed lesson IDs.
 */
export function calculateLevelProgress(level, userCompleted = []) {
  const actualLessons = getLevelLessons(level);
  const total = actualLessons.length;
  // Count completed real lessons or demo markers
  const completedCount = actualLessons.filter(l => userCompleted.includes(l.realLessonId || l.id)).length;
  const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  let status = 'available';
  if (completedCount === total && total > 0) {
    status = 'completed';
  } else if (level.isDemoOnly) {
    status = 'preview';
  } else if (completedCount > 0) {
    status = 'in_progress';
  }

  return {
    total,
    completedCount,
    percentage,
    status
  };
}

/**
 * Gets the status of an individual lesson node:
 * - 'completed'
 * - 'current' (recommended next lesson)
 * - 'available'
 * - 'locked'
 */
export function getLessonStatus(lesson, userCompleted = [], activeLessonId = null) {
  const isReal = !!lesson.realLessonId;
  const isCompleted = userCompleted.includes(lesson.realLessonId || lesson.id);

  if (isCompleted) {
    return 'completed';
  }

  if (isReal) {
    // If this lesson is the currently active lesson recommendation
    if (activeLessonId && lesson.realLessonId === activeLessonId) {
      return 'current';
    }

    // Check if prerequisite real lesson is completed
    const realIndex = realLessons.findIndex(r => r.id === lesson.realLessonId);
    if (realIndex === 0) {
      return 'current'; // first lesson is always available / current if not completed
    }
    const prevReal = realLessons[realIndex - 1];
    if (userCompleted.includes(prevReal.id)) {
      return activeLessonId === lesson.realLessonId ? 'current' : 'available';
    }
    return 'locked';
  }

  // Demonstration curriculum lessons:
  // Checkpoints are locked until the unit's preceding lessons are completed
  if (lesson.isCheckpoint) {
    return 'locked';
  }

  // In demo sections, lessons are previewable
  return 'preview';
}
