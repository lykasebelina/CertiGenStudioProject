# CertiGen - AI-Powered Certificate Generator

## Overview

CertiGen is an AI-powered web application that generates professional certificates using natural language prompts. Users can describe their desired certificate in plain English, and the system creates a fully customized design with intelligent layout, styling, and content placement. The application features a visual editor, template library, brand kit management, and file import capabilities for bulk certificate generation.

**Core Purpose**: Democratize certificate creation by removing the need for design expertise, enabling users to generate professional-quality certificates through conversational AI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast HMR
- **React Router v7** for client-side routing with nested route architecture
- **Tailwind CSS** for utility-first styling with custom theme extensions
- **Framer Motion** for declarative animations and transitions

**State Management**
- **Context API** for global state (AuthContext, CertificateContext)
- Local component state for UI interactions
- No external state management library (Redux/Zustand) - chosen for simplicity and reduced bundle size

**Canvas Rendering**
- **Konva.js** + **react-konva** for interactive canvas-based certificate editing
- **html2canvas** for generating certificate previews/thumbnails
- **jsPDF** for PDF export functionality
- Dual rendering approach: HTML/CSS for preview, Konva for editing

**File Processing**
- **mammoth.js** for Word document (.docx) parsing
- **pptx2json** for PowerPoint presentation parsing
- **xlsx** for Excel spreadsheet parsing
- **JSZip** for handling compressed file formats
- **pizzip** for additional zip file operations

**Key Design Patterns**
- **Layout Components**: Separate public (landing) and private (app) layouts
- **Protected Routes**: Authentication-based route guards via PrivateLayout wrapper
- **Component Composition**: Sidebar, TopBar, BottomBar composed into studio layout
- **Controlled/Uncontrolled Pattern**: Sidebar supports both modes for flexibility

### Backend Architecture

**Server Framework**
- **Express 5** (ESM modules) for HTTP server
- **CORS** middleware enabled for cross-origin requests
- **dotenv** for environment variable management
- RESTful API design pattern

**AI Integration**
- **OpenAI GPT** for natural language certificate field extraction
- Custom prompt engineering for structured certificate data generation
- Client-side DALL·E 3 integration for decorative image generation
- Multi-stage generation pipeline: background → border → text layout → corner frames

**Generation Pipeline Architecture**

The certificate generation follows a layered approach:

1. **Background Layer**: Detects gradient/plain/textured styles, generates base using CSS or DALL·E
2. **Border Layer**: Creates CSS borders (solid/double/dashed) with intelligent thickness detection
3. **Inner Frame**: White content area with configurable margins
4. **Corner Frames**: DALL·E-generated decorative elements positioned at 45° rotation
5. **Text Layer**: AI-extracted content fields with intelligent layout positioning
6. **Signature Layer**: Multi-signature support (1-4) with smart horizontal/vertical positioning

**Rationale**: Separation of concerns allows independent styling of each layer and easier debugging. Z-index management ensures proper visual stacking.

### Authentication & User Management

**Authentication Provider**
- **Supabase Auth** for user authentication (email/password)
- OTP-based email verification for signup
- Password reset flow with session management
- **Firebase** SDK included (dual auth support or migration path)

**Security Features**
- Rate limiting on OTP requests (3 attempts per 5-minute window)
- Account lockout after 5 failed login attempts (3-minute duration)
- Session validation on window focus/visibility change
- Reset link single-use enforcement via sessionStorage

**User Profile Management**
- Separate `profiles` table with foreign key to `auth.users`
- Row-Level Security (RLS) policies for user data isolation
- Auto-update trigger for `updated_at` timestamp
- First name/last name stored in user metadata

**Design Decisions**
- Chose Supabase over self-hosted auth for reduced operational complexity
- OTP verification prevents fake signups and ensures valid email addresses
- Lockout mechanisms prevent brute-force attacks while maintaining UX

### Data Storage & File Management

**Database**
- **Supabase (PostgreSQL)** as primary database
- Tables: `profiles`, `templates`, `brand_presets`, `participants`
- Foreign key relationships enforce referential integrity
- RLS policies ensure users only access their own data

**File Storage**
- **Supabase Storage** buckets for user-uploaded assets:
  - `brand-logos`: Company/institution logos
  - `brand-signatures`: Digital signature images
  - `templates`: User-uploaded certificate templates (.docx, .pptx)
