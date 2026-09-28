import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const app = express();

// In-memory store for temporary shareable roadmaps (24h TTL)
const sharedRoadmaps = new Map<
  string,
  { roadmap: unknown; weeklyHours: number; expiresAt: number }
>();

app.use(express.json({ limit: '2mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a temporary shareable link ID for a roadmap
app.post('/api/roadmap/share', (req, res) => {
  try {
    const { roadmap, weeklyHours = 12 } = req.body || {};
    if (!roadmap || !roadmap.targetRole) {
      res.status(400).json({ error: 'Valid roadmap payload is required.' });
      return;
    }
    const shareId = `sh_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    sharedRoadmaps.set(shareId, { roadmap, weeklyHours, expiresAt });
    res.json({
      shareId,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create shareable link.';
    res.status(500).json({ error: message });
  }
});

// Retrieve a shared roadmap by temporary ID
app.get('/api/roadmap/shared/:shareId', (req, res) => {
  const entry = sharedRoadmaps.get(req.params.shareId);
  if (!entry || Date.now() > entry.expiresAt) {
    sharedRoadmaps.delete(req.params.shareId);
    res.status(404).json({ error: 'Temporary share link has expired or does not exist.' });
    return;
  }
  res.json(entry);
});

// 1. Personalized AI Career Roadmap Generator Endpoint
app.post('/api/roadmap/generate', async (req, res) => {
  try {
    const {
      currentRole = 'Senior Full-Stack Engineer',
      targetRole = 'AI Systems Architect',
      industrySector = 'Enterprise B2B SaaS',
      experienceYears = 5,
      weeklyHours = 12,
      skills = [],
      focusArea = 'Production RAG, Evaluation Harnesses & Agentic Systems',
    } = req.body || {};

    const ai = getGenAIClient();

    const skillSummary = Array.isArray(skills)
      ? skills
          .map((s: { name: string; level: string; category?: string }) => `${s.name} (${s.level})`)
          .join(', ')
      : 'TypeScript (Production), Python (Working), SQL (Working)';

    const prompt = `Design a rigorous, production-grade technical career transition roadmap for an engineer moving from "${currentRole}" (${experienceYears} years experience) to "${targetRole}" in the "${industrySector}" sector.

Candidate's Current Skill Profile: ${skillSummary}
Weekly Study Commitment: ${weeklyHours} hours/week
Primary Technical Focus Area: ${focusArea}

Requirements:
1. Calibrate the skillMatrix directly to the candidate's current skills vs. 2026 industry hiring benchmarks for ${targetRole}.
2. Structure 4 sequential learning stages numbered "01", "02", "03", "04" with realistic durationWeeks and totalHours based on ${weeklyHours} hours/week.
3. Each stage must include 3 concrete technical modules (with real, authoritative documentation/paper URLs from Google Cloud, Stanford, arXiv, PyTorch, OWASP, or ACM) and a measurable hands-on capstone project with specific deliverables and an evaluation metric.
4. Provide 3 high-signal 2026 industry trends with YoY adoption velocity and compensation premium figures.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a Principal Engineering Career Architect and Staff Technical Recruiter. Produce concrete, quantitative, engineering-grade learning paths without generic buzzwords.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentRole: { type: Type.STRING },
            targetRole: { type: Type.STRING },
            industrySector: { type: Type.STRING },
            experienceLevel: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            marketOutlook: {
              type: Type.OBJECT,
              properties: {
                medianCompensationRange: { type: Type.STRING },
                openRolesGrowthYoY: { type: Type.STRING },
                averageTransitionWeeks: { type: Type.INTEGER },
                totalCurriculumHours: { type: Type.INTEGER },
                topHiringSectors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'medianCompensationRange',
                'openRolesGrowthYoY',
                'averageTransitionWeeks',
                'totalCurriculumHours',
                'topHiringSectors',
              ],
            },
            skillMatrix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skillName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  currentScore: { type: Type.INTEGER },
                  targetScore: { type: Type.INTEGER },
                  yoyDemandGrowth: { type: Type.STRING },
                  salaryWeight: { type: Type.STRING },
                  status: { type: Type.STRING },
                  recommendedAction: { type: Type.STRING },
                },
                required: [
                  'skillName',
                  'category',
                  'currentScore',
                  'targetScore',
                  'yoyDemandGrowth',
                  'salaryWeight',
                  'status',
                  'recommendedAction',
                ],
              },
            },
            stages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stageNumber: { type: Type.STRING },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  durationWeeks: { type: Type.INTEGER },
                  totalHours: { type: Type.INTEGER },
                  priority: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  industryRationale: { type: Type.STRING },
                  modules: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        estimatedHours: { type: Type.INTEGER },
                        type: { type: Type.STRING },
                        coreConcepts: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        resourceTitle: { type: Type.STRING },
                        resourceAuthorOrOrg: { type: Type.STRING },
                        resourceUrl: { type: Type.STRING },
                      },
                      required: [
                        'id',
                        'title',
                        'estimatedHours',
                        'type',
                        'coreConcepts',
                        'resourceTitle',
                        'resourceAuthorOrOrg',
                        'resourceUrl',
                      ],
                    },
                  },
                  capstoneProject: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      architectureSummary: { type: Type.STRING },
                      deliverables: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      evaluationMetric: { type: Type.STRING },
                    },
                    required: [
                      'title',
                      'architectureSummary',
                      'deliverables',
                      'evaluationMetric',
                    ],
                  },
                },
                required: [
                  'stageNumber',
                  'title',
                  'subtitle',
                  'durationWeeks',
                  'totalHours',
                  'priority',
                  'objective',
                  'industryRationale',
                  'modules',
                  'capstoneProject',
                ],
              },
            },
            industryTrends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trendTitle: { type: Type.STRING },
                  adoptionVelocity: { type: Type.STRING },
                  compensationPremium: { type: Type.STRING },
                  impactLevel: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  keyTechnologies: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'trendTitle',
                  'adoptionVelocity',
                  'compensationPremium',
                  'impactLevel',
                  'summary',
                  'keyTechnologies',
                ],
              },
            },
          },
          required: [
            'currentRole',
            'targetRole',
            'industrySector',
            'experienceLevel',
            'executiveSummary',
            'marketOutlook',
            'skillMatrix',
            'stages',
            'industryTrends',
          ],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Model returned an empty response.');
    }

    const parsed = JSON.parse(rawText.trim());
    const roadmap = {
      ...parsed,
      id: `custom-${Date.now()}`,
      generatedAt: new Date().toISOString(),
    };

    res.json({ roadmap });
  } catch (error: unknown) {
    console.error('Error generating roadmap:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate personalized roadmap with Gemini API.';
    res.status(500).json({ error: message });
  }
});

// 2. Live Google Search Grounded Industry Trend Pulse Endpoint
app.post('/api/trends/analyze', async (req, res) => {
  try {
    const {
      targetRole = 'AI Systems Architect',
      industrySector = 'Enterprise B2B SaaS',
    } = req.body || {};

    const ai = getGenAIClient();

    const prompt = `Analyze current hiring demand, emerging technical skill requirements, and compensation benchmarks for "${targetRole}" roles in "${industrySector}".
Provide:
1. A concise, factual synthesis of the top 3 technical skills increasing fastest in job descriptions right now.
2. Specific production architectures, frameworks, or evaluation practices hiring managers are screening for.
3. Concrete compensation and market demand signals.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const analysisMarkdown = response.text || 'No trend analysis returned.';
    const rawChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const citations: { title: string; uri: string }[] = [];
    for (const chunk of rawChunks) {
      if (chunk.web?.uri) {
        citations.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        });
      }
    }

    res.json({
      targetRole,
      industrySector,
      analysisMarkdown,
      citations,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error analyzing live trends:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch live industry trends from Gemini Search Grounding.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
