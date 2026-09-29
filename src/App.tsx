/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  CareerRoadmap,
  LiveTrendAnalysisResponse,
  ProficiencyLevel,
  UserSkillInput,
} from './types/roadmap';
import {
  BENCHMARK_ROADMAPS,
  INITIAL_USER_SKILLS,
} from './data/benchmarkRoadmaps';
import { N8nCareerChat } from './components/N8nCareerChat';

import heroImageUrl from './assets/images/hero_career_architecture_1790582003360.jpg';
import avatarLeadUrl from './assets/images/avatar_mentor_lead_1790582026936.jpg';
import avatarArchitectUrl from './assets/images/avatar_systems_architect_1790582043393.jpg';

const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  'None',
  'Foundational',
  'Working',
  'Production',
];

const PROFICIENCY_SCORE_MAP: Record<ProficiencyLevel, number> = {
  None: 15,
  Foundational: 42,
  Working: 68,
  Production: 90,
};

export default function App() {
  // Active benchmark or custom roadmap state
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('ai-systems-architect');
  const [roadmapsById, setRoadmapsById] = useState<Record<string, CareerRoadmap>>(BENCHMARK_ROADMAPS);
  const activeRoadmap = roadmapsById[selectedPresetKey] || BENCHMARK_ROADMAPS['ai-systems-architect'];

  // Interactive Profile & Calibration Configurator State
  const [currentRole, setCurrentRole] = useState<string>(activeRoadmap.currentRole);
  const [targetRole, setTargetRole] = useState<string>(activeRoadmap.targetRole);
  const [industrySector, setIndustrySector] = useState<string>(activeRoadmap.industrySector);
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [weeklyHours, setWeeklyHours] = useState<number>(12);
  const [focusArea, setFocusArea] = useState<string>(
    'Deterministic Evaluation Harnesses, Hybrid Retrieval & Multi-Agent State Machines'
  );
  const [userSkills, setUserSkills] = useState<UserSkillInput[]>(INITIAL_USER_SKILLS);
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillCategory, setNewSkillCategory] = useState<UserSkillInput['category']>('AI & Models');

  // Roadmap Interactive Filters & Module Completion Tracking
  const [stagePriorityFilter, setStagePriorityFilter] = useState<string>('ALL');
  const [moduleSearchQuery, setModuleSearchQuery] = useState<string>('');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    '01': true,
    '02': true,
    '03': false,
    '04': false,
  });
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({
    'mod-101': true,
    'ml-101': true,
    'ops-101': true,
  });

  // Skill Matrix Category Filter
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<string>('ALL');

  // Gemini Generation & Search Grounding States
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState<boolean>(false);
  const [liveTrendData, setLiveTrendData] = useState<LiveTrendAnalysisResponse | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);

  // Image Fallback States (Zero-Broken-Image Policy)
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);
  const [avatar1Failed, setAvatar1Failed] = useState<boolean>(false);
  const [avatar2Failed, setAvatar2Failed] = useState<boolean>(false);

  // Share Modal & Temporary Share Link / Social Snippet States
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState<boolean>(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'link' | 'snippet' | null>(null);

  // n8n Career Advisor Chat Drawer State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Load shared roadmap from URL query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    const presetTrack = params.get('track');

    if (shareId) {
      fetch(`/api/roadmap/shared/${encodeURIComponent(shareId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.roadmap && data.roadmap.id) {
            const loaded: CareerRoadmap = data.roadmap;
            setRoadmapsById((prev) => ({ ...prev, [loaded.id]: loaded }));
            setSelectedPresetKey(loaded.id);
            setCurrentRole(loaded.currentRole);
            setTargetRole(loaded.targetRole);
            setIndustrySector(loaded.industrySector);
            if (typeof data.weeklyHours === 'number') {
              setWeeklyHours(data.weeklyHours);
            }
          }
        })
        .catch(() => {
          // Fallback to preset track if temporary share ID expired
          if (presetTrack && BENCHMARK_ROADMAPS[presetTrack]) {
            setSelectedPresetKey(presetTrack);
          }
        });
    } else if (presetTrack && BENCHMARK_ROADMAPS[presetTrack]) {
      setSelectedPresetKey(presetTrack);
    }
  }, []);

  // Switch preset career track and synchronize form inputs
  const handleSelectPreset = (presetKey: string) => {
    const target = roadmapsById[presetKey];
    if (!target) return;
    setSelectedPresetKey(presetKey);
    setCurrentRole(target.currentRole);
    setTargetRole(target.targetRole);
    setIndustrySector(target.industrySector);
    setGenerationError(null);
    setExpandedStages({ '01': true, '02': true, '03': false, '04': false });
  };

  // Update individual skill proficiency
  const handleSkillLevelChange = (skillName: string, nextLevel: ProficiencyLevel) => {
    setUserSkills((prev) =>
      prev.map((s) => (s.name === skillName ? { ...s, level: nextLevel } : s))
    );
  };

  // Add custom skill to user's profile
  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (userSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkillName('');
      return;
    }
    setUserSkills((prev) => [
      ...prev,
      { name: trimmed, category: newSkillCategory, level: 'Working' },
    ]);
    setNewSkillName('');
  };

  // Toggle completion of a curriculum module
  const toggleModuleCompletion = (moduleId: string) => {
    setCompletedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Toggle stage accordion expansion
  const toggleStageExpand = (stageNumber: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageNumber]: !prev[stageNumber],
    }));
  };

  // Generate personalized AI roadmap via server-side Gemini endpoint
  const handleGenerateCustomRoadmap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGeneratingRoadmap(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRole,
          targetRole,
          industrySector,
          experienceYears,
          weeklyHours,
          skills: userSkills,
          focusArea,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.roadmap) {
        throw new Error(
          data.error || 'Unable to generate custom roadmap. Please verify your API configuration.'
        );
      }

      const generated: CareerRoadmap = data.roadmap;
      setRoadmapsById((prev) => ({
        ...prev,
        [generated.id]: generated,
      }));
      setSelectedPresetKey(generated.id);
      setExpandedStages({ '01': true, '02': true, '03': true, '04': false });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unexpected error while generating roadmap.';
      setGenerationError(msg);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Run live Google Search Grounded Industry Trend Analysis
  const handleAnalyzeLiveTrends = async () => {
    setIsAnalyzingTrends(true);
    setTrendError(null);

    try {
      const response = await fetch('/api/trends/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: activeRoadmap.targetRole,
          industrySector: activeRoadmap.industrySector,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to retrieve live search-grounded market trends.'
        );
      }

      setLiveTrendData(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to fetch live industry trends.';
      setTrendError(msg);
    } finally {
      setIsAnalyzingTrends(false);
    }
  };

  // Computed metrics calibrated to Weekly Study Allocation & Checked Modules
  const roadmapMetrics = useMemo(() => {
    let totalHours = 0;
    let completedHours = 0;
    let totalModulesCount = 0;
    let completedModulesCount = 0;

    for (const stage of activeRoadmap.stages) {
      for (const mod of stage.modules) {
        totalHours += mod.estimatedHours;
        totalModulesCount += 1;
        if (completedModules[mod.id]) {
          completedHours += mod.estimatedHours;
          completedModulesCount += 1;
        }
      }
    }

    const remainingHours = Math.max(0, totalHours - completedHours);
    const dynamicWeeksRemaining = Math.max(1, Math.ceil(remainingHours / Math.max(1, weeklyHours)));
    const completionPercentage =
      totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

    // Calculate projected readiness date from current date (2026-09-28)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dynamicWeeksRemaining * 7);
    const formattedTargetDate = targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      totalHours,
      completedHours,
      remainingHours,
      totalModulesCount,
      completedModulesCount,
      dynamicWeeksRemaining,
      completionPercentage,
      formattedTargetDate,
    };
  }, [activeRoadmap, completedModules, weeklyHours]);

  // Dynamically calibrate skill matrix rows against user's interactive proficiency controls
  const calibratedSkillMatrix = useMemo(() => {
    return activeRoadmap.skillMatrix
      .map((row) => {
        const matchedUserSkill = userSkills.find(
          (u) =>
            row.skillName.toLowerCase().includes(u.name.split(' ')[0].toLowerCase()) ||
            u.name.toLowerCase().includes(row.skillName.split(' ')[0].toLowerCase())
        );
        const currentScore = matchedUserSkill
          ? PROFICIENCY_SCORE_MAP[matchedUserSkill.level]
          : row.currentScore;
        const delta = row.targetScore - currentScore;
        const status: 'Ready' | 'Gap Identified' | 'Priority Focus' =
          delta <= 8 ? 'Ready' : delta >= 40 ? 'Priority Focus' : 'Gap Identified';

        return {
          ...row,
          currentScore,
          delta: Math.max(0, delta),
          status,
        };
      })
      .filter((row) =>
        skillCategoryFilter === 'ALL' ? true : row.category === skillCategoryFilter
      );
  }, [activeRoadmap.skillMatrix, userSkills, skillCategoryFilter]);

  // Filtered stages based on priority & search input
  const filteredStages = useMemo(() => {
    return activeRoadmap.stages.filter((stage) => {
      const matchesPriority =
        stagePriorityFilter === 'ALL' || stage.priority === stagePriorityFilter;
      const query = moduleSearchQuery.trim().toLowerCase();
      if (!query) return matchesPriority;

      const inStageTitle =
        stage.title.toLowerCase().includes(query) ||
        stage.objective.toLowerCase().includes(query) ||
        stage.capstoneProject.title.toLowerCase().includes(query);
      const inModules = stage.modules.some(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.coreConcepts.some((c) => c.toLowerCase().includes(query))
      );
      return matchesPriority && (inStageTitle || inModules);
    });
  }, [activeRoadmap.stages, stagePriorityFilter, moduleSearchQuery]);

  // Export Markdown study plan
  const handleExportRoadmap = () => {
    const lines: string[] = [
      `# Meridian Career Architecture — Personalized Study Plan`,
      `Transition: ${activeRoadmap.currentRole} -> ${activeRoadmap.targetRole}`,
      `Sector: ${activeRoadmap.industrySector}`,
      `Weekly Commitment: ${weeklyHours} hrs/week | Remaining Duration: ~${roadmapMetrics.dynamicWeeksRemaining} weeks (${roadmapMetrics.remainingHours} hrs remaining)`,
      `Projected Readiness Date: ${roadmapMetrics.formattedTargetDate}`,
      ``,
      `## Executive Summary`,
      activeRoadmap.executiveSummary,
      ``,
      `## Skill Gap Matrix`,
      ...calibratedSkillMatrix.map(
        (s) =>
          `- **${s.skillName}** (${s.category}): Current ${s.currentScore}/100 -> Target ${s.targetScore}/100 | Demand: ${s.yoyDemandGrowth} | Status: ${s.status}`
      ),
      ``,
      `## Curriculum Stages & Capstones`,
    ];

    for (const stage of activeRoadmap.stages) {
      const stageWeeksAtPace = Math.max(1, Math.ceil(stage.totalHours / weeklyHours));
      lines.push(
        `### Stage ${stage.stageNumber}: ${stage.title} (${stageWeeksAtPace} weeks @ ${weeklyHours}h/wk · ${stage.totalHours} hrs)`
      );
      lines.push(`${stage.objective}`);
      lines.push(``);
      for (const mod of stage.modules) {
        const check = completedModules[mod.id] ? '[x]' : '[ ]';
        lines.push(
          `- ${check} **${mod.title}** (${mod.estimatedHours}h · ${mod.type}) — Concepts: ${mod.coreConcepts.join(', ')} | Reference: ${mod.resourceTitle} (${mod.resourceUrl})`
        );
      }
      lines.push(``);
      lines.push(`**Capstone Project**: ${stage.capstoneProject.title}`);
      lines.push(`- Summary: ${stage.capstoneProject.architectureSummary}`);
      lines.push(`- Benchmark Metric: ${stage.capstoneProject.evaluationMetric}`);
      lines.push(``);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeRoadmap.targetRole.toLowerCase().replace(/\s+/g, '-')}-roadmap.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate temporary shareable link & social media snippet for the current roadmap
  const handleOpenShareModal = async () => {
    setIsShareModalOpen(true);
    setCopiedField(null);
    setIsCreatingShareLink(true);

    const baseUrl = window.location.origin + window.location.pathname;
    try {
      const response = await fetch('/api/roadmap/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmap: activeRoadmap,
          weeklyHours,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setShareableUrl(
          `${baseUrl}?share=${encodeURIComponent(data.shareId)}&track=${encodeURIComponent(
            activeRoadmap.id
          )}`
        );
        setShareExpiresAt(data.expiresAt);
      } else {
        setShareableUrl(
          `${baseUrl}?track=${encodeURIComponent(
            activeRoadmap.id
          )}&role=${encodeURIComponent(activeRoadmap.targetRole)}`
        );
      }
    } catch {
      setShareableUrl(
        `${baseUrl}?track=${encodeURIComponent(
          activeRoadmap.id
        )}&role=${encodeURIComponent(activeRoadmap.targetRole)}`
      );
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const socialMediaSnippet = useMemo(() => {
    const stageHighlights = activeRoadmap.stages
      .slice(0, 4)
      .map((s) => `${s.stageNumber}. ${s.title} (${s.totalHours}h)`)
      .join('\n');

    return `Architecting my transition from ${activeRoadmap.currentRole} → ${activeRoadmap.targetRole} (${activeRoadmap.industrySector}) with Meridian Career Architecture.\n\n• Pace: ${weeklyHours} hrs/wk (~${roadmapMetrics.dynamicWeeksRemaining} weeks · ${roadmapMetrics.totalHours} total hrs)\n• Market Signal: ${activeRoadmap.marketOutlook.openRolesGrowthYoY} role demand (${activeRoadmap.marketOutlook.medianCompensationRange})\n\nCurriculum Stages:\n${stageHighlights}\n\n${
      shareableUrl || window.location.origin
    }`;
  }, [activeRoadmap, weeklyHours, roadmapMetrics, shareableUrl]);

  const handleCopyText = async (text: string, field: 'link' | 'snippet') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* TOP BAR CONTRACT: Strictly 1 row, 3 zones (Brand Wordmark — 4 Nav Links — Primary Actions) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="font-display text-xl font-semibold tracking-tight text-slate-950 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          Meridian
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => scrollToSection('roadmap-studio')}
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Roadmap Studio
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('skill-matrix')}
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Skill Matrix
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('industry-demand')}
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Industry Demand
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('outcomes')}
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
          >
            Outcomes
          </button>
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenShareModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handleExportRoadmap}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Study Plan</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('calibrator-panel')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Configure Path</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* SHARE ROADMAP MODAL: Temporary Shareable Link & Social Media Snippet */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-roadmap-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-medium text-sky-700">
                  {selectedPresetKey.startsWith('custom-')
                    ? 'Custom-Generated AI Roadmap'
                    : 'Calibrated Career Roadmap'}
                </p>
                <h2
                  id="share-roadmap-title"
                  className="font-display text-lg font-semibold text-slate-950 mt-0.5"
                >
                  Share {activeRoadmap.currentRole} → {activeRoadmap.targetRole}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                aria-label="Close share modal"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Temporary Shareable Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="share-link-input"
                  className="font-semibold text-slate-800"
                >
                  Temporary Shareable Link (24-Hour Snapshot)
                </label>
                {shareExpiresAt && (
                  <span className="font-mono tabular-nums text-[11px] text-slate-500">
                    Expires{' '}
                    {new Date(shareExpiresAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={
                    isCreatingShareLink
                      ? 'Generating temporary shareable link...'
                      : shareableUrl
                  }
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-2 focus:outline-sky-600"
                />
                <button
                  type="button"
                  disabled={isCreatingShareLink}
                  onClick={() => handleCopyText(shareableUrl, 'link')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedField === 'link' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Social Media Snippet */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="social-snippet-textarea"
                  className="font-semibold text-slate-800"
                >
                  Social Media Snippet (LinkedIn / X)
                </label>
                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                  {socialMediaSnippet.length} chars
                </span>
              </div>
              <textarea
                id="social-snippet-textarea"
                readOnly
                rows={7}
                value={socialMediaSnippet}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-800 leading-relaxed focus:outline-2 focus:outline-sky-600"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyText(socialMediaSnippet, 'snippet')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedField === 'snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied Snippet</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Social Snippet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main id="top" className="flex-1">
        {/* HERO SECTION: Single dominant focal anchor with 16:9 studio photography & measured scrim */}
        <section className="max-w-[1360px] mx-auto px-6 lg:px-10 pt-8 pb-12">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[420px] flex flex-col justify-end">
            {!heroImgFailed ? (
              <img
                src={heroImageUrl}
                alt="Minimalist architectural engineering research studio at golden hour"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950" />
            )}
            {/* Measured contrast scrim ensuring >= 4.5:1 text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/20" />

            <div className="relative z-10 p-8 lg:p-12 max-w-4xl">
              <p className="text-xs font-medium text-sky-300 tracking-wide mb-3">
                Technical Career Architecture · Calibrated to 2026 Hiring Signals
              </p>
              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-white leading-[1.15] tracking-tight mb-4"
                style={{ textWrap: 'balance' }}
              >
                Architect your transition into production AI engineering with empirical precision.
              </h1>
              <p className="text-base text-slate-200 leading-relaxed max-w-[68ch] mb-8">
                Stop piecing together generic tutorials. Meridian maps your current engineering
                competencies against real-time market demand to sequence concrete learning modules,
                production evaluation benchmarks, and portfolio-ready capstone systems.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => scrollToSection('calibrator-panel')}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-white rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Build Personalized Roadmap</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('industry-demand')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Inspect Live Hiring Signals</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-sky-200 border border-sky-400/40 bg-sky-950/50 rounded-lg hover:bg-sky-900/60 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Ask AI Career Advisor</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quantitative Proof Strip directly adjacent to Hero claim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 bg-white border border-slate-200 rounded-xl p-6">
            <div>
              <div className="text-xs text-slate-500 mb-1">Target Role Compensation Band</div>
              <div className="font-mono tabular-nums text-xl font-semibold text-slate-950">
                {activeRoadmap.marketOutlook.medianCompensationRange}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Total annual compensation · US & Global Remote
              </div>
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <div className="text-xs text-slate-500 mb-1">Open Role Demand Velocity</div>
              <div className="font-mono tabular-nums text-xl font-semibold text-emerald-700">
                ▲ {activeRoadmap.marketOutlook.openRolesGrowthYoY}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Year-over-year senior & staff job postings
              </div>
            </div>

            <div className="lg:border-l lg:border-slate-200 lg:pl-6">
              <div className="text-xs text-slate-500 mb-1">Calibrated Time to Readiness</div>
              <div className="font-mono tabular-nums text-xl font-semibold text-slate-950">
                {roadmapMetrics.dynamicWeeksRemaining} Weeks · {roadmapMetrics.remainingHours} hrs
              </div>
              <div className="text-xs text-slate-500 mt-1">
                At {weeklyHours} hrs/wk · Est. {roadmapMetrics.formattedTargetDate}
              </div>
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <div className="text-xs text-slate-500 mb-1">Curriculum Progress</div>
              <div className="font-mono tabular-nums text-xl font-semibold text-sky-700">
                {roadmapMetrics.completionPercentage}% Complete
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {roadmapMetrics.completedModulesCount} of {roadmapMetrics.totalModulesCount} modules verified
              </div>
            </div>
          </div>
        </section>

        {/* WORKSPACE CANVAS: Two-Zone Interactive Calibrator + Multi-Stage Roadmap Studio */}
        <section
          id="roadmap-studio"
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 border-t border-slate-200"
        >
          {/* Header + Benchmark Role Track Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                01. Interactive Learning Path Studio
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
                {activeRoadmap.currentRole} → {activeRoadmap.targetRole}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Sector Focus: {activeRoadmap.industrySector} · Experience Baseline:{' '}
                {activeRoadmap.experienceLevel}
              </p>
            </div>

            {/* Interactive Segmented Benchmark Track Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-200/80 p-1 rounded-lg self-start lg:self-auto">
              <button
                type="button"
                onClick={() => handleSelectPreset('ai-systems-architect')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedPresetKey === 'ai-systems-architect'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                AI Systems Architect
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('applied-ml-engineer')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedPresetKey === 'applied-ml-engineer'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Applied ML Engineer
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('mlops-platform-engineer')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedPresetKey === 'mlops-platform-engineer'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                MLOps & Inference Platform
              </button>
              {selectedPresetKey.startsWith('custom-') && (
                <button
                  type="button"
                  onClick={() => setSelectedPresetKey(selectedPresetKey)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-md bg-white text-sky-700 shadow-xs whitespace-nowrap cursor-pointer"
                >
                  ● Custom AI Path
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT ZONE (4 Cols): Skill & Commitment Calibrator Deck */}
            <aside
              id="calibrator-panel"
              className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    Career & Skill Calibrator
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure parameters to synthesize a tailored curriculum via Gemini
                  </p>
                </div>
                <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              <form onSubmit={handleGenerateCustomRoadmap} className="space-y-4">
                <div>
                  <label
                    htmlFor="current-role-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Current Role
                  </label>
                  <input
                    id="current-role-input"
                    type="text"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                    placeholder="e.g., Senior Full-Stack Engineer"
                  />
                </div>

                <div>
                  <label
                    htmlFor="target-role-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Target AI Role
                  </label>
                  <input
                    id="target-role-input"
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                    placeholder="e.g., Principal AI Systems Architect"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="sector-input"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Industry Sector
                    </label>
                    <input
                      id="sector-input"
                      type="text"
                      value={industrySector}
                      onChange={(e) => setIndustrySector(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="exp-years-input"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Years Experience
                    </label>
                    <input
                      id="exp-years-input"
                      type="number"
                      min={0}
                      max={35}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                    />
                  </div>
                </div>

                {/* Labeled Slider with explicit unit & live numeric feedback */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="weekly-hours-slider"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Weekly Study Allocation
                    </label>
                    <span className="font-mono tabular-nums text-xs font-semibold text-sky-700">
                      {weeklyHours} hrs / week
                    </span>
                  </div>
                  <input
                    id="weekly-hours-slider"
                    type="range"
                    min={4}
                    max={30}
                    step={2}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500 mt-1">
                    <span>4 hrs/wk (Steady)</span>
                    <span>14 hrs/wk</span>
                    <span>30 hrs/wk (Intensive)</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="focus-area-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Specialization Priority
                  </label>
                  <input
                    id="focus-area-input"
                    type="text"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                  />
                </div>

                {/* Submit Button for Live Gemini Generation */}
                <button
                  type="submit"
                  disabled={isGeneratingRoadmap}
                  className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {isGeneratingRoadmap ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Custom Path via Gemini...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Personalized AI Roadmap</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {generationError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1"
                  >
                    <div className="font-semibold">▲ Roadmap Generation Alert</div>
                    <p>{generationError}</p>
                  </div>
                )}
              </form>

              {/* Current Skill Baseline Interactive Controls */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Current Competency Baseline ({userSkills.length} Skills)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Adjust your proficiency levels to dynamically recalibrate gap priorities
                  </p>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {userSkills.map((skill) => (
                    <div
                      key={skill.name}
                      className="pb-3 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-800 truncate pr-2">
                          {skill.name}
                        </span>
                        <span className="text-slate-400 text-[11px] shrink-0">
                          {skill.category}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-md">
                        {PROFICIENCY_LEVELS.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleSkillLevelChange(skill.name, lvl)}
                            className={`py-1 px-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap truncate cursor-pointer ${
                              skill.level === lvl
                                ? 'bg-white text-slate-950 font-semibold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Skill Input */}
                <form onSubmit={handleAddCustomSkill} className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Add skill (e.g., Rust, CUDA, LangGraph)..."
                      aria-label="Add custom skill"
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Domain:</span>
                    {(
                      [
                        'AI & Models',
                        'Core Engineering',
                        'Data & Infrastructure',
                        'Product & Evaluation',
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewSkillCategory(cat)}
                        className={`underline-offset-2 cursor-pointer ${
                          newSkillCategory === cat
                            ? 'text-slate-950 font-semibold underline'
                            : 'hover:text-slate-800'
                        }`}
                      >
                        {cat.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </form>
              </div>
            </aside>

            {/* RIGHT ZONE (8 Cols): Sequenced Multi-Stage Curriculum & Capstone Architecture */}
            <div className="lg:col-span-8 space-y-6">
              {/* Executive Architecture Diagnostic */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500">
                      Strategic Transition Diagnostic · Updated{' '}
                      {new Date(activeRoadmap.generatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                         year: 'numeric',
                      })}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-950 mt-0.5">
                      Executive Path Synthesis
                    </h3>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-600">
                    Top Hiring: {activeRoadmap.marketOutlook.topHiringSectors.join(' · ')}
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mt-4">
                  {activeRoadmap.executiveSummary}
                </p>

                {/* Filter & Search Bar for Curriculum Stages */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Interactive Stage Priority Filter Buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                    {(
                      [
                        { id: 'ALL', label: 'All Stages' },
                        { id: 'Critical Path', label: 'Critical Path' },
                        { id: 'Core Competency', label: 'Core Competency' },
                        { id: 'Advanced Specialization', label: 'Specialization' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStagePriorityFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          stagePriorityFilter === tab.id
                            ? 'bg-white text-slate-950 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-950'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Curriculum Search Input */}
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={moduleSearchQuery}
                      onChange={(e) => setModuleSearchQuery(e.target.value)}
                      placeholder="Filter modules or concepts..."
                      aria-label="Filter modules or concepts"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600"
                    />
                  </div>
                </div>
              </div>

              {/* Loading Skeleton State when Gemini is generating */}
              {isGeneratingRoadmap && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-2/3" />
                  <div className="h-16 bg-slate-100 rounded w-full" />
                  <div className="space-y-2 pt-4 border-t border-slate-200">
                    <div className="h-10 bg-slate-100 rounded w-full" />
                    <div className="h-10 bg-slate-100 rounded w-full" />
                  </div>
                </div>
              )}

              {/* Empty Filter State */}
              {!isGeneratingRoadmap && filteredStages.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-900">
                    No curriculum stages match your current filter criteria.
                  </p>
                  <p className="text-xs text-slate-500">
                    Clear your search query or switch the priority filter to view all stages.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStagePriorityFilter('ALL');
                      setModuleSearchQuery('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Reset Curriculum Filters
                  </button>
                </div>
              )}

              {/* Multi-Stage Curriculum Cards (Single-elevation depth; hairline dividers inside) */}
              <div className="space-y-5">
                {filteredStages.map((stage) => {
                  const isExpanded = !!expandedStages[stage.stageNumber];
                  const dynamicWeeks = Math.max(
                    1,
                    Math.ceil(stage.totalHours / Math.max(1, weeklyHours))
                  );
                  const stageCompletedCount = stage.modules.filter(
                    (m) => completedModules[m.id]
                  ).length;

                  return (
                    <article
                      key={stage.stageNumber}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                    >
                      {/* Stage Header */}
                      <div className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono tabular-nums font-semibold text-slate-900">
                              Stage {stage.stageNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {dynamicWeeks} Weeks at {weeklyHours}h/wk ({stage.totalHours} Hours)
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                stage.priority === 'Critical Path'
                                  ? 'text-sky-700 font-semibold'
                                  : 'text-slate-700 font-medium'
                              }
                            >
                              {stage.priority === 'Critical Path'
                                ? '▲ Critical Path'
                                : stage.priority === 'Core Competency'
                                ? '● Core Competency'
                                : '◆ Advanced Specialization'}
                            </span>
                          </div>

                          <div className="font-mono tabular-nums text-xs text-slate-600">
                            {stageCompletedCount}/{stage.modules.length} Modules Verified
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">
                              {stage.stageNumber}. {stage.title}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">{stage.subtitle}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleStageExpand(stage.stageNumber)}
                            aria-expanded={isExpanded}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Collapse' : 'Inspect Syllabus'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed mt-4">
                          {stage.objective}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          <strong className="font-semibold text-slate-700">
                            Hiring Signal Rationale:
                          </strong>{' '}
                          {stage.industryRationale}
                        </p>
                      </div>

                      {/* Expandable Modules & Capstone Section separated by hairline border */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 divide-y divide-slate-200">
                          {/* Modules List */}
                          <div className="p-6 space-y-5">
                            <h4 className="text-xs font-semibold text-slate-900">
                              Required Technical Modules (Click to mark completed)
                            </h4>
                            <div className="divide-y divide-slate-100">
                              {stage.modules.map((mod) => {
                                const isDone = !!completedModules[mod.id];
                                return (
                                  <div
                                    key={mod.id}
                                    className="py-4 first:pt-1 last:pb-1 flex items-start gap-3.5"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleModuleCompletion(mod.id)}
                                      aria-label={`Mark ${mod.title} as ${
                                        isDone ? 'incomplete' : 'completed'
                                      }`}
                                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                        isDone
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : 'bg-white border-slate-300 hover:border-slate-500'
                                      }`}
                                    >
                                      {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span
                                          className={`text-sm font-semibold ${
                                            isDone
                                              ? 'line-through text-slate-400'
                                              : 'text-slate-900'
                                          }`}
                                        >
                                          {mod.title}
                                        </span>
                                        <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                                          {mod.estimatedHours} hrs · {mod.type}
                                          {isDone ? ' · ✓ Completed' : ''}
                                        </span>
                                      </div>

                                      {/* Unboxed metadata concepts with typographic middle dots */}
                                      <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-medium text-slate-700">
                                          Core Topics:
                                        </span>
                                        {mod.coreConcepts.map((concept, idx) => (
                                          <React.Fragment key={concept}>
                                            <span>{concept}</span>
                                            {idx < mod.coreConcepts.length - 1 && (
                                              <span aria-hidden="true">·</span>
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </div>

                                      {/* Primary Reference Link */}
                                      <div className="mt-2 text-xs flex flex-wrap items-center gap-2">
                                        <span className="text-slate-500">
                                          Primary Study Reference:
                                        </span>
                                        <a
                                          href={mod.resourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                                        >
                                          <span>
                                            {mod.resourceTitle} ({mod.resourceAuthorOrOrg})
                                          </span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Stage Capstone Specification */}
                          <div className="p-6 bg-slate-50/70">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                              <span className="font-semibold text-slate-900">
                                Stage {stage.stageNumber} Portfolio Capstone Deliverable
                              </span>
                              <span className="font-mono tabular-nums text-emerald-700 font-medium">
                                Target Benchmark: {stage.capstoneProject.evaluationMetric}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-950">
                              {stage.capstoneProject.title}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed mt-1">
                              {stage.capstoneProject.architectureSummary}
                            </p>
                            <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                              {stage.capstoneProject.deliverables.map((deliv, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="font-mono tabular-nums text-slate-400">
                                    0{i + 1}.
                                  </span>
                                  <span>{deliv}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: HIGH-DENSITY SKILL GAP MATRIX */}
        <section
          id="skill-matrix"
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-12 border-t border-slate-200"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                02. Quantitative Competency Audit
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
                Skill Gap Matrix vs. Target Role Benchmark
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Compares your calibrated baseline scores against 2026 hiring bar requirements for{' '}
                <span className="font-semibold text-slate-900">{activeRoadmap.targetRole}</span>.
              </p>
            </div>

            {/* Category Filter Controls */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg self-start md:self-auto overflow-x-auto">
              {(['ALL', 'AI & Models', 'Data & Infrastructure', 'Core Engineering', 'Product & Evaluation'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSkillCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      skillCategoryFilter === cat
                        ? 'bg-white text-slate-950 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Domains' : cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-5">Competency & Domain</th>
                    <th className="py-3.5 px-4 text-right">Current Baseline</th>
                    <th className="py-3.5 px-4 text-right">Target Benchmark</th>
                    <th className="py-3.5 px-4 text-right">12M Demand Delta</th>
                    <th className="py-3.5 px-4">Diagnostic Status</th>
                    <th className="py-3.5 px-5">Recommended Engineering Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {calibratedSkillMatrix.map((row) => (
                    <tr
                      key={row.skillName}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900">{row.skillName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {row.category} · {row.salaryWeight}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {row.currentScore} / 100
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-950">
                        {row.targetScore} / 100
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {row.yoyDemandGrowth}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-semibold">
                        {row.status === 'Ready' && (
                          <span className="text-emerald-700">● Nominal / Ready</span>
                        )}
                        {row.status === 'Priority Focus' && (
                          <span className="text-amber-700">▲ Priority Focus</span>
                        )}
                        {row.status === 'Gap Identified' && (
                          <span className="text-sky-700">◆ Gap Identified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600 max-w-md">
                        {row.recommendedAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 3: INDUSTRY DEMAND & LIVE GOOGLE SEARCH GROUNDING */}
        <section
          id="industry-demand"
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-12 border-t border-slate-200"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                03. Market Telemetry & Hiring Signals
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
                Industry Demand & Compensation Drivers
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Track structural shifts in technical interviews, production stack adoption, and
                verify live job-market signals with Google Search grounding.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAnalyzeLiveTrends}
              disabled={isAnalyzingTrends}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60 transition-colors whitespace-nowrap self-start lg:self-auto cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isAnalyzingTrends ? 'animate-spin' : ''}`}
              />
              <span>
                {isAnalyzingTrends
                  ? 'Querying Live Search Grounding...'
                  : `Fetch Live Market Pulse for ${activeRoadmap.targetRole}`}
              </span>
            </button>
          </div>

          {/* Live Google Search Grounded Result Panel (when triggered) */}
          {trendError && (
            <div
              role="alert"
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800"
            >
              <span className="font-semibold">▲ Live Search Grounding Error:</span> {trendError}
            </div>
          )}

          {liveTrendData && (
            <div className="mb-8 bg-white border border-sky-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="text-xs font-semibold text-sky-800">
                  ● Live Web-Grounded Market Brief · {liveTrendData.targetRole} (
                  {liveTrendData.industrySector})
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  Grounded via Google Search ·{' '}
                  {new Date(liveTrendData.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {liveTrendData.analysisMarkdown}
              </div>

              {liveTrendData.citations.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Verified Web Grounding Sources ({liveTrendData.citations.length}):
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {liveTrendData.citations.map((cit, index) => (
                      <a
                        key={`${cit.uri}-${index}`}
                        href={cit.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                      >
                        <span className="font-mono tabular-nums">[{index + 1}]</span>
                        <span className="truncate max-w-[260px]">{cit.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Asymmetric Bento Grid of Industry Trend Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {activeRoadmap.industryTrends.map((trend, idx) => (
              <div
                key={trend.trendTitle}
                className={`bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between ${
                  idx === 0 && activeRoadmap.industryTrends.length === 2
                    ? 'lg:col-span-2'
                    : 'lg:col-span-1'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3">
                    <span className="font-mono tabular-nums font-semibold text-emerald-700">
                      ▲ {trend.adoptionVelocity}
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 font-medium">
                      {trend.compensationPremium}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-950 leading-snug">
                    0{idx + 1}. {trend.trendTitle}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mt-2.5">
                    {trend.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-700">Core Stack:</span>
                  {trend.keyTechnologies.map((tech, tIdx) => (
                    <React.Fragment key={tech}>
                      <span>{tech}</span>
                      {tIdx < trend.keyTechnologies.length - 1 && (
                        <span aria-hidden="true">·</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: ATTRIBUTABLE PROOF OF IMPACT & TRANSITION OUTCOMES */}
        <section
          id="outcomes"
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-12 border-t border-slate-200"
        >
          <div className="mb-8">
            <p className="text-xs font-medium text-slate-500 mb-1">
              04. Verified Transition Case Studies
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
              Measured Engineering Outcomes
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Concrete before-and-after transitions from software and data practitioners who
              executed structured, evaluation-first capstone portfolios.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Case Study 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3.5">
                    {!avatar1Failed ? (
                      <img
                        src={avatarLeadUrl}
                        alt="Elena Rostova, Staff AI Systems Architect"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatar1Failed(true)}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-900 text-white font-semibold text-sm flex items-center justify-center shrink-0">
                        ER
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Elena Rostova</div>
                      <div className="text-xs text-slate-500">
                        Staff AI Systems Architect · LinearScale Cloud
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs font-semibold text-emerald-700">
                      +41% Total Comp
                    </div>
                    <div className="text-[11px] text-slate-500">14 Weeks · 12 hrs/wk</div>
                  </div>
                </div>

                <blockquote className="text-sm text-slate-700 leading-relaxed mt-4">
                  “Before using Meridian, I had built three toy RAG demos that failed immediately
                  in technical system design interviews. By focusing my study hours on Stage 01’s
                  deterministic evaluation harness and Stage 02’s BM25 + HNSW reciprocal rank
                  fusion capstone, I walked into my Staff loop with empirical latency and NDCG@10
                  benchmarks. I received two competing Staff AI Architect offers within 15 weeks.”
                </blockquote>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Prior Role: Senior Backend Engineer (Distributed Payments)</span>
                <span className="font-mono tabular-nums text-slate-700">
                  Verified Capstone: Hybrid Codebase Search (NDCG@10: 0.88)
                </span>
              </div>
            </div>

            {/* Case Study 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3.5">
                    {!avatar2Failed ? (
                      <img
                        src={avatarArchitectUrl}
                        alt="Marcus Vance, Principal Inference Platform Engineer"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatar2Failed(true)}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-900 text-white font-semibold text-sm flex items-center justify-center shrink-0">
                        MV
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Marcus Vance</div>
                      <div className="text-xs text-slate-500">
                        Principal Inference Platform Engineer · CoreCompute Labs
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs font-semibold text-emerald-700">
                      +$68,000 Base Lift
                    </div>
                    <div className="text-[11px] text-slate-500">12 Weeks · 14 hrs/wk</div>
                  </div>
                </div>

                <blockquote className="text-sm text-slate-700 leading-relaxed mt-4">
                  “As a Kubernetes infrastructure engineer, I knew container orchestration cold
                  but lacked first-principles fluency in GPU HBM roofline math and KV-cache
                  autoscaling. Completing the prefix-aware vLLM L7 router capstone gave me a
                  concrete architectural artifact that directly solved my hiring manager’s
                  multi-tenant GPU utilization bottleneck.”
                </blockquote>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Prior Role: Lead Cloud Infrastructure Engineer</span>
                <span className="font-mono tabular-nums text-slate-700">
                  Verified Capstone: Prefix-Hash vLLM Gateway (76% Cache Hit Rate)
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER: Wordmark, navigation mirror, and real user actions */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-sm font-semibold text-slate-950">Meridian</span>
            <span aria-hidden="true">·</span>
            <span>AI Career Architecture & Empirical Curriculum Engine</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToSection('roadmap-studio')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Roadmap Studio
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('skill-matrix')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Skill Matrix
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('industry-demand')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Industry Demand
            </button>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              AI Career Chat
            </button>
            <button
              type="button"
              onClick={handleExportRoadmap}
              className="text-slate-800 font-semibold hover:underline cursor-pointer"
            >
              Download Markdown Plan
            </button>
          </div>
        </div>
      </footer>

      {/* n8n Webhook Career Advisor Chat Widget */}
      <N8nCareerChat
        activeRoadmap={activeRoadmap}
        weeklyHours={weeklyHours}
        isOpen={isChatOpen}
        onToggleOpen={setIsChatOpen}
      />
    </div>
  );
}
