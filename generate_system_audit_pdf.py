import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx2pdf import convert

def build_audit_document():
    print("Generating WalkTrace System Flow & Status Audit Document...")
    doc = docx.Document()

    # 1. Page Margins
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)
        s.page_width = Inches(8.5)
        s.page_height = Inches(11.0)

    # 2. Palette
    COLOR_NAVY = RGBColor(26, 75, 117)     # #1A4B75 Header Navy
    COLOR_DARK = RGBColor(15, 23, 42)      # #0F172A Body
    COLOR_MUTED = RGBColor(71, 85, 105)    # #475569 Captions
    COLOR_GREEN = RGBColor(16, 185, 129)   # #10B981 Dynamic
    COLOR_AMBER = RGBColor(217, 119, 6)    # #D97706 Static/Mock
    HEX_HEADER_BG = "1A4B75"
    HEX_LIGHT_ROW = "F8FAFC"
    HEX_BORDER = "CBD5E1"
    HEX_CODE_BG = "F1F5F9"
    HEX_DYNAMIC_BG = "ECFDF5"
    HEX_STATIC_BG = "FFFBEB"

    # Helpers
    def set_cell_shading(cell, color_hex):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=120, right=120):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_table_borders(table, color="CCCCCC"):
        tblPr = table._tbl.tblPr
        tblBorders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>\n'
            f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color}"/>\n'
            f'  <w:left w:val="none"/>\n'
            f'  <w:right w:val="none"/>\n'
            f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>\n'
            f'  <w:insideV w:val="none"/>\n'
            f'</w:tblBorders>'
        )
        tblPr.append(tblBorders)

    def add_para(text="", align=WD_ALIGN_PARAGRAPH.LEFT, bold=False, italic=False, 
                 size=10.5, color=COLOR_DARK, space_before=0, space_after=6):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if text:
            r = p.add_run(text)
            r.bold = bold
            r.italic = italic
            r.font.size = Pt(size)
            r.font.color.rgb = color
            r.font.name = "Times New Roman"
        return p

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(15)
        r.font.color.rgb = COLOR_NAVY
        r.font.name = "Times New Roman"
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(13)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(12)
        r.font.color.rgb = COLOR_NAVY
        r.font.name = "Times New Roman"
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = COLOR_DARK
        r.font.name = "Times New Roman"
        return p

    def add_bullet(bold_prefix="", text=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r1 = p.add_run(bold_prefix + ": ")
            r1.bold = True
            r1.font.size = Pt(10)
            r1.font.color.rgb = COLOR_DARK
            r1.font.name = "Times New Roman"
        if text:
            r2 = p.add_run(text)
            r2.font.size = Pt(10)
            r2.font.color.rgb = COLOR_DARK
            r2.font.name = "Times New Roman"
        return p

    def add_table_data(headers, rows, col_widths=None, align_right_cols=[]):
        table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        set_table_borders(table, color="D1D5DB")

        hdr_cells = table.rows[0].cells
        for i, title in enumerate(headers):
            hdr_cells[i].text = ""
            set_cell_shading(hdr_cells[i], HEX_HEADER_BG)
            set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i in align_right_cols else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(title)
            r.bold = True
            r.font.size = Pt(9.0)
            r.font.color.rgb = RGBColor(255, 255, 255)
            r.font.name = "Times New Roman"

        for r_idx, row_data in enumerate(rows):
            row_cells = table.rows[r_idx + 1].cells
            shd_color = HEX_LIGHT_ROW if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row_data):
                row_cells[c_idx].text = ""
                set_cell_shading(row_cells[c_idx], shd_color)
                set_cell_margins(row_cells[c_idx], top=70, bottom=70, left=100, right=100)
                p = row_cells[c_idx].paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx in align_right_cols else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(str(val))
                r.font.size = Pt(8.5)
                # Color code Dynamic vs Static badges if applicable
                if str(val) == "LIVE / DYNAMIC":
                    r.bold = True
                    r.font.color.rgb = COLOR_GREEN
                elif str(val) == "STATIC / MOCK":
                    r.bold = True
                    r.font.color.rgb = COLOR_AMBER
                else:
                    r.font.color.rgb = COLOR_DARK
                r.font.name = "Times New Roman"

        if col_widths:
            for row in table.rows:
                for c_idx, w in enumerate(col_widths):
                    row.cells[c_idx].width = Inches(w)

        p_sp = doc.add_paragraph()
        p_sp.paragraph_format.space_before = Pt(2)
        p_sp.paragraph_format.space_after = Pt(6)
        return table

    # ==========================================
    # TITLE & HEADER
    # ==========================================
    add_para("WALKTRACE PLATFORM ARCHITECTURE & AUDIT REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=18, color=COLOR_NAVY, space_before=10, space_after=4)
    add_para("End-to-End System Flow, Dynamic vs. Static Functionality Audit, and AWS Data Store Architecture", 
             align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=11, color=COLOR_MUTED, space_after=18)
    
    add_para("Project: WalkTrace (AI-Powered Gait Surveillance & Identification)\nAcademic Term: PPD-II (7th Sem B.Tech CSE), November 2026\nAWS Account: 605134459334 | Region: us-east-1", 
             align=WD_ALIGN_PARAGRAPH.CENTER, size=9.5, color=COLOR_DARK, space_after=18)

    # ==========================================
    # SECTION 1: END-TO-END SYSTEM FLOW
    # ==========================================
    add_heading_1("1. End-to-End System Flow Architecture")
    add_para("WalkTrace operates across four decoupled architectural layers: the Web Presentation Client, the Cloud API Gateway & Lambda Serverless Compute Tier, the Asynchronous Storage & Message Queue Tier, and the Python PyTorch Neural Inference Engine.")
    
    add_heading_2("Step-by-Step Operational Workflow:")
    add_bullet("Step 1: User Authentication & Session Establishment", 
               "The security operator accesses WalkTrace. If unauthenticated, access to the command dashboard is restricted. The operator signs in or registers via AWS Cognito SRP protocol. Cognito sends an email OTP verification code. Upon validation, Cognito issues RSA-256 signed JWT IdTokens and AccessTokens stored in the browser's localStorage.")
    add_bullet("Step 2: Operations Dashboard Telemetry Initialization", 
               "The React SPA loads and issues a GET /dashboard/overview request to Amazon API Gateway (https://dhxv2f51l1.execute-api.us-east-1.amazonaws.com/dev). The Lambda function validates the Bearer token, aggregates active camera stats, 24-hour tracklet counts, and enrolled gallery profile totals from DynamoDB, returning live telemetry.")
    add_bullet("Step 3: Surveillance Video Ingestion via Presigned S3 URLs", 
               "In the Gait Analysis workspace, the operator uploads recorded surveillance footage (MP4/AVI). To bypass API Gateway's 10 MB payload ceiling and Lambda memory limits, the browser calls POST /videos/upload-url. Lambda generates a 15-minute Amazon S3 presigned PUT URL. The browser streams the video binary directly into s3://gaitvision-storage-dev/raw-videos/.")
    add_bullet("Step 4: Upload Confirmation & Asynchronous Job Queuing", 
               "Once the direct S3 upload returns HTTP 200, the client calls POST /videos/complete-upload to register the video record in DynamoDB. The operator initiates analysis via POST /analysis. The Lambda handler writes an ANALYSIS# job record with status 'QUEUED' and dispatches a JSON task payload to the Amazon SQS queue (gaitvision-jobs-queue-dev).")
    add_bullet("Step 5: PyTorch Neural Worker Processing Cycle", 
               "The standalone Python AI Worker daemon (ai_service/worker.py) long-polls the SQS queue. Upon receiving the job message: (a) It atomically updates DynamoDB job status to 'PROCESSING' (50% progress); (b) It loads the GaitBase-v1 neural network; (c) It extracts normalized 64x64 silhouette sequences across the walking cycle; (d) It executes temporal pooling and Horizontal Pyramid Pooling (HPP) across 31 strips; (e) It projects a 256-D L2-normalized biometric embedding vector.")
    add_bullet("Step 6: Metric Gallery Matching & Event Persistence", 
               "The worker computes pairwise Euclidean distances between the probe vector and enrolled reference vectors in DynamoDB. It calculates percentage similarity scores, commits candidate match rankings to DynamoDB under ANALYSIS# results, writes a surveillance alert under EVENT#, updates job status to 'COMPLETED' (100% progress), and removes the message from SQS.")
    add_bullet("Step 7: Operator Results Presentation & Profile Enrollment", 
               "The frontend queries GET /analysis/{id}/results, dynamically displaying the top candidate matches (Rank 1, 2, 3), similarity percentages, distance metrics, and enrolled conditions. In the People Profiles workspace, operators can register new reference subjects directly into DynamoDB.")

    # ==========================================
    # SECTION 2: DYNAMIC VS STATIC AUDIT
    # ==========================================
    add_heading_1("2. Dynamic vs. Static Functionality Audit")
    add_para("The following table provides an honest, rigorous audit of every subsystem and UI feature across WalkTrace, explicitly classifying whether it operates dynamically against live cloud backends or remains static/simulated.")

    audit_headers = ["Subsystem / Workspace", "Specific Feature / Component", "Execution Mode", "Underlying Architecture & Real Data Mechanism"]
    audit_rows = [
        ["User Authentication", "User Registration (Sign Up)", "LIVE / DYNAMIC", "AWS Cognito User Pool (us-east-1_fLyGM6BsL); sends real OTP to user email."],
        ["User Authentication", "Email OTP Verification", "LIVE / DYNAMIC", "AWS Cognito confirmRegistration API validates real 6-digit email code."],
        ["User Authentication", "Resend OTP Code", "LIVE / DYNAMIC", "AWS Cognito resendConfirmationCode dispatches fresh OTP to user inbox."],
        ["User Authentication", "User Sign In (Authentication)", "LIVE / DYNAMIC", "AWS Cognito SRP protocol authentication; issues real JWT IdToken & AccessToken."],
        ["User Authentication", "Protected Route Guarding", "LIVE / DYNAMIC", "Unauthenticated visitors are blocked from dashboard and redirected to login."],
        ["API & Backend Security", "Bearer JWT Token Verification", "LIVE / DYNAMIC", "Lambda auth middleware validates RSA-256 signature against Cognito JWKS."],
        ["API & Backend Security", "Role-Based Access Control (RBAC)", "LIVE / DYNAMIC", "Lambda enforces roles; 'Viewer' is blocked from uploading, 'Investigator' allowed."],
        ["Overview Dashboard", "Active Telemetry Metrics", "LIVE / DYNAMIC", "Fetched via GET /dashboard/overview from API Gateway Lambda."],
        ["Overview Dashboard", "Enrolled Profiles Counter", "LIVE / DYNAMIC", "Dynamically counts real enrolled subject items in DynamoDB table."],
        ["Overview Dashboard", "Live Triage Cameras Preview", "STATIC / MOCK", "Displays sample CCTV stills (landing-surveillance.png) and mock metadata."],
        ["Overview Dashboard", "Surveillance Feed Stream", "STATIC / MOCK", "Renders sample event log stream (live polling of GET /events not hooked to UI)."],
        ["Live Monitor Matrix", "8-Camera Surveillance Matrix", "STATIC / MOCK", "Renders 8 camera cards with simulated FPS and static background images."],
        ["Live Monitor Matrix", "Zone Filtering & Bounding Boxes", "LIVE / DYNAMIC", "Client-side interactive state toggles bounding box overlays and zone filters."],
        ["Gait Analysis", "S3 Presigned Upload Negotiation", "LIVE / DYNAMIC", "POST /videos/upload-url calls AWS SDK v3 S3 Presigner to generate live PUT URL."],
        ["Gait Analysis", "Direct Browser-to-S3 Video Upload", "LIVE / DYNAMIC", "Browser streams raw MP4/AVI binary directly into S3 bucket (HTTP 200)."],
        ["Gait Analysis", "DynamoDB Video Registration", "LIVE / DYNAMIC", "POST /videos/complete-upload persists video metadata record in DynamoDB."],
        ["Gait Analysis", "SQS Analysis Job Enqueuing", "LIVE / DYNAMIC", "POST /analysis writes job to DynamoDB and dispatches JSON message to SQS FIFO."],
        ["Gait Analysis", "PyTorch AI Inference Pipeline", "LIVE / DYNAMIC", "ai_service/worker.py polls SQS, runs GaitBase, outputs 256D normalized embedding."],
        ["Gait Analysis", "Biometric Candidate Match Results", "LIVE / DYNAMIC", "GET /analysis/{id}/results retrieves real distance metrics from DynamoDB."],
        ["Gait Analysis", "Silhouette Stream Preview Box", "STATIC / MOCK", "Displays sample emoji/icon sequence frames as silhouette visual representation."],
        ["People Profiles", "Enrolled Identity Directory Table", "LIVE / DYNAMIC", "GET /profiles fetches live enrolled subject records from DynamoDB."],
        ["People Profiles", "Search & Department Filtering", "LIVE / DYNAMIC", "Real-time client-side search across Subject IDs, names, and department tags."],
        ["People Profiles", "In-Browser Subject Enrollment", "LIVE / DYNAMIC", "Modal form submits POST /profiles, atomically creating PROFILE# in DynamoDB."],
        ["Settings Workspace", "AWS Infrastructure Telemetry", "LIVE / DYNAMIC", "Displays active API Gateway URL, User Pool ID, DynamoDB table, S3 bucket."],
        ["Settings Workspace", "Operator Session Identity", "LIVE / DYNAMIC", "Dynamically renders authenticated Cognito email, IAM role, and JWT status."]
    ]
    add_table_data(audit_headers, audit_rows, col_widths=[1.4, 2.0, 1.4, 2.7])

    # ==========================================
    # SECTION 3: DATABASE & TABLE ARCHITECTURE
    # ==========================================
    add_heading_1("3. Database Architecture & Table Specifications")
    add_para("WalkTrace utilizes an Amazon DynamoDB Single-Table Design pattern to eliminate relational JOIN overhead, ensuring sub-10 millisecond query performance at enterprise surveillance scale.")
    
    add_heading_2("DynamoDB Table Specifications:")
    add_bullet("Database Name / Table Name", "gaitvision-main-dev")
    add_bullet("AWS Cloud Service", "Amazon DynamoDB (Fully Managed NoSQL)")
    add_bullet("AWS Region", "us-east-1 (US East - N. Virginia)")
    add_bullet("Capacity Billing Mode", "PAY_PER_REQUEST (On-Demand capacity)")
    add_bullet("Encryption at Rest", "Enabled (AWS KMS Managed Key)")
    add_bullet("Table Status", "ACTIVE")

    add_heading_2("Primary Key Schema:")
    add_bullet("Partition Key (PK)", "String (HASH) — Identifies the entity collection (e.g., USER#<id>, VIDEO#<id>, ANALYSIS#<id>, PROFILE#<id>, EVENT#<id>).")
    add_bullet("Sort Key (SK)", "String (RANGE) — Qualifies the specific record attribute (e.g., METADATA, JOB, RESULTS, DETAILS).")

    add_heading_2("Global Secondary Index (GSI):")
    add_bullet("Index Name", "GSI1")
    add_bullet("Index Partition Key (GSI1PK)", "String (HASH) — Categorical partition identifier (e.g., VIDEOS, ANALYSIS_JOBS, PROFILES, EVENTS).")
    add_bullet("Index Sort Key (GSI1SK)", "String (RANGE) — ISO-8601 Timestamp (e.g., 2026-11-14T19:27:49Z) enabling reverse-chronological range queries.")
    add_bullet("Index Projection", "ALL attributes projected.")

    add_heading_2("Logical Entities & Stored Schema Layout:")

    db_entity_headers = ["Entity Type", "PK Pattern", "SK Pattern", "GSI1PK / GSI1SK", "Stored Attributes & Payloads"]
    db_entity_rows = [
        ["User Profile", "USER#{userId}", "METADATA", "USERS\n{createdAt}", "userId, email, name, role (Admin/Investigator/Viewer), status, createdAt."],
        ["Surveillance Video", "VIDEO#{videoId}", "METADATA", "VIDEOS\n{createdAt}", "videoId, userId, userEmail, s3Key, fileName, fileSize, duration, uploadStatus, createdAt."],
        ["Analysis Job", "ANALYSIS#{analysisId}", "JOB", "ANALYSIS_JOBS\n{createdAt}", "analysisId, videoId, userId, modelId, selectedTrackId, status (QUEUED/PROCESSING/COMPLETED), progress, createdAt, completedAt."],
        ["Biometric Results", "ANALYSIS#{analysisId}", "RESULTS", "—", "analysisId, videoId, trackId, modelId, candidateMatches (list of rank, profileId, score, dist, condition), embeddingDimension (256), completedAt."],
        ["Gait Profile", "PROFILE#{profileId}", "METADATA", "PROFILES\n{enrolledDate}", "profileId (e.g. WT-0104), displayName, category (Staff/Contractor/Security), status, sequences (count), enrolledDate."],
        ["Surveillance Event", "EVENT#{eventId}", "DETAILS", "EVENTS\n{timestamp}", "eventId, analysisId, videoId, cameraId, trackingId, topCandidateId, similarityScore, reviewStatus (PENDING_REVIEW/CONFIRMED), timestamp."],
        ["Camera Record", "CAMERA#{cameraId}", "METADATA", "CAMERAS\n{createdAt}", "cameraId (e.g. CAM-01), cameraName, location, status (ONLINE/OFFLINE), fps, resolution, streamUrl."],
        ["Model Registry", "MODEL#{modelId}", "METADATA", "MODELS\n{createdAt}", "modelId (GaitBase-v1, GaitGL, GaitGL-ET), architecture, version, checkpointPath, parameters, status."]
    ]
    add_table_data(db_entity_headers, db_entity_rows, col_widths=[1.2, 1.4, 0.9, 1.2, 2.8])

    # ==========================================
    # SECTION 4: AWS CLOUD INFRASTRUCTURE CATALOG
    # ==========================================
    add_heading_1("4. Supporting AWS Cloud Resources & Endpoints")
    add_para("All backend services are provisioned and live in AWS Account 605134459334:")

    aws_res_headers = ["Resource Category", "AWS Service", "Resource Name / Identifier", "Operational Role"]
    aws_res_rows = [
        ["Authentication", "Amazon Cognito", "us-east-1_fLyGM6BsL\nClient: 3n9otsnh6lpt92g0ipcvp19oqu", "User pool managing accounts, SRP authentication, and email OTP verification."],
        ["API Gateway", "AWS API Gateway (REST)", "dhxv2f51l1\nEndpoint: .../dev", "CORS-enabled REST gateway routing HTTP requests to Lambda handlers."],
        ["Compute", "AWS Lambda (Node.js 20)", "22 Microservices (gaitvision-backend-dev-*)", "Stateless execution units handling API endpoints, S3 presigning, and DynamoDB CRUD."],
        ["Database", "Amazon DynamoDB", "gaitvision-main-dev", "Single-table NoSQL store holding jobs, videos, profiles, events, and results."],
        ["Object Storage", "Amazon S3", "gaitvision-storage-dev", "Object store receiving direct browser video uploads and holding media artifacts."],
        ["Message Queue", "Amazon SQS FIFO/Standard", "gaitvision-jobs-queue-dev", "Primary asynchronous queue decoupling HTTP requests from heavy AI inference."],
        ["Dead Letter Queue", "Amazon SQS (DLQ)", "gaitvision-jobs-dlq-dev", "Isolates corrupt or poisoned video jobs after 3 failed receive attempts."],
        ["AI Service", "PyTorch / OpenGait Worker", "ai_service/worker.py\nModels: GaitBase, GaitGL-ET", "Standalone Python worker long-polling SQS, extracting silhouettes, and computing 256D embeddings."]
    ]
    add_table_data(aws_res_headers, aws_res_rows, col_widths=[1.2, 1.4, 2.0, 2.9])

    # Save
    out_docx = os.path.abspath("WalkTrace_System_Flow_and_Status_Audit.docx")
    out_pdf = os.path.abspath("WalkTrace_System_Flow_and_Status_Audit.pdf")

    print(f"Saving DOCX to {out_docx}...")
    doc.save(out_docx)
    print("DOCX saved successfully!")

    print(f"Converting DOCX to PDF ({out_pdf}) via Word COM...")
    convert(out_docx, out_pdf)
    print(f"PDF generated successfully: {out_pdf}")

    # Copy to Downloads
    downloads_pdf = os.path.join(os.path.expanduser("~"), "Downloads", "WalkTrace_System_Flow_and_Status_Audit.pdf")
    downloads_docx = os.path.join(os.path.expanduser("~"), "Downloads", "WalkTrace_System_Flow_and_Status_Audit.docx")
    import shutil
    shutil.copyfile(out_pdf, downloads_pdf)
    shutil.copyfile(out_docx, downloads_docx)
    print(f"Copied to Downloads: {downloads_pdf}")

if __name__ == '__main__':
    build_audit_document()
