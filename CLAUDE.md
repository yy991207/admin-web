# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**admir-web** is a React + TypeScript admin console for managing an AI agent/skills platform. It provides a Chinese-language dashboard for system skills, agents, templates, task tracking, and the ClawHub skill marketplace.

## Tech Stack

- **React 19** with TypeScript 5.9
- **Vite 8** (build tool)
- **Ant Design 6** (UI component library, zh-CN locale)
- **React Router DOM 7** (client-side routing)
- **Less 4** (CSS Modules via `*.module.less`)
- **react-markdown + remark-gfm** (Markdown rendering)

## Development Commands

```bash
npm run dev       # Dev server on port 5174 (0.0.0.0)
npm run build     # TypeScript check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

## Configuration

Backend API URL is configured via `config.yaml` (gitignored). See `config.yaml.example` for the template:

```yaml
user_id: your_user_id
url: http://127.0.0.1:8000/
token: your_token_here
```

The config is parsed by a custom YAML parser in `src/services/config.ts`.

## Architecture

### Routing

```
/          → redirects to /skills
/skills    → SystemSkills (skill management)
/templates → Templates (template management)
/agents    → Agents (agent management)
/tasks     → Tasks (task monitoring)
/clawhub   → ClawHub (skill marketplace)
```

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/          # Main layout wrapper
│   └── Sidebar/         # Navigation sidebar
├── pages/               # Page-level components (self-contained)
│   ├── Agents/
│   ├── ClawHub/
│   ├── SystemSkills/
│   ├── Tasks/
│   └── Templates/
├── services/            # API service layer
│   ├── config.ts        # YAML config parser
│   ├── skillService.ts  # Skills & ClawHub APIs
│   ├── agentService.ts  # Agent CRUD APIs
│   ├── templateService.ts
│   └── taskService.ts
├── hooks/               # Custom hooks (empty)
├── utils/               # Utilities (empty)
├── App.tsx              # Router configuration
├── index.css            # Global CSS + Vercel design tokens
└── main.tsx             # Entry point
```

### API Layer

All services use a generic `request<T>()` function from `config.ts` that reads the backend URL from `config.yaml`. Responses follow a standardized `ApiResponse<T>` wrapper:

```typescript
{ success: boolean, code: string, msg: string, data: T }
```

### Page Component Pattern

Each page is a self-contained component following a consistent pattern:
- `useState` for loading, data, search, and modal states
- `useCallback` + `useEffect` for data fetching
- Ant Design `Table` with `ColumnsType<T>` for data display
- Ant Design `Modal` + `Form` for CRUD operations
- CSS Modules (`*.module.less`) for scoped styling

## Design System

Vercel-inspired design tokens are defined as CSS variables in `index.css` and documented in `DESIGN.md`. Key principles:

- **Shadow-as-border**: Use `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)` instead of CSS `border`
- **Color tokens**: `--geist-foreground: #171717`, `--geist-background: #ffffff`
- **Font stack**: Geist, Arial, Segoe UI Emoji
- **Border radius**: 6px standard, 8px comfortable, 12px for featured cards

## Adding New Features

1. **New page**: Add a component under `src/pages/`, register route in `App.tsx`, add nav entry in `Sidebar/`
2. **New API**: Add functions to the appropriate service file under `src/services/`
3. **New component**: Place reusable components under `src/components/`, page-specific ones within the page directory
4. **Styling**: Use `*.module.less` for component-scoped styles; leverage existing CSS variables from `index.css`
