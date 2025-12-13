import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Latest model name (no pinned hash)
const MODEL = process.env.REPLICATE_MODEL || 'black-forest-labs/flux-kontext-pro';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function trimPrompt(p: string) {
  const s = String(p || '').trim();
  return s.length > 1500 ? s.slice(0, 1500) : s;
}

function extractReplicateFailure(pred: any) {
  const status = pred?.status || 'unknown';
  const id = pred?.id || '';
  const error = pred?.error ? String(pred.error) : '';
  const logs = pred?.logs ? String(pred.logs) : '';
  const logsTail = logs ? logs.slice(Math.max(0, logs.length - 1200)) : '';
  return { status, id, error: error || 'Unknown Replicate error', logsTail };
}

async function runOnce(args: {
  prompt: string;
  sourceImageUrl: string;
  seed?: number;
}): Promise<{ ok: true; resultImageUrl: string } | { ok: false; details: any }> {
  const { prompt, sourceImageUrl, seed } = args;

  // ✅ Flux Kontext Pro expects:
  // - prompt
  // - image
  // Keep it minimal & stable.
  const input: Record<string, any> = {
    prompt: trimPrompt(prompt),
    image: sourceImageUrl, // ✅ correct key
    output_format: 'jpg',
  };

  if (typeof seed === 'number' && Number.isFinite(seed)) {
    input.seed = seed;
  }

  console.log('[generateComicImage] Creating prediction:', {
    model: MODEL,
    hasPrompt: !!input.prompt,
    hasImage: !!input.image,
    seed: input.seed,
  });

  let pred: any;
  try {
    pred = await replicate.predictions.create({
      model: MODEL,
      input,
    });
  } catch (e: any) {
    return {
      ok: false,
      details: {
        where: 'predictions.create',
        message: e?.message || String(e),
      },
    };
  }

  const started = Date.now();
  const maxMs = 180_000; // 3 minutes
  const pollEveryMs = 1200;

  while (true) {
    if (!pred?.id) {
      return { ok: false, details: { where: 'poll', message: 'No prediction id returned' } };
    }

    if (pred.status === 'succeeded') break;

    if (pred.status === 'failed' || pred.status === 'canceled') {
      return { ok: false, details: { where: 'poll', ...extractReplicateFailure(pred) } };
    }

    if (Date.now() - started > maxMs) {
      return {
        ok: false,
        details: {
          where: 'poll',
          message: 'Timed out waiting for prediction',
          id: pred.id,
          status: pred.status,
        },
      };
    }

    await sleep(pollEveryMs);

    try {
      pred = await replicate.predictions.get(pred.id);
    } catch (e: any) {
      return {
        ok: false,
        details: {
          where: 'predictions.get',
          message: e?.message || String(e),
          id: pred?.id,
        },
      };
    }
  }

  // Parse output
  const out = pred.output;

  const resultImageUrl =
    typeof out === 'string'
      ? out
      : Array.isArray(out)
        ? out.find((x) => typeof x === 'string')
        : undefined;

  console.log('[generateComicImage] Done:', {
    status: pred.status,
    id: pred.id,
    hasOutput: !!out,
    gotUrl: !!resultImageUrl,
  });

  if (!resultImageUrl) {
    return {
      ok: false,
      details: {
        where: 'output',
        message: 'No usable output URL returned',
        outputType: typeof out,
      },
    };
  }

  return { ok: true, resultImageUrl };
}

export async function generateComicImage(
  prompt: string,
  selfieUrl: string,
  options?: { seed?: number }
): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN');
  if (!prompt || !selfieUrl) throw new Error('Missing prompt or selfieUrl');

  const seed = options?.seed;

  console.log('[generateComicImage] Input:', {
    promptPresent: !!prompt,
    selfieUrlPresent: !!selfieUrl,
    seed,
  });

  // Retry plan:
  // 1) seed
  // 2) seed
  // 3) seed
  // 4) no-seed (seed can sometimes contribute to failures)
  const attempts: Array<{ seed?: number; label: string }> = [
    { seed, label: 'try-1' },
    { seed, label: 'try-2' },
    { seed, label: 'try-3' },
    { seed: undefined, label: 'try-4-no-seed' },
  ];

  let lastDetails: any = null;

  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];

    console.log('[generateComicImage] Attempt:', { label: a.label, seed: a.seed });

    const res = await runOnce({
      prompt,
      sourceImageUrl: selfieUrl,
      seed: a.seed,
    });

    if (res.ok) return res.resultImageUrl;

    lastDetails = res.details;
    console.warn('[generateComicImage] Attempt failed:', lastDetails);

    await sleep(800 * (i + 1));
  }

  const detailStr = (() => {
    try {
      return JSON.stringify(lastDetails);
    } catch {
      return String(lastDetails);
    }
  })();

  throw new Error(`Generation failed after retries. Details: ${detailStr}`);
}
