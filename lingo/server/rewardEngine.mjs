/**
 * Server-Authoritative Reward Evaluation, Atomic Claiming & Gems Wallet Engine
 *
 * Lifecycle: locked -> available -> (opening UI) -> claimed
 * Prevents duplicate claims and duplicate XP/Gems via unique wallet ledger keys.
 */

import { CURRICULUM_CATALOG } from './curriculumCatalog.mjs';
import { REWARD_DEFINITIONS, REWARD_BY_ID } from './rewardDefinitions.mjs';
import { BADGE_BY_ID } from './badgeCatalog.mjs';
import { evaluateAchievements } from './achievementEngine.mjs';

const UNIT_LESSONS_MAP = new Map();
const SECTION_LESSONS_MAP = new Map();
const LEVEL_LESSONS_MAP = new Map();
const LEVEL_FINAL_ASSESSMENT_MAP = new Map();

for (const level of CURRICULUM_CATALOG.levels) {
  const lvlLessons = [];
  for (const section of level.sections || []) {
    const secLessons = [];
    for (const unit of section.units || []) {
      const uLessons = (unit.lessons || []).map(l => l.id);
      UNIT_LESSONS_MAP.set(unit.id, uLessons);
      secLessons.push(...uLessons);
      lvlLessons.push(...uLessons);
    }
    SECTION_LESSONS_MAP.set(section.id, secLessons);
  }
  LEVEL_LESSONS_MAP.set(level.id, lvlLessons);
  if (lvlLessons.length) {
    LEVEL_FINAL_ASSESSMENT_MAP.set(level.id, lvlLessons[lvlLessons.length - 1]);
  }
}

export function ensureRewardState(progress) {
  if (typeof progress.gems !== 'number' || !Number.isFinite(progress.gems) || progress.gems < 0) {
    progress.gems = 0;
  }
  if (!progress.rewards || typeof progress.rewards !== 'object' || Array.isArray(progress.rewards)) {
    progress.rewards = {};
  }
  if (!Array.isArray(progress.walletLedger)) {
    progress.walletLedger = [];
  }
  if (!progress.certificates || typeof progress.certificates !== 'object' || Array.isArray(progress.certificates)) {
    progress.certificates = {};
  }
  return progress;
}

export function isRewardEligible(def, progress) {
  if (!def || !def.isActive) return false;
  const completedSet = new Set(progress?.completed || []);

  if (def.triggerType === 'unit') {
    const reqIds = UNIT_LESSONS_MAP.get(def.triggerReference) || [];
    return reqIds.length > 0 && reqIds.every(id => completedSet.has(id));
  }

  if (def.triggerType === 'section') {
    const reqIds = SECTION_LESSONS_MAP.get(def.triggerReference) || [];
    return reqIds.length > 0 && reqIds.every(id => completedSet.has(id));
  }

  if (def.triggerType === 'cefr_level') {
    const reqIds = LEVEL_LESSONS_MAP.get(def.triggerReference) || [];
    const finalLessonId = LEVEL_FINAL_ASSESSMENT_MAP.get(def.triggerReference);
    if (!reqIds.length || !reqIds.every(id => completedSet.has(id))) return false;
    if (finalLessonId && !completedSet.has(finalLessonId)) return false;
    return true;
  }

  return false;
}

/**
 * Safely evaluates and backfills reward availability based on actual user progress.
 * Claimed rewards remain claimed; newly qualified locked rewards become 'available'.
 */
export function evaluateRewards(progress, nowIso = new Date().toISOString()) {
  ensureRewardState(progress);
  const newlyAvailable = [];

  for (const def of REWARD_DEFINITIONS) {
    if (!def.isActive) continue;
    const existing = progress.rewards[def.id];
    if (existing?.status === 'claimed') {
      continue;
    }

    const eligible = isRewardEligible(def, progress);
    if (eligible) {
      if (!existing || existing.status !== 'available') {
        const record = {
          rewardId: def.id,
          status: 'available',
          unlockedAt: existing?.unlockedAt || nowIso,
          claimedAt: null
        };
        progress.rewards[def.id] = record;
        newlyAvailable.push({ ...def, ...record });
      }
    } else if (!existing) {
      progress.rewards[def.id] = {
        rewardId: def.id,
        status: 'locked',
        unlockedAt: null,
        claimedAt: null
      };
    }
  }

  return {
    newlyAvailable,
    rewards: progress.rewards
  };
}

/**
 * Server-validated atomic claim of an eligible reward.
 * Guarantees idempotency: claiming twice never duplicates XP or Gems.
 */
