# CareIQ Environment Variables Checklist

## 🔐 **REQUIRED Environment Variables**

### **Database & Authentication**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase](https://supabase.com) | Free tier: $0/month<br/>Pro: $25/month | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | [Supabase](https://supabase.com) | Included with plan | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | [Supabase](https://supabase.com) | Included with plan | ✅ |

### **AI & Language Models**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI models | [OpenRouter](https://openrouter.ai) | Pay-per-use<br/>~$0.01-0.10 per 1K tokens | ✅ |
| `OPENROUTER_SITE_URL` | Your site URL for OpenRouter | [OpenRouter](https://openrouter.ai) | Free | ⚠️ Optional |
| `OPENROUTER_SITE_NAME` | Your site name for OpenRouter | [OpenRouter](https://openrouter.ai) | Free | ⚠️ Optional |
| `OPENROUTER_MODEL` | AI model to use (default: openai/gpt-5-chat) | [OpenRouter](https://openrouter.ai) | Varies by model | ⚠️ Optional |
| `OPENROUTER_TITLE_MODEL` | Model for auto-titling (default: meta-llama/llama-3.1-8b-instruct) | [OpenRouter](https://openrouter.ai) | Varies by model | ⚠️ Optional |
| `OPENAI_API_KEY` | Direct OpenAI API key (alternative to OpenRouter) | [OpenAI](https://openai.com) | Pay-per-use<br/>~$0.01-0.06 per 1K tokens | ⚠️ Alternative |

### **Payment Processing**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret key for payments | [Stripe](https://stripe.com) | 2.9% + $0.30 per transaction | ⚠️ Optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret for events | [Stripe](https://stripe.com) | Free | ⚠️ Optional |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | [Stripe](https://stripe.com) | Free | ⚠️ Optional |

## 🔧 **OPTIONAL Environment Variables**

### **Email Services**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `RESEND_API_KEY` | Resend API key for emails | [Resend](https://resend.com) | Free tier: 3,000 emails/month<br/>Pro: $20/month for 50K emails | ⚠️ Optional |
| `FEEDBACK_EMAIL` | Email address for feedback | Your domain | Free | ⚠️ Optional |

### **Calendar Integrations**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar OAuth client ID | [Google Cloud Console](https://console.cloud.google.com) | Free | ⚠️ Optional |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar OAuth client secret | [Google Cloud Console](https://console.cloud.google.com) | Free | ⚠️ Optional |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Google Calendar OAuth redirect URI | Your app | Free | ⚠️ Optional |
| `OUTLOOK_CALENDAR_CLIENT_ID` | Outlook Calendar OAuth client ID | [Azure Portal](https://portal.azure.com) | Free | ⚠️ Optional |
| `OUTLOOK_CALENDAR_CLIENT_SECRET` | Outlook Calendar OAuth client secret | [Azure Portal](https://portal.azure.com) | Free | ⚠️ Optional |
| `OUTLOOK_CALENDAR_REDIRECT_URI` | Outlook Calendar OAuth redirect URI | Your app | Free | ⚠️ Optional |
| `OUTLOOK_CALENDAR_AUTHORITY` | Outlook Calendar OAuth authority | [Azure Portal](https://portal.azure.com) | Free | ⚠️ Optional |

### **EHR Integrations**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `PCC_API_URL` | PointClickCare API endpoint | [PointClickCare](https://pointclickcare.com) | Contact for pricing | ⚠️ Optional |
| `PCC_CLIENT_ID` | PointClickCare OAuth client ID | [PointClickCare](https://pointclickcare.com) | Contact for pricing | ⚠️ Optional |
| `PCC_CLIENT_SECRET` | PointClickCare OAuth client secret | [PointClickCare](https://pointclickcare.com) | Contact for pricing | ⚠️ Optional |
| `PCC_FACILITY_ID` | PointClickCare facility ID | [PointClickCare](https://pointclickcare.com) | Contact for pricing | ⚠️ Optional |

### **Azure OpenAI (Alternative)**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) | Pay-per-use<br/>~$0.01-0.06 per 1K tokens | ⚠️ Alternative |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) | Pay-per-use | ⚠️ Alternative |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI deployment name | [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) | Pay-per-use | ⚠️ Alternative |

### **HIPAA Compliance**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `HIPAA_MODE` | Enable HIPAA compliance mode | Your app | Free | ⚠️ Optional |
| `AI_PROVIDER` | AI provider for HIPAA mode | Your app | Varies | ⚠️ Optional |

### **Application Settings**
| Variable | Description | Source | Price | Required |
|----------|-------------|--------|-------|----------|
| `NEXT_PUBLIC_SITE_URL` | Your application URL | Your app | Free | ⚠️ Optional |
| `NODE_ENV` | Environment (development/production) | Your app | Free | ⚠️ Optional |

## 💰 **Cost Summary**

### **Minimum Setup (Required Only)**
- **Supabase**: Free tier ($0/month)
- **OpenRouter**: Pay-per-use (~$5-20/month depending on usage)
- **Total**: ~$5-20/month

### **Full Production Setup**
- **Supabase Pro**: $25/month
- **OpenRouter**: ~$20-50/month (depending on usage)
- **Stripe**: 2.9% + $0.30 per transaction
- **Resend**: $20/month (50K emails)
- **Total**: ~$65-95/month + transaction fees

### **Enterprise Setup**
- **Supabase Enterprise**: Contact for pricing
- **OpenRouter**: ~$50-200/month (high usage)
- **Stripe**: 2.9% + $0.30 per transaction
- **Resend**: $20-100/month (depending on volume)
- **EHR Integrations**: Contact vendors for pricing
- **Total**: ~$200-500/month + transaction fees

## 🚀 **Quick Setup Guide**

### 1. **Required Setup (Minimum)**
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# AI
OPENROUTER_API_KEY=your_openrouter_key
```

### 2. **Production Setup**
```bash
# Add to required setup:
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
RESEND_API_KEY=your_resend_key
FEEDBACK_EMAIL=feedback@yourdomain.com
```

### 3. **Full Integration Setup**
```bash
# Add calendar integrations:
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/calendar/google/auth

# Add EHR integrations:
PCC_API_URL=https://api.pointclickcare.com
PCC_CLIENT_ID=your_pcc_client_id
PCC_CLIENT_SECRET=your_pcc_client_secret
PCC_FACILITY_ID=your_facility_id
```

## 🔒 **Security Notes**

- Store all sensitive keys in environment variables, never in code
- Use different keys for development and production
- Rotate keys regularly
- Monitor usage and costs
- Enable MFA on all service accounts
- Use least-privilege access principles

## 📊 **Usage Monitoring**

- **OpenRouter**: Monitor token usage in dashboard
- **Supabase**: Monitor database usage and limits
- **Stripe**: Monitor transaction volume and fees
- **Resend**: Monitor email sending limits

## 🆘 **Support**

- **Supabase**: [Discord](https://discord.supabase.com) | [GitHub](https://github.com/supabase/supabase)
- **OpenRouter**: [Discord](https://discord.gg/openrouter) | [GitHub](https://github.com/openrouter-ai)
- **Stripe**: [Support Center](https://support.stripe.com)
- **Resend**: [Discord](https://discord.gg/resend) | [GitHub](https://github.com/resend/resend)
