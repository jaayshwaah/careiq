# Payroll Starter Packet Template

**Client**: [Client Name]  
**Project**: [Project Name]  
**Date**: [Date]  
**Payroll Specialist**: [Name]

---

## Overview

This payroll starter packet contains all the necessary templates, forms, and procedures to successfully onboard a new payroll client. It includes employee roster templates, pay schedule information, bank details collection, and prior provider export scripts.

---

## Employee Roster Template

### CSV Column Headers
```
Employee_ID,First_Name,Last_Name,SSN,Department,Job_Title,Hire_Date,Pay_Rate,Pay_Type,Hours_Per_Week,Pay_Frequency,Direct_Deposit_Account,Direct_Deposit_Routing,Address_Line_1,Address_Line_2,City,State,ZIP_Code,Phone_Number,Email_Address,Emergency_Contact_Name,Emergency_Contact_Phone,Emergency_Contact_Relationship,Marital_Status,Federal_Tax_Exemptions,State_Tax_Exemptions,Local_Tax_Exemptions,Benefits_Enrollment,401k_Contribution_Percent,401k_Contribution_Amount,Health_Insurance_Premium,Life_Insurance_Premium,Disability_Insurance_Premium,Other_Deductions,Notes
```

### Field Descriptions
- **Employee_ID**: Unique identifier for each employee
- **First_Name**: Employee's first name
- **Last_Name**: Employee's last name
- **SSN**: Social Security Number (encrypted)
- **Department**: Employee's department
- **Job_Title**: Employee's job title
- **Hire_Date**: Date employee was hired (MM/DD/YYYY)
- **Pay_Rate**: Hourly rate or annual salary
- **Pay_Type**: Hourly, Salary, or Commission
- **Hours_Per_Week**: Standard hours per week
- **Pay_Frequency**: Weekly, Bi-weekly, Semi-monthly, or Monthly
- **Direct_Deposit_Account**: Bank account number
- **Direct_Deposit_Routing**: Bank routing number
- **Address_Line_1**: Employee's street address
- **Address_Line_2**: Apartment, suite, etc.
- **City**: Employee's city
- **State**: Employee's state
- **ZIP_Code**: Employee's ZIP code
- **Phone_Number**: Employee's phone number
- **Email_Address**: Employee's email address
- **Emergency_Contact_Name**: Emergency contact name
- **Emergency_Contact_Phone**: Emergency contact phone
- **Emergency_Contact_Relationship**: Relationship to employee
- **Marital_Status**: Single, Married, Divorced, Widowed
- **Federal_Tax_Exemptions**: Number of federal tax exemptions
- **State_Tax_Exemptions**: Number of state tax exemptions
- **Local_Tax_Exemptions**: Number of local tax exemptions
- **Benefits_Enrollment**: Yes or No
- **401k_Contribution_Percent**: 401k contribution percentage
- **401k_Contribution_Amount**: 401k contribution amount
- **Health_Insurance_Premium**: Monthly health insurance premium
- **Life_Insurance_Premium**: Monthly life insurance premium
- **Disability_Insurance_Premium**: Monthly disability insurance premium
- **Other_Deductions**: Other deduction amounts
- **Notes**: Additional notes about employee

---

## Pay Schedule Template

### Pay Schedule Information
- **Pay Frequency**: [Weekly/Bi-weekly/Semi-monthly/Monthly]
- **Pay Period Start**: [Day of week/Date]
- **Pay Period End**: [Day of week/Date]
- **Pay Date**: [Day of week/Date]
- **Cutoff Time**: [Time] on [Day]
- **Holiday Schedule**: [List of holidays]

### Pay Period Calendar
| Pay Period | Start Date | End Date | Pay Date | Status |
|------------|------------|----------|----------|--------|
| Period 1 | [Date] | [Date] | [Date] | [Pending/Complete] |
| Period 2 | [Date] | [Date] | [Date] | [Pending/Complete] |
| Period 3 | [Date] | [Date] | [Date] | [Pending/Complete] |

---

## Bank Details Collection Form

### Primary Bank Account
- **Bank Name**: _________________________
- **Account Type**: [Checking/Savings]
- **Account Number**: _________________________
- **Routing Number**: _________________________
- **Account Holder Name**: _________________________
- **Bank Address**: _________________________

### Secondary Bank Account (if applicable)
- **Bank Name**: _________________________
- **Account Type**: [Checking/Savings]
- **Account Number**: _________________________
- **Routing Number**: _________________________
- **Account Holder Name**: _________________________
- **Bank Address**: _________________________

### ACH Authorization
- **Authorization Date**: _________________________
- **Authorized By**: _________________________
- **Signature**: _________________________

---

## Tax Jurisdictions Template

### Federal Tax Information
- **EIN**: _________________________
- **Tax Year**: _________________________
- **Filing Status**: [Monthly/Quarterly/Annual]

### State Tax Information
- **State**: _________________________
- **State ID**: _________________________
- **Unemployment Tax Rate**: _________________________
- **Workers' Compensation Rate**: _________________________

### Local Tax Information
- **Local Tax Jurisdiction**: _________________________
- **Local Tax Rate**: _________________________
- **Local Tax ID**: _________________________

---

## Benefits Deductions Template

### Health Insurance
- **Provider**: _________________________
- **Plan Type**: [PPO/HMO/HDHP]
- **Monthly Premium**: $_________________
- **Employee Contribution**: $_________________
- **Employer Contribution**: $_________________

### 401k Retirement
- **Provider**: _________________________
- **Employer Match**: _________________________%
- **Vesting Schedule**: _________________________
- **Contribution Limits**: $_________________

