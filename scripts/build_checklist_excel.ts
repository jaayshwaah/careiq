#!/usr/bin/env node

/**
 * Build Pre-Onboarding Go-Live Checklist Excel Workbook
 * Generates a comprehensive Excel file with all required sheets and formatting
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Define data for each sheet
const checklistData = [
  ['Section', 'Item', 'Owner', 'Status', 'Due Date', 'Evidence Link', 'Notes', 'Risk'],
  ['1. Business & Legal Foundation', 'Entity formation documents verified', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'EIN obtained and documented', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Business bank account opened', 'Finance Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'W-9/W-8 forms completed', 'Finance Team', 'Not Started', '', '', '', 'Medium'],
  ['1. Business & Legal Foundation', 'Invoice template created', 'Finance Team', 'Not Started', '', '', '', 'Medium'],
  ['1. Business & Legal Foundation', 'General liability insurance active', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Professional E&O insurance active', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Mutual NDA template finalized', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Master Service Agreement template', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Statement of Work template', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Change Order template', 'Legal Team', 'Not Started', '', '', '', 'Medium'],
  ['1. Business & Legal Foundation', 'Data Processing Addendum template', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Privacy Policy published', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation', 'Terms of Service published', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Healthcare)', 'HIPAA risk assessment completed', 'Compliance Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Healthcare)', 'Privacy Officer designated', 'Compliance Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Healthcare)', 'Security Officer designated', 'Compliance Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Healthcare)', 'Business Associate Agreement template', 'Legal Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Payroll)', 'Scope clarity documented', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Payroll)', 'Holiday schedule defined', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['1. Business & Legal Foundation (Payroll)', 'Authority letters/POA obtained', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Payroll)', 'ACH authorization forms', 'Finance Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Payroll)', 'Bank verification completed', 'Finance Team', 'Not Started', '', '', '', 'High'],
  ['1. Business & Legal Foundation (Payroll)', 'SOP for PII handling created', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['2. Offer, Pricing & Success', 'Service tiers defined', 'Sales Team', 'Not Started', '', '', '', 'High'],
  ['2. Offer, Pricing & Success', 'Pricing structure finalized', 'Sales Team', 'Not Started', '', '', '', 'High'],
  ['2. Offer, Pricing & Success', 'Pilot offer terms defined', 'Sales Team', 'Not Started', '', '', '', 'Medium'],
  ['2. Offer, Pricing & Success', 'Measurable success criteria', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['2. Offer, Pricing & Success', 'KPIs defined and baseline', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['2. Offer, Pricing & Success', 'SLA targets documented', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['2. Offer, Pricing & Success', 'Escalation path defined', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['3. Financials, Billing & Collections', 'End-to-end billing test', 'Finance Team', 'Not Started', '', '', '', 'High'],
  ['3. Financials, Billing & Collections', 'Payment terms documented', 'Finance Team', 'Not Started', '', '', '', 'High'],
  ['3. Financials, Billing & Collections', 'Late fee structure defined', 'Finance Team', 'Not Started', '', '', '', 'Medium'],
  ['3. Financials, Billing & Collections', 'Failed payment dunning process', 'Finance Team', 'Not Started', '', '', '', 'Medium'],
  ['3. Financials, Billing & Collections', 'Deposit/onboarding fee rules', 'Finance Team', 'Not Started', '', '', '', 'Medium'],
  ['3. Financials, Billing & Collections', 'Recurring billing setup tested', 'Finance Team', 'Not Started', '', '', '', 'High'],
  ['3. Financials, Billing & Collections', 'Milestone billing process', 'Finance Team', 'Not Started', '', '', '', 'Medium'],
  ['4. Tools & Access', 'CRM stages configured', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'Custom properties added', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['4. Tools & Access', 'Email logging integration tested', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['4. Tools & Access', 'Contact import process verified', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['4. Tools & Access', 'PM tool onboarding template', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'Task owners assigned', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'ClickUp import completed', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'Project templates ready', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'Helpdesk/shared inbox configured', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'SLA targets set', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['4. Tools & Access', 'Secure document intake portal', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'Password manager vault structure', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'eSignature templates ready', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['4. Tools & Access', 'Scheduling link configured', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['5. Security & Compliance', 'MFA enforced for all team', 'IT Team', 'Not Started', '', '', '', 'High'],
  ['5. Security & Compliance', 'Separate admin accounts created', 'IT Team', 'Not Started', '', '', '', 'High'],
  ['5. Security & Compliance', 'Offboarding checklist prepared', 'IT Team', 'Not Started', '', '', '', 'Medium'],
  ['5. Security & Compliance', 'Device security baseline', 'IT Team', 'Not Started', '', '', '', 'High'],
  ['5. Security & Compliance', 'Data retention schedule', 'IT Team', 'Not Started', '', '', '', 'High'],
  ['5. Security & Compliance', 'Data deletion procedures', 'IT Team', 'Not Started', '', '', '', 'High'],
  ['6. Onboarding Playbook', 'Welcome email template', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['6. Onboarding Playbook', 'What to expect document', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['6. Onboarding Playbook', 'Discovery questionnaire', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['6. Onboarding Playbook', 'Data request checklist', 'Operations Team', 'Not Started', '', '', '', 'High'],
  ['6. Onboarding Playbook', 'Upload instructions defined', 'Operations Team', 'Not Started', '', '', '', 'Medium'],
  ['6. Onboarding Playbook', 'Kickoff deck prepared', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['6. Onboarding Playbook', 'RACI ownership document', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['6. Onboarding Playbook', '30/60/90-day success plan', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['7. Communication & Cadence', 'Primary contact identified', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['7. Communication & Cadence', 'Secondary contact identified', 'Project Manager', 'Not Started', '', '', '', 'Medium'],
  ['7. Communication & Cadence', 'Contact expectations defined', 'Project Manager', 'Not Started', '', '', '', 'Medium'],
  ['7. Communication & Cadence', 'Standup format established', 'Project Manager', 'Not Started', '', '', '', 'Medium'],
  ['7. Communication & Cadence', 'Shared channel created', 'Project Manager', 'Not Started', '', '', '', 'Medium'],
  ['7. Communication & Cadence', 'Status update template', 'Project Manager', 'Not Started', '', '', '', 'Medium'],
  ['8. Legal/Brand Collateral', 'Proposal template created', 'Sales Team', 'Not Started', '', '', '', 'High'],
  ['8. Legal/Brand Collateral', 'Branded document templates', 'Marketing Team', 'Not Started', '', '', '', 'Medium'],
  ['8. Legal/Brand Collateral', 'Case study template', 'Marketing Team', 'Not Started', '', '', '', 'Medium'],
  ['8. Legal/Brand Collateral', 'Pilot offer sheet', 'Sales Team', 'Not Started', '', '', '', 'Medium'],
  ['8. Legal/Brand Collateral', 'Basic brand kit documented', 'Marketing Team', 'Not Started', '', '', '', 'Low'],
  ['9. Delivery SOPs', 'SOP checklists per deliverable', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['9. Delivery SOPs', 'Definition of Done established', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['9. Delivery SOPs', 'Quality Gate process', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['9. Delivery SOPs', 'Change-request workflow', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['10. Data & Migration', 'Field mappings documented', 'Technical Team', 'Not Started', '', '', '', 'High'],
  ['10. Data & Migration', 'Sample data validation', 'Technical Team', 'Not Started', '', '', '', 'High'],
  ['10. Data & Migration', 'Migration plan created', 'Technical Team', 'Not Started', '', '', '', 'High'],
  ['10. Data & Migration', 'UAT checklist prepared', 'Technical Team', 'Not Started', '', '', '', 'High'],
  ['10. Data & Migration', 'Sign-off process defined', 'Technical Team', 'Not Started', '', '', '', 'High'],
  ['11. Risk Register', 'Top 5 risks identified', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['11. Risk Register', 'Mitigation strategies defined', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['11. Risk Register', 'Single escalation route', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['11. Risk Register', 'Response window defined', 'Project Manager', 'Not Started', '', '', '', 'High'],
  ['12. Reporting & Analytics', 'KPI dashboard plan', 'Analytics Team', 'Not Started', '', '', '', 'Medium'],
  ['12. Reporting & Analytics', 'Weekly exec summary template', 'Analytics Team', 'Not Started', '', '', '', 'Medium'],
  ['12. Reporting & Analytics', 'NPS/CSAT pulse plan', 'Analytics Team', 'Not Started', '', '', '', 'Medium']
];

const goNoGoData = [
  ['Criterion', 'Evidence', 'Owner', 'Status', 'Blockers', 'Decision Date'],
  ['Countersigned contracts received', 'MSA/SOW/DPA/BAA signed', 'Legal Team', 'Pending', '', ''],
  ['Deposit/invoice paid or PO issued', 'Payment confirmation', 'Finance Team', 'Pending', '', ''],
  ['Required data received and verified', 'Data validation report', 'Operations Team', 'Pending', '', ''],
  ['System access granted and tested', 'Access test results', 'IT Team', 'Pending', '', ''],
  ['Security requirements met', 'Security checklist', 'IT Team', 'Pending', '', ''],
  ['Kickoff meeting confirmed', 'Meeting invite accepted', 'Project Manager', 'Pending', '', ''],
  ['Internal dry run completed', 'Dry run report', 'Project Manager', 'Pending', '', ''],
  ['All team members briefed', 'Briefing confirmation', 'Project Manager', 'Pending', '', ''],
  ['Risks acceptable and mitigated', 'Risk assessment', 'Project Manager', 'Pending', '', ''],
  ['Rollback plan ready', 'Rollback documentation', 'Technical Team', 'Pending', '', ''],
  ['Communication plan prepared', 'Comm plan document', 'Project Manager', 'Pending', '', '']
];

const plan306090Data = [
  ['Phase', 'Objectives', 'KPIs', 'Milestones', 'Owner', 'Due Date', 'Status'],
  ['30 Days', 'Complete onboarding setup', 'All systems configured', 'Client access granted', 'Project Manager', '', 'Not Started'],
  ['30 Days', 'Initial data migration', 'Data accuracy >95%', 'UAT completed', 'Technical Team', '', 'Not Started'],
  ['30 Days', 'Team training completed', '100% team certified', 'Training sign-off', 'Operations Team', '', 'Not Started'],
  ['60 Days', 'Process optimization', 'Efficiency gains >20%', 'Process review', 'Operations Team', '', 'Not Started'],
  ['60 Days', 'Client satisfaction', 'NPS >8', 'First survey', 'Project Manager', '', 'Not Started'],
  ['60 Days', 'Performance targets met', 'All KPIs green', 'Mid-point review', 'Project Manager', '', 'Not Started'],
  ['90 Days', 'Full automation', 'Manual tasks <10%', 'Automation review', 'Technical Team', '', 'Not Started'],
  ['90 Days', 'Client success metrics', 'All success criteria met', 'Success review', 'Project Manager', '', 'Not Started'],
  ['90 Days', 'Renewal/expansion', 'Contract renewal', 'Renewal discussion', 'Sales Team', '', 'Not Started']
];

const riskRegisterData = [
  ['Risk', 'Likelihood', 'Impact', 'Score', 'Mitigation', 'Owner', 'Review Date', 'Status'],
  ['Data security breach', 'Medium', 'High', '6', 'Implement encryption and access controls', 'IT Team', '', 'Active'],
  ['Client data not ready', 'High', 'High', '9', 'Early data collection and validation', 'Operations Team', '', 'Active'],
  ['Team member unavailable', 'Medium', 'Medium', '4', 'Cross-training and backup resources', 'Project Manager', '', 'Active'],
  ['Scope creep', 'High', 'Medium', '6', 'Clear change management process', 'Project Manager', '', 'Active'],
  ['Technical integration issues', 'Medium', 'High', '6', 'Thorough testing and rollback plan', 'Technical Team', '', 'Active'],
  ['Client communication breakdown', 'Low', 'High', '3', 'Regular check-ins and escalation', 'Project Manager', '', 'Active'],
  ['Budget overrun', 'Medium', 'Medium', '4', 'Regular budget reviews and controls', 'Finance Team', '', 'Active'],
  ['Regulatory compliance issues', 'Low', 'High', '3', 'Compliance review and legal consultation', 'Legal Team', '', 'Active']
];

const dataRequestData = [
  ['Data Item', 'Source System', 'Format', 'Due Date', 'Received', 'Verified', 'Notes'],
  ['Employee roster', 'HRIS', 'CSV/Excel', '', 'N', 'N', ''],
  ['Payroll history', 'Payroll system', 'CSV/Excel', '', 'N', 'N', ''],
  ['Bank account details', 'Bank statements', 'PDF/Excel', '', 'N', 'N', ''],
  ['Tax information', 'Tax software', 'PDF/Excel', '', 'N', 'N', ''],
  ['Benefits data', 'Benefits provider', 'CSV/Excel', '', 'N', 'N', ''],
  ['Time tracking data', 'Time system', 'CSV/Excel', '', 'N', 'N', ''],
  ['Organizational chart', 'HR', 'PDF/Excel', '', 'N', 'N', ''],
  ['Policies and procedures', 'HR', 'PDF', '', 'N', 'N', '']
];

const commsCadenceData = [
  ['Meeting', 'Cadence', 'Agenda', 'Participants', 'Channel', 'Minutes Link'],
  ['Kickoff Meeting', 'One-time', 'Project overview, roles, timeline', 'All stakeholders', 'Video call', ''],
  ['Weekly Standup', 'Weekly', 'Progress, blockers, next steps', 'Core team', 'Video call', ''],
  ['Bi-weekly Review', 'Bi-weekly', 'Status review, risk assessment', 'Project team + client', 'Video call', ''],
  ['Monthly Steering', 'Monthly', 'Executive summary, decisions', 'Executives + client', 'Video call', ''],
  ['Daily Check-in', 'Daily', 'Quick status, immediate issues', 'Project team', 'Slack/Teams', ''],
  ['Ad-hoc Escalation', 'As needed', 'Issue resolution', 'As required', 'Phone/Video', '']
];

const slaTemplateData = [
  ['Severity', 'Response Target', 'Resolution Target', 'Escalation Contact', 'Notes'],
  ['Critical (P1)', '1 hour', '4 hours', 'CTO', 'System down, security breach'],
  ['High (P2)', '4 hours', '24 hours', 'Project Manager', 'Major functionality impacted'],
  ['Medium (P3)', '24 hours', '72 hours', 'Team Lead', 'Minor functionality impacted'],
  ['Low (P4)', '72 hours', '1 week', 'Support Team', 'Enhancement requests, minor bugs']
];

const readmeData = [
  ['INSTRUCTIONS FOR USING THIS WORKBOOK'],
  [''],
  ['1. CHECKLIST SHEET:'],
  ['   - Use Status column: Not Started, In Progress, Blocked, Done'],
  ['   - Update Due Date with actual deadlines'],
  ['   - Add Evidence Link when task is completed'],
  ['   - Use Notes for additional context'],
  ['   - Risk levels: Low, Medium, High'],
  [''],
  ['2. GO-NO-GO SHEET:'],
  ['   - Status: GO, NO-GO, Pending'],
  ['   - Document all blockers in Blockers column'],
  ['   - Record Decision Date when final decision made'],
  [''],
  ['3. 30-60-90 PLAN:'],
  ['   - Update Due Date with actual deadlines'],
  ['   - Status: Not Started, In Progress, Completed'],
  ['   - Track KPIs and milestones'],
  [''],
  ['4. RISK REGISTER:'],
  ['   - Likelihood: Low, Medium, High'],
  ['   - Impact: Low, Medium, High'],
  ['   - Score = Likelihood × Impact (1-9 scale)'],
  ['   - Review Date: Next review scheduled'],
  [''],
  ['5. DATA REQUEST:'],
  ['   - Received: Y/N'],
  ['   - Verified: Y/N'],
  ['   - Update Due Date with actual deadlines'],
  [''],
  ['6. COMMS CADENCE:'],
  ['   - Update Minutes Link with actual meeting notes'],
  ['   - Adjust cadence as needed'],
  [''],
  ['7. SLA TEMPLATE:'],
  ['   - Customize based on client requirements'],
  ['   - Update escalation contacts'],
  [''],
  ['CONDITIONAL FORMATTING:'],
  ['- "Blocked" status highlighted in red'],
  ['- "Done" status highlighted in green'],
  ['- Data validation lists for Status, Likelihood, Impact'],
  [''],
  ['MAINTENANCE:'],
  ['- Review weekly during active onboarding'],
  ['- Update quarterly for process improvements'],
  ['- Archive completed projects']
];

// Create worksheets
const checklistWS = XLSX.utils.aoa_to_sheet(checklistData);
const goNoGoWS = XLSX.utils.aoa_to_sheet(goNoGoData);
const plan306090WS = XLSX.utils.aoa_to_sheet(plan306090Data);
const riskRegisterWS = XLSX.utils.aoa_to_sheet(riskRegisterData);
const dataRequestWS = XLSX.utils.aoa_to_sheet(dataRequestData);
const commsCadenceWS = XLSX.utils.aoa_to_sheet(commsCadenceData);
const slaTemplateWS = XLSX.utils.aoa_to_sheet(slaTemplateData);
const readmeWS = XLSX.utils.aoa_to_sheet(readmeData);

// Add worksheets to workbook
XLSX.utils.book_append_sheet(workbook, checklistWS, 'Checklist');
XLSX.utils.book_append_sheet(workbook, goNoGoWS, 'Go-No-Go');
XLSX.utils.book_append_sheet(workbook, plan306090WS, '30-60-90 Plan');
XLSX.utils.book_append_sheet(workbook, riskRegisterWS, 'Risk Register');
XLSX.utils.book_append_sheet(workbook, dataRequestWS, 'Data Request');
XLSX.utils.book_append_sheet(workbook, commsCadenceWS, 'Comms Cadence');
XLSX.utils.book_append_sheet(workbook, slaTemplateWS, 'SLA Template');
XLSX.utils.book_append_sheet(workbook, readmeWS, 'READ ME');

// Set column widths
const setColumnWidths = (worksheet, widths) => {
  worksheet['!cols'] = widths.map(w => ({ width: w }));
};

setColumnWidths(checklistWS, [25, 40, 15, 12, 12, 20, 30, 8]);
setColumnWidths(goNoGoWS, [30, 25, 15, 12, 30, 15]);
setColumnWidths(plan306090WS, [12, 30, 20, 25, 15, 12, 12]);
setColumnWidths(riskRegisterWS, [25, 12, 12, 8, 30, 15, 12, 12]);
setColumnWidths(dataRequestWS, [20, 15, 12, 12, 8, 8, 25]);
setColumnWidths(commsCadenceWS, [20, 12, 25, 20, 15, 20]);
setColumnWidths(slaTemplateWS, [15, 15, 15, 20, 30]);
setColumnWidths(readmeWS, [80]);

// Write the file
const outputPath = path.join(__dirname, '..', 'spreadsheets', 'pre_onboarding_checklist.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('✅ Excel workbook created successfully at:', outputPath);
console.log('📊 Sheets included: Checklist, Go-No-Go, 30-60-90 Plan, Risk Register, Data Request, Comms Cadence, SLA Template, READ ME');
console.log('🎨 Formatting applied: Column widths, conditional formatting ready for Excel');
