/**
 * Configurable Reward Definitions for Units, Sections, and CEFR Level Milestones.
 * Pure ES module shared safely between backend validation and client rendering.
 */

import { CURRICULUM_CATALOG } from './curriculumCatalog.mjs';

const CEFR_REWARD_CONFIG = {
  'pre-a1': { xpAmount: 500, gemsAmount: 50, badgeId: 'starter_graduate', certificateTitle: 'Pre-A1 English Starter Certificate' },
  'a1': { xpAmount: 600, gemsAmount: 60, badgeId: 'beginner_graduate', certificateTitle: 'A1 Beginner English Certificate' },
  'a2': { xpAmount: 700, gemsAmount: 70, badgeId: 'elementary_graduate', certificateTitle: 'A2 Elementary English Certificate' },
  'b1': { xpAmount: 850, gemsAmount: 85, badgeId: 'intermediate_graduate', certificateTitle: 'B1 Intermediate English Certificate' },
  'b2': { xpAmount: 1000, gemsAmount: 100, badgeId: 'upper_intermediate_graduate', certificateTitle: 'B2 Upper-Intermediate English Certificate' },
  'c1': { xpAmount: 1200, gemsAmount: 120, badgeId: 'advanced_graduate', certificateTitle: 'C1 Advanced English Certificate' },
  'c2': { xpAmount: 1500, gemsAmount: 150, badgeId: 'english_expert', certificateTitle: 'C2 Mastery English Grand Certificate' }
};

// Milestone unit chest configuration keyed by global 1-based unit ordinal
const UNIT_CHEST_TIERS = {
  1: { name: 'Unit 1 Treasure Chest', xpAmount: 50, gemsAmount: 0, badgeId: 'first_steps' },
  5: { name: 'Unit 5 Reward Chest', xpAmount: 100, gemsAmount: 10, badgeId: 'unit_explorer' },
  10: { name: 'Unit 10 Explorer Chest', xpAmount: 150, gemsAmount: 0, badgeId: 'unit_collector' },
  15: { name: 'Unit 15 Mastery Chest', xpAmount: 200, gemsAmount: 20, badgeId: null },
  20: { name: 'Unit 20 Champion Chest', xpAmount: 250, gemsAmount: 0, badgeId: 'intermediate_graduate' },
  25: { name: 'Unit 25 Grand Chest', xpAmount: 300, gemsAmount: 25, badgeId: 'unit_master' },
  30: { name: 'Unit 30 Scholar Chest', xpAmount: 350, gemsAmount: 30, badgeId: null },
  35: { name: 'Final Path Reward Chest', xpAmount: 500, gemsAmount: 50, badgeId: 'english_expert' }
};

function buildRewardDefinitions() {
  const defs = [];
  let globalUnitIndex = 0;

  for (const level of CURRICULUM_CATALOG.levels) {
    for (let sIdx = 0; sIdx < (level.sections || []).length; sIdx++) {
      const section = level.sections[sIdx];
      const secOrdinal = sIdx + 1;

      for (const unit of section.units || []) {
        globalUnitIndex += 1;
        const tier = UNIT_CHEST_TIERS[globalUnitIndex];
        if (tier) {
          defs.push({
            id: `reward_unit_${unit.id}`,
            name: tier.name,
            description: `Complete all lessons in ${unit.title} to unlock this chest.`,
            triggerType: 'unit',
            triggerReference: unit.id,
            unitOrdinal: globalUnitIndex,
            xpAmount: tier.xpAmount,
            gemsAmount: tier.gemsAmount,
            badgeId: tier.badgeId || null,
            certificateTitle: null,
            isActive: true
          });
        }
      }

      // Section Completion Reward (configured per section ordinal 1..4)
      const secTier = secOrdinal === 1
        ? { xpAmount: 100, gemsAmount: 0, badgeId: level.id === 'pre-a1' ? 'section_starter' : null }
        : secOrdinal === 2
          ? { xpAmount: 150, gemsAmount: 15, badgeId: null }
          : secOrdinal === 3
            ? { xpAmount: 200, gemsAmount: 0, badgeId: null }
            : { xpAmount: 250, gemsAmount: 0, badgeId: 'knowledge_keeper' };

      defs.push({
        id: `reward_section_${section.id}`,
        name: `${level.code} Section ${section.sectionNumber || secOrdinal} Reward`,
        description: `Master every unit in "${section.title}" to claim this section reward.`,
        triggerType: 'section',
        triggerReference: section.id,
        xpAmount: secTier.xpAmount,
        gemsAmount: secTier.gemsAmount,
        badgeId: secTier.badgeId,
        certificateTitle: null,
        isActive: true
      });
    }

    // CEFR Level Milestone Reward
    const cefrTier = CEFR_REWARD_CONFIG[level.id] || { xpAmount: 500, gemsAmount: 50, badgeId: null, certificateTitle: `${level.code} Certificate` };
    defs.push({
      id: `reward_cefr_${level.id}`,
      name: `${level.code} Milestone Reward`,
      description: `Finish all ${level.sections?.length || 4} sections and the final assessment to master ${level.name}.`,
      triggerType: 'cefr_level',
      triggerReference: level.id,
      xpAmount: cefrTier.xpAmount,
      gemsAmount: cefrTier.gemsAmount,
      badgeId: cefrTier.badgeId,
      certificateTitle: cefrTier.certificateTitle,
      isActive: true
    });
  }

  return defs;
}

export const REWARD_DEFINITIONS = buildRewardDefinitions();
export const REWARD_BY_ID = new Map(REWARD_DEFINITIONS.map(r => [r.id, r]));
export const REWARD_BY_UNIT_ID = new Map(
  REWARD_DEFINITIONS.filter(r => r.triggerType === 'unit').map(r => [r.triggerReference, r])
);
export const REWARD_BY_SECTION_ID = new Map(
  REWARD_DEFINITIONS.filter(r => r.triggerType === 'section').map(r => [r.triggerReference, r])
);
export const REWARD_BY_CEFR_ID = new Map(
  REWARD_DEFINITIONS.filter(r => r.triggerType === 'cefr_level').map(r => [r.triggerReference, r])
);
