'use server';
/**
 * @fileOverview An AI agent to detect and extract order details from emails.
 *
 * - extractOrderDetails - A function that handles the detection and extraction of order details.
 * - ExtractOrderDetailsInput - The input type for the extractOrderDetails function.
 * - ExtractOrderDetailsOutput - The return type for the extractOrderDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractOrderDetailsInputSchema = z.object({
  emailBody: z.string().describe('The body of the email to analyze.'),
  emailSubject: z.string().describe('The subject line of the email.'),
  parsingSchema: z
    .string()
    .describe(
      'A JSON string representing the Zod schema for data extraction.'
    ),
  model: z.any().optional(),
});
export type ExtractOrderDetailsInput = z.infer<
  typeof ExtractOrderDetailsInputSchema
>;

const DynamicExtractionSchema = z.object({
  isOrderQuote: z
    .boolean()
    .describe(
      'Whether the email or its attachments contain an order, quote, or estimate.'
    ),
  category: z
    .enum(['order', 'estimate', 'none'])
    .describe(
      "The category of the email. Use 'order' for confirmed purchases, 'estimate' for quotes or proposals, and 'none' for anything else."
    ),
  extractedData: z
    .any()
    .describe(
      'The data extracted from the email, conforming to the provided schema. This should be null if isOrderQuote is false.'
    ),
  reason: z
    .string()
    .describe(
      'A brief explanation for the determination, especially if it is not a quote.'
    ),
});

export type ExtractOrderDetailsOutput = z.infer<typeof DynamicExtractionSchema>;

export async function extractOrderDetails(
  input: ExtractOrderDetailsInput
): Promise<ExtractOrderDetailsOutput> {
  return extractOrderDetailsFlow(input);
}

const extractOrderDetailsPrompt = ai.definePrompt({
  name: 'extractOrderDetailsPrompt',
  input: {schema: ExtractOrderDetailsInputSchema},
  output: {schema: DynamicExtractionSchema},
  prompt: `You are an AI assistant specializing in detecting and extracting order information, quotes, and estimates from emails.

  Analyze the provided email body and subject to determine if it contains an order, quote, or potential business opportunity.

  Email Subject: {{{emailSubject}}}
  Email Body: {{{emailBody}}}

  If the email is identified as an order or estimate, extract the relevant information and structure it according to the following JSON schema. If it is not an order or quote, return null for the extractedData field.

  Extraction Schema:
  \`\`\`json
  {{{parsingSchema}}}
  \`\`\`

  Your primary goal is to accurately populate the fields defined in the schema. Pay close attention to details like order numbers, customer information, item SKUs, quantities, and prices.
`,
});

const extractOrderDetailsFlow = ai.defineFlow(
  {
    name: 'extractOrderDetailsFlow',
    inputSchema: ExtractOrderDetailsInputSchema,
    outputSchema: DynamicExtractionSchema,
  },
  async input => {
    const {output} = await extractOrderDetailsPrompt(input, { model: input.model });
    return output!;
  }
);