export function claimReward(progress, rewardId, nowIso = new Date().toISOString()) {
  ensureRewardState(progress);
  const def = REWARD_BY_ID.get(rewardId);
  if (!def || !def.isActive) {
    const e = new Error('Reward not found.');
    e.status = 404;
    throw e;
  }

  // Re-evaluate strictly before validating claim
  evaluateRewards(progress, nowIso);
  const record = progress.rewards[def.id];

  if (record?.status === 'claimed') {
    return {
      alreadyClaimed: true,
      reward: { ...def, ...record, badge: def.badgeId ? (BADGE_BY_ID.get(def.badgeId) || null) : null },
      xpAdded: 0,
      gemsAdded: 0,
      newlyUnlockedBadges: [],
      progress
    };
  }

  if (!record || record.status !== 'available' || !isRewardEligible(def, progress)) {
    const e = new Error('Complete all requirements for this milestone to unlock and claim its reward.');
    e.status = 403;
    throw e;
  }

  const claimedAt = nowIso;
  progress.rewards[def.id] = {
    rewardId: def.id,
    status: 'claimed',
    unlockedAt: record.unlockedAt || claimedAt,
    claimedAt
  };

  let xpAdded = 0;
  let gemsAdded = 0;

  if (def.xpAmount > 0) {
    const hasXpTx = progress.walletLedger.some(
      tx => tx.currency === 'xp' && tx.sourceType === 'reward_claim' && tx.sourceId === def.id
    );
    if (!hasXpTx) {
      progress.xp = (Number(progress.xp) || 0) + def.xpAmount;
      xpAdded = def.xpAmount;
      progress.walletLedger.push({
        id: `tx:xp:${def.id}`,
        currency: 'xp',
        amount: def.xpAmount,
        sourceType: 'reward_claim',
        sourceId: def.id,
        rewardName: def.name,
        triggerType: def.triggerType,
        triggerReference: def.triggerReference,
        createdAt: claimedAt
      });
    }
  }

  if (def.gemsAmount > 0) {
    const hasGemsTx = progress.walletLedger.some(
      tx => tx.currency === 'gems' && tx.sourceType === 'reward_claim' && tx.sourceId === def.id
    );
    if (!hasGemsTx) {
      progress.gems = (Number(progress.gems) || 0) + def.gemsAmount;
      gemsAdded = def.gemsAmount;
      progress.walletLedger.push({
        id: `tx:gems:${def.id}`,
        currency: 'gems',
        amount: def.gemsAmount,
        sourceType: 'reward_claim',
        sourceId: def.id,
        rewardName: def.name,
        triggerType: def.triggerType,
        triggerReference: def.triggerReference,
        createdAt: claimedAt
      });
    }
  }

  if (def.certificateTitle && def.triggerType === 'cefr_level') {
    progress.certificates[def.triggerReference] = {
      levelId: def.triggerReference,
      title: def.certificateTitle,
      awardedAt: claimedAt
    };
  }

  const achRes = evaluateAchievements(
    progress,
    {
      type: 'evaluate',
      relatedEntityType: def.triggerType === 'cefr_level' ? 'cefr' : def.triggerType,
      relatedEntityId: def.triggerReference
    },
    claimedAt
  );

  // Also ensure associated badge is awarded if eligible or explicitly tied to a claimed milestone
  if (def.badgeId && BADGE_BY_ID.has(def.badgeId) && !progress.badges[def.badgeId]) {
    const badgeMeta = BADGE_BY_ID.get(def.badgeId);
    progress.badges[def.badgeId] = {
      badgeId: def.badgeId,
      earnedAt: claimedAt,
      relatedEntityType: def.triggerType === 'cefr_level' ? 'cefr' : def.triggerType,
      relatedEntityId: def.triggerReference
    };
    achRes.newlyUnlocked.push({
      ...badgeMeta,
      ...progress.badges[def.badgeId]
    });
  }

  return {
    alreadyClaimed: false,
    reward: {
      ...def,
      ...progress.rewards[def.id],
      badge: def.badgeId ? (BADGE_BY_ID.get(def.badgeId) || null) : null
    },
    xpAdded,
    gemsAdded,
    newlyUnlockedBadges: achRes.newlyUnlocked,
    progress
  };
}

export function formatRewardHistory(progress) {
  ensureRewardState(progress);
  const items = [];
  for (const def of REWARD_DEFINITIONS) {
    const rec = progress.rewards[def.id];
    if (rec && (rec.status === 'available' || rec.status === 'claimed')) {
      items.push({
        ...def,
        ...rec,
        badge: def.badgeId ? (BADGE_BY_ID.get(def.badgeId) || null) : null
      });
    }
  }
  return items.sort((a, b) => {
    const dateB = String(b.claimedAt || b.unlockedAt || '');
    const dateA = String(a.claimedAt || a.unlockedAt || '');
    return dateB.localeCompare(dateA);
  });
}
