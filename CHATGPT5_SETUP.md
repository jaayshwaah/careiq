# ChatGPT-5 Configuration Guide

## Current Status
ChatGPT-5 is not yet publicly available. The application is configured to use the best available OpenAI models through OpenRouter.

## Model Configuration

### Current Settings
- **Main Chat**: `openai/gpt-4o` (latest GPT-4 Omni)
- **Facility Analysis**: `openai/gpt-4o` (most capable for analysis)
- **Auto-titling**: `openai/gpt-4o-mini` (efficient for simple tasks)

### Environment Variables

Add these to your `.env.local` file:

```env
# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o

# When GPT-5 becomes available, update to:
# OPENROUTER_MODEL=openai/gpt-5

# OpenRouter Site Info (optional)
OPENROUTER_SITE_URL=https://careiq.vercel.app
OPENROUTER_SITE_NAME=CareIQ
```

### Getting OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Generate an API key
4. Add credits to your account
5. Use the API key in your environment variables

### Available Models (as of 2024)

**Most Capable (for complex tasks):**
- `openai/gpt-4o` - Latest GPT-4 Omni (recommended)
- `openai/gpt-4-turbo` - Fast GPT-4 variant
- `anthropic/claude-3-opus` - Anthropic's most capable model

**Efficient (for simple tasks):**
- `openai/gpt-4o-mini` - Fast and cost-effective
- `openai/gpt-3.5-turbo` - Budget option

**When GPT-5 is released:**
- `openai/gpt-5` - Will be the most advanced model

### Current Model Usage

1. **Chat Interface** (`/api/messages/stream/route.ts`):
   - Uses `OPENROUTER_MODEL` environment variable
   - Defaults to `openai/gpt-4o`
   - Handles streaming responses

2. **Facility Analysis** (`/api/facility-analysis/route.ts`):
   - Uses `openai/gpt-4o` for complex analysis
   - Specialized for healthcare compliance

3. **Auto-titling** (`/lib/titler.ts`):
   - Uses `openai/gpt-4o-mini` for efficiency
   - Fallbacks to other models if needed

### Upgrading to GPT-5

When GPT-5 becomes available:

1. Update environment variable:
   ```env
   OPENROUTER_MODEL=openai/gpt-5
   ```

2. Restart your application

3. The system will automatically use GPT-5 for all chat interactions

### Cost Optimization

- **Development**: Use `openai/gpt-4o-mini` for testing
- **Production**: Use `openai/gpt-4o` for best results
- **Future**: Use `openai/gpt-5` when available

### Testing Model Changes

1. Update `OPENROUTER_MODEL` in `.env.local`
2. Restart your development server
3. Test chat functionality
4. Monitor costs in OpenRouter dashboard