-- Seed Chat Suggestions for CareIQ
-- Run this after creating the chat_suggestions table

-- Delete existing suggestions (optional, for testing)
-- DELETE FROM chat_suggestions;

-- Insert diverse chat suggestions
INSERT INTO public.chat_suggestions (icon, title, text, category, priority) VALUES
-- Clinical Care
('🏥', 'Care Planning', 'Help me create a care plan for a new admission with CHF', 'clinical', 9),
('💊', 'Medication Review', 'Review medication administration protocols', 'clinical', 8),
('🩺', 'Assessment Help', 'Guide me through completing an MDS assessment', 'clinical', 9),
('❤️', 'Wound Care', 'What are best practices for stage 3 pressure injury care?', 'clinical', 7),
('🧠', 'Dementia Care', 'Create strategies for managing sundowning behaviors', 'clinical', 8),
('🚑', 'Emergency Response', 'What are the steps for responding to a resident fall?', 'clinical', 9),
('💉', 'Diabetes Management', 'Explain insulin sliding scale administration', 'clinical', 7),
('🫁', 'Respiratory Care', 'Guidelines for oxygen therapy in skilled nursing', 'clinical', 7),
('🦴', 'Mobility Support', 'Develop a mobility improvement plan for a resident', 'clinical', 6),
('👁️', 'Vital Signs', 'When should I escalate abnormal vital signs?', 'clinical', 8),

-- Compliance & Surveys
('📋', 'Survey Prep', 'What are the key CMS survey preparation steps?', 'compliance', 10),
('🔍', 'F-Tag Help', 'Explain F-Tag 689 requirements in detail', 'compliance', 9),
('📊', 'Quality Measures', 'How can I improve our quality indicator scores?', 'compliance', 8),
('🛡️', 'Infection Control', 'Summarize infection control requirements', 'compliance', 9),
('📝', 'Policy Review', 'Draft a policy update memo for infection prevention', 'compliance', 7),
('⚖️', 'Regulatory Changes', 'What are the latest CMS regulatory updates?', 'compliance', 8),
('🔐', 'HIPAA Compliance', 'Review HIPAA requirements for electronic records', 'compliance', 7),
('✅', 'Audit Preparation', 'Help me prepare for an internal compliance audit', 'compliance', 8),
('📑', 'Documentation', 'Best practices for clinical documentation', 'compliance', 8),
('🎯', 'QAPI Plan', 'Develop a QAPI initiative for fall prevention', 'compliance', 7),

-- Staffing & Operations
('👥', 'Staffing Calculations', 'Calculate PPD hours for our facility', 'staffing', 9),
('📅', 'Schedule Optimization', 'Help me optimize nursing schedules for better coverage', 'staffing', 8),
('🎓', 'Staff Training', 'Create a staff training checklist for CNAs', 'staffing', 8),
('💼', 'Onboarding', 'Develop a comprehensive new hire orientation plan', 'staffing', 7),
('⏰', 'Overtime Management', 'Strategies to reduce overtime costs', 'staffing', 7),
('📈', 'Productivity', 'How can I improve staff productivity and efficiency?', 'staffing', 6),
('🤝', 'Team Building', 'Create team building activities for nursing staff', 'staffing', 5),
('💰', 'Payroll Help', 'Explain PBJ reporting requirements', 'staffing', 8),
('👔', 'Leadership', 'Develop leadership skills for charge nurses', 'staffing', 6),
('🔄', 'Turnover Reduction', 'Strategies to reduce staff turnover', 'staffing', 7),

-- Documentation
('✍️', 'Progress Notes', 'Guide me in writing effective progress notes', 'documentation', 8),
('📄', 'Care Plan Updates', 'How often should care plans be reviewed and updated?', 'documentation', 7),
('🗂️', 'Record Organization', 'Best practices for organizing resident records', 'documentation', 6),
('🔍', 'Chart Reviews', 'What should I look for in a chart audit?', 'documentation', 7),
('📝', 'Admission Paperwork', 'Checklist for completing admission documentation', 'documentation', 8),
('🖊️', 'Electronic Records', 'Tips for efficient EHR documentation', 'documentation', 6),
('📋', 'Assessment Tools', 'Which assessment tools are required for Medicare?', 'documentation', 7),
('💬', 'Communication Logs', 'How to properly document family communications', 'documentation', 6),
('📊', 'Reporting Requirements', 'What reports are required for state inspections?', 'documentation', 8),
('🔖', 'Documentation Shortcuts', 'Time-saving documentation tips', 'documentation', 5),

-- Quality & Safety
('⭐', 'Quality Improvement', 'Develop a quality improvement initiative', 'quality', 8),
('🎯', 'Performance Metrics', 'What are key performance indicators for SNFs?', 'quality', 7),
('🔬', 'Clinical Outcomes', 'How to improve clinical outcome measures', 'quality', 7),
('📉', 'Risk Management', 'Identify and mitigate facility risks', 'quality', 8),
('🚨', 'Incident Reporting', 'Best practices for incident report documentation', 'quality', 8),
('🏆', 'Best Practices', 'What are industry best practices for rehab services?', 'quality', 6),
('💡', 'Innovation', 'Innovative approaches to resident engagement', 'quality', 5),
('🔔', 'Safety Protocols', 'Review emergency preparedness protocols', 'quality', 8),
('📐', 'Process Improvement', 'Streamline admission process workflow', 'quality', 6),
('🌟', 'Excellence', 'Strategies for achieving 5-star rating', 'quality', 9),

-- Operations
('🏢', 'Facility Management', 'Best practices for facility operations', 'operations', 7),
('💵', 'Budget Planning', 'Help me plan the annual facility budget', 'operations', 7),
('🍽️', 'Dietary Services', 'Improve resident satisfaction with meals', 'operations', 6),
('🧹', 'Housekeeping Standards', 'Environmental services cleaning protocols', 'operations', 5),
('🔧', 'Maintenance', 'Create a preventive maintenance schedule', 'operations', 6),
('📦', 'Supply Management', 'Optimize medical supply ordering and inventory', 'operations', 6),
('🚗', 'Transportation', 'Develop a resident transportation policy', 'operations', 5),
('🎨', 'Activities', 'Plan engaging activities for residents', 'operations', 6),
('📞', 'Family Communication', 'Improve family communication and engagement', 'operations', 7),
('🎪', 'Event Planning', 'Organize a successful family event', 'operations', 5),

-- MDS & Assessment
('📊', 'MDS Timelines', 'Explain MDS assessment timelines', 'compliance', 9),
('🗓️', 'RAI Process', 'Guide me through the RAI process', 'compliance', 8),
('📈', 'Case Mix', 'How to optimize case mix for reimbursement', 'compliance', 8),
('🔢', 'RUG Scoring', 'Explain RUG classification system', 'compliance', 7),
('📋', 'CAA Documentation', 'Complete CAA process documentation', 'compliance', 8),
('⏱️', 'Look-back Periods', 'Clarify MDS look-back periods', 'compliance', 7),
('✅', 'MDS Accuracy', 'Ensure MDS coding accuracy', 'compliance', 9),
('📝', 'Section GG', 'Help with Section GG functional assessment', 'compliance', 8),
('🎯', 'Quality Measures', 'MDS-based quality measures explained', 'compliance', 7),
('🔄', 'Medicare Tracking', 'Track Medicare days and billing', 'compliance', 8),

-- Additional diverse topics
('🌡️', 'COVID Protocols', 'Current COVID-19 management protocols', 'clinical', 8),
('🧪', 'Lab Results', 'Interpret common lab values for elderly residents', 'clinical', 7),
('👨‍⚕️', 'Physician Orders', 'Process for clarifying unclear physician orders', 'clinical', 7),
('🩹', 'Skin Integrity', 'Skin integrity assessment and prevention', 'clinical', 8),
('🎭', 'Behavioral Health', 'Managing psychiatric medications in LTC', 'clinical', 7),
('🚿', 'ADL Assistance', 'Best practices for ADL support and dignity', 'clinical', 6),
('🍎', 'Nutrition', 'Address weight loss and nutritional concerns', 'clinical', 7),
('💤', 'Sleep Management', 'Non-pharmacological sleep interventions', 'clinical', 6),
('🚶', 'Fall Prevention', 'Comprehensive fall prevention strategies', 'clinical', 9),
('👴', 'End of Life Care', 'Compassionate end-of-life care guidelines', 'clinical', 8)

ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT 
  category,
  COUNT(*) as count,
  AVG(priority) as avg_priority
FROM chat_suggestions
GROUP BY category
ORDER BY count DESC;


