-- ============================================================================
-- LINGO PHASE 2: CORE CURRICULUM ARCHITECTURE & PROGRESSION SCHEMA
-- Version: 20261015000001
-- Description: Additive migration introducing normalized CEFR levels, sections,
--              units, lessons, versioned exercises, isolated answer keys,
--              objective mappings, and relational progression logging.
-- ============================================================================

BEGIN;

-- 1. ENUM TYPES (Guarded for idempotent execution)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'curriculum_publish_status') THEN
        CREATE TYPE public.curriculum_publish_status AS ENUM ('draft', 'in_review', 'approved', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_type_enum') THEN
        CREATE TYPE public.lesson_type_enum AS ENUM ('standard', 'checkpoint', 'review', 'assessment');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_domain_enum') THEN
        CREATE TYPE public.skill_domain_enum AS ENUM ('listening', 'reading', 'spoken_interaction', 'spoken_production', 'writing', 'vocabulary', 'grammar', 'phonics', 'pragmatics');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learner_lesson_state') THEN
        CREATE TYPE public.learner_lesson_state AS ENUM ('locked', 'available', 'in_progress', 'completed');
    END IF;
END $$;

-- 2. PROGRAM & CEFR LEVELS
CREATE TABLE IF NOT EXISTS public.curriculum_programs (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_levels (
    id text PRIMARY KEY,
    program_id text NOT NULL REFERENCES public.curriculum_programs(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    badge text NOT NULL,
    tagline text NOT NULL,
    official_cefr_descriptor text,
    accent_color text NOT NULL DEFAULT 'lime',
    estimated_hours integer NOT NULL DEFAULT 20 CHECK (estimated_hours > 0),
    display_order integer NOT NULL CHECK (display_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_level_program_order UNIQUE (program_id, display_order),
    CONSTRAINT uq_level_code UNIQUE (program_id, code)
);

-- 3. SECTIONS & UNITS
CREATE TABLE IF NOT EXISTS public.curriculum_sections (
    id text PRIMARY KEY,
    level_id text NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE CASCADE,
    section_number text NOT NULL,
    title text NOT NULL,
    tagline text,
    description text,
    display_order integer NOT NULL CHECK (display_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_section_level_order UNIQUE (level_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.curriculum_units (
    id text PRIMARY KEY,
    section_id text NOT NULL REFERENCES public.curriculum_sections(id) ON DELETE CASCADE,
    unit_number text NOT NULL,
    title text NOT NULL,
    eyebrow text,
    objective text,
    display_order integer NOT NULL CHECK (display_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_unit_section_order UNIQUE (section_id, display_order)
);

-- 4. LESSONS
CREATE TABLE IF NOT EXISTS public.curriculum_lessons (
    id text PRIMARY KEY,
    unit_id text NOT NULL REFERENCES public.curriculum_units(id) ON DELETE CASCADE,
    level_label text,
    title text NOT NULL,
    subtitle text,
    lesson_type public.lesson_type_enum NOT NULL DEFAULT 'standard',
    pedagogical_focus text NOT NULL,
    icon text NOT NULL DEFAULT '👋',
    accent_color text NOT NULL DEFAULT 'lime',
    xp_reward integer NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
    estimated_duration_min integer NOT NULL DEFAULT 5 CHECK (estimated_duration_min > 0),
    description text,
    publish_status public.curriculum_publish_status NOT NULL DEFAULT 'draft',
    current_version integer NOT NULL DEFAULT 1 CHECK (current_version >= 1),
    display_order integer NOT NULL CHECK (display_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_lesson_unit_order UNIQUE (unit_id, display_order)
);

-- 5. LEARNING OBJECTIVES & MAPPINGS
CREATE TABLE IF NOT EXISTS public.curriculum_learning_objectives (
    id text PRIMARY KEY,
    level_id text NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE CASCADE,
    skill_domain public.skill_domain_enum NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    official_cefr_descriptor text,
    mastery_threshold_score numeric(5,2) NOT NULL DEFAULT 80.00 CHECK (mastery_threshold_score BETWEEN 0.00 AND 100.00),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_lesson_objectives (
    lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    objective_id text NOT NULL REFERENCES public.curriculum_learning_objectives(id) ON DELETE CASCADE,
    is_primary boolean NOT NULL DEFAULT true,
    PRIMARY KEY (lesson_id, objective_id)
);

-- 6. VOCABULARY & GRAMMAR KNOWLEDGE BASES
CREATE TABLE IF NOT EXISTS public.curriculum_vocabulary (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lemma text NOT NULL,
    cefr_level_id text NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE RESTRICT,
    part_of_speech text NOT NULL,
    phonetic_ipa text,
    definition text NOT NULL,
    example_sentence text NOT NULL,
    audio_asset_url text,
    topic_tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_grammar_concepts (
    id text PRIMARY KEY,
    cefr_level_id text NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE RESTRICT,
    title text NOT NULL,
    rule_summary text NOT NULL,
    detailed_markdown text NOT NULL,
    common_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_lesson_vocabulary (
    lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    vocabulary_id uuid NOT NULL REFERENCES public.curriculum_vocabulary(id) ON DELETE CASCADE,
    display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    PRIMARY KEY (lesson_id, vocabulary_id)
);

CREATE TABLE IF NOT EXISTS public.curriculum_lesson_grammar (
    lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    grammar_id text NOT NULL REFERENCES public.curriculum_grammar_concepts(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, grammar_id)
);

-- 7. PREREQUISITES GRAPH
CREATE TABLE IF NOT EXISTS public.curriculum_lesson_prerequisites (
    target_lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    required_lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    is_mandatory boolean NOT NULL DEFAULT true,
    PRIMARY KEY (target_lesson_id, required_lesson_id),
    CONSTRAINT chk_no_self_prerequisite CHECK (target_lesson_id <> required_lesson_id)
);

-- 8. ACTIVITIES & EXERCISES
CREATE TABLE IF NOT EXISTS public.curriculum_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    title text NOT NULL,
    display_order integer NOT NULL CHECK (display_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_lesson_order UNIQUE (lesson_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.curriculum_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.curriculum_activities(id) ON DELETE CASCADE,
    exercise_type text NOT NULL,
    display_order integer NOT NULL CHECK (display_order >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_exercise_activity_order UNIQUE (activity_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.curriculum_exercise_objectives (
    exercise_id uuid NOT NULL REFERENCES public.curriculum_exercises(id) ON DELETE CASCADE,
    objective_id text NOT NULL REFERENCES public.curriculum_learning_objectives(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, objective_id)
);

-- 9. VERSIONED EXERCISE REVISIONS & ISOLATED SOLUTIONS
CREATE TABLE IF NOT EXISTS public.curriculum_exercise_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id uuid NOT NULL REFERENCES public.curriculum_exercises(id) ON DELETE CASCADE,
    revision_number integer NOT NULL CHECK (revision_number >= 1),
    prompt text NOT NULL,
    instructions text,
    stimulus_audio_url text,
    stimulus_text text,
    content_payload jsonb NOT NULL,
    explanation text,
    xp_weight integer NOT NULL DEFAULT 10 CHECK (xp_weight >= 0),
    is_active boolean NOT NULL DEFAULT true,
    published_at timestamptz DEFAULT now(),
    CONSTRAINT uq_exercise_revision_number UNIQUE (exercise_id, revision_number),
    CONSTRAINT uq_exercise_revision_pair UNIQUE (exercise_id, id)
);

-- Partial index guaranteeing at most ONE active revision per exercise
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_single_active_revision 
    ON public.curriculum_exercise_revisions (exercise_id) 
    WHERE (is_active = true);

-- Solution keys stored in isolated table (zero public read permissions)
-- Using ON DELETE RESTRICT so parent revision deletion cannot bypass solution protection
CREATE TABLE IF NOT EXISTS public.curriculum_exercise_solutions (
    revision_id uuid PRIMARY KEY REFERENCES public.curriculum_exercise_revisions(id) ON DELETE RESTRICT,
    solution_payload jsonb NOT NULL,
    grading_rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Administrative Audit Log
CREATE TABLE IF NOT EXISTS public.curriculum_content_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    revision_id uuid REFERENCES public.curriculum_exercise_revisions(id) ON DELETE SET NULL,
    action text NOT NULL,
    performed_by text NOT NULL,
    change_summary text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. IMMUTABILITY TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.fn_enforce_revision_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Fix 2: Prevent deletion of published revisions
    IF TG_OP = 'DELETE' THEN
        -- If the revision was published (published_at is set) or active, prevent deletion
        IF OLD.published_at IS NOT NULL OR OLD.is_active = true THEN
            RAISE EXCEPTION 'Published exercise revisions are immutable and cannot be deleted. Deactivate the revision instead.';
        END IF;
        RETURN OLD;
    END IF;

    -- Fix 1: Prevent modification of published revisions (even after deactivation)
    IF TG_OP = 'UPDATE' THEN
        -- A revision is considered published if published_at is set or was active
        IF OLD.published_at IS NOT NULL OR OLD.is_active = true THEN
            -- Cannot strip or nullify published_at to bypass immutability
            IF OLD.published_at IS NOT NULL AND NEW.published_at IS NULL THEN
                RAISE EXCEPTION 'Publication timestamp cannot be removed from a published revision.';
            END IF;

            -- Prevent changing exercise identity, revision number, or primary key
            IF OLD.id IS DISTINCT FROM NEW.id OR
               OLD.exercise_id IS DISTINCT FROM NEW.exercise_id OR
               OLD.revision_number IS DISTINCT FROM NEW.revision_number THEN
                RAISE EXCEPTION 'Cannot modify identity, exercise reference, or revision number of a published revision.';
            END IF;

            -- Prevent changes to all protected educational & grading content fields
            IF OLD.prompt IS DISTINCT FROM NEW.prompt OR
               OLD.instructions IS DISTINCT FROM NEW.instructions OR
               OLD.stimulus_audio_url IS DISTINCT FROM NEW.stimulus_audio_url OR
               OLD.stimulus_text IS DISTINCT FROM NEW.stimulus_text OR
               OLD.content_payload IS DISTINCT FROM NEW.content_payload OR
               OLD.explanation IS DISTINCT FROM NEW.explanation OR
               OLD.xp_weight IS DISTINCT FROM NEW.xp_weight THEN
                RAISE EXCEPTION 'Published exercise revisions are immutable. Content cannot be altered during update or deactivation. Insert a new revision instead.';
            END IF;

            -- Permitted lifecycle change: is_active can transition (e.g. true -> false when superseded/deactivated)
            -- Note: published_at remains set, so even when is_active = false, OLD.published_at IS NOT NULL remains TRUE for all future updates.
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_revision_immutability ON public.curriculum_exercise_revisions;
CREATE TRIGGER trg_revision_immutability
    BEFORE UPDATE OR DELETE ON public.curriculum_exercise_revisions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_revision_immutability();

CREATE OR REPLACE FUNCTION public.fn_enforce_solution_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_published_at timestamptz;
    v_is_active boolean;
BEGIN
    -- Query the publication and activation state of the associated revision
    SELECT published_at, is_active
      INTO v_published_at, v_is_active
      FROM public.curriculum_exercise_revisions
     WHERE id = OLD.revision_id;

    -- Fix 3: If parent revision is published or active, solution is strictly immutable
    IF v_published_at IS NOT NULL OR v_is_active = true THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Exercise solutions for published revisions are immutable and cannot be deleted.';
        END IF;

        IF TG_OP = 'UPDATE' THEN
            IF OLD.solution_payload IS DISTINCT FROM NEW.solution_payload OR
               OLD.grading_rubric IS DISTINCT FROM NEW.grading_rubric OR
               OLD.revision_id IS DISTINCT FROM NEW.revision_id THEN
                RAISE EXCEPTION 'Exercise solutions and grading rubrics for published revisions are immutable. Create a new exercise revision to update answers.';
            END IF;
        END IF;
    ELSE
        -- Draft revision workflow:
        -- Deleting draft solution is allowed (for draft cleanup).
        -- Updating solution_payload or grading_rubric on a draft is allowed.
        -- Reassigning revision_id is prohibited.
        IF TG_OP = 'UPDATE' AND OLD.revision_id IS DISTINCT FROM NEW.revision_id THEN
            RAISE EXCEPTION 'Cannot reassign an exercise solution to a different revision.';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solution_immutability ON public.curriculum_exercise_solutions;
CREATE TRIGGER trg_solution_immutability
    BEFORE UPDATE OR DELETE ON public.curriculum_exercise_solutions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_solution_immutability();

-- 11. LEARNER RELATIONAL PROGRESS & ATTEMPTS (Referencing lingo_accounts.id)
CREATE TABLE IF NOT EXISTS public.learner_curriculum_profiles (
    account_id text PRIMARY KEY REFERENCES public.lingo_accounts(id) ON DELETE CASCADE,
    active_level_id text NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE RESTRICT,
    total_curriculum_xp integer NOT NULL DEFAULT 0 CHECK (total_curriculum_xp >= 0),
    last_active_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learner_lesson_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id text NOT NULL REFERENCES public.lingo_accounts(id) ON DELETE CASCADE,
    lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE RESTRICT,
    status public.learner_lesson_state NOT NULL DEFAULT 'locked',
    attempts_count integer NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
    best_score_pct numeric(5,2) NOT NULL DEFAULT 0.00 CHECK (best_score_pct BETWEEN 0.00 AND 100.00),
    first_passed_at timestamptz,
    last_studied_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_account_lesson UNIQUE (account_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.learner_exercise_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id text NOT NULL REFERENCES public.lingo_accounts(id) ON DELETE CASCADE,
    exercise_id uuid NOT NULL REFERENCES public.curriculum_exercises(id) ON DELETE CASCADE,
    revision_id uuid NOT NULL,
    lesson_id text NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE RESTRICT,
    submitted_answer jsonb NOT NULL,
    is_correct boolean NOT NULL,
    score_earned integer NOT NULL DEFAULT 0 CHECK (score_earned >= 0),
    duration_ms integer CHECK (duration_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_attempt_exercise_revision FOREIGN KEY (exercise_id, revision_id)
        REFERENCES public.curriculum_exercise_revisions(exercise_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.learner_objective_mastery (
    account_id text NOT NULL REFERENCES public.lingo_accounts(id) ON DELETE CASCADE,
    objective_id text NOT NULL REFERENCES public.curriculum_learning_objectives(id) ON DELETE CASCADE,
    mastery_status text NOT NULL DEFAULT 'developing' CHECK (mastery_status IN ('developing', 'proficient', 'mastered')),
    confidence_score numeric(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence_score BETWEEN 0.000 AND 1.000),
    consecutive_correct integer NOT NULL DEFAULT 0 CHECK (consecutive_correct >= 0),
    next_review_due timestamptz,
    last_evaluated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, objective_id)
);

-- 12. INDEXES
CREATE INDEX IF NOT EXISTS idx_levels_program_order ON public.curriculum_levels (program_id, display_order);
CREATE INDEX IF NOT EXISTS idx_sections_level_order ON public.curriculum_sections (level_id, display_order);
CREATE INDEX IF NOT EXISTS idx_units_section_order ON public.curriculum_units (section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_lessons_unit_status ON public.curriculum_lessons (unit_id, publish_status, display_order);
CREATE INDEX IF NOT EXISTS idx_activities_lesson_order ON public.curriculum_activities (lesson_id, display_order);
CREATE INDEX IF NOT EXISTS idx_exercises_activity_order ON public.curriculum_exercises (activity_id, display_order);
CREATE INDEX IF NOT EXISTS idx_prerequisites_target ON public.curriculum_lesson_prerequisites (target_lesson_id);
CREATE INDEX IF NOT EXISTS idx_learner_lesson_user ON public.learner_lesson_progress (account_id, status);
CREATE INDEX IF NOT EXISTS idx_learner_attempts_account_lesson ON public.learner_exercise_attempts (account_id, lesson_id, created_at DESC);

-- 13. ROW LEVEL SECURITY & ACCESS RESTRICTIONS
-- Explicitly enable Row Level Security on all 22 tables introduced in this migration.
-- There are deliberately NO public RLS policies. Only the trusted backend service_role
-- can access records, following the server-side authentication and authorization design.

ALTER TABLE public.curriculum_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_lesson_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_grammar_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_lesson_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_lesson_grammar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_lesson_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_exercise_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_exercise_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_exercise_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_content_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_curriculum_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_objective_mastery ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.curriculum_programs, public.curriculum_levels,
    public.curriculum_sections, public.curriculum_units,
    public.curriculum_lessons, public.curriculum_learning_objectives,
    public.curriculum_lesson_objectives, public.curriculum_vocabulary,
    public.curriculum_grammar_concepts, public.curriculum_lesson_vocabulary,
    public.curriculum_lesson_grammar, public.curriculum_lesson_prerequisites,
    public.curriculum_activities, public.curriculum_exercises,
    public.curriculum_exercise_objectives, public.curriculum_exercise_revisions,
    public.curriculum_exercise_solutions, public.curriculum_content_audit_log,
    public.learner_curriculum_profiles, public.learner_lesson_progress,
    public.learner_exercise_attempts, public.learner_objective_mastery
FROM anon, authenticated;

GRANT ALL ON public.curriculum_programs, public.curriculum_levels,
    public.curriculum_sections, public.curriculum_units,
    public.curriculum_lessons, public.curriculum_learning_objectives,
    public.curriculum_lesson_objectives, public.curriculum_vocabulary,
    public.curriculum_grammar_concepts, public.curriculum_lesson_vocabulary,
    public.curriculum_lesson_grammar, public.curriculum_lesson_prerequisites,
    public.curriculum_activities, public.curriculum_exercises,
    public.curriculum_exercise_objectives, public.curriculum_exercise_revisions,
    public.curriculum_exercise_solutions, public.curriculum_content_audit_log,
    public.learner_curriculum_profiles, public.learner_lesson_progress,
    public.learner_exercise_attempts, public.learner_objective_mastery
TO service_role;

COMMIT;
