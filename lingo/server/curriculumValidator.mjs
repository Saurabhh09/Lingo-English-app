/**
 * Lingo. Curriculum Validation Engine
 *
 * Validates pedagogical structure, CEFR levels, exercise schemas,
 * answer key format, objective registries, and prerequisite graph acyclicity (DAG).
 */

export const VALID_CEFR_LEVELS = ['pre-a1', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
export const VALID_SKILL_DOMAINS = [
  'listening', 'reading', 'spoken_interaction', 'spoken_production',
  'writing', 'vocabulary', 'grammar', 'phonics', 'pragmatics'
];
export const VALID_EXERCISE_TYPES = [
  'multiple_choice', 'fill_in_the_blank', 'matching', 'word_ordering',
  'sentence_construction', 'listening_comprehension', 'reading_comprehension',
  'error_correction', 'short_answer', 'speaking_prompt', 'writing_task',
  'pronunciation_practice'
];

/**
 * Validates a single exercise revision and its corresponding solution.
 */
export function validateExercise(exercise, solution = null) {
  const errors = [];

  if (!exercise || typeof exercise !== 'object') {
    return { valid: false, errors: ['Exercise payload must be a non-null object'] };
  }

  if (!exercise.id || typeof exercise.id !== 'string') {
    errors.push('Exercise missing required id');
  }
  if (!exercise.prompt || typeof exercise.prompt !== 'string' || !exercise.prompt.trim()) {
    errors.push(`Exercise ${exercise.id || 'unknown'}: Missing or invalid prompt`);
  }
  if (!VALID_EXERCISE_TYPES.includes(exercise.exerciseType)) {
    errors.push(`Exercise ${exercise.id || 'unknown'}: Invalid exerciseType "${exercise.exerciseType}"`);
  }

  // Multiple choice validation
  if (exercise.exerciseType === 'multiple_choice') {
    const options = exercise.options || exercise.contentPayload?.options;
    if (!Array.isArray(options) || options.length < 2) {
      errors.push(`Exercise ${exercise.id}: Multiple choice requires at least 2 options`);
    } else {
      for (let i = 0; i < options.length; i++) {
        if (typeof options[i] !== 'string' || !options[i].trim()) {
          errors.push(`Exercise ${exercise.id}: Option at index ${i} must be a non-empty string`);
        }
      }
    }

    if (solution !== null && solution !== undefined) {
      const correctIndex = typeof solution === 'object' && solution !== null
        ? solution.correctIndex ?? solution.correct_index
        : solution;

      if (!Number.isInteger(correctIndex) || correctIndex < 0 || (options && correctIndex >= options.length)) {
        errors.push(`Exercise ${exercise.id}: Solution index (${correctIndex}) out of bounds for options count`);
      }
    }
  }

  // Fill in the blank validation
  if (exercise.exerciseType === 'fill_in_the_blank') {
    const options = exercise.options || exercise.contentPayload?.options;
    if (options && (!Array.isArray(options) || options.length < 2)) {
      errors.push(`Exercise ${exercise.id}: Fill in the blank with options requires at least 2 choices`);
    }
    if (solution !== null && solution !== undefined) {
      const correctIndex = typeof solution === 'object' && solution !== null
        ? solution.correctIndex ?? solution.correct_index
        : solution;
      const acceptedAnswers = solution?.acceptedAnswers;

      if (options && correctIndex !== undefined) {
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
          errors.push(`Exercise ${exercise.id}: Fill in the blank solution index (${correctIndex}) out of bounds`);
        }
      } else if (!acceptedAnswers && typeof solution !== 'string') {
        errors.push(`Exercise ${exercise.id}: Fill in the blank solution must specify correctIndex or acceptedAnswers`);
      }
    }
  }

  // Word ordering validation
  if (exercise.exerciseType === 'word_ordering') {
    const words = exercise.words || exercise.options || exercise.contentPayload?.words;
    if (!Array.isArray(words) || words.length < 2) {
      errors.push(`Exercise ${exercise.id}: Word ordering requires at least 2 word tokens`);
    }
    if (solution !== null && solution !== undefined) {
      const order = solution.correctOrder || solution.correctIndices;
      if (order && (!Array.isArray(order) || order.length !== (words?.length || 0))) {
        errors.push(`Exercise ${exercise.id}: Word ordering solution sequence length mismatch`);
      }
    }
  }

  // Matching validation
  if (exercise.exerciseType === 'matching') {
    const pairs = exercise.pairs || exercise.contentPayload?.pairs;
    if (pairs && (!Array.isArray(pairs) || pairs.length < 2)) {
      errors.push(`Exercise ${exercise.id}: Matching exercise requires at least 2 pairs`);
    }
  }

  // Listening comprehension validation
  if (exercise.exerciseType === 'listening_comprehension') {
    const audioUrl = exercise.audioUrl || exercise.contentPayload?.audioUrl;
    if (!audioUrl || typeof audioUrl !== 'string') {
      errors.push(`Exercise ${exercise.id}: Listening comprehension requires audioUrl string`);
    }
    const options = exercise.options || exercise.contentPayload?.options;
    if (!Array.isArray(options) || options.length < 2) {
      errors.push(`Exercise ${exercise.id}: Listening comprehension requires at least 2 options`);
    }
    if (solution !== null && solution !== undefined) {
      const correctIndex = typeof solution === 'object' && solution !== null
        ? solution.correctIndex ?? solution.correct_index
        : solution;
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || (options && correctIndex >= options.length)) {
        errors.push(`Exercise ${exercise.id}: Listening comprehension solution index (${correctIndex}) out of bounds`);
      }
    }
  }

  // Speaking prompt validation
  if (exercise.exerciseType === 'speaking_prompt') {
    if (!exercise.prompt || typeof exercise.prompt !== 'string') {
      errors.push(`Exercise ${exercise.id}: Speaking prompt requires prompt string`);
    }
  }

  // Pronunciation practice validation
  if (exercise.exerciseType === 'pronunciation_practice') {
    const target = exercise.targetPhrase || exercise.contentPayload?.targetPhrase;
    if (!target || typeof target !== 'string' || !target.trim()) {
      errors.push(`Exercise ${exercise.id}: Pronunciation practice requires targetPhrase`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Kahn's Algorithm to verify that the prerequisite graph is a Directed Acyclic Graph (DAG).
 * Returns { valid: true } or { valid: false, error: ... }
 */
export function detectPrerequisiteCycles(prerequisites) {
  // prerequisites is an array of [targetLessonId, requiredLessonId]
  // targetLessonId depends on requiredLessonId (edge: required -> target)
  const inDegree = new Map();
  const adjList = new Map();
  const allNodes = new Set();

  for (const [target, required] of prerequisites) {
    if (target === required) {
      return {
        valid: false,
        error: `Self-referential prerequisite detected on lesson: ${target}`
      };
    }
    allNodes.add(target);
    allNodes.add(required);

    if (!adjList.has(required)) adjList.set(required, []);
    adjList.get(required).push(target);

    inDegree.set(target, (inDegree.get(target) || 0) + 1);
    if (!inDegree.has(required)) inDegree.set(required, 0);
  }

  const queue = [];
  for (const node of allNodes) {
    if ((inDegree.get(node) || 0) === 0) {
      queue.push(node);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const curr = queue.shift();
    visitedCount++;

    const neighbors = adjList.get(curr) || [];
    for (const next of neighbors) {
      const remainingInDegree = inDegree.get(next) - 1;
      inDegree.set(next, remainingInDegree);
      if (remainingInDegree === 0) {
        queue.push(next);
      }
    }
  }

  if (visitedCount < allNodes.size) {
    return {
      valid: false,
      error: 'Circular prerequisite dependency detected in curriculum graph.'
    };
  }

  return { valid: true };
}

/**
 * Validates an entire curriculum catalog structure.
 */
export function validateCurriculumCatalog(catalog) {
  const errors = [];
  const lessonIds = new Set();
  const exerciseIds = new Set();
  const knownObjectiveIds = new Set();
  const prerequisitePairs = [];
  const levelCounts = {};

  if (!catalog || !Array.isArray(catalog.levels)) {
    return { valid: false, errors: ['Catalog must contain an array of levels'] };
  }

  // Validate learning objectives registry if provided
  if (catalog.learningObjectives && typeof catalog.learningObjectives === 'object') {
    for (const [objId, obj] of Object.entries(catalog.learningObjectives)) {
      if (!obj || typeof obj !== 'object') {
        errors.push(`Learning objective "${objId}": Must be an object`);
        continue;
      }
      if (!obj.id || obj.id !== objId) {
        errors.push(`Learning objective "${objId}": ID mismatch or missing`);
      }
      if (!obj.title || typeof obj.title !== 'string') {
        errors.push(`Learning objective "${objId}": Missing or invalid title`);
      }
      if (!obj.description || typeof obj.description !== 'string') {
        errors.push(`Learning objective "${objId}": Missing or invalid description`);
      }
      if (!VALID_SKILL_DOMAINS.includes(obj.skillDomain)) {
        errors.push(`Learning objective "${objId}": Invalid skillDomain "${obj.skillDomain}"`);
      }
      if (!VALID_CEFR_LEVELS.includes(obj.levelId?.toLowerCase())) {
        errors.push(`Learning objective "${objId}": Invalid levelId "${obj.levelId}"`);
      }
      knownObjectiveIds.add(objId);
    }
  }

  let totalSections = 0;
  let totalUnits = 0;
  let totalLessons = 0;
  let totalExercises = 0;

  for (const level of catalog.levels) {
    const levelId = level.id?.toLowerCase();
    if (!VALID_CEFR_LEVELS.includes(levelId)) {
      errors.push(`Level ${level.id}: Invalid CEFR level code`);
    }
    if (!level.name || !level.tagline) {
      errors.push(`Level ${level.id}: Missing name or tagline`);
    }

    levelCounts[levelId] = { lessons: 0, exercises: 0 };

    if (!Array.isArray(level.sections)) continue;
    totalSections += level.sections.length;

    for (const section of level.sections) {
      if (!section.id || !section.title) {
        errors.push(`Section ${section.id || 'unknown'}: Missing title or id`);
      }

      if (!Array.isArray(section.units)) continue;
      totalUnits += section.units.length;

      for (const unit of section.units) {
        if (!unit.id || !unit.title) {
          errors.push(`Unit ${unit.id || 'unknown'}: Missing title or id`);
        }

        if (!Array.isArray(unit.lessons)) continue;
        totalLessons += unit.lessons.length;
        levelCounts[levelId].lessons += unit.lessons.length;

        for (const lesson of unit.lessons) {
          if (!lesson.id) {
            errors.push('Encountered lesson without an id');
            continue;
          }
          if (lessonIds.has(lesson.id)) {
            errors.push(`Duplicate lesson ID detected: "${lesson.id}"`);
          }
          lessonIds.add(lesson.id);

          if (!lesson.title || typeof lesson.title !== 'string') {
            errors.push(`Lesson ${lesson.id}: Missing title`);
          }
          if (!lesson.description || typeof lesson.description !== 'string') {
            errors.push(`Lesson ${lesson.id}: Missing description`);
          }

          if (lesson.xp !== undefined && (typeof lesson.xp !== 'number' || lesson.xp < 0)) {
            errors.push(`Lesson ${lesson.id}: XP must be a non-negative number`);
          }

          // Validate lesson learning objectives
          if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
            errors.push(`Lesson ${lesson.id}: Missing required learning objectives`);
          } else if (catalog.learningObjectives) {
            for (const objId of lesson.objectives) {
              if (!knownObjectiveIds.has(objId)) {
                errors.push(`Lesson ${lesson.id}: References unregistered learning objective "${objId}"`);
              }
            }
          }

          if (Array.isArray(lesson.prerequisites)) {
            for (const req of lesson.prerequisites) {
              prerequisitePairs.push([lesson.id, req]);
            }
          }

          if (Array.isArray(lesson.exercises)) {
            if (lesson.exercises.length === 0) {
              errors.push(`Lesson ${lesson.id}: Must contain at least one exercise`);
            }
            totalExercises += lesson.exercises.length;
            levelCounts[levelId].exercises += lesson.exercises.length;

            for (const ex of lesson.exercises) {
              if (exerciseIds.has(ex.id)) {
                errors.push(`Duplicate exercise ID detected: "${ex.id}" across catalog`);
              }
              exerciseIds.add(ex.id);

              const res = validateExercise(ex, ex.solutionKey);
              if (!res.valid) {
                errors.push(...res.errors);
              }
            }
          } else {
            errors.push(`Lesson ${lesson.id}: Exercises property must be an array`);
          }
        }
      }
    }
  }

  // Validate prerequisite references exist
  for (const [target, req] of prerequisitePairs) {
    if (!lessonIds.has(req)) {
      errors.push(`Lesson "${target}" references non-existent prerequisite lesson "${req}"`);
    }
  }

  // Cycle check
  const cycleResult = detectPrerequisiteCycles(prerequisitePairs);
  if (!cycleResult.valid) {
    errors.push(cycleResult.error);
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      levels: catalog.levels.length,
      sections: totalSections,
      units: totalUnits,
      lessons: totalLessons,
      exercises: totalExercises,
      objectives: knownObjectiveIds.size,
      byLevel: levelCounts
    }
  };
}
