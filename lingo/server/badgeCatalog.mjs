/**
 * Lingo Achievement & Badge Catalog (36+ Collectible Achievements)
 *
 * Expandable architecture: add new badge entries with a metric key & target
 * without modifying evaluation core or UI components.
 */

export const BADGE_CATEGORIES = [
  { id: 'all', label: 'All', color: 'lime' },
  { id: 'unit', label: 'Units', color: 'green' },
  { id: 'section', label: 'Sections', color: 'blue' },
  { id: 'cefr', label: 'CEFR Levels', color: 'gold' },
  { id: 'streak', label: 'Streaks', color: 'orange' },
  { id: 'learning', label: 'Learning', color: 'purple' }
];

export const BADGE_CATALOG = [
  // =========================================================================
  // CATEGORY A: UNIT ACHIEVEMENTS (Green)
  // =========================================================================
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first unit.',
    requirementText: 'Complete 1 unit to unlock First Steps.',
    category: 'unit',
    icon: 'unit_book_check',
    rarity: 'common',
    color: 'green',
    ribbonText: 'Unit Complete',
    unlockCondition: { metric: 'unitsCompleted', target: 1, unitLabel: 'unit' }
  },
  {
    id: 'unit_explorer',
    name: 'Unit Explorer',
    description: 'Complete 5 units.',
    requirementText: 'Complete 5 units to unlock Unit Explorer.',
    category: 'unit',
    icon: 'unit_compass',
    rarity: 'rare',
    color: 'green',
    ribbonText: '5 Units',
    unlockCondition: { metric: 'unitsCompleted', target: 5, unitLabel: 'units' }
  },
  {
    id: 'unit_collector',
    name: 'Unit Collector',
    description: 'Complete 10 units.',
    requirementText: 'Complete 10 units to unlock Unit Collector.',
    category: 'unit',
    icon: 'unit_stack',
    rarity: 'rare',
    color: 'green',
    ribbonText: '10 Units',
    unlockCondition: { metric: 'unitsCompleted', target: 10, unitLabel: 'units' }
  },
  {
    id: 'unit_master',
    name: 'Unit Master',
    description: 'Complete 25 units.',
    requirementText: 'Complete 25 units to unlock Unit Master.',
    category: 'unit',
    icon: 'unit_puzzle',
    rarity: 'epic',
    color: 'green',
    ribbonText: '25 Units',
    unlockCondition: { metric: 'unitsCompleted', target: 25, unitLabel: 'units' }
  },
  {
    id: 'unit_champion',
    name: 'Unit Champion',
    description: 'Complete 50 units.',
    requirementText: 'Complete 50 units to unlock Unit Champion.',
    category: 'unit',
    icon: 'unit_trophy',
    rarity: 'epic',
    color: 'green',
    ribbonText: '50 Units',
    unlockCondition: { metric: 'unitsCompleted', target: 50, unitLabel: 'units' }
  },
  {
    id: 'perfect_unit',
    name: 'Perfect Unit',
    description: 'Complete a unit with a perfect score.',
    requirementText: 'Score 100% on every lesson in a unit to unlock Perfect Unit.',
    category: 'unit',
    icon: 'unit_gem_star',
    rarity: 'rare',
    color: 'green',
    ribbonText: '100% Unit',
    unlockCondition: { metric: 'perfectUnits', target: 1, unitLabel: 'perfect unit' }
  },
  {
    id: 'speed_learner',
    name: 'Speed Learner',
    description: 'Complete a unit within the specified time target.',
    requirementText: 'Complete all lessons in a unit within its target duration.',
    category: 'unit',
    icon: 'unit_rocket',
    rarity: 'rare',
    color: 'green',
    ribbonText: 'Fast Unit',
    unlockCondition: { metric: 'fastUnits', target: 1, unitLabel: 'timed unit' }
  },
  {
    id: 'consistent_learner',
    name: 'Consistent Learner',
    description: 'Complete 5 units without skipping a day.',
    requirementText: 'Complete 5 units across consecutive study days without skipping.',
    category: 'unit',
    icon: 'unit_calendar_chain',
    rarity: 'epic',
    color: 'green',
    ribbonText: '5-Day Run',
    unlockCondition: { metric: 'consecutiveUnitStreak', target: 5, unitLabel: 'consecutive units' }
  },

  // =========================================================================
  // CATEGORY B: SECTION ACHIEVEMENTS (Blue)
  // =========================================================================
  {
    id: 'section_starter',
    name: 'Section Starter',
    description: 'Complete your first section.',
    requirementText: 'Complete 1 section to unlock Section Starter.',
    category: 'section',
    icon: 'section_flag',
    rarity: 'common',
    color: 'blue',
    ribbonText: '1st Section',
    unlockCondition: { metric: 'sectionsCompleted', target: 1, unitLabel: 'section' }
  },
  {
    id: 'section_explorer',
    name: 'Section Explorer',
    description: 'Complete 3 sections.',
    requirementText: 'Complete 3 sections to unlock Section Explorer.',
    category: 'section',
    icon: 'section_books',
    rarity: 'rare',
    color: 'blue',
    ribbonText: '3 Sections',
    unlockCondition: { metric: 'sectionsCompleted', target: 3, unitLabel: 'sections' }
  },
  {
    id: 'section_master',
    name: 'Section Master',
    description: 'Complete 5 sections.',
    requirementText: 'Complete 5 sections to unlock Section Master.',
    category: 'section',
    icon: 'section_compass',
    rarity: 'epic',
    color: 'blue',
    ribbonText: '5 Sections',
    unlockCondition: { metric: 'sectionsCompleted', target: 5, unitLabel: 'sections' }
  },
  {
    id: 'section_champion',
    name: 'Section Champion',
    description: 'Complete 10 sections.',
    requirementText: 'Complete 10 sections to unlock Section Champion.',
    category: 'section',
    icon: 'section_shield',
    rarity: 'epic',
    color: 'blue',
    ribbonText: '10 Sections',
    unlockCondition: { metric: 'sectionsCompleted', target: 10, unitLabel: 'sections' }
  },
  {
    id: 'perfect_section',
    name: 'Perfect Section',
    description: 'Complete all lessons in a section with perfect scores.',
    requirementText: 'Achieve 100% in every lesson of a single section.',
    category: 'section',
    icon: 'section_bullseye',
    rarity: 'epic',
    color: 'blue',
    ribbonText: '100% Section',
    unlockCondition: { metric: 'perfectSections', target: 1, unitLabel: 'perfect section' }
  },
  {
    id: 'knowledge_keeper',
    name: 'Knowledge Keeper',
    description: 'Complete every unit in a section.',
    requirementText: 'Finish all units inside any section to unlock Knowledge Keeper.',
    category: 'section',
    icon: 'section_scroll',
    rarity: 'rare',
    color: 'blue',
    ribbonText: 'Full Section',
    unlockCondition: { metric: 'sectionsCompleted', target: 1, unitLabel: 'section' }
  },
  {
    id: 'section_legend',
    name: 'Section Legend',
    description: 'Complete all sections in a CEFR level.',
    requirementText: 'Complete every section within any full CEFR level.',
    category: 'section',
    icon: 'section_crown',
    rarity: 'epic',
    color: 'blue',
    ribbonText: 'Level Sections',
    unlockCondition: { metric: 'levelsCompleted', target: 1, unitLabel: 'CEFR level' }
  },

  // =========================================================================
  // CATEGORY C: CEFR LEVEL ACHIEVEMENTS (Gold)
  // =========================================================================
  {
    id: 'starter_graduate',
    name: 'Starter Graduate',
    description: 'Complete Pre-A1 English Starter.',
    requirementText: 'Complete all Pre-A1 lessons and milestones to graduate.',
    category: 'cefr',
    icon: 'cefr_sprout_cap',
    rarity: 'rare',
    color: 'gold',
    ribbonText: 'Pre-A1',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'pre-a1', unitLabel: 'lessons' }
  },
  {
    id: 'beginner_graduate',
    name: 'Beginner Graduate',
    description: 'Complete A1 Beginner English.',
    requirementText: 'Complete all A1 lessons and milestones to graduate.',
    category: 'cefr',
    icon: 'cefr_medal_a1',
    rarity: 'rare',
    color: 'gold',
    ribbonText: 'A1 Passed',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'a1', unitLabel: 'lessons' }
  },
  {
    id: 'elementary_graduate',
    name: 'Elementary Graduate',
    description: 'Complete A2 Elementary English.',
    requirementText: 'Complete all A2 lessons and milestones to graduate.',
    category: 'cefr',
    icon: 'cefr_laurel_a2',
    rarity: 'rare',
    color: 'gold',
    ribbonText: 'A2 Passed',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'a2', unitLabel: 'lessons' }
  },
  {
    id: 'intermediate_graduate',
    name: 'Intermediate Graduate',
    description: 'Complete B1 Intermediate English.',
    requirementText: 'Complete all B1 lessons and milestones to graduate.',
    category: 'cefr',
    icon: 'cefr_compass_b1',
    rarity: 'epic',
    color: 'gold',
    ribbonText: 'B1 Passed',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'b1', unitLabel: 'lessons' }
  },
  {
    id: 'upper_intermediate_graduate',
    name: 'Upper-Intermediate Graduate',
    description: 'Complete B2 Upper-Intermediate English.',
    requirementText: 'Complete all B2 lessons and milestones to graduate.',
    category: 'cefr',
    icon: 'cefr_torch_b2',
    rarity: 'epic',
    color: 'gold',
    ribbonText: 'B2 Passed',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'b2', unitLabel: 'lessons' }
  },
  {
    id: 'advanced_graduate',
    name: 'Advanced Graduate',
    description: 'Complete C1 Advanced English.',
    requirementText: 'Complete all C1 lessons and milestones to graduate.',
    category: 'cefr',
    icon: 'cefr_diamond_c1',
    rarity: 'epic',
    color: 'gold',
    ribbonText: 'C1 Passed',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'c1', unitLabel: 'lessons' }
  },
  {
    id: 'english_expert',
    name: 'English Expert',
    description: 'Complete C2 Mastery English.',
    requirementText: 'Complete every lesson and milestone in C2 Mastery.',
    category: 'cefr',
    icon: 'cefr_grand_crown',
    rarity: 'legendary',
    color: 'gold',
    ribbonText: 'C2 Master',
    unlockCondition: { metric: 'levelLessonsCompleted', levelId: 'c2', unitLabel: 'lessons' }
  },
  {
    id: 'cefr_explorer',
    name: 'CEFR Explorer',
    description: 'Complete your first CEFR level.',
    requirementText: 'Complete all requirements of 1 CEFR level.',
    category: 'cefr',
    icon: 'cefr_globe',
    rarity: 'rare',
    color: 'gold',
    ribbonText: '1st CEFR',
    unlockCondition: { metric: 'levelsCompleted', target: 1, unitLabel: 'CEFR level' }
  },
  {
    id: 'language_climber',
    name: 'Language Climber',
    description: 'Complete three CEFR levels.',
    requirementText: 'Complete 3 full CEFR levels to unlock Language Climber.',
    category: 'cefr',
    icon: 'cefr_mountain',
    rarity: 'epic',
    color: 'gold',
    ribbonText: '3 Levels',
    unlockCondition: { metric: 'levelsCompleted', target: 3, unitLabel: 'CEFR levels' }
  },
  {
    id: 'language_legend',
    name: 'Language Legend',
    description: 'Complete all seven CEFR levels.',
    requirementText: 'Master all 7 CEFR levels from Pre-A1 to C2.',
    category: 'cefr',
    icon: 'cefr_grand_trophy',
    rarity: 'legendary',
    color: 'gold',
    ribbonText: 'All 7 Levels',
    unlockCondition: { metric: 'levelsCompleted', target: 7, unitLabel: 'CEFR levels' }
  },

  // =========================================================================
  // CATEGORY D: STREAK ACHIEVEMENTS (Orange)
  // =========================================================================
  {
    id: 'first_flame',
    name: 'First Flame',
    description: 'Maintain a 3-day streak.',
    requirementText: 'Study 3 days in a row to unlock First Flame.',
    category: 'streak',
    icon: 'streak_spark',
    rarity: 'common',
    color: 'orange',
    ribbonText: '3 Day Streak',
    unlockCondition: { metric: 'bestStreak', target: 3, unitLabel: 'days' }
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak.',
    requirementText: 'Maintain a 7-day learning streak to unlock Week Warrior.',
    category: 'streak',
    icon: 'streak_flame',
    rarity: 'rare',
    color: 'orange',
    ribbonText: '7 Day Streak',
    unlockCondition: { metric: 'bestStreak', target: 7, unitLabel: 'days' }
  },
  {
    id: 'monthly_dedication',
    name: 'Monthly Dedication',
    description: 'Maintain a 30-day streak.',
    requirementText: 'Study consistently for 30 consecutive days.',
    category: 'streak',
    icon: 'streak_calendar',
    rarity: 'epic',
    color: 'orange',
    ribbonText: '30 Day Streak',
    unlockCondition: { metric: 'bestStreak', target: 30, unitLabel: 'days' }
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 60-day streak.',
    requirementText: 'Keep your learning streak alive for 60 consecutive days.',
    category: 'streak',
    icon: 'streak_lightning',
    rarity: 'epic',
    color: 'orange',
    ribbonText: '60 Day Streak',
    unlockCondition: { metric: 'bestStreak', target: 60, unitLabel: 'days' }
  },
  {
    id: 'century_learner',
    name: 'Century Learner',
    description: 'Maintain a 100-day streak.',
    requirementText: 'Reach an extraordinary 100-day continuous streak.',
    category: 'streak',
    icon: 'streak_phoenix',
    rarity: 'legendary',
    color: 'orange',
    ribbonText: '100 Days',
    unlockCondition: { metric: 'bestStreak', target: 100, unitLabel: 'days' }
  },

  // =========================================================================
  // CATEGORY E: LEARNING & PERFORMANCE (Purple)
  // =========================================================================
  {
    id: 'vocabulary_builder',
    name: 'Vocabulary Builder',
    description: 'Save 50 vocabulary words.',
    requirementText: 'Save 50 words to your vocabulary library.',
    category: 'learning',
    icon: 'learning_brain',
    rarity: 'rare',
    color: 'purple',
    ribbonText: '50 Words',
    unlockCondition: { metric: 'savedWordsCount', target: 50, unitLabel: 'saved words' }
  },
  {
    id: 'word_collector',
    name: 'Word Collector',
    description: 'Save 100 vocabulary words.',
    requirementText: 'Save 100 words to your vocabulary library.',
    category: 'learning',
    icon: 'learning_owl_book',
    rarity: 'epic',
    color: 'purple',
    ribbonText: '100 Words',
    unlockCondition: { metric: 'savedWordsCount', target: 100, unitLabel: 'saved words' }
  },
  {
    id: 'grammar_guru',
    name: 'Grammar Guru',
    description: 'Complete 25 grammar exercises.',
    requirementText: 'Complete 25 grammar exercises accurately.',
    category: 'learning',
    icon: 'learning_quill',
    rarity: 'rare',
    color: 'purple',
    ribbonText: '25 Grammar',
    unlockCondition: { metric: 'grammarExercisesCompleted', target: 25, unitLabel: 'exercises' }
  },
  {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Achieve 100% in an eligible assessment.',
    requirementText: 'Score 100% on any lesson, listening lab, or milestone assessment.',
    category: 'learning',
    icon: 'learning_bullseye',
    rarity: 'rare',
    color: 'purple',
    ribbonText: '100% Score',
    unlockCondition: { metric: 'perfectAssessments', target: 1, unitLabel: 'perfect score' }
  },
  {
    id: 'quick_thinker',
    name: 'Quick Thinker',
    description: 'Complete 10 exercises within their time targets.',
    requirementText: 'Answer 10 exercises accurately within their time target.',
    category: 'learning',
    icon: 'learning_stopwatch',
    rarity: 'rare',
    color: 'purple',
    ribbonText: 'Speedy 10',
    unlockCondition: { metric: 'fastExercisesCount', target: 10, unitLabel: 'fast exercises' }
  },
  {
    id: 'daily_champion',
    name: 'Daily Champion',
    description: 'Complete 30 daily learning activities.',
    requirementText: 'Complete learning activities across 30 days.',
    category: 'learning',
    icon: 'learning_sun_star',
    rarity: 'epic',
    color: 'purple',
    ribbonText: '30 Activities',
    unlockCondition: { metric: 'dailyActivitiesCount', target: 30, unitLabel: 'daily activities' }
  }
];

export const BADGE_BY_ID = new Map(BADGE_CATALOG.map(b => [b.id, b]));
