import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createFileRoute } from '@tanstack/react-router';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { z } from 'zod';

const SYSTEM = `You are "Ari", a helpful Python tutor and code reviewer. Your role is to provide constructive, encouraging feedback on learner code.

REVIEW GUIDELINES:
1. Be encouraging - celebrate what the learner did well
2. Be specific - point to exact code or concepts
3. Be practical - give actionable suggestions
4. Be concise - 2-4 bullet points per section
5. Use markdown formatting for code snippets

FORMAT YOUR RESPONSE AS:
## ✅ What's Working
[Bullet points about correct approaches, good patterns used]

## 🔧 Issues Found
[Bullet points about bugs, errors, or incorrect logic - if any]

## 💡 Suggestions
[Specific improvements the learner could make]

## 🎯 Best Practices
[Python best practices relevant to this exercise

If all tests pass and the code is excellent, start with "🎉 Great job! Your code works perfectly."`;

const inputSchema = z.object({
  messages: z.array(z.any()),
  code: z.string(),
  exerciseTitle: z.string(),
  exerciseDescription: z.string(),
  exerciseInstructions: z.string().nullable(),
  testResults: z.array(
    z.object({
      description: z.string().optional(),
      input: z.string(),
      expected: z.string(),
      actual: z.string(),
      passed: z.boolean(),
      error: z.string().optional(),
    })
  ),
});

export const Route = createFileRoute('/api/ai-code-review')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
          return new Response('Missing GEMINI_API_KEY', { status: 500 });
        }

        const body = await request.json();
        const parseResult = inputSchema.safeParse(body);

        if (!parseResult.success) {
          return new Response(JSON.stringify({ error: 'Invalid input', details: parseResult.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { messages, code, exerciseTitle, exerciseDescription, exerciseInstructions, testResults } =
          parseResult.data;

        // Build context about the exercise and test results
        const testSummary = testResults.length > 0
          ? `
## Test Results
${testResults
  .map(
    (t, i) =>
      `${i + 1}. ${t.description || `Test ${i + 1}`}: ${t.passed ? '✅ PASSED' : '❌ FAILED'}${
        !t.passed
          ? `
   - Expected: ${t.expected}
   - Actual: ${t.actual}
   ${t.error ? `- Error: ${t.error}` : ''}`
          : ''
      }`
  )
  .join('\n')}`
          : 'No test cases provided.';

        const exerciseContext = `
## Exercise: ${exerciseTitle}
**Description:** ${exerciseDescription}
**Instructions:** ${exerciseInstructions || 'No specific instructions provided.'}

${testSummary}

## Learner's Code
\`\`\`python
${code}
\`\`\``;

        // Add exercise context as a system message for reference
        const contextMessage: UIMessage = {
          role: 'system',
          content: `EXERCISE CONTEXT (for your reference):\n${exerciseContext}\n\nReview the learner's code above using the review guidelines. Focus on helping them learn and improve.`,
        };

        const google = createOpenAICompatible({
          name: 'google',
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
          apiKey: key,
        });

        const modelMessages = await convertToModelMessages([...messages, contextMessage] as UIMessage[]);

        const result = streamText({
          model: google('gemini-3.5-flash'),
          system: SYSTEM,
          messages: modelMessages,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
