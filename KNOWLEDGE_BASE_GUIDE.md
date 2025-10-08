# CareIQ Knowledge Base System Guide

## 📚 **Overview**

CareIQ has **TWO separate knowledge base systems**:

1. **Global Knowledge Base** (Admin/Dev-managed) - CMS regulations, MDS guidelines, etc.
2. **Facility Knowledge Base** (User-managed) - Facility-specific policies, handbooks, reports, etc.

Both systems use AI embeddings and vector search to power the chat assistant's responses.

---

## 🌍 **1. Global Knowledge Base (Admin)**

### **Purpose**
Store universal healthcare compliance documents that ALL facilities need:
- CMS regulations (42 CFR Part 483)
- F-Tag interpretive guidelines
- MDS 3.0 RAI Manual
- CDC infection control guidelines
- State-specific nursing home regulations
- Joint Commission standards
- CMS memos and updates

### **Access**
- **Page:** `/admin/knowledge-base`
- **Requires:** Administrator role (`is_admin: true`)
- **Security:** Requires `ADMIN_INGEST_KEY` environment variable

### **How to Upload:**

1. Go to `/admin/knowledge-base`
2. Click "Upload Documents" tab
3. Fill in:
   - **Document Title** (e.g., "42 CFR Part 483 - Subpart B")
   - **Category** (CMS Regulation, MDS Guidelines, State Regulation, etc.)
   - **Source URL** (optional - link to official source)
   - **State** (optional - for state-specific docs, use 2-letter code)
4. Select file(s) to upload (PDF, Word, text)
5. Click "Upload to Global Knowledge Base"

### **Supported File Types:**
- ✅ PDF (.pdf)
- ✅ Word (.docx, .doc)
- ✅ Text (.txt, .md)

### **What Happens:**
1. Files are parsed and text extracted
2. Content is split into ~1,200 character chunks with 120 char overlap
3. Each chunk is embedded using AI (vector embeddings)
4. Stored in `knowledge_base` table with `facility_id = null` (global)
5. Available to AI assistant for ALL facilities

### **Categories Available:**
- **CMS Regulation** - Federal requirements, CFR citations
- **MDS Guidelines** - MDS 3.0 RAI Manual, assessment guidance
- **State Regulation** - State-specific nursing home regulations
- **CDC Guidelines** - Infection control, public health
- **Joint Commission** - Accreditation standards
- **CMS Memos** - CMS guidance memos and updates
- **SOM Updates** - State Operations Manual updates
- **Best Practices** - Industry research and best practices

### **Management:**
- View all global documents in "Manage Documents" tab
- Search by title or category
- Filter by category
- Delete documents (affects all facilities - use carefully!)
- View statistics (total documents, chunks, coverage by category/state)

---

## 🏥 **2. Facility Knowledge Base (User)**

### **Purpose**
Store facility-specific documents that only that facility needs:
- Facility policies and procedures
- Employee handbooks
- Staff schedules and reports
- Unit-specific SOPs
- Training materials
- Internal memos
- Headcount reports
- Quality improvement plans
- Survey response plans

### **Access**
- **Page:** `/knowledge`
- **Requires:** Any authenticated user
- **Isolated:** Each facility only sees their own documents

### **How to Upload:**

1. Go to `/knowledge`
2. Click "Upload Documents" tab
3. Select document type:
   - Facility Policy
   - SOP
   - Training Material
   - Survey Findings
   - Employee Handbook
   - Staff Schedule
   - Quality Report
   - Other
4. Add description (optional but recommended)
5. Select file(s) to upload
6. Click "Upload Documents"

### **Supported File Types:**
- ✅ PDF (.pdf)
- ✅ Word (.docx, .doc)
- ✅ Text (.txt, .md)
- ✅ CSV (.csv) - NEW!
- ✅ Excel (.xlsx, .xls) - NEW!

### **What Happens:**
1. Files are parsed and text extracted
2. Auto-categorized based on content
3. Content is chunked and embedded
4. Stored with your facility_id (isolated)
5. Available ONLY to your facility's AI chat

### **Management:**
- View your facility's documents in "Manage Documents" tab
- Search documents by name or content
- Filter by category
- View upload history
- Delete documents you no longer need
- See statistics for your facility

---

## 🤖 **How the AI Uses Knowledge Bases**

### **When You Chat:**

1. **User sends message** (e.g., "What are the requirements for F-Tag 689?")

2. **AI searches BOTH knowledge bases:**
   - Embeds your question into a vector
   - Searches global KB for CMS regulations
   - Searches your facility KB for relevant policies
   - Ranks results by relevance

3. **AI builds context** from top results:
   ```
   RETRIEVED KNOWLEDGE:
   [1] CMS Regulation: 42 CFR 483.12 - Freedom from Abuse
   [2] Your Facility Policy: Abuse Prevention & Reporting
   [3] CDC Guideline: Workplace Violence Prevention
   ```

4. **AI responds** using retrieved knowledge:
   - Cites sources with [1], [2], [3] format
   - Combines regulatory requirements with your policies
   - Provides actionable, facility-specific guidance

### **Priority Order:**
1. **Global CMS/MDS regulations** (highest priority)
2. **State-specific regulations** (if applicable)
3. **Your facility policies** (for context)
4. **Best practices and guidelines**

---

## 📊 **Database Structure**

### **knowledge_base Table:**

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  facility_id UUID NULL,              -- NULL = global, otherwise facility-specific
  facility_name TEXT,
  state TEXT,                         -- 2-letter state code (optional)
  category TEXT,                      -- Document category
  title TEXT,                         -- Document title
  content TEXT,                       -- Chunk content
  source_url TEXT,                    -- Source URL (optional)
  last_updated TIMESTAMP,
  embedding VECTOR(768),              -- AI embedding for vector search
  metadata JSONB,                     -- Additional metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Metadata Structure:**

**Global Documents:**
```json
{
  "seq": 0,
  "total": 10,
  "state": "CA",
  "category": "CMS Regulation",
  "source_url": "https://cms.gov/..."
}
```

**Facility Documents:**
```json
{
  "original_filename": "Employee_Handbook_2024.pdf",
  "document_type": "Facility Policy",
  "description": "Updated employee handbook",
  "uploaded_by": "user-uuid",
  "uploaded_by_role": "administrator",
  "facility_specific": true,
  "chunk_index": 0,
  "total_chunks": 5,
  "file_size": 2048576,
  "upload_date": "2024-10-03T12:00:00Z"
}
```

---

## 🔐 **Security & Isolation**

### **Row-Level Security (RLS):**

- Global documents (`facility_id = null`) are visible to ALL users
- Facility documents are ONLY visible to users of that facility
- RLS policies enforce data isolation automatically

### **Access Control:**

| Feature | Who Can Access |
|---------|----------------|
| Upload Global Docs | Administrators only |
| View Global Docs | Everyone |
| Upload Facility Docs | All authenticated users |
| View Facility Docs | Only users from that facility |
| Delete Global Docs | Administrators only |
| Delete Facility Docs | Users from that facility |

---

## 📝 **Best Practices**

### **For Administrators (Global KB):**

1. **Keep documents up-to-date**
   - Update when CMS releases new guidance
   - Version control major regulation changes
   - Remove outdated documents

2. **Use clear titles**
   - ✅ "42 CFR Part 483.12 - Freedom from Abuse (2024 Update)"
   - ❌ "document_final_v3.pdf"

3. **Add source URLs**
   - Always link to official CMS/CDC sources
   - Helps users verify information

4. **Tag state-specific docs**
   - Use 2-letter state codes (CA, TX, NY)
   - Enables state-specific AI responses

5. **Organize by category**
   - Proper categorization improves search relevance
   - Use consistent category names

### **For Facility Users:**

1. **Upload relevant documents**
   - Current policies and procedures
   - Employee handbooks
   - Recent survey reports
   - Quality improvement plans

2. **Keep descriptions detailed**
   - Helps you find documents later
   - Improves AI search relevance

3. **Remove outdated content**
   - Delete old versions of policies
   - Remove superseded documents

4. **Use appropriate categories**
   - Choose the most specific category
   - Helps AI understand document type

5. **Regular maintenance**
   - Review documents quarterly
   - Update when policies change
   - Remove irrelevant content

---

## 🚀 **Recommended Initial Setup**

### **Global Knowledge Base (Admin):**

**Phase 1 - Core Regulations:**
- [ ] 42 CFR Part 483 (complete text)
- [ ] F-Tag Interpretive Guidelines (all F-Tags)
- [ ] State Operations Manual - Appendix PP
- [ ] MDS 3.0 RAI Manual (complete)

**Phase 2 - Clinical Standards:**
- [ ] CDC Infection Control Guidelines
- [ ] Medication administration protocols
- [ ] Fall prevention guidelines
- [ ] Wound care standards

**Phase 3 - State-Specific:**
- [ ] Your state's nursing home regulations
- [ ] State survey protocols
- [ ] State reporting requirements

**Phase 4 - Quality & Operations:**
- [ ] QAPI guidelines
- [ ] Five Star Rating methodology
- [ ] Staffing requirements by state
- [ ] Emergency preparedness regulations

### **Facility Knowledge Base (Users):**

**Essential Documents:**
- [ ] Current employee handbook
- [ ] Facility-wide policies and procedures
- [ ] Abuse prevention policy
- [ ] Infection control plan
- [ ] Emergency response plan
- [ ] Admission/discharge policies
- [ ] Quality assurance plan

**Recommended:**
- [ ] Staff training materials
- [ ] Unit-specific SOPs
- [ ] Recent survey findings and POCs
- [ ] Staff schedules and contact lists
- [ ] Vendor contracts and specifications

---

## 🔧 **Troubleshooting**

### **"Upload Failed" Error**
- **Cause:** File too large (>50MB) or unsupported format
- **Fix:** Compress PDF or split into smaller files

### **"Unauthorized" Error (Global KB)**
- **Cause:** Missing admin role or ADMIN_INGEST_KEY
- **Fix:** Contact system administrator

### **AI Doesn't Reference My Documents**
- **Cause:** Documents not properly embedded or query not relevant
- **Fix:** Check document upload status, rephrase question more specifically

### **Can't Find My Document**
- **Cause:** Wrong facility or document deleted
- **Fix:** Check "Manage Documents" tab, use search feature

### **"No Content Extracted" Error**
- **Cause:** PDF is scanned image without text layer
- **Fix:** Use OCR software to create searchable PDF

---

## 📞 **Support**

- **Global KB Issues:** Contact CareIQ admin team
- **Facility KB Issues:** Contact your facility administrator
- **Feature Requests:** Submit via CareIQ feedback form

---

## 🎯 **Next Steps**

1. **Admins:** Set up global knowledge base with core CMS/MDS documents
2. **Users:** Upload your facility's key policies and handbooks
3. **Everyone:** Start chatting with the AI - it now has access to all knowledge!

---

**Last Updated:** October 3, 2025
**Version:** 2.0


