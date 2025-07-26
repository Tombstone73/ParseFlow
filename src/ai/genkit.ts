import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama';

// This would be dynamically loaded from a database or config file
// For this demo, we'll use environment variables
const AI_PROVIDER = process.env.AI_PROVIDER || 'google';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

let plugins: GenkitPlugin[];

switch (AI_PROVIDER) {
    case 'google':
        if (!GOOGLE_API_KEY) {
            console.warn("Google AI provider selected, but GOOGLE_API_KEY is not set. AI features may not work.");
            plugins = [];
        } else {
            plugins = [googleAI({apiKey: GOOGLE_API_KEY})];
        }
        break;
    case 'ollama':
        plugins = [ollama({
            models: [{ name: 'gemma' }],
            serverAddress: 'http://127.0.0.1:11434',
        })];
        break;
    default:
        console.error(`Unknown AI_PROVIDER: ${AI_PROVIDER}`);
        plugins = [];
}


export const ai = genkit({
  plugins,
});