### Life Insurance
- **Provider**: _________________________
- **Coverage Amount**: $_________________
- **Monthly Premium**: $_________________
- **Employee Contribution**: $_________________

### Disability Insurance
- **Provider**: _________________________
- **Coverage Amount**: $_________________
- **Monthly Premium**: $_________________
- **Employee Contribution**: $_________________

### Other Benefits
- **Benefit 1**: _________________________ - $_________________
- **Benefit 2**: _________________________ - $_________________
- **Benefit 3**: _________________________ - $_________________

---

## Prior Provider Export Request Script

### Email Template for Prior Provider

**Subject**: Data Export Request - [Client Name] Payroll Transition

Dear [Prior Provider Name],

We are transitioning [Client Name]'s payroll services to King & Co. Consulting. We request the following data export to ensure a smooth transition:

### Required Data Export
1. **Employee Master Data**: Complete employee roster with all fields
2. **Payroll History**: Last 24 months of payroll data
3. **Tax Information**: Current tax settings and history
4. **Benefits Data**: Current benefit enrollments and deductions
5. **Bank Information**: Direct deposit information (encrypted)
6. **Time Tracking Data**: Time and attendance records
7. **Reports**: Standard payroll reports and custom reports

### Data Format Requirements
- **Format**: CSV or Excel (.xlsx)
- **Encoding**: UTF-8
- **Date Format**: MM/DD/YYYY
- **Currency Format**: $0.00
- **Encryption**: All sensitive data must be encrypted

### Delivery Method
- **Secure Portal**: [Portal link]
- **Encrypted Email**: [Email address]
- **Secure File Transfer**: [SFTP details]

### Timeline
- **Request Date**: [Date]
- **Due Date**: [Date]
- **Transition Date**: [Date]

### Contact Information
- **Project Manager**: [Name] - [Email] - [Phone]
- **Technical Lead**: [Name] - [Email] - [Phone]
- **Data Specialist**: [Name] - [Email] - [Phone]

Please confirm receipt of this request and provide an estimated delivery date.

Thank you for your cooperation in this transition.

Best regards,
[Your Name]
Project Manager
King & Co. Consulting

---

## Field Mapping Documentation

### Employee Data Mapping
| Source Field | Target Field | Data Type | Validation Rules |
|--------------|--------------|-----------|------------------|
| EMP_ID | Employee_ID | Text | Required, Unique |
| FIRST_NAME | First_Name | Text | Required, Max 50 chars |
| LAST_NAME | Last_Name | Text | Required, Max 50 chars |
| SSN | SSN | Text | Required, 9 digits, Encrypted |
| DEPT | Department | Text | Required, Max 100 chars |
| TITLE | Job_Title | Text | Required, Max 100 chars |
| HIRE_DATE | Hire_Date | Date | Required, MM/DD/YYYY |
| RATE | Pay_Rate | Decimal | Required, > 0 |
| TYPE | Pay_Type | Text | Required, Hourly/Salary/Commission |

### Payroll Data Mapping
| Source Field | Target Field | Data Type | Validation Rules |
|--------------|--------------|-----------|------------------|
| PAY_PERIOD | Pay_Period | Date | Required, MM/DD/YYYY |
| GROSS_PAY | Gross_Pay | Decimal | Required, > 0 |
| FEDERAL_TAX | Federal_Tax | Decimal | Required, >= 0 |
| STATE_TAX | State_Tax | Decimal | Required, >= 0 |
| LOCAL_TAX | Local_Tax | Decimal | Required, >= 0 |
| FICA | FICA | Decimal | Required, >= 0 |
| MEDICARE | Medicare | Decimal | Required, >= 0 |
| NET_PAY | Net_Pay | Decimal | Required, > 0 |

---

## Data Validation Checklist

### Employee Data Validation
- [ ] All required fields populated
- [ ] SSN format validated (XXX-XX-XXXX)
- [ ] Email format validated
- [ ] Phone format validated
- [ ] Address format validated
- [ ] Pay rate > 0
- [ ] Hire date in valid format
- [ ] No duplicate employee IDs

### Payroll Data Validation
- [ ] All required fields populated
- [ ] Pay period dates valid
- [ ] Gross pay > 0
- [ ] Tax amounts >= 0
- [ ] Net pay > 0
- [ ] Gross pay = Net pay + All deductions
- [ ] No duplicate pay periods

### Bank Data Validation
- [ ] Account numbers numeric
- [ ] Routing numbers 9 digits
- [ ] Account holder names match
- [ ] Bank names valid

---

## Security Requirements

### Data Encryption
- [ ] SSN encrypted at rest
- [ ] Bank account numbers encrypted
- [ ] Data encrypted in transit
- [ ] Encryption keys secured

### Access Controls
- [ ] Role-based access implemented
- [ ] Multi-factor authentication enabled
- [ ] Audit logging enabled
- [ ] Access reviews scheduled

### Data Retention
- [ ] Retention policy defined
- [ ] Data deletion procedures
- [ ] Backup procedures
- [ ] Archive procedures

---

## Contact Information

**Payroll Specialist**: [Name] - [Email] - [Phone]  
**Project Manager**: [Name] - [Email] - [Phone]  
**Technical Lead**: [Name] - [Email] - [Phone]  
**Data Specialist**: [Name] - [Email] - [Phone]

---

## Sign-off

**Data Collection Complete**: [Name] - [Date]  
**Data Validation Complete**: [Name] - [Date]  
**Security Review Complete**: [Name] - [Date]  
**Implementation Approved**: [Name] - [Date]

---

*This payroll starter packet ensures comprehensive data collection and validation for payroll clients. All templates and procedures must be completed before payroll processing begins.*
