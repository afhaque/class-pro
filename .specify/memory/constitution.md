<!--
Sync Impact Report:
Version change: 0.0.0 → 1.0.0
Modified principles: N/A (new constitution)
Added sections: Hackathon Constraints, Development Workflow
Removed sections: N/A
Templates requiring updates: 
✅ plan-template.md (updated constitution check)
✅ spec-template.md (simplified requirements)
✅ tasks-template.md (hackathon-optimized task flow)
Follow-up TODOs: None
-->

# Class Pro Constitution

## Core Principles

### I. Single File Architecture
All functionality MUST be contained in minimal files. Prefer single-page applications over multi-file architectures. Components, logic, and styles should be co-located when possible. This principle ensures rapid development and easy deployment for hackathon constraints.

### II. Next.js First
The project MUST use Next.js as the primary framework. Leverage built-in features: App Router, Server Components, and API routes. Avoid external state management libraries unless absolutely necessary. Use Tailwind CSS for styling to maintain consistency and speed.

### III. MVP Focus (NON-NEGOTIABLE)
Every feature MUST deliver immediate user value. No "nice-to-have" features during development. If a feature doesn't directly solve the core problem, it MUST be deferred. YAGNI (You Aren't Gonna Need It) principles strictly enforced.

### IV. Rapid Prototyping
Development MUST prioritize speed over perfection. Use placeholder data, mock APIs, and hardcoded values initially. Refactor only when functionality is proven. Time-box all development phases to maintain hackathon pace.

### V. Simple Deployment
The application MUST be deployable with a single command. Use Vercel for hosting to leverage Next.js integration. No complex CI/CD pipelines or multi-environment configurations. Focus on getting to production quickly.

## Hackathon Constraints

### Time Management
- 5-hour total development window
- 1 hour for planning and setup
- 3 hours for core development
- 1 hour for polish and deployment

### Technology Stack
- Next.js 15+ with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Vercel for deployment
- No external databases (use local state or simple file storage)

### Scope Limitations
- Maximum 3 core features
- No user authentication (unless absolutely required)
- No complex data relationships
- No real-time features
- No external API integrations (unless core to the problem)

## Development Workflow

### Phase 1: Quick Setup (30 minutes)
1. Initialize Next.js project with TypeScript
2. Configure Tailwind CSS
3. Set up basic project structure
4. Create initial page layout

### Phase 2: Core Development (3 hours)
1. Implement primary user flow
2. Add essential features only
3. Use placeholder data and mock responses
4. Focus on functionality over aesthetics

### Phase 3: Polish & Deploy (1.5 hours)
1. Basic styling and responsive design
2. Error handling for critical paths
3. Deploy to Vercel
4. Test core user journey

### Quality Gates
- Core user flow must work end-to-end
- Application must load in under 3 seconds
- No critical errors in browser console
- Mobile-responsive design (basic)

## Governance

This constitution supersedes all other development practices during the hackathon period. Amendments require team consensus and must not extend the 5-hour timeline. All development decisions must be justified against hackathon constraints.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27