import fs from 'node:fs';
import path from 'node:path';

export const B1_OBJECTIVES = {
  obj_b1_used_to: {
    id: 'obj_b1_used_to',
    levelId: 'b1',
    skillDomain: 'grammar',
    title: 'Past Habits and States with "Used to" and "Would"',
    description: 'Describe past habits, discontinued routines, and former states contrasting them with present life.',
    cefrDescriptor: 'Can describe with reasonable fluency past routines, former habits, and changed life situations.'
  },
  obj_b1_past_perfect: {
    id: 'obj_b1_past_perfect',
    levelId: 'b1',
    skillDomain: 'grammar',
    title: 'Chronological Past Narrative with the Past Perfect',
    description: 'Narrate interconnected past events, establishing clear chronological priority using the past perfect and past simple.',
    cefrDescriptor: 'Can relate a narrative or incident with clear temporal sequencing and explain background circumstances.'
  },
  obj_b1_life_decisions: {
    id: 'obj_b1_life_decisions',
    levelId: 'b1',
    skillDomain: 'spoken_interaction',
    title: 'Relating Key Life Decisions and Ongoing Consequences',
    description: 'Narrate pivotal life transitions, educational choices, and their ongoing consequences using perfect continuous aspects.',
    cefrDescriptor: 'Can explain the reasons for personal decisions, career shifts, and describe their outcomes.'
  },
  obj_b1_ambitions_hopes: {
    id: 'obj_b1_ambitions_hopes',
    levelId: 'b1',
    skillDomain: 'spoken_production',
    title: 'Articulating Future Ambitions, Hopes and Goals',
    description: 'Articulate personal and professional goals, dreams, and long-term ambitions with clear supporting rationales.',
    cefrDescriptor: 'Can describe dreams, hopes and ambitions and briefly give reasons and explanations for plans.'
  },
  obj_b1_work_roles: {
    id: 'obj_b1_work_roles',
    levelId: 'b1',
    skillDomain: 'vocabulary',
    title: 'Professional Roles, Work Routines and Team Collaboration',
    description: 'Communicate details about workplace duties, team collaboration, supervision, and professional responsibilities.',
    cefrDescriptor: 'Can describe workplace responsibilities, projects, and collaborate with colleagues in routine tasks.'
  },
  obj_b1_modals_obligation: {
    id: 'obj_b1_modals_obligation',
    levelId: 'b1',
    skillDomain: 'grammar',
    title: 'Regulations, Obligation and Permission in the Workplace',
    description: 'Communicate rules, mandatory safety practices, permissions, and discretionary tasks using modal verbs of obligation.',
    cefrDescriptor: 'Can explain company regulations, workplace safety guidelines, and employee permissions.'
  },
  obj_b1_formal_inquiries: {
    id: 'obj_b1_formal_inquiries',
    levelId: 'b1',
    skillDomain: 'writing',
    title: 'Formal Correspondence, Inquiries and Polite Requests',
    description: 'Draft and interpret formal correspondence, professional inquiries, and polite requests using standard business conventions.',
    cefrDescriptor: 'Can write straightforward formal emails and letters requesting or conveying necessary information.'
  },
  obj_b1_work_negotiation: {
    id: 'obj_b1_work_negotiation',
    levelId: 'b1',
    skillDomain: 'spoken_interaction',
    title: 'Constructive Problem-Solving and Workplace Negotiation',
    description: 'Negotiate compromises, evaluate alternatives, and resolve practical scheduling or project difficulties with colleagues.',
    cefrDescriptor: 'Can contribute to problem-solving discussions and negotiate acceptable compromises on practical matters.'
  },
  obj_b1_travel_delays: {
    id: 'obj_b1_travel_delays',
    levelId: 'b1',
    skillDomain: 'spoken_interaction',
    title: 'Managing Travel Disruptions, Itineraries and Rebooking',
    description: 'Inquire about travel disruptions, missed connections, rerouting, and compensation with transit personnel.',
    cefrDescriptor: 'Can deal with most situations likely to arise whilst travelling, including unexpected delays and rebooking.'
  },
  obj_b1_reporting_problems: {
    id: 'obj_b1_reporting_problems',
    levelId: 'b1',
    skillDomain: 'reading',
    title: 'Filing Official Reports for Lost Belongings and Damage',
    description: 'Complete claim documentation for missing luggage, transit damage, or hotel discrepancies with accurate descriptions.',
    cefrDescriptor: 'Can describe lost property and complete standard claim and declaration forms.'
  },
  obj_b1_emergency_assistance: {
    id: 'obj_b1_emergency_assistance',
    levelId: 'b1',
    skillDomain: 'spoken_interaction',
    title: 'Urgent Medical Assistance and Emergency Communication',
    description: 'Describe urgent symptoms, ask for emergency assistance, and comprehend critical safety directions.',
    cefrDescriptor: 'Can explain emergency situations and medical symptoms clearly enough for urgent medical or roadside assistance.'
  },
  obj_b1_cultural_etiquette: {
    id: 'obj_b1_cultural_etiquette',
    levelId: 'b1',
    skillDomain: 'vocabulary',
    title: 'Cultural Customs, Hospitality and Social Etiquette',
    description: 'Discuss cultural etiquette, local dining traditions, hospitality norms, and respectful behavior when traveling.',
    cefrDescriptor: 'Can describe cultural customs and compare everyday social conventions in different environments.'
  },
  obj_b1_media_literacy: {
    id: 'obj_b1_media_literacy',
    levelId: 'b1',
    skillDomain: 'reading',
    title: 'Interpreting Media Reports and Distinguishing Fact from Opinion',
    description: 'Analyze news stories, headline summaries, and digital articles, distinguishing verifiable facts from subjective opinions.',
    cefrDescriptor: 'Can identify the main conclusions in clearly written argumentative texts and news articles.'
  },
  obj_b1_agree_disagree: {
    id: 'obj_b1_agree_disagree',
    levelId: 'b1',
    skillDomain: 'spoken_interaction',
    title: 'Nuanced Agreement, Polite Disagreement and Balanced Debate',
    description: 'Participate in discussions by expressing balanced views, polite reservations, and well-supported opinions on contemporary issues.',
    cefrDescriptor: 'Can express polite disagreement, offer counter-arguments, and present balanced opinions.'
  },
  obj_b1_second_conditional: {
    id: 'obj_b1_second_conditional',
    levelId: 'b1',
    skillDomain: 'grammar',
    title: 'Hypothetical Reasoning with the Second Conditional',
    description: 'Speculate on hypothetical circumstances, unreal dilemmas, and imaginary outcomes using the second conditional.',
    cefrDescriptor: 'Can talk about hypothetical situations and state what actions they would take in imaginary circumstances.'
  },
  obj_b1_environment_sustainability: {
    id: 'obj_b1_environment_sustainability',
    levelId: 'b1',
    skillDomain: 'vocabulary',
    title: 'Ecological Issues, Sustainability and Conservation',
    description: 'Discuss environmental conservation, renewable energy, plastic reduction, and practical sustainable lifestyle choices.',
    cefrDescriptor: 'Can describe environmental problems and suggest feasible, everyday solutions.'
  },
  obj_b1_reading_reviews: {
    id: 'obj_b1_reading_reviews',
    levelId: 'b1',
    skillDomain: 'reading',
    title: 'Evaluating Articles, Critical Reviews and Recommendations',
    description: 'Extract critical pros and cons, evaluations, and practical guidance from product appraisals, restaurant guides, and reviews.',
    cefrDescriptor: 'Can scan longer texts to identify specific information and understand recommendations.'
  },
  obj_b1_advice_letters: {
    id: 'obj_b1_advice_letters',
    levelId: 'b1',
    skillDomain: 'writing',
    title: 'Drafting Constructive Advice Letters and Problem Responses',
    description: 'Write structured letters and replies offering empathetic, practical advice and constructive recommendations.',
    cefrDescriptor: 'Can write personal letters and messages giving advice and expressing personal reactions.'
  },
  obj_b1_discourse_fluency: {
    id: 'obj_b1_discourse_fluency',
    levelId: 'b1',
    skillDomain: 'spoken_production',
    title: 'Sentence Cohesion, Discourse Markers and Transitions',
    description: 'Structure connected discourse smoothly using transitional linkers, contrastive phrases, and summary markers.',
    cefrDescriptor: 'Can connect a series of short, distinct elements into a linear, cohesive sequence of points.'
  },
  obj_b1_capstone_synthesis: {
    id: 'obj_b1_capstone_synthesis',
    levelId: 'b1',
    skillDomain: 'spoken_interaction',
    title: 'B1 Intermediate Comprehensive Milestone Synthesis',
    description: 'Demonstrate integrated threshold fluency across narrative, professional, travel, and socio-cultural scenarios.',
    cefrDescriptor: 'Can enter unprepared into conversations on familiar topics, express personal opinions and exchange information on topics of personal interest.'
  }
};

console.log('B1 Objectives prepared:', Object.keys(B1_OBJECTIVES).length);
