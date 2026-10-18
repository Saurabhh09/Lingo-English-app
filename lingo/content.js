import { CURRICULUM_CATALOG } from './server/curriculumCatalog.mjs';

/**
 * Normalized lessons derived directly from the canonical CURRICULUM_CATALOG.
 * Preserves the exact interactive quiz structure [prompt, options, correctIndex, explanation].
 */
export const lessons = [];
for (const level of CURRICULUM_CATALOG.levels) {
  for (const section of level.sections) {
    for (const unit of section.units) {
      for (const lesson of unit.lessons) {
        lessons.push({
          id: lesson.id,
          unit: parseInt(unit.unitNumber, 10) || 1,
          title: lesson.title,
          subtitle: lesson.subtitle,
          icon: lesson.icon,
          color: lesson.accentColor,
          xp: lesson.xp,
          description: lesson.description,
          questions: (lesson.exercises || []).map(ex => [
            ex.prompt,
            ex.options,
            ex.solutionKey?.correctIndex ?? 0,
            ex.explanation
          ])
        });
      }
    }
  }
}

export const extraQuestions = {
  Beginner: [
    ['Choose the opposite of “big”.', ['Tall', 'Small', 'Wide', 'Long'], 1, '“Small” is the opposite of “big”.'],
    ['Complete: “She has ___ umbrella.”', ['a', 'an', 'the a', 'two'], 1, 'Use “an” before a vowel sound.'],
    ['How many days are in a week?', ['Five', 'Six', 'Seven', 'Eight'], 2, 'There are seven days in a week.'],
    ['Which word is a color?', ['Happy', 'Blue', 'Chair', 'Walk'], 1, 'Blue is a color.'],
    ['Complete: “The cat is ___ the table.”', ['under', 'happy', 'eating', 'fast'], 0, '“Under” describes a position below something.']
  ],
  Intermediate: [
    ['Complete: “I have lived here ___ 2020.”', ['for', 'since', 'during', 'at'], 1, 'Use “since” with a starting point in time.'],
    ['Choose the correct conditional.', ['If it rains, I will stay home.', 'If it rain, I stay home.', 'If it rains, I stayed home.', 'If rains, I will home.'], 0, 'First conditional: if + present simple, will + base verb.'],
    ['“Look after” means…', ['Search for', 'Take care of', 'Look behind', 'Leave alone'], 1, '“Look after” means to take care of someone or something.'],
    ['Complete: “This book is ___ than that one.”', ['interesting', 'most interesting', 'more interesting', 'interest'], 2, 'Use “more” to compare longer adjectives.'],
    ['Choose the correct sentence.', ['I have never been to Paris.', 'I never have went Paris.', 'I have never go Paris.', 'I never been Paris.'], 0, 'Present perfect uses have + past participle.']
  ],
  Advanced: [
    ['“Ubiquitous” means…', ['Rare', 'Present everywhere', 'Uncertain', 'Temporary'], 1, 'Something ubiquitous seems to be everywhere.'],
    ['Complete: “Had I known, I ___ helped.”', ['will have', 'would have', 'would', 'had'], 1, 'This is an inverted third conditional: Had I known, I would have helped.'],
    ['Choose the correct subjunctive.', ['I suggest that he is on time.', 'I suggest that he be on time.', 'I suggest that he was on time.', 'I suggest that he being on time.'], 1, 'After “suggest that”, a formal subjunctive uses the base verb “be”.'],
    ['“A blessing in disguise” is…', ['A hidden mistake', 'Something bad that turns out well', 'An obvious advantage', 'An impossible task'], 1, 'An apparent setback can later prove beneficial.'],
    ['Complete: “No sooner had I arrived ___ it began to rain.”', ['when', 'than', 'then', 'that'], 1, 'The paired expression is “no sooner … than”.']
  ]
};

export function questionPool(topic, difficulty) {
  let pool = topic === 'Grammar'
    ? lessons.filter(l => ['sentences', 'past'].includes(l.id)).flatMap(l => l.questions)
    : topic === 'Food & drinks'
      ? lessons.find(l => l.id === 'food')?.questions || lessons.flatMap(l => l.questions)
      : topic === 'Conversation'
        ? lessons.filter(l => ['hello', 'confidence'].includes(l.id)).flatMap(l => l.questions)
        : topic === 'Vocabulary'
          ? lessons.find(l => l.id === 'everyday')?.questions || lessons.flatMap(l => l.questions)
          : lessons.flatMap(l => l.questions);

  if (difficulty === 'Advanced') {
    pool = [...extraQuestions.Advanced, ...(topic === 'Mixed English' ? extraQuestions.Intermediate : pool)];
  } else if (difficulty === 'Intermediate') {
    pool = [...extraQuestions.Intermediate, ...pool];
  } else {
    pool = [...pool, ...extraQuestions.Beginner];
  }
  return pool;
}
