import { SpecializedAgentId } from '../src/types';

const BASE_URL = 'http://localhost:3000';

async function testAgentChat(agentId: SpecializedAgentId, message: string, language: 'en' | 'hi' | 'kn') {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/agents/specialized/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      message,
      language
    })
  });

  const duration = Date.now() - start;
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`[${agentId} - ${language}] Request failed with ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  return { ...json, duration };
}

async function run() {
  console.log('Testing Specialized AI Agent Chat & Voice Response Endpoints...\n');

  const testCases: Array<{ agentId: SpecializedAgentId; message: string; lang: 'en' | 'hi' | 'kn' }> = [
    { agentId: 'POLICE_TACTICAL', message: 'Report robbery in progress on Main Street', lang: 'en' },
    { agentId: 'POLICE_TACTICAL', message: 'मेन स्ट्रीट पर चोरी हो रही है', lang: 'hi' },
    { agentId: 'POLICE_TACTICAL', message: 'ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ಕಳ್ಳತನ ನಡೆಯುತ್ತಿದೆ', lang: 'kn' },
    { agentId: 'HOSPITAL_EMS', message: 'Two casualties with severe injuries after highway accident', lang: 'en' },
    { agentId: 'WATER_HYDRO', message: 'Main supply pipe burst flooding the residential square', lang: 'en' },
    { agentId: 'CURRENT_KEB', message: '11kV power transformer blown causing total blackout', lang: 'en' }
  ];

  let passed = 0;
  for (const tc of testCases) {
    try {
      const res = await testAgentChat(tc.agentId, tc.message, tc.lang);
      console.log(`[PASS] Agent: ${tc.agentId} | Lang: ${tc.lang} | Latency: ${res.duration}ms`);
      console.log(`       Reply snippet: "${res.reply.substring(0, 100).replace(/\n/g, ' ')}..."`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] Agent: ${tc.agentId} | Lang: ${tc.lang} Error: ${err.message}`);
    }
  }

  console.log(`\nResults: ${passed}/${testCases.length} Passed`);
  if (passed !== testCases.length) {
    process.exit(1);
  }
}

run();