- Public URL generation for stored files
- Automatic file naming with timestamp + random suffix to prevent collisions

**Brand Kit System**
- Stores reusable certificate styling (colors, fonts, logos, signatures, headers)
- One preset can be marked as default per user
- Participants list CSV upload support for bulk generation

**Rationale**: Supabase provides integrated auth + database + storage, reducing infrastructure complexity. Storage buckets separate asset types for easier management and permissions.

### Certificate Data Model

**Core Types** (`CertificateElement`)
- Supports 15+ element types: text, image, signature, border, background, cornerFrame, logo, qrCode, watermark, etc.
- Common properties: id, type, x, y, zIndex, width, height, opacity
- Text-specific: fontSize, fontFamily, color, bold, italic, underline, align, letterSpacing, lineHeight, textTransform, wrap
- Frame-specific: textFrameWidth, textFrameHeight, maxChars, backgroundColor
- Behavior flags: selectable, draggable, resizable, rotatable

**Size Management**
- Predefined sizes: A4, Legal, Letter (both portrait and landscape)
- Pixel-based dimensions (96 DPI standard)
- SIZE_MAP constant for consistent dimension lookups

**Element Generation Strategy**
- Utility functions for each layer (backgroundGenerator, borderGenerator, textGenerator, etc.)
- Color extraction from prompts with fallback palettes
- Font size scaling based on canvas dimensions (responsive typography)
- Intelligent text wrapping and positioning within frame boundaries

**Rationale**: Flexible element system allows future expansion (charts, tables, barcodes). Separation of styling properties from behavior flags enables granular control in the editor.

## External Dependencies

### Third-Party APIs

**OpenAI API**
- **GPT Model**: Used for extracting certificate fields from natural language prompts
- **DALL·E 3**: Generates decorative backgrounds and corner frame artwork
- API key stored in environment variables (`VITE_OPENAI_API_KEY` for client, `OPENAI_API_KEY` for server)
- Browser-based API calls for DALL·E (image generation)
- Server-side API calls for GPT (field extraction at `/extract` endpoint)

**Google Generative AI**
- Packages included: `@google/genai`, `@google/generative-ai`
- Likely alternative/backup AI provider for content generation

### Cloud Services

**Supabase**
- **Authentication**: Email/password, OTP verification, password resets
- **Database**: PostgreSQL with Row-Level Security
- **Storage**: File uploads (logos, signatures, templates)
- **Edge Functions**: `send-otp` function for email delivery
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Firebase**
- SDK integrated (`firebase` package)
- Potential dual auth setup or migration from prior version
- Exports: `db`, `auth`, `storage` (declared in types.d.ts)

### Email Service

**Nodemailer** (via Supabase Edge Function)
- Used in `send-otp` function for delivering verification codes
- SMTP configuration managed in Edge Function environment
- HTML email templates for OTP delivery

### Development & Build Tools

**TypeScript Configuration**
- Strict mode enabled for type safety
- Path aliases configured (`@/*` maps to `src/*`)
- Separate configs for app (`tsconfig.app.json`) and node tools (`tsconfig.node.json`)

**ESLint Setup**
- React-specific rules via `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- TypeScript integration via `typescript-eslint`

**Deployment Considerations**
- Server runs on Express (port configurable)
- Frontend dev server on port 5000 with HMR via port 443 (Replit-specific)
- CORS enabled for cross-origin development workflow

### Notable Architectural Trade-offs

**Client-Side AI Calls**
- DALL·E calls made from browser (with `dangerouslyAllowBrowser: true`)
- **Pro**: Faster iteration, no server load for image generation
- **Con**: Exposes API key in client code (mitigated by rate limiting and key rotation)
- **Alternative Considered**: Server-side proxy for all OpenAI calls (rejected due to added latency)

**Dual Canvas Libraries**
- Both Fabric.js and Konva.js dependencies present
- **Current**: Konva.js actively used for editor
- **Rationale**: Konva offers better React integration and simpler transformer API
- Fabric.js likely legacy dependency (consider removing)

**No Database ORM**
- Direct Supabase client queries instead of Drizzle/Prisma
- **Pro**: Less abstraction, simpler for small schema
- **Con**: No type-safe query builder, manual typing required
- **Future**: Drizzle could be added for better TypeScript integration