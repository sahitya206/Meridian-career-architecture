export type ProficiencyLevel = 'None' | 'Foundational' | 'Working' | 'Production';

export interface UserSkillInput {
  name: string;
  category: 'Core Engineering' | 'AI & Models' | 'Data & Infrastructure' | 'Product & Evaluation';
  level: ProficiencyLevel;
}

export interface SkillGapRow {
  skillName: string;
  category: string;
  currentScore: number; // 0 to 100
  targetScore: number; // 0 to 100
  yoyDemandGrowth: string; // e.g. "+44% YoY"
  salaryWeight: 'High Impact' | 'Core Requirement' | 'Differentiator';
  status: 'Ready' | 'Gap Identified' | 'Priority Focus';
  recommendedAction: string;
}

export interface CurriculumModule {
  id: string;
  title: string;
  estimatedHours: number;
  type: 'Theory & Architecture' | 'Implementation Lab' | 'System Evaluation';
  coreConcepts: string[];
  resourceTitle: string;
  resourceAuthorOrOrg: string;
  resourceUrl: string;
  completed?: boolean;
}

export interface RoadmapStage {
  stageNumber: string; // e.g., "01", "02"
  title: string;
  subtitle: string;
  durationWeeks: number;
  totalHours: number;
  priority: 'Critical Path' | 'Core Competency' | 'Advanced Specialization';
  objective: string;
  industryRationale: string;
  modules: CurriculumModule[];
  capstoneProject: {
    title: string;
    architectureSummary: string;
    deliverables: string[];
    evaluationMetric: string;
  };
}

export interface IndustryTrendInsight {
  trendTitle: string;
  adoptionVelocity: string; // e.g. "+62% Job Postings YoY"
  compensationPremium: string; // e.g. "+$28,000 Median Base"
  impactLevel: 'High Demand' | 'Emerging Standard' | 'Foundational';
  summary: string;
  keyTechnologies: string[];
}

export interface GroundingCitation {
  title: string;
  uri: string;
}

export interface CareerRoadmap {
  id: string;
  currentRole: string;
  targetRole: string;
  industrySector: string;
  experienceLevel: string;
  executiveSummary: string;
  marketOutlook: {
    medianCompensationRange: string;
    openRolesGrowthYoY: string;
    averageTransitionWeeks: number;
    totalCurriculumHours: number;
    topHiringSectors: string[];
  };
  skillMatrix: SkillGapRow[];
  stages: RoadmapStage[];
  industryTrends: IndustryTrendInsight[];
  groundingSources?: GroundingCitation[];
  generatedAt: string;
}

export interface GenerateRoadmapRequest {
  currentRole: string;
  targetRole: string;
  industrySector: string;
  experienceYears: number;
  weeklyHours: number;
  skills: UserSkillInput[];
  focusArea: string;
}

export interface LiveTrendAnalysisResponse {
  targetRole: string;
  industrySector: string;
  analysisMarkdown: string;
  emergingSkills: {
    skill: string;
    growthSignal: string;
    hiringContext: string;
  }[];
  citations: GroundingCitation[];
  updatedAt: string;
}
