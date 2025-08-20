// Embeddings with either OpenRouter (remote) or local MiniLM.
let pipelinePromise: Promise<any> | null = null;

async function loadPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    })();
  }
  return pipelinePromise;
}

async function localEmbed(texts: string[]): Promise<number[][]> {
  const pipe = await loadPipeline();
  const outputs: number[][] = [];
  for (const t of texts) {
    const out = await pipe(t, { pooling: "mean", normalize: true });
    const arr = Array.from(out.data as Float32Array);
    outputs.push(arr);
  }
  return outputs;
}

async function remoteEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY for remote embeddings");

  // OpenRouter embeddings endpoint (compatible with OpenAI format)
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Smaller & cheaper; 1536 dims. Use text-embedding-3-large if you prefer 3072 dims.
      model: "openai/text-embedding-3-small",
      input: texts,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embedding request failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  return (json.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const provider = (process.env.EMBEDDINGS_PROVIDER || "local").toLowerCase();
  if (provider === "openrouter" || provider === "remote") return remoteEmbed(texts);
  return localEmbed(texts);
}

export async function embedQuery(q: string): Promise<number[]> {
  const [e] = await embedTexts([q]);
  return e;
}