import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CommentInsight {
  title: string;
  explanation: string;
  strength: number; // 0-100
  examples: string[];
}

export interface VideoMoment {
  timestampRange: string;
  type: "peak" | "drop-off";
  explanation: string;
}

export interface VideoAnalytics {
  timeline: VideoMoment[];
  mostEngagingSegment: string;
  weakestSegment: string;
}

export interface AnalysisResult {
  insights: CommentInsight[];
  summary: string;
  generalTone: string;
  commonRequests: string[];
  videoAnalytics: VideoAnalytics;
}

export async function analyzeComments(comments: { text: string }[]): Promise<AnalysisResult> {
  const model = "gemini-3.1-pro-preview";

  const commentText = comments.map(c => c.text).join("\n---\n");

  const prompt = `
    Analyze the following YouTube comments for a content creator.

    Comments:
    ${commentText}

    Your task is to:
    1. Extract the top 5 audience insights (sentiments, themes, or takeaways).
       - Do not use simple labels like "Positive" or "Negative".
       - Focus on meaningful opinions: what viewers want, what they liked/disliked specifically, emotional reactions, recurring suggestions.
    2. For each insight, provide:
       - A short title.
       - A clear explanation of the audience's feeling/opinion.
       - An estimated strength (percentage of comments reflecting this, 0-100).
       - 3 to 5 actual example comments from the provided list that support this insight.
    3. Provide an overall audience summary of the video.
    4. Describe the general tone of the comment section.
    5. List common requests or repeated feedback.
    6. **Video Analytics (Inferred)**: Based on timestamps mentioned in comments or specific parts of the video discussed:
       - Identify 3-5 key moments (retention peaks or drop-offs).
       - For each moment, provide a timestamp range (e.g., "1:32-2:10"), the type ("peak" or "drop-off"), and a short explanation.
       - Summarize the "Most Engaging Segment" and the "Weakest Segment".

    Prioritize insights that are most useful to a content creator for improving their content.
    Remove spam, duplicates, and irrelevant comments from your consideration.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                strength: { type: Type.NUMBER },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "explanation", "strength", "examples"]
            }
          },
          summary: { type: Type.STRING },
          generalTone: { type: Type.STRING },
          commonRequests: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          videoAnalytics: {
            type: Type.OBJECT,
            properties: {
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestampRange: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["peak", "drop-off"] },
                    explanation: { type: Type.STRING }
                  },
                  required: ["timestampRange", "type", "explanation"]
                }
              },
              mostEngagingSegment: { type: Type.STRING },
              weakestSegment: { type: Type.STRING }
            },
            required: ["timeline", "mostEngagingSegment", "weakestSegment"]
          }
        },
        required: ["insights", "summary", "generalTone", "commonRequests", "videoAnalytics"]
      }
    }
  });

  return JSON.parse(response.text);
}
