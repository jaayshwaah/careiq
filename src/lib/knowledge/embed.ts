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
    const res: any = await pipe(t, { pooling: "mean", normalize: true });
    outputs.push(Array.from(res.data as Float32Array));
  }
  return outputs;
}

async function remoteEmbed(texts: string[]): Promise<number[][]> {
  const url = process.env.EMBEDDINGS_BASE_URL || "https://openrouter.ai/api/v1/embeddings";
  const model = process.env.EMBEDDINGS_MODEL || "openai/text-embedding-3-small";
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing for remote embeddings.");

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texts })
  });
  if (!resp.ok) throw new Error(`Embedding API error: ${resp.status} ${await resp.text()}`);
  const json = await resp.json();
  return json.data.map((d: any) => d.embedding as number[]);
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
