import type { RoleName } from "@/components/shell/role-shell";
import type { RoleGuideDocument } from "./tutorial-types";

export const ROLE_TUTORIAL_DATA: Record<RoleName, RoleGuideDocument> = {
  admin: {
    role: "admin",
    roleDisplayName: "System Administrator",
    roleDescription:
      "Responsible for system configuration, school year provisioning, staff accounts, CSV data pipelines, algorithmic parameter tuning, and governance compliance.",
    primaryFocus: "System integrity, access control, pipeline imports, and audit oversight",
    privacyScope:
      "Metadata only for interventions. No access to private counseling notes or student therapeutic records.",
    quickStats: [
      { label: "Role Permission", value: "Full System Setup" },
      { label: "Sensitive Data Access", value: "Metadata Only" },
      { label: "Data Pipeline", value: "Bulk CSV Importers" },
      { label: "Algorithm Authority", value: "Weights & Rule Tuning" },
    ],
    tourSteps: [
      {
        id: "admin-welcome",
        route: "/admin",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Administrator Control Center Header",
        title: "Welcome — System Administrator Control Center",
        badge: "Orientation",
        content:
          "Your central administration hub for school setup, staff provisioning, bulk CSV imports, consent compliance, and algorithmic calibration.",
        actionHint: "Start each school year by configuring terms and sections before importing data.",
        processFlowSteps: [
          "1. Configure School Year & Sections in [School Setup]",
          "2. Provision faculty in [Staff Management]",
          "3. Bulk import rosters via [CSV Ingestion Wizard]",
          "4. Calibrate weights & verify consent compliance",
        ],
        elements: [
          "Overview dashboard — system status & metrics",
          "Sidebar navigation — direct access to admin modules",
          "Notification bell — alerts for failed imports & consent flags",
          "Guide & Tour button — relaunch this tour anytime",
        ],
        placement: "center",
        icon: "shield",
      },
      {
        id: "admin-users-page",
        route: "/admin/users",
        targetSelector: '[data-tour="admin-users-table"], main',
        targetElementName: "Staff Accounts & Permissions Directory",
        title: "User & Staff Management — Accounts & Permissions",
        badge: "Staff Accounts (/admin/users)",
        content:
          "Create and manage accounts for Teachers, Counselors, Principals, and Admins. Assign teachers to homeroom sections and subjects to control student data access.",
        actionHint: "Assign homeroom advisers to sections so teachers have student access.",
        modalExplanation:
          "Clicking 'Add Staff' opens role settings, email confirmation, and section assignments.",
        processFlowSteps: [
          "1. Click [+ Add User] in top toolbar",
          "2. Select role (Teacher, Counselor, Principal, Admin)",
          "3. Assign handled grade levels and sections",
          "4. Click [Create User] to provision credentials",
        ],
        elements: [
          "+ Add User — opens registration form",
          "Role filter tabs — Teacher, Counselor, Principal, Admin",
          "Accounts table — registered staff & assignments",
          "Status badge — Active or Suspended accounts",
        ],
        placement: "bottom",
        icon: "users",
      },
      {
        id: "admin-setup-page",
        route: "/admin/setup",
        targetSelector: "main",
        targetElementName: "Academic Structure & Section Provisioning",
        title: "School Setup — Academic Structure",
        badge: "School Structure (/admin/setup)",
        content:
          "Configure School Years, grading quarter date boundaries, grade levels (7–10), and classroom sections (e.g. 9-Newton, 9-Curie).",
        actionHint: "Configure School Year before creating sections or uploading rosters.",
        processFlowSteps: [
          "1. Create School Year and set Q1–Q4 dates",
          "2. Set active year toggle",
          "3. Create sections under each grade level",
          "4. Map curriculum subjects to grades",
        ],
        elements: [
          "Create School Year — define term name and dates",
          "Active Year toggle — activates term school-wide",
          "Quarter date pickers — Q1–Q4 start/end dates",
          "Add Section — create section with capacity",
        ],
        placement: "bottom",
        icon: "calendar",
      },
      {
        id: "admin-import-page",
        route: "/admin/import",
        targetSelector: "main",
        targetElementName: "Bulk CSV Data Ingestion Wizard",
        title: "Bulk CSV Import Wizard — Data Ingestion",
        badge: "Data Pipelines (/admin/import)",
        content:
          "Ingest institutional datasets in bulk: Student Rosters, Quarterly Grades, Daily Attendance, and Behavioral Incidents with dry-run validation.",
        actionHint: "Import order: Students first ➔ Attendance ➔ Grades ➔ Incidents.",
        modalExplanation:
          "The validation preview flags erroneous rows in red before any database writes occur.",
        processFlowSteps: [
          "1. Download blank CSV template",
          "2. Fill data and upload file",
          "3. Review dry-run validation preview",
          "4. Click [Commit Import] to batch insert",
        ],
        elements: [
          "Import Type — Students, Grades, Attendance, Incidents",
          "Download Template — gets formatted CSV template",
          "Upload CSV — upload filled spreadsheet",
          "Validation preview — flags errors before commit",
        ],
        placement: "bottom",
        icon: "layout",
      },
      {
        id: "admin-consent-page",
        route: "/admin/consent",
        targetSelector: "main",
        targetElementName: "Data Privacy & Consent Compliance Ledger",
        title: "Consent & Privacy — Data Privacy Act Compliance",
        badge: "Data Governance (/admin/consent)",
        content:
          "Audit student data processing consent under DepEd Data Privacy Act guidelines. Students without consent are automatically excluded from risk scoring.",
        actionHint: "Process parent revocation requests here with documented reasons.",
        processFlowSteps: [
          "1. Search student by LRN or name",
          "2. Verify active consent timestamp",
          "3. Revoke consent with required justification note",
        ],
        elements: [
          "Consent list — Consented (green) or Pending (amber)",
          "Search bar — find student consent record",
          "Revoke button — excludes student from scoring",
          "Export Log — downloads audit-ready CSV",
        ],
        placement: "bottom",
        icon: "shield",
      },
      {
        id: "admin-algorithm-page",
        route: "/admin/algorithm",
        targetSelector: "main",
        targetElementName: "Risk Engine Calibration Sliders & Rule Toggles",
        title: "Algorithmic Calibration — Tuning the Risk Engine",
        badge: "Risk Engine (/admin/algorithm)",
        content:
          "Calibrate 5 dimension weights (Grades, Attendance, Behavior, Trend, Subject Discrepancy), risk band cutoffs, and 8 pattern detector rules.",
        actionHint: "Dimension weights must sum to exactly 100%.",
        modalExplanation:
          "Saving changes creates an immutable version snapshot and triggers risk score recalculation.",
        processFlowSteps: [
          "1. Adjust 5 weight sliders to sum to 100%",
          "2. Set Moderate and High Risk cutoffs",
          "3. Toggle pattern detection rules",
          "4. Click [Save & Publish Version]",
        ],
        elements: [
          "Dimension sliders — set % contribution per factor",
          "Total sum indicator — warns if total is not 100%",
          "Risk cutoffs — Moderate and High thresholds",
          "Save & Publish — commits version snapshot",
        ],
        placement: "bottom",
        icon: "brain",
      },
      {
        id: "admin-audit-page",
        route: "/admin/audit",
        targetSelector: "main",
        targetElementName: "Immutable System Audit Log Stream",
        title: "Audit Log — Immutable System Activity Trail",
        badge: "Compliance Trail (/admin/audit)",
        content:
          "Review the tamper-evident audit log tracking user logins, data modifications, CSV imports, algorithm versions, and access records.",
        actionHint: "Filter by Event Type to isolate logins, data mutations, or imports.",
        processFlowSteps: [
          "1. Select Event Type filter",
          "2. Narrow date range window",
          "3. Inspect before/after JSON diffs",
        ],
        elements: [
          "Event Type filter — Login, Data, Import, Algorithm",
          "User filter — isolate staff member activity",
          "Audit entry — timestamp, user, action details",
          "Export CSV — downloads compliance log",
        ],
        placement: "bottom",
        icon: "shield",
      },
      {
        id: "admin-reports-page",
        route: "/reports",
        targetSelector: "main",
        targetElementName: "Institutional Master Data & Compliance Exports",
        title: "Institutional Reports — School-Wide Data Exports",
        badge: "Reporting (/reports)",
        content:
          "Download clean CSV data exports for school-wide reporting and DepEd Division compliance: Risk Rosters, Intervention Outcomes, and Attendance Registers.",
        actionHint: "Download the School-Wide Risk Roster at the end of each quarter for division submissions.",
        processFlowSteps: [
          "1. Choose report type from dropdown",
          "2. Set school year and grade level",
          "3. Click [Download CSV] to save",
        ],
        elements: [
          "Report type — select institutional report",
          "School Year filter — select academic year",
          "Download CSV — generates file export",
        ],
        placement: "bottom",
        icon: "book",
      },
      {
        id: "admin-finish",
        route: "/admin",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Administrator Control Center",
        title: "Tour Complete — Admin Control Center Ready! 🎉",
        badge: "All Done",
        content:
          "You've completed the Admin tour! You now know how to configure school terms, manage staff, run bulk imports, govern privacy consent, calibrate algorithms, and review audit logs.",
        actionHint: "First priority for a new school year: Create School Year ➔ Add Sections ➔ Import Students ➔ Assign Teachers.",
        elements: [
          "Guide & Tour button — relaunch this tour anytime",
          "Help & Guides — opens the written manual",
        ],
        placement: "center",
        icon: "sparkle",
      },
    ],

    features: [
      {
        id: "admin-users",
        title: "User & Staff Management",
        route: "/admin/users",
        category: "Administration & Security",
        badge: "Staff Access",
        summary:
          "Centralized dashboard for provisioning teacher, counselor, and principal accounts, configuring section advisorships, and managing security access.",
        whatYouCanDo: [
          "Create new faculty and staff accounts with specific system roles (TEACHER, COUNSELOR, PRINCIPAL, ADMIN).",
          "Assign teachers as Section Advisers and Subject Instructors.",
          "Perform secure credential resets and access suspensions.",
          "Audit last login timestamps and account activation statuses.",
        ],
        keyFunctions: [
          {
            name: "Add Staff Member",
            description: "Register a new teacher or staff member with validated email and initial password.",
          },
          {
            name: "Assign Section Advisory",
            description: "Bind a teacher to a section for automatic classroom scoping and risk tracking.",
          },
          {
            name: "Reset Password",
            description: "Generate a one-time secure password reset for staff experiencing login difficulties.",
          },
        ],
        privacyAndScope: "Admins manage role assignments but cannot view private counseling discussions.",
        tips: [
          "Ensure every section has an assigned section adviser for proper student notification routing.",
          "Deactivate rather than delete historical staff accounts to preserve historical audit logs.",
        ],
      },
      {
        id: "admin-students",
        title: "Students Master Directory",
        route: "/admin/students",
        category: "Student Records",
        badge: "Roster Management",
        summary:
          "Comprehensive directory of all enrolled learners across Grade 7 to Grade 10, showing section affiliations, enrollment status, and parent/guardian contact records.",
        whatYouCanDo: [
          "Search enrolled learners by LRN (Learner Reference Number), name, or section.",
          "Review student demographic records and emergency contact details.",
          "Check active enrollment status across current and past academic years.",
        ],
        keyFunctions: [
          {
            name: "Learner Lookup",
            description: "Quickly locate any student's record using their unique 12-digit DepEd LRN.",
          },
          {
            name: "Section Breakdown",
            description: "Filter student lists by grade level and section group.",
          },
        ],
        privacyAndScope: "Standard demographic and roster metadata only; sensitive counselor session notes are excluded.",
        tips: ["Use LRN search for accurate and unambiguous student lookup."],
      },
      {
        id: "admin-setup",
        title: "School Year & Structure Setup",
        route: "/admin/setup",
        category: "Academic Configuration",
        badge: "Academic Hierarchy",
        summary:
          "Define school years, quarter terms, grade levels, and sections that form the backbone of all system analytics.",
        whatYouCanDo: [
          "Create and activate upcoming school years (e.g. SY 2026-2027).",
          "Add classroom sections to grade levels with defined capacity.",
          "Register academic subjects and learning areas based on standard curriculum.",
        ],
        keyFunctions: [
          {
            name: "New School Year",
            description: "Initialize an academic year and define quarterly grading periods.",
          },
          {
            name: "Section Provisioning",
            description: "Create sections (e.g. 10-Einstein) and assign room designations.",
          },
          {
            name: "Subject Catalog",
            description: "Maintain core subjects (Mathematics, Science, English, etc.).",
          },
        ],
        privacyAndScope: "Global institutional configuration; changes take effect immediately across all user roles.",
        tips: [
          "Always verify section and subject definitions before running batch CSV student imports.",
        ],
      },
      {
        id: "admin-import",
        title: "Data Import Wizard",
        route: "/admin/import",
        category: "Data Pipelines",
        badge: "CSV Pipelines",
        summary:
          "Robust batch ingestion tool for importing students, quarterly grades, attendance sheets, and behavioral incidents via standardized CSV templates.",
        whatYouCanDo: [
          "Download official CSV templates for Students, Grades, Attendance, and Behavior.",
          "Upload bulk files with instant preview, validation, and error detection.",
          "Execute automated database ingestion with atomic rollback on failure.",
          "Trigger algorithmic risk recalculations immediately following import.",
        ],
        keyFunctions: [
          {
            name: "CSV Template Download",
            description: "Get clean formatted sample templates matching database schema requirements.",
          },
          {
            name: "Validation Pre-check",
            description: "Scans for missing LRNs, invalid dates, and out-of-range grade scores before writing.",
          },
          {
            name: "Batch Ingest & Recalculate",
            description: "Commits valid records to Postgres and updates student risk profiles.",
          },
        ],
        privacyAndScope: "All import transactions are stamped in the immutable audit log with creator ID.",
        tips: [
          "Ensure CSV files use UTF-8 encoding and follow standard date formatting (YYYY-MM-DD).",
        ],
      },
      {
        id: "admin-consent",
        title: "Consent & Privacy Management",
        route: "/admin/consent",
        category: "Governance & Compliance",
        badge: "Data Privacy",
        summary:
          "Track parental and student data processing consent status in accordance with the Data Privacy Act and DepEd educational guidelines.",
        whatYouCanDo: [
          "Review active consent records and documentation logs.",
          "Process verified consent revocation requests with required legal justification.",
          "Ensure algorithmic exclusion flags are respected for non-consented students.",
        ],
        keyFunctions: [
          {
            name: "Revocation Processing",
            description: "Log written justification and exclude student from automated scoring.",
          },
          {
            name: "Consent Audit",
            description: "Generate status reports on total consented vs pending records.",
          },
        ],
        privacyAndScope: "Ensures legal compliance and transparency across all predictive capabilities.",
        tips: [
          "Always archive physical or digital signed consent forms before approving system records.",
        ],
      },
      {
        id: "admin-algorithm",
        title: "Algorithm Configuration & Tuning",
        route: "/admin/algorithm",
        category: "Algorithmic Engine",
        badge: "Versioned Rules",
        summary:
          "Calibrate scoring weights, band cut-offs (Low, Moderate, High), and pattern detection thresholds. Every adjustment generates a versioned audit snapshot.",
        whatYouCanDo: [
          "Adjust weights for the 5 core dimensions: Academic Performance, Attendance Rate, Behavioral Incidents, Grade Trend, and Subject Discrepancy.",
          "Tune score thresholds for Moderate Risk (default 40.0) and High Risk (default 70.0).",
          "Configure triggers for 8 pattern rules (e.g. Chronic Absenteeism, Sharp Grade Drop, High Absence/Passing Grade, etc.).",
          "View history of all past parameter versions with author notes.",
        ],
        keyFunctions: [
          {
            name: "Weight Adjustment Slider",
            description: "Rebalance dimension contributions ensuring total sum equals 100%.",
          },
          {
            name: "Pattern Toggle",
            description: "Enable or refine sensitivity thresholds for rule-based pattern detectors.",
          },
          {
            name: "Publish New Version",
            description: "Commit changes to the live engine and trigger recalculation across students.",
          },
        ],
        privacyAndScope: "Transparent, rule-based mathematical scoring. No black-box machine learning weights.",
        tips: [
          "Review bias monitoring metrics in the Principal dashboard before publishing major weight changes.",
        ],
      },
      {
        id: "admin-audit",
        title: "Audit Log & System Activity",
        route: "/admin/audit",
        category: "Compliance & Security",
        badge: "Append-Only Trail",
        summary:
          "Complete, non-destructive audit ledger capturing all authentication events, CRUD mutations, data imports, and sensitive information reads.",
        whatYouCanDo: [
          "Filter audit records by actor, action type (CREATE, UPDATE, DELETE, VIEW, AUTH), date range, and resource type.",
          "Inspect JSON metadata diffs showing exactly what values were modified.",
          "Export audit reports for institutional accreditation and security reviews.",
        ],
        keyFunctions: [
          {
            name: "Event Search & Filter",
            description: "Quickly locate specific user actions or system interventions.",
          },
          {
            name: "Metadata Inspector",
            description: "View before-and-after change snapshots in structured JSON.",
          },
        ],
        privacyAndScope: "The audit log cannot be modified or deleted by any user or administrator.",
        tips: [
          "Regularly inspect the audit log for failed login attempts or unusual after-hours bulk modifications.",
        ],
      },
      {
        id: "admin-reports",
        title: "Reports & Data Exports",
        route: "/reports",
        category: "Reporting & Analytics",
        badge: "CSV Downloads",
        summary:
          "Generate and download clean CSV datasets containing risk rosters, attendance summaries, intervention tracking, and governance metrics.",
        whatYouCanDo: [
          "Export school-wide risk rosters with factor breakdowns.",
          "Download attendance registers and quarterly performance reports.",
          "Extract governance summaries and intervention outcome logs.",
        ],
        keyFunctions: [
          {
            name: "Instant CSV Export",
            description: "Generates formatted, tabular data files ready for Excel or DepEd reporting.",
          },
        ],
        privacyAndScope: "Exports only include data permitted by the user's role authorization.",
        tips: ["Use reports for quarterly DepEd stakeholder meetings and school improvement planning."],
      },
    ],
    workflows: [
      {
        id: "workflow-sy-setup",
        title: "Academic Year Initialization Workflow",
        summary: "Step-by-step procedure for provisioning a brand new academic school year.",
        estimatedTime: "15 - 30 minutes",
        frequency: "Quarterly",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Create School Year",
            pageRoute: "/admin/setup",
            instructions: "Navigate to School Setup, click 'Add School Year', specify start/end dates and label (e.g. SY 2026-2027), then set it as active.",
          },
          {
            stepNumber: 2,
            actionTitle: "Configure Sections & Subjects",
            pageRoute: "/admin/setup",
            instructions: "Create all grade levels (7-10), add classroom sections, and register standard curriculum subjects.",
          },
          {
            stepNumber: 3,
            actionTitle: "Assign Section Advisers",
            pageRoute: "/admin/users",
            instructions: "In User Management, assign faculty members to their respective classroom section advisorships.",
          },
          {
            stepNumber: 4,
            actionTitle: "Import Roster & Enrollment",
            pageRoute: "/admin/import",
            instructions: "Use the Data Import Wizard to upload the student masterlist CSV for the new school year.",
          },
        ],
      },
      {
        id: "workflow-algorithm-tuning",
        title: "Algorithmic Recalibration & Rule Review",
        summary: "Procedure for adjusting risk weights in consultation with school guidance leadership.",
        estimatedTime: "10 - 20 minutes",
        frequency: "Quarterly",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Review Governance & Bias Reports",
            pageRoute: "/reports",
            instructions: "Analyze current risk score distribution and bias metrics to identify any unintended skew.",
          },
          {
            stepNumber: 2,
            actionTitle: "Adjust Weights & Thresholds",
            pageRoute: "/admin/algorithm",
            instructions: "Modify factor percentages ensuring a 100% total, and document the pedagogical justification.",
          },
          {
            stepNumber: 3,
            actionTitle: "Publish & Trigger Recalculation",
            pageRoute: "/admin/algorithm",
            instructions: "Submit changes to create a new versioned algorithm snapshot and trigger risk engine recomputation.",
          },
        ],
      },
    ],
    aiAndAlgorithmNotes: [
      {
        title: "Deterministic Risk Engine Architecture",
        content:
          "The AEM system calculates risk scores using transparent, linear algebraic formulas based on DepEd performance metrics. No unexplainable deep-learning models are used in score calculation.",
      },
      {
        title: "Role-Based Data Separation",
        content:
          "Admins maintain structural and configuration control, but cannot view private student counseling session notes or therapeutic disclosures, guaranteeing strict ethical boundaries.",
      },
    ],
  },

  teacher: {
    role: "teacher",
    roleDisplayName: "Classroom Teacher / Section Adviser",
    roleDescription:
      "Empowers educators to manage assigned classes, record daily attendance, enter quarterly grades, log behavioral notes, monitor student risk indicators, conduct intervention sessions, and refer students for counseling support.",
    primaryFocus: "Classroom operations, daily data logging, early risk detection, and student referral",
    privacyScope:
      "Access is strictly scoped to assigned sections. Interventions show public goals and actions; private counseling notes remain confidential.",
    quickStats: [
      { label: "Classroom Scope", value: "Assigned Sections Only" },
      { label: "Daily Data Duty", value: "Attendance & Performance" },
      { label: "Referral Power", value: "Teacher-to-Counselor" },
      { label: "Intervention Role", value: "Session Logging & Notes" },
    ],
    tourSteps: [
      {
        id: "teacher-welcome",
        route: "/teacher",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Teacher Command Center Header",
        title: "Welcome — Teacher Workspace Overview",
        badge: "Orientation",
        content:
          "Your classroom command center for recording daily attendance, entering quarterly scores, tracking at-risk learners, logging support sessions, and referring students to guidance.",
        actionHint: "Check your section summary cards and active alerts on this overview page daily.",
        processFlowSteps: [
          "1. Confirm active school year in top-right dropdown",
          "2. Review student risk overview cards on this dashboard",
          "3. Use sidebar or module cards to jump to daily tasks",
        ],
        elements: [
          "School year selector — confirm active term",
          "Modules grid — quick links to teacher tools",
          "Notification bell — alerts for referral updates",
          "Guide & Tour button — relaunch this tour anytime",
        ],
        placement: "center",
        icon: "layout",
      },
      {
        id: "teacher-sidebar",
        route: "/teacher",
        targetSelector: '[data-tour="sidebar-nav"]',
        targetElementName: "Left Navigation Sidebar",
        title: "Navigation Sidebar — Daily Shortcut Panel",
        badge: "Layout",
        content:
          "One-click navigation between your classes, student risk rosters, intervention logs, guidance referrals, CSV reports, and algorithm guides.",
        actionHint: "Click any sidebar link to jump directly to that workspace.",
        elements: [
          "Overview — dashboard summary",
          "My Classes — rosters & daily operations",
          "Student Risk — scoring insights",
          "Intervention Feedback — log sessions",
          "Refer a Student — guidance referrals",
          "Reports — download CSV exports",
        ],
        placement: "right",
        icon: "layout",
      },
      {
        id: "teacher-my-classes",
        route: "/teacher/my-classes",
        targetSelector: "main .divide-y, main",
        targetElementName: "Classroom Section Assignment Cards",
        title: "My Classes — Section Rosters & Operations",
        badge: "Daily Operations (/teacher/my-classes)",
        content:
          "Manage all assigned sections for the active term. Open any class workspace to record roll-call attendance, input quarterly marks, or log student behavioral records.",
        actionHint: "Click any class row to open that section's workspace.",
        processFlowSteps: [
          "1. Click a section assignment row to open its workspace",
          "2. Switch between Roster, Attendance, Gradebook, and Risk tabs",
          "3. Save updates to immediately feed the risk engine",
        ],
        elements: [
          "Section cards — one card per assigned class",
          "Student count — total enrolled learners",
          "Adviser badge — homeroom adviser indicator",
          "Subject label — subject taught for that section",
        ],
        placement: "bottom",
        icon: "users",
      },
      {
        id: "teacher-attendance",
        route: "/teacher/my-classes",
        targetSelector: '[data-tour="class-tab-attendance"], main',
        targetElementName: "[Attendance] Tab & Quick-Toggle Register",
        title: "Taking Daily Attendance — Roll Call Process",
        badge: "Process Flow — Attendance",
        content:
          "Open your assigned section and tap the Attendance tab. Cycle student status: Present ✓ ➔ Late ⏱ ➔ Absent ✗ ➔ Excused, then save.",
        actionHint: "Record roll call daily. Consecutive absences trigger counselor alerts.",
        modalExplanation:
          "The register auto-calculates absence rates. Chronic absences automatically trigger DepEd attendance warnings.",
        processFlowSteps: [
          "1. Click [Attendance] tab on section workspace",
          "2. Select calendar date (defaults to today)",
          "3. Tap status buttons (P / A / T / E)",
          "4. Click [Save Attendance] to commit",
        ],
        elements: [
          "Attendance tab — roll-call workspace",
          "Date picker — choose target date",
          "Status buttons — P (Green), A (Red), T (Amber), E (Blue)",
          "Save Attendance — commits logs to database",
        ],
        placement: "bottom",
        icon: "check",
      },
      {
        id: "teacher-grades",
        route: "/teacher/my-classes",
        targetSelector: '[data-tour="class-tab-gradebook"], main',
        targetElementName: "[Gradebook] Tab & Quarterly Score Entry",
        title: "Entering Quarterly Grades — Gradebook Entry",
        badge: "Process Flow — Gradebook",
        content:
          "Switch to the Gradebook tab, select the Quarter (Q1–Q4) and Assessment Kind (Written Work, Performance Task, Exam), enter scores, and save.",
        actionHint: "Submit grades before quarterly deadlines so early warning signals can catch struggling learners.",
        modalExplanation:
          "Failing marks (<75) are highlighted in red and immediately factored into the academic risk calculation.",
        processFlowSteps: [
          "1. Click [Gradebook] tab in section workspace",
          "2. Select active quarter (Q1, Q2, Q3, Q4)",
          "3. Input scores in the tabular grid",
          "4. Click [Save Grades] to recalculate GPAs",
        ],
        elements: [
          "Quarter selector — Q1, Q2, Q3, Q4 tabs",
          "Assessment filter — Written, Task, or Exam",
          "Score cells — numerical score entry",
          "Save Grades — commits grades to database",
        ],
        placement: "bottom",
        icon: "book",
      },
      {
        id: "teacher-student-risk",
        route: "/teacher/student-risk",
        targetSelector: '[data-tour="risk-roster-table"], main',
        targetElementName: "Student Risk Roster Table",
        title: "Student Risk Roster — Identifying At-Risk Learners",
        badge: "Analytics (/teacher/student-risk)",
        content:
          "Ranks learners in your sections by computed risk score (0–100). Red indicates High Risk (≥70), amber Moderate (40–69), and green Low.",
        actionHint: "Sort by 'Risk Score' or filter by 'High Risk' to prioritize learners needing support.",
        processFlowSteps: [
          "1. Filter by HIGH or MODERATE risk",
          "2. Click a student to open 360° factor breakdown",
          "3. Review Academic, Attendance, and Behavior drivers",
        ],
        elements: [
          "Risk Band filter — All, High, Moderate, Low",
          "Search bar — search by name or LRN",
          "Risk Badge — color-coded score rating",
          "Sub-score bars — Academic, Attendance, Behavior",
        ],
        placement: "bottom",
        icon: "brain",
      },
      {
        id: "teacher-intervention-feedback",
        route: "/teacher/intervention-feedback",
        targetSelector: '[data-tour="feedback-master-list"], main',
        targetElementName: "Active Support Plans Master List",
        title: "Intervention Feedback — View & Select Active Plans",
        badge: "Collaboration (/teacher/intervention-feedback)",
        content:
          "Lists all counselor-created intervention plans for your students. Select any plan to view goals, teacher accommodations, and feedback history.",
        actionHint: "Select a plan to inspect required actions and log completed support sessions.",
        processFlowSteps: [
          "1. Select a support plan from the master list",
          "2. Read schedule & tasks in [Plan Parameters]",
          "3. Click [Submit Feedback] to log sessions",
        ],
        elements: [
          "Plans list — active student support plans",
          "Scope badge — Individual, Section, Grade",
          "Status badge — Active or Pending Review",
          "Log counter — total feedback submissions",
        ],
        placement: "bottom",
        icon: "check",
      },
      {
        id: "teacher-log-session",
        route: "/teacher/intervention-feedback",
        targetSelector: '[data-tour="feedback-view-tabs"], [data-tour="feedback-tab-submit"], main',
        targetElementName: "[Submit Feedback] Tab & Form Controls",
        title: "Logging Intervention Feedback — Session Log Process",
        badge: "Process Flow — Feedback & Session Log",
        content:
          "Log remedial sessions conducted, request plan adjustments, or submit qualitative student observations to the Guidance Counselor.",
        actionHint: "Log every remedial class as evidence of support for quarterly review.",
        modalExplanation:
          "Submitting feedback routes observations to the counselor owning the plan and updates the audit log.",
        processFlowSteps: [
          "1. Click [Submit Feedback] tab on selected plan",
          "2. Pick mode: Log Session, Revision, or Outcome",
          "3. Enter session observations in textarea",
          "4. Click [Send Feedback] to dispatch log",
        ],
        elements: [
          "Feedback modes — Log Session, Revision, Outcome",
          "Text area — detailed session notes",
          "Send Feedback — routes log to counselor",
          "Feedback Log tab — historical audit log",
        ],
        placement: "bottom",
        icon: "check",
      },
      {
        id: "teacher-refer",
        route: "/teacher/refer",
        targetSelector: '[data-tour="teacher-refer-form"], main',
        targetElementName: "Student Guidance Referral Form",
        title: "Refer a Student — Initiating a Guidance Referral",
        badge: "Referral Process (/teacher/refer)",
        content:
          "Formally refer a student needing counseling support. Select the student, suggested support category, enter classroom observations, set urgency, and submit.",
        actionHint: "Provide concrete observations (e.g. 'missed 4 assignments after midterm') to assist the counselor.",
        modalExplanation:
          "Submissions alert the Guidance Counselor immediately and convert into formal intervention plans upon acceptance.",
        processFlowSteps: [
          "1. Select student from your assigned sections",
          "2. Choose suggested support type & urgency",
          "3. Describe concerns in reason textbox",
          "4. Click [Submit referral] to dispatch",
        ],
        elements: [
          "Student selector — search assigned students",
          "Support type — Academic, Attendance, Behavior",
          "Reason textarea — description of concerns",
          "Submit referral — dispatches to counselor",
        ],
        placement: "bottom",
        icon: "sparkle",
      },
      {
        id: "teacher-refer-status",
        route: "/teacher/refer",
        targetSelector: '[data-tour="teacher-referral-history-list"], main',
        targetElementName: "Your Referrals History List",
        title: "Tracking Referral Status — Accepted, Pending, or Declined",
        badge: "Process Flow — Referral Tracking",
        content:
          "Track referral progress in real-time: PENDING (under review) ➔ ACCEPTED (plan linked) or DECLINED (with counselor's pedagogical feedback).",
        actionHint: "If declined, read the counselor's note and adjust classroom support.",
        processFlowSteps: [
          "1. Monitor status badges in the history list",
          "2. Click [View Plan] on accepted referrals",
          "3. Read feedback on declined submissions",
        ],
        elements: [
          "Referral card — student, date, urgency",
          "Status badge — Pending, Accepted, Declined",
          "Intervention link — shortcut to accepted plan",
          "Decline box — counselor's explanation",
        ],
        placement: "bottom",
        icon: "bell",
      },
      {
        id: "teacher-reports",
        route: "/reports",
        targetSelector: "main",
        targetElementName: "Classroom CSV Reports Workspace",
        title: "Reports & Exports — Downloading Classroom Data",
        badge: "Data Exports (/reports)",
        content:
          "Download clean CSV spreadsheets for DepEd Form 2 (attendance register), parent-teacher conferences, and section risk rosters.",
        actionHint: "Filter by section to keep exported files focused and organized.",
        processFlowSteps: [
          "1. Choose report type (Attendance, Grades, Risk)",
          "2. Select section and grading quarter",
          "3. Click [Download CSV] to save",
        ],
        elements: [
          "Report type — Attendance, Grades, Risk Roster",
          "Section filter — narrow to assigned class",
          "Quarter selector — download specific quarter",
          "Download CSV — exports spreadsheet file",
        ],
        placement: "bottom",
        icon: "book",
      },
      {
        id: "teacher-learn",
        route: "/learn",
        targetSelector: "main",
        targetElementName: "AI Transparency & Algorithm Guide",
        title: "How the System Works — AI Transparency & Formulas",
        badge: "AI Literacy (/learn)",
        content:
          "Inspect the live mathematical formulas, factor weights (Grades, Attendance, Behavior), and 8 pattern detection rules that calculate risk scores.",
        actionHint: "Read this to understand how student scores change after grade/attendance submissions.",
        processFlowSteps: [
          "1. Review factor percentage weights",
          "2. Expand pattern detection rule cards",
          "3. Inspect data privacy scope boundaries",
        ],
        elements: [
          "Factor sliders — Grades/Attendance/Behavior %",
          "Pattern rules — trigger conditions",
          "Formula card — linear scoring equation",
          "Privacy table — role access matrix",
        ],
        placement: "bottom",
        icon: "book",
      },
      {
        id: "teacher-finish",
        route: "/teacher",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Teacher Workspace Hero",
        title: "Tour Complete — You're Ready to Teach! 🎉",
        badge: "All Done",
        content:
          "You've completed the teacher tour! You now know how to take roll call, enter marks, monitor risk, submit referrals, and log intervention feedback.",
        actionHint: "Start by opening 'My Classes' and taking today's attendance for your first section.",
        elements: [
          "Guide & Tour button — relaunch this tour anytime",
          "Help & Guides — opens the written manual",
        ],
        placement: "center",
        icon: "sparkle",
      },
    ],
    features: [
      {
        id: "teacher-classes",
        title: "My Classes & Rosters",
        route: "/teacher/my-classes",
        category: "Classroom Management",
        badge: "Rosters & Daily Logging",
        summary:
          "Your primary daily portal for managing assigned sections, taking student attendance, entering quarterly assessment grades, and logging behavioral incidents.",
        whatYouCanDo: [
          "Select any handled section (e.g. 9-Newton, 9-Curie) to view enrolled learners.",
          "Record daily attendance (Present, Late, Absent, Excused) with automated tallying.",
          "Input quarterly written work, performance tasks, and quarterly exam grades.",
          "Log positive behavioral recognitions or disciplinary incidents with date and context.",
          "Drill down into individual student academic profiles.",
        ],
        keyFunctions: [
          {
            name: "Attendance Tracker",
            description: "Quick toggle grid for rapid daily roll call and absence rate computation.",
          },
          {
            name: "Quarterly Gradebook",
            description: "Grade entry matrix with automatic passing/failing indicator highlighting.",
          },
          {
            name: "Behavior Log",
            description: "Structured incident recorder categorized by severity and observation notes.",
          },
        ],
        privacyAndScope: "Teachers can only view and edit students enrolled in their assigned sections.",
        tips: [
          "Log attendance daily so the algorithm can detect emerging attendance trends before they become chronic.",
        ],
      },
      {
        id: "teacher-risk",
        title: "Student Risk Roster & Factor Explanations",
        route: "/teacher/student-risk",
        category: "Analytics & Early Warning",
        badge: "Explainable Risk",
        summary:
          "View risk scores and clear factor breakdowns for all students in your classes to quickly identify who needs early pedagogical intervention.",
        whatYouCanDo: [
          "Sort students by overall risk score, academic risk, attendance risk, or grade drop velocity.",
          "Inspect the Explainability Panel to see how each dimension contributed to the final score.",
          "Identify triggered algorithmic patterns (e.g. Grade Drop in Math, High Absence on Mondays).",
          "One-click launch to refer a student or view their intervention history.",
        ],
        keyFunctions: [
          {
            name: "Risk Band Filter",
            description: "Quickly isolate High Risk (Score >= 70) and Moderate Risk (Score 40-69) students.",
          },
          {
            name: "Explain Factor Drawer",
            description: "Detailed mathematical breakdown showing the exact points contributed by each metric.",
          },
        ],
        privacyAndScope: "Risk scores are computed purely from quantitative school records; no private personal notes are factored in.",
        tips: [
          "Focus on students in the Moderate band early—timely remedial support prevents escalation to High Risk.",
        ],
      },
      {
        id: "teacher-feedback",
        title: "Intervention Feedback & Session Tracker",
        route: "/teacher/intervention-feedback",
        category: "Intervention Execution",
        badge: "Support Logging",
        summary:
          "Collaborative workspace to review active intervention plans assigned to your students, log completed mentoring/remedial sessions, and provide feedback to the counselor.",
        whatYouCanDo: [
          "Browse active individual and section-level intervention plans.",
          "Log completed support sessions with date, duration, topics covered, and student responsiveness.",
          "Submit qualitative observation notes on student progress.",
          "Request a formal plan revision if the student's needs have changed.",
        ],
        keyFunctions: [
          {
            name: "Log Session",
            description: "Record that a remedial class, peer tutoring session, or parent check-in was conducted.",
          },
          {
            name: "Progress Observation",
            description: "Send qualitative feedback to the counselor describing improvements or remaining obstacles.",
          },
          {
            name: "Revision Request",
            description: "Formally flag that an intervention strategy should be adjusted.",
          },
        ],
        privacyAndScope: "Teachers see intervention objectives, target metrics, and assigned tasks; private counselor clinical notes remain sealed.",
        tips: [
          "Regularly logging sessions provides measurable evidence of intervention efficacy for quarterly reports.",
        ],
      },
      {
        id: "teacher-refer",
        title: "Refer a Student for Guidance Support",
        route: "/teacher/refer",
        category: "Student Support",
        badge: "Proactive Referrals",
        summary:
          "Initiate a formal guidance referral for any student requiring specialized academic, behavioral, or emotional support from the Guidance Counselor.",
        whatYouCanDo: [
          "Select a student from your assigned sections.",
          "Specify referral categories (Academic Struggle, Chronic Absence, Behavioral Concerns, Emotional Distress, Family Circumstances).",
          "Provide detailed, objective observational notes and actions already attempted in the classroom.",
          "Track referral status (Pending Review, Accepted into Intervention, Declined with Feedback).",
        ],
        keyFunctions: [
          {
            name: "Submit Referral",
            description: "Sends an immediate alert to the Counselor workspace with your supporting notes.",
          },
          {
            name: "Referral History",
            description: "Review all past referrals submitted by you and the corresponding counselor outcomes.",
          },
        ],
        privacyAndScope: "Referrals are shared exclusively between you, the Guidance Counselor, and the School Principal.",
        tips: [
          "Include concrete classroom observations (e.g. 'missed 4 consecutive assignments after midterm') to assist the counselor.",
        ],
      },
      {
        id: "teacher-reports",
        title: "Classroom Reports & Exports",
        route: "/reports",
        category: "Reporting",
        badge: "CSV Downloads",
        summary:
          "Download CSV records of classroom attendance logs, quarterly assessment marks, and student risk scores for your assigned sections.",
        whatYouCanDo: [
          "Export class attendance summaries formatted for DepEd Form 2 reporting.",
          "Download quarterly grading sheets and risk rosters for parent-teacher conferences.",
        ],
        keyFunctions: [
          {
            name: "Section CSV Export",
            description: "Download tabular datasets for spreadsheet analysis and record keeping.",
          },
        ],
        privacyAndScope: "Limited strictly to your assigned sections.",
        tips: ["Export reports prior to quarterly parent-teacher consultations for data-grounded discussions."],
      },
    ],
    workflows: [
      {
        id: "workflow-daily-teacher",
        title: "Daily Classroom Routine",
        summary: "Standard morning routine for tracking attendance and early risk signals.",
        estimatedTime: "5 - 10 minutes",
        frequency: "Daily",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Open Handled Section",
            pageRoute: "/teacher/my-classes",
            instructions: "Navigate to My Classes and select the section currently in session.",
          },
          {
            stepNumber: 2,
            actionTitle: "Record Roll Call",
            pageRoute: "/teacher/my-classes",
            instructions: "Toggle any absent or tardy students and submit the attendance register.",
          },
          {
            stepNumber: 3,
            actionTitle: "Review Risk Indicators",
            pageRoute: "/teacher/student-risk",
            instructions: "Check if any student has triggered an attendance pattern or high-risk alert.",
          },
        ],
      },
      {
        id: "workflow-referral-routine",
        title: "Submitting a Guidance Referral",
        summary: "How to refer a struggling learner for specialized intervention.",
        estimatedTime: "5 minutes",
        frequency: "As Needed",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Identify Student Needs",
            pageRoute: "/teacher/student-risk",
            instructions: "Review the student's risk factor breakdown and recent academic/attendance history.",
          },
          {
            stepNumber: 2,
            actionTitle: "Fill Referral Form",
            pageRoute: "/teacher/refer",
            instructions: "Select the student, choose primary referral categories, and detail your classroom observations.",
          },
          {
            stepNumber: 3,
            actionTitle: "Monitor Referral Status",
            pageRoute: "/teacher/refer",
            instructions: "Check back to see when the counselor accepts the referral into an active intervention plan.",
          },
        ],
      },
    ],
    aiAndAlgorithmNotes: [
      {
        title: "How Risk Scores Help Teachers",
        content:
          "Risk scores aggregate complex data (grades, attendance, trends) into an easy-to-read metric, helping you spot subtle academic decline before report card time.",
      },
      {
        title: "Human in the Loop",
        content:
          "The system never assigns grades, never issues disciplinary actions, and never labels a student. It only surfaces data so you can apply your professional pedagogical judgment.",
      },
    ],
  },

  counselor: {
    role: "counselor",
    roleDisplayName: "Guidance Counselor",
    roleDescription:
      "The clinical and intervention hub of the AEM system. Counselors manage the student support caseload, craft tailored intervention plans with AI assistance, evaluate teacher referrals, resolve pattern alerts, and simulate hypothetical risk scenarios.",
    primaryFocus: "Intervention lifecycle management, case counseling, pattern resolution, and human decision-making",
    privacyScope:
      "Full access to clinical counseling notes, sensitive context, and comprehensive school-wide student histories.",
    quickStats: [
      { label: "Caseload Scope", value: "School-wide (All Students)" },
      { label: "AI Capability", value: "Generative Recommendation Drafts" },
      { label: "Sensitive Data", value: "Full Counseling Notes Access" },
      { label: "Intervention Ownership", value: "Lifecycle & Revision Authority" },
    ],
    tourSteps: [
      {
        id: "counselor-welcome",
        route: "/counselor",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Counselor Command Center Header",
        title: "Welcome — Guidance Counselor Hub",
        badge: "Orientation",
        content:
          "Your clinical intervention hub for triaging at-risk caseloads, authoring personalized support plans with AI assistance, evaluating teacher referrals, and testing risk scenarios.",
        actionHint: "Daily routine: check caseload risk shifts, triage incoming referrals, and monitor active plans.",
        processFlowSteps: [
          "1. Triage High Risk students in the Caseload",
          "2. Process incoming Teacher Referrals",
          "3. Author personalized intervention plans",
          "4. Review session logs and adjust strategies",
        ],
        elements: [
          "Caseload summary — High Risk count & pending referrals",
          "Sidebar navigation — quick access to counselor tools",
          "Notification bell — alerts for new teacher referrals",
          "Guide & Tour button — relaunch this tour anytime",
        ],
        placement: "center",
        icon: "sparkle",
      },
      {
        id: "counselor-caseload",
        route: "/counselor/caseload",
        targetSelector: "main table, main",
        targetElementName: "Student Caseload Master Roster",
        title: "Caseload Dashboard — Triaging At-Risk Students",
        badge: "Caseload (/counselor/caseload)",
        content:
          "Triage at-risk students ranked by risk severity. High Risk students (≥70) appear at the top in red. Filter by grade or section to focus on urgent cases.",
        actionHint: "Click any student row to open their 360° Counseling Profile.",
        processFlowSteps: [
          "1. Filter caseload by [HIGH RISK]",
          "2. Inspect 360° profile (academic, attendance, confidential notes)",
          "3. Click [Create Plan] to start a targeted intervention",
        ],
        elements: [
          "Risk filters — All, High, Moderate, Low",
          "Section / Grade dropdowns — narrow caseload scope",
          "Student row — risk score, trend, active plan tag",
          "Active Plan badge — existing intervention indicator",
        ],
        placement: "bottom",
        icon: "users",
      },
      {
        id: "counselor-interventions",
        route: "/counselor/interventions",
        targetSelector: '[data-tour="new-intervention-btn"]',
        targetElementName: "[+ New Intervention] Button",
        title: "Intervention Manager — Starting a Support Plan",
        badge: "Interventions (/counselor/interventions)",
        content:
          "Manage active support plans, principal review queues, and AI drafts. Click '+ New Intervention' to start the 4-step builder for an individual or group.",
        actionHint: "Click '+ New Intervention' to open the intervention builder form.",
        modalExplanation:
          "Supports 4 scopes: Individual (activates immediately), Section (routes to Principal for approval), Grade Level, or School-wide.",
        processFlowSteps: [
          "1. Click [+ New Intervention] in the header",
          "2. Choose Scope (Individual, Section, Grade, School)",
          "3. Select student, schedule, and accommodations",
          "4. Generate AI draft and assign teacher tasks",
        ],
        elements: [
          "+ New Intervention — opens 4-step builder",
          "Active Plans card — currently monitored plans",
          "Pending Review — plans awaiting Principal sign-off",
          "AI Recommendations tab — automated pattern drafts",
        ],
        placement: "bottom",
        icon: "brain",
      },
      {
        id: "counselor-create-plan-step1",
        route: "/counselor/interventions",
        targetSelector: '[data-tour="interventions-tabs"], main',
        targetElementName: "Intervention Workspace Tabs",
        title: "Intervention Hub — Tabs & AI Recommendations",
        badge: "Process Flow — Tabs & Insights",
        content:
          "Switch between 'All Interventions' (master table), 'AI Recommendations' (1-click drafts generated by pattern detection), and 'Outcomes' (longitudinal recovery rates).",
        actionHint: "Check the AI Recommendations tab weekly to instantiate system-suggested plans.",
        processFlowSteps: [
          "1. Click [AI Recommendations] tab",
          "2. Review pre-generated support drafts",
          "3. Click [Instantiate] to pre-fill the builder",
        ],
        elements: [
          "All Interventions tab — master plan table",
          "AI Recommendations tab — automated drafts",
          "Outcomes tab — stabilization & recovery metrics",
        ],
        placement: "bottom",
        icon: "brain",
      },
      {
        id: "counselor-referrals",
        route: "/counselor/referrals",
        targetSelector: '[data-tour="counselor-referrals-list"], main',
        targetElementName: "Incoming Teacher Referrals Queue",
        title: "Teacher Referral Queue — Reviewing Incoming Referrals",
        badge: "Referrals (/counselor/referrals)",
        content:
          "Review incoming teacher referrals with classroom observations, flagged categories, and urgency ratings. Accept into a new intervention plan or decline with notes.",
        actionHint: "Click 'Accept & create intervention' to prefill a new plan with the teacher's referral data.",
        modalExplanation:
          "Accepting a referral links the new plan to the teacher's referral record and sends an immediate notification.",
        processFlowSteps: [
          "1. Review teacher observations & suggested support",
          "2. Click [Accept & create intervention]",
          "3. Or click [Decline] with constructive notes",
        ],
        elements: [
          "Referral card — student, teacher, categories",
          "Accept button — launches builder prefilled",
          "Decline button — opens feedback textarea",
        ],
        placement: "bottom",
        icon: "layout",
      },
      {
        id: "counselor-patterns",
        route: "/counselor/patterns",
        targetSelector: "main",
        targetElementName: "Automated Pattern Trigger Inbox",
        title: "Pattern Inbox — Investigating Systemic Anomalies",
        badge: "Rule Triggers (/counselor/patterns)",
        content:
          "Triage rule-triggered alerts across 8 behavioral/academic patterns (e.g. Chronic Absenteeism, Sharp Grade Drop). Attach to intervention plans or dismiss with justification.",
        actionHint: "Chronic Absenteeism and Multi-Subject Grade Drops are top priority.",
        processFlowSteps: [
          "1. Review pattern alerts sorted by severity",
          "2. Click [Create Intervention] for group plans",
          "3. Or click [Dismiss with Note] if handled",
        ],
        elements: [
          "Alert list — sorted by detection date & severity",
          "Rule badge — identifies triggered rule detector",
          "Affected students — learners triggering the pattern",
          "Create Intervention — start targeted plan",
        ],
        placement: "bottom",
        icon: "bell",
      },
      {
        id: "counselor-what-if",
        route: "/counselor/what-if",
        targetSelector: "main",
        targetElementName: "Interactive Risk Sandbox Simulator",
        title: "What-If Simulator — Testing Scenarios Before Acting",
        badge: "AI Simulator (/counselor/what-if)",
        content:
          "Simulate hypothetical grade and attendance adjustments to preview real-time risk score changes. Use this to set realistic, impactful intervention target metrics.",
        actionHint: "Test scenarios before finalizing student goals.",
        processFlowSteps: [
          "1. Select any student from caseload",
          "2. Adjust hypothetical factor sliders",
          "3. Observe real-time predicted score shifts",
        ],
        elements: [
          "Student selector — choose student to simulate",
          "Factor sliders — adjust Grades, Attendance, Behavior",
          "Simulated score — real-time predicted outcome",
          "Reset button — restores actual student values",
        ],
        placement: "bottom",
        icon: "chart",
      },
      {
        id: "counselor-feedback",
        route: "/counselor/feedback",
        targetSelector: "main",
        targetElementName: "Teacher Feedback Stream & Revision Queue",
        title: "Teacher Feedback Queue — Reviewing Session Logs & Notes",
        badge: "Feedback Loops (/counselor/feedback)",
        content:
          "Monitor teacher-submitted session logs, student responsiveness ratings, and formal plan revision requests to evaluate whether interventions are working.",
        actionHint: "Check daily to respond to teacher revision flags.",
        processFlowSteps: [
          "1. Read teacher session logs & ratings",
          "2. Check for highlighted Revision Requests",
          "3. Revise goals/tasks or mark plan complete",
        ],
        elements: [
          "Feedback stream — logs sorted by submission date",
          "Session log — date, duration, responsiveness",
          "Observation note — qualitative teacher remarks",
          "Revision alert — highlighted adjustment requests",
        ],
        placement: "bottom",
        icon: "check",
      },
      {
        id: "counselor-reports",
        route: "/reports",
        targetSelector: "main",
        targetElementName: "Guidance & Intervention CSV Reports",
        title: "Guidance Reports — Exporting Outcome & Compliance Data",
        badge: "Reporting (/reports)",
        content:
          "Download quarterly counseling outcome reports, recovery rates, caseload distribution summaries, and referral processing time metrics for DepEd compliance.",
        actionHint: "Export Intervention Outcomes at the end of each quarter for your guidance portfolio.",
        processFlowSteps: [
          "1. Choose counseling report type",
          "2. Select quarter or custom date range",
          "3. Click [Download CSV] to export",
        ],
        elements: [
          "Report type — choose counseling report",
          "Date picker — filter by quarter or term",
          "Download CSV — export spreadsheet file",
        ],
        placement: "bottom",
        icon: "book",
      },
      {
        id: "counselor-finish",
        route: "/counselor",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Guidance Counselor Command Center",
        title: "Tour Complete — Guidance Hub Ready! 🎉",
        badge: "All Done",
        content:
          "You've completed the Counselor tour! You now know how to triage caseloads, author plans, process referrals, resolve pattern alerts, and review teacher logs.",
        actionHint: "Start your day by checking the Caseload for new High Risk alerts or pending referrals.",
        elements: [
          "Guide & Tour button — relaunch this tour anytime",
          "Help & Guides — opens the written manual",
        ],
        placement: "center",
        icon: "sparkle",
      },
    ],
    features: [
      {
        id: "counselor-caseload-feat",
        title: "Caseload Dashboard & Urgency Triage",
        route: "/counselor/caseload",
        category: "Caseload Management",
        badge: "Priority Triage",
        summary:
          "Centralized dashboard displaying all students requiring guidance attention, categorized by risk severity, active intervention status, and recent signal changes.",
        whatYouCanDo: [
          "Triage students by High Risk (>=70) and Moderate Risk (40-69).",
          "Filter by grade level, section, attendance velocity, and intervention status.",
          "Access full student profiles including confidential counseling notes.",
          "Initiate rapid intervention creation for urgent cases.",
        ],
        keyFunctions: [
          {
            name: "Urgency Sorting",
            description: "Instantly sort caseload by highest risk score, steepest grade drop, or highest absence rate.",
          },
          {
            name: "Student 360 Profile",
            description: "Deep dive into longitudinal grades, attendance logs, behavioral history, and clinical notes.",
          },
        ],
        privacyAndScope: "Counselors have full institutional scope and can view confidential counseling disclosures.",
        tips: [
          "Review the caseload weekly to track whether students on active plans are demonstrating score improvements.",
        ],
      },
      {
        id: "counselor-interventions-feat",
        title: "Intervention Builder & AI Recommendation Studio",
        route: "/counselor/interventions",
        category: "Intervention Planning",
        badge: "AI-Assisted Planning",
        summary:
          "Comprehensive builder for authoring, modifying, and tracking multi-tiered intervention plans (Individual, Section, Grade, School-wide) with optional Gemini AI drafting assistance.",
        whatYouCanDo: [
          "Create Individual student plans or broader Section/Grade/School-wide initiatives.",
          "Use AI Drafting to generate evidence-based intervention strategies from student risk factors.",
          "Specify measurable target metrics (e.g. 'Raise Math grade to >=78', 'Attendance >=92%').",
          "Assign responsible teachers, counselors, and administrators with target completion dates.",
          "Submit Section/Grade/School-wide plans to the Principal for formal approval.",
        ],
        keyFunctions: [
          {
            name: "AI Draft Generator",
            description: "Produces natural-language intervention descriptions, rationales, and action steps tailored to student factors.",
          },
          {
            name: "Scope Selector",
            description: "Choose Individual (auto-active), Section, Grade Level, or School-wide (requires Principal approval).",
          },
          {
            name: "Outcome Evaluation",
            description: "Mark interventions as Completed, Successful, Partially Successful, or Ineffective with review notes.",
          },
        ],
        privacyAndScope: "Counselors can author sensitive clinical rationales; non-sensitive goals are shared with assigned teachers.",
        tips: [
          "Always review and edit AI drafts to ensure they reflect the student's unique personal circumstances.",
        ],
      },
      {
        id: "counselor-referrals-feat",
        title: "Teacher Referral Management",
        route: "/counselor/referrals",
        category: "Referral Processing",
        badge: "Teacher Collaboration",
        summary:
          "Workflow queue for evaluating student referrals submitted by classroom teachers.",
        whatYouCanDo: [
          "Review teacher observation notes, reported incident context, and attempted interventions.",
          "Accept Referral: Automatically opens the Intervention Builder pre-populated with referral data.",
          "Decline Referral: Provide professional reasoning shared back with the referring teacher.",
        ],
        keyFunctions: [
          {
            name: "Accept & Build Plan",
            description: "Converts teacher referral into a structured intervention plan.",
          },
          {
            name: "Decline with Note",
            description: "Sends constructive guidance to the teacher if classroom-level management is recommended.",
          },
        ],
        privacyAndScope: "Referral communication is private between referring teachers, counselors, and school leadership.",
        tips: [
          "Process referrals within 48 hours to maintain prompt student support responsiveness.",
        ],
      },
      {
        id: "counselor-patterns-feat",
        title: "Pattern Inbox & Rule Triggers",
        route: "/counselor/patterns",
        category: "Pattern Recognition",
        badge: "8 Rule Detectors",
        summary:
          "Automated detection center highlighting systemic anomalies across individual students, sections, and grade cohorts.",
        whatYouCanDo: [
          "Review triggers across 8 rule types: Chronic Absenteeism, Consecutive Absences, Sharp Grade Drop, Multi-Subject Failing, High Absence with Passing Grades, Subject Discrepancy, Section-Level Decline, and Grade-Wide Inequity.",
          "Inspect affected students, severity indicators, and rule trigger details.",
          "Acknowledge, link to an intervention, or dismiss with documented reasoning.",
        ],
        keyFunctions: [
          {
            name: "Resolve Pattern",
            description: "Mark pattern as addressed by attaching it to a new or existing intervention plan.",
          },
          {
            name: "Dismiss Pattern",
            description: "Dismiss false alarms or pre-handled situations with required justification.",
          },
        ],
        privacyAndScope: "Patterns are calculated purely from objective attendance and grading records.",
        tips: [
          "Pay close attention to 'Subject Discrepancy' patterns—they often indicate localized classroom or curricular challenges rather than student inability.",
        ],
      },
      {
        id: "counselor-simulator-feat",
        title: "What-If Algorithmic Simulator",
        route: "/counselor/what-if",
        category: "AI Literacy & Simulation",
        badge: "Sandbox Testing",
        summary:
          "Interactive sandbox for testing hypothetical grade adjustments, attendance shifts, and behavioral changes to observe how the scoring algorithm responds.",
        whatYouCanDo: [
          "Slide grades, attendance percentages, and incident counts to simulate potential student trajectories.",
          "Observe instant recalculation of risk scores, risk bands, and triggered patterns.",
          "Deepen your literacy in how algorithmic thresholds behave under different scenarios.",
        ],
        keyFunctions: [
          {
            name: "Live Score Calculator",
            description: "Recalculates risk in real-time using the active institutional algorithm weights.",
          },
          {
            name: "Dimension Breakdown Visualizer",
            description: "Displays graphical bar charts showing point contributions from each factor.",
          },
        ],
        privacyAndScope: "Completely sandbox-based; zero changes are made to real student databases.",
        tips: [
          "Use the simulator to show parents during counseling sessions how improving attendance by 10% drastically lowers academic risk.",
        ],
      },
      {
        id: "counselor-feedback-feat",
        title: "Teacher Feedback Queue",
        route: "/counselor/feedback",
        category: "Intervention Collaboration",
        badge: "Feedback Loops",
        summary:
          "Inbox for processing teacher session logs, qualitative observation notes, and plan revision requests.",
        whatYouCanDo: [
          "Review recent support sessions conducted by classroom teachers.",
          "Read qualitative observations on student engagement and academic progress.",
          "Process revision requests by updating active intervention targets and strategies.",
        ],
        keyFunctions: [
          {
            name: "Acknowledge Note",
            description: "Marks teacher feedback as reviewed and archived in the student's longitudinal record.",
          },
          {
            name: "Modify Plan",
            description: "Direct link to edit the associated intervention plan based on teacher findings.",
          },
        ],
        privacyAndScope: "Builds a continuous collaborative loop between counseling and classroom instruction.",
        tips: [
          "Regular teacher feedback ensures intervention plans stay dynamically responsive to changing student realities.",
        ],
      },
    ],
    workflows: [
      {
        id: "workflow-referral-to-plan",
        title: "Processing Referral to Active Intervention",
        summary: "Standard workflow from receiving a teacher referral to launching an AI-assisted intervention plan.",
        estimatedTime: "10 - 15 minutes",
        frequency: "As Needed",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Review Teacher Referral",
            pageRoute: "/counselor/referrals",
            instructions: "Examine teacher observations and historical academic data for the referred student.",
          },
          {
            stepNumber: 2,
            actionTitle: "Accept and Launch Builder",
            pageRoute: "/counselor/referrals",
            instructions: "Click 'Accept Referral' to automatically transfer referral details into the Intervention Builder.",
          },
          {
            stepNumber: 3,
            actionTitle: "Generate AI Recommendation",
            pageRoute: "/counselor/interventions",
            instructions: "Use the AI Draft assistant to generate customized intervention strategies and review/refine them.",
          },
          {
            stepNumber: 4,
            actionTitle: "Assign Owners and Activate",
            pageRoute: "/counselor/interventions",
            instructions: "Set measurable targets, assign teacher roles, and activate the plan to start tracking progress.",
          },
        ],
      },
      {
        id: "workflow-pattern-triage",
        title: "Weekly Pattern Inbox Triage",
        summary: "Weekly review of systemic pattern alerts across grade cohorts.",
        estimatedTime: "15 minutes",
        frequency: "Weekly",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Open Pattern Inbox",
            pageRoute: "/counselor/patterns",
            instructions: "Filter patterns by severity and rule type to identify urgent systemic issues.",
          },
          {
            stepNumber: 2,
            actionTitle: "Investigate Triggered Cohort",
            pageRoute: "/counselor/patterns",
            instructions: "Inspect the list of affected learners and historical attendance/grade graphs.",
          },
          {
            stepNumber: 3,
            actionTitle: "Resolve or Dismiss",
            pageRoute: "/counselor/patterns",
            instructions: "Create a group-level intervention or dismiss with documented reasoning.",
          },
        ],
      },
    ],
    aiAndAlgorithmNotes: [
      {
        title: "Role of Generative AI in Counseling",
        content:
          "Gemini GenAI is exclusively used to draft natural-language intervention descriptions and synthesize teacher notes into professional summaries. It NEVER calculates risk scores or determines student outcomes.",
      },
      {
        title: "Confidentiality Safeguards",
        content:
          "Private therapeutic notes written by counselors are encrypted at rest and restricted exclusively to counselor logins. They are never displayed to teachers or administrators.",
      },
    ],
  },

  principal: {
    role: "principal",
    roleDisplayName: "School Principal / Head Administrator",
    roleDescription:
      "Provides executive oversight, policy compliance, bias monitoring, approval authority for large-scale interventions, and cohort-level longitudinal analytics across the entire school institution.",
    primaryFocus: "School-wide oversight, governance, intervention approvals, fairness monitoring, and cohort analysis",
    privacyScope:
      "Comprehensive school-wide academic and governance visibility. Private therapeutic counseling notes remain confidential.",
    quickStats: [
      { label: "Oversight Scope", value: "All Grades (7-10) & Staff" },
      { label: "Approval Authority", value: "Section, Grade & School-wide Plans" },
      { label: "Governance Metric", value: "Algorithmic Bias Monitoring" },
      { label: "Longitudinal Analytics", value: "Multi-Year Cohort Comparisons" },
    ],
    tourSteps: [
      {
        id: "principal-welcome",
        route: "/principal",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Principal Command Center Header",
        title: "Welcome — School Principal Oversight Hub",
        badge: "Executive Orientation",
        content:
          "Your executive command center for school-wide risk monitoring, intervention approvals, algorithmic fairness audits, and multi-year cohort analysis.",
        actionHint: "Daily priority: check the Approval Queue for pending counselor intervention proposals.",
        processFlowSteps: [
          "1. Inspect school-wide risk breakdown on the Dashboard",
          "2. Review and authorize pending Section/Grade proposals",
          "3. Audit demographic fairness in the Bias Monitor",
          "4. Track multi-year cohort recovery rates",
        ],
        elements: [
          "Overview dashboard — risk distribution & active interventions",
          "Sidebar navigation — direct access to all principal tools",
          "Notification bell — alerts for pending approval requests",
          "Guide & Tour button — relaunch this tour anytime",
        ],
        placement: "center",
        icon: "shield",
      },
      {
        id: "principal-dashboard",
        route: "/principal/dashboard",
        targetSelector: "main",
        targetElementName: "Executive Analytics & Section Heatmap",
        title: "School Dashboard — Executive Analytics & Bias Monitoring",
        badge: "Macro Analytics (/principal/dashboard)",
        content:
          "Monitor institutional risk distributions across Grade 7–10, pinpoint struggling classrooms via the section heatmap, and audit algorithmic fairness across student groups.",
        actionHint: "Inspect this weekly to catch sections with rising risk concentrations.",
        processFlowSteps: [
          "1. Check School-Wide Risk Band totals (High, Moderate, Low)",
          "2. Inspect Section Heatmap to spot struggling classrooms",
          "3. Review Bias Monitor for demographic parity",
        ],
        elements: [
          "Risk band cards — High / Moderate / Low student counts",
          "Grade breakdown chart — distribution per grade (7–10)",
          "Section Heatmap — risk concentration matrix",
          "Bias Monitor — Disparate Impact ratios by subgroup",
        ],
        placement: "bottom",
        icon: "chart",
      },
      {
        id: "principal-approvals",
        route: "/principal/approvals",
        targetSelector: '[data-tour="principal-approval-tabs"], main',
        targetElementName: "Intervention Approvals Workspace Tabs",
        title: "Intervention Approval Queue — Reviewing Counselor Proposals",
        badge: "Approvals (/principal/approvals)",
        content:
          "Review broader-scope intervention proposals (Section, Grade, School-wide) submitted by counselors. Verify objectives, resources, and assigned teachers before authorizing.",
        actionHint: "Review target metrics and resource feasibility before approving.",
        modalExplanation:
          "Approving immediately transitions status to ACTIVE and notifies all assigned teachers. Rejecting logs required revision notes for the counselor.",
        processFlowSteps: [
          "1. Switch to [Pending Approvals] tab to view submissions",
          "2. Inspect proposal scope, goals, and teacher tasks",
          "3. Click [Approve] to activate, or [Reject] with feedback",
        ],
        elements: [
          "Pending Approvals tab — proposals awaiting authorization",
          "Approved & History tab — archive of past plans",
          "Proposal card — scope, target group, and rationale",
        ],
        placement: "bottom",
        icon: "check",
      },
      {
        id: "principal-approve-process",
        route: "/principal/approvals",
        targetSelector: '[data-tour="principal-approval-actions"], main',
        targetElementName: "[Approve] & [Reject] Action Buttons",
        title: "Approving an Intervention — Action Buttons & Decision",
        badge: "Process Flow — Approval Decision",
        content:
          "Click 'Approve' for instant school-wide activation. Click 'Reject' to open the revision form and return the proposal with mandatory directives.",
        actionHint: "Rejections require written feedback recorded in the immutable audit log.",
        modalExplanation:
          "Clicking 'Reject' reveals a reason textarea. Once confirmed, the proposal is returned to the counselor's inbox.",
        processFlowSteps: [
          "1. Verify goals and teacher assignments",
          "2. Click [Approve] for immediate activation",
          "3. Or click [Reject] ➔ enter notes ➔ click [Confirm reject]",
        ],
        elements: [
          "Approve button — activates the plan immediately",
          "Reject button — opens the revision reason form",
          "Reason textarea — input executive revision directives",
        ],
        placement: "bottom",
        icon: "check",
      },
      {
        id: "principal-cohort-analysis",
        route: "/principal/cohort-analysis",
        targetSelector: "main",
        targetElementName: "Multi-Year Cohort Comparison Workspace",
        title: "Longitudinal Cohort Analysis — Multi-Year Trend Comparison",
        badge: "Cohort Drift (/principal/cohort-analysis)",
        content:
          "Compare student cohorts across academic years (e.g. Grade 9 across 2024–2026) to measure longitudinal recovery rates and verify school-wide intervention effectiveness.",
        actionHint: "Look for declining High Risk percentages year-over-year as evidence of institutional progress.",
        processFlowSteps: [
          "1. Select academic years to compare",
          "2. Filter by specific grade level",
          "3. Review Recovery Rate metrics (% improved)",
        ],
        elements: [
          "Cohort Year selector — pick academic years to compare",
          "Grade Level filter — isolate specific grades",
          "Risk Trend chart — yearly risk band trajectory",
          "Recovery Rate — % of High Risk students who improved",
        ],
        placement: "bottom",
        icon: "chart",
      },
      {
        id: "principal-students",
        route: "/principal/students",
        targetSelector: "main",
        targetElementName: "Student Master Oversight Directory",
        title: "Student Lookup — Executive Read-Only Directory",
        badge: "Student Lookup (/principal/students)",
        content:
          "Look up any student's academic history, attendance records, risk tier, and active support plans. Private counseling session notes remain confidential to the counselor.",
        actionHint: "Use for parent conferences or administrative evaluations.",
        processFlowSteps: [
          "1. Search student by name or 12-digit LRN",
          "2. Inspect quarterly grades across all subjects",
          "3. Check attendance rates and active support plans",
        ],
        elements: [
          "Search bar — find student by name or LRN",
          "Student card — current risk tier and section",
          "Grade history — quarterly grades across subjects",
          "Attendance summary — quarterly rates & absence counts",
        ],
        placement: "bottom",
        icon: "users",
      },
      {
        id: "principal-reports",
        route: "/reports",
        targetSelector: "main",
        targetElementName: "Institutional Compliance & SIP Exports",
        title: "Institutional Reports — DepEd Compliance & SIP Data",
        badge: "Reporting (/reports)",
        content:
          "Export school-wide CSV datasets for DepEd Division compliance, School Improvement Plan (SIP) documentation, and accreditation reviews.",
        actionHint: "Download quarterly for SIP documentation and division reporting.",
        processFlowSteps: [
          "1. Select report type (Risk Roster, Bias Summary, Outcomes)",
          "2. Choose academic year and scope",
          "3. Click [Download CSV] to export",
        ],
        elements: [
          "Report type selector — choose from institutional reports",
          "School Year filter — select academic year",
          "Download CSV button — generates instant file export",
        ],
        placement: "bottom",
        icon: "book",
      },
      {
        id: "principal-finish",
        route: "/principal",
        targetSelector: '[data-tour="workspace-hero"]',
        targetElementName: "Principal Command Center",
        title: "Tour Complete — Executive Hub Ready! 🎉",
        badge: "All Done",
        content:
          "You've completed the Principal workspace tour! You now know how to monitor school-wide risk, approve proposals, audit bias, and export compliance reports.",
        actionHint: "Start each day by checking the Approval Queue and School Dashboard.",
        elements: [
          "Guide & Tour button — relaunch this tour anytime",
          "Help & Guides — opens the written manual",
        ],
        placement: "center",
        icon: "sparkle",
      },
    ],

    features: [
      {
        id: "principal-dashboard-feat",
        title: "School Dashboard & Bias Monitoring",
        route: "/principal/dashboard",
        category: "Executive Analytics",
        badge: "Macro Analytics & Bias Checks",
        summary:
          "High-level institutional dashboard visualizing risk band breakdown across grade levels and sections, active intervention pipelines, and algorithmic fairness audits.",
        whatYouCanDo: [
          "Examine risk band percentages (Low, Moderate, High) across Grade 7, 8, 9, and 10.",
          "Identify specific sections with elevated failure or absenteeism rates via heatmap filters.",
          "Monitor Disparate Impact and Fairness metrics across gender and learner sub-groups.",
          "Track total active, completed, and pending intervention initiatives across the campus.",
        ],
        keyFunctions: [
          {
            name: "Section Risk Heatmap",
            description: "Visual matrix highlighting classroom sections requiring instructional support.",
          },
          {
            name: "Algorithmic Bias Monitor",
            description: "Checks that prediction rates do not unfairly skew across demographic subgroups.",
          },
          {
            name: "Intervention Pipeline Tracker",
            description: "Real-time tally of plans in Draft, Pending Approval, Active, and Completed states.",
          },
        ],
        privacyAndScope: "Institutional summary metrics; protects individual student clinical counseling notes.",
        tips: [
          "Use the Section Risk Heatmap to allocate remedial teaching resources to sections facing high academic pressure.",
        ],
      },
      {
        id: "principal-approvals-feat",
        title: "Intervention Approval Queue",
        route: "/principal/approvals",
        category: "Governance & Approvals",
        badge: "Approval Authority",
        summary:
          "Executive review station for approving, amending, or returning multi-student intervention proposals submitted by the Guidance Office.",
        whatYouCanDo: [
          "Review proposed Section, Grade Level, and School-wide intervention plans.",
          "Inspect target objectives, allocated school resources, and assigned personnel responsibilities.",
          "Approve proposals to immediately activate plans, or return proposals with specific revision remarks.",
        ],
        keyFunctions: [
          {
            name: "Approve Intervention",
            description: "Officially authorizes execution and triggers notifications to assigned faculty.",
          },
          {
            name: "Request Revision",
            description: "Sends proposal back to Counselor with executive feedback on resource allocation.",
          },
        ],
        privacyAndScope: "Executive oversight ensures school resource alignment and policy compliance.",
        tips: [
          "Verify that proposed grade-wide interventions have measurable success criteria and realistic timeline targets.",
        ],
      },
      {
        id: "principal-cohort-feat",
        title: "Longitudinal Cohort Analysis",
        route: "/principal/cohort-analysis",
        category: "Institutional Research",
        badge: "Multi-Year Insights",
        summary:
          "Compare identical grade levels across consecutive academic years to identify long-term curriculum efficacy and retention trends.",
        whatYouCanDo: [
          "Compare Grade 7 through Grade 10 performance across SY 2024-2025, SY 2025-2026, and SY 2026-2027.",
          "Analyze whether school-wide interventions reduced the percentage of High-Risk learners over time.",
          "Evaluate year-over-year attendance drift and subject-specific passing rates.",
          "Export multi-year comparison charts and CSV datasets for DepEd Division reviews.",
        ],
        keyFunctions: [
          {
            name: "Year-over-Year Comparison Table",
            description: "Direct side-by-side metric comparison across academic cycles.",
          },
          {
            name: "Intervention Outcome Differential",
            description: "Measures the academic recovery rate of students who received structured interventions.",
          },
        ],
        privacyAndScope: "Aggregated cohort analytics suitable for institutional presentation and strategic planning.",
        tips: [
          "Incorporate cohort analysis findings into the annual School Improvement Plan (SIP).",
        ],
      },
      {
        id: "principal-students-feat",
        title: "Student Master Oversight",
        route: "/principal/students",
        category: "Student Directory",
        badge: "Read-Only Records",
        summary:
          "Institution-wide student lookup allowing the Principal to inspect academic performance, attendance records, and intervention participation for any learner.",
        whatYouCanDo: [
          "Search all 500+ enrolled students across grades and sections.",
          "Review historical quarterly grades and daily attendance trends.",
          "Inspect active intervention plan status and teacher session logs.",
        ],
        keyFunctions: [
          {
            name: "Student 360 Oversight",
            description: "Complete academic snapshot with full transparency into risk factors.",
          },
        ],
        privacyAndScope: "Full academic visibility; confidential counseling session discussions remain sealed in accordance with counseling ethics.",
        tips: ["Use during parent consultations to provide complete, data-backed academic overviews."],
      },
      {
        id: "principal-reports-feat",
        title: "Institutional Reports & Compliance Extracts",
        route: "/reports",
        category: "Institutional Reporting",
        badge: "CSV Downloads",
        summary:
          "Executive export center for downloading school-wide risk rosters, intervention outcomes, attendance registries, and bias audits.",
        whatYouCanDo: [
          "Download comprehensive school risk rosters with factor breakdowns.",
          "Export completed intervention outcome reports showing success and partial success rates.",
          "Extract governance and audit summaries for division monitoring.",
        ],
        keyFunctions: [
          {
            name: "School-Wide CSV Export",
            description: "One-click generation of institutional datasets.",
          },
        ],
        privacyAndScope: "Contains all institution-wide academic metrics; excludes private counseling notes.",
        tips: ["Export intervention outcome reports at the end of each grading quarter for executive review."],
      },
    ],
    workflows: [
      {
        id: "workflow-principal-approvals",
        title: "Intervention Proposal Review Workflow",
        summary: "Executive process for reviewing and authorizing counselor intervention plans.",
        estimatedTime: "5 - 10 minutes",
        frequency: "As Needed",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Check Pending Approvals",
            pageRoute: "/principal/approvals",
            instructions: "Open the Approval Queue to view submitted Section, Grade, or School-wide proposals.",
          },
          {
            stepNumber: 2,
            actionTitle: "Inspect Goals and Resources",
            pageRoute: "/principal/approvals",
            instructions: "Review the proposed action steps, assigned faculty, and measurable target criteria.",
          },
          {
            stepNumber: 3,
            actionTitle: "Authorize or Return",
            pageRoute: "/principal/approvals",
            instructions: "Click Approve to activate the intervention, or Return with feedback for needed adjustments.",
          },
        ],
      },
      {
        id: "workflow-principal-bias-check",
        title: "Quarterly Algorithmic Governance Audit",
        summary: "Routine check of algorithmic fairness and cohort health.",
        estimatedTime: "15 minutes",
        frequency: "Quarterly",
        steps: [
          {
            stepNumber: 1,
            actionTitle: "Review School Dashboard",
            pageRoute: "/principal/dashboard",
            instructions: "Analyze overall risk distribution across grade levels and sections.",
          },
          {
            stepNumber: 2,
            actionTitle: "Check Bias Monitoring Widget",
            pageRoute: "/principal/dashboard",
            instructions: "Ensure risk prediction ratios remain balanced across gender and learner demographics.",
          },
          {
            stepNumber: 3,
            actionTitle: "Compare Cohort Progression",
            pageRoute: "/principal/cohort-analysis",
            instructions: "Evaluate year-over-year recovery rates for students on active interventions.",
          },
        ],
      },
    ],
    aiAndAlgorithmNotes: [
      {
        title: "Algorithmic Governance and Oversight",
        content:
          "The Principal oversees the balance between predictive automation and human judgment. All broad-scale interventions require executive sign-off, ensuring institutional accountability.",
      },
      {
        title: "Fairness and Non-Discrimination",
        content:
          "The system continuously audits predictions to ensure no demographic or socio-economic group is disproportionately flagged, maintaining DepEd child protection and equity standards.",
      },
    ],
  },
};
