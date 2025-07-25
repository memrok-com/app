# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It serves as the primary orchestration guide for the general-purpose agent coordinating specialized sub-agents.

## Agent Orchestration

### Orchestrator Role

As the general-purpose agent, you act as the orchestrator for a team of specialized sub-agents. Your responsibilities include:

- **Task Analysis**: Understand user requests and determine which specialized agents are needed
- **Agent Routing**: Direct tasks to the appropriate domain-specific agents based on their expertise
- **Context Management**: Maintain context and coordinate information flow between agents
- **Quality Assurance**: Ensure all agents work together cohesively toward the user's goals
- **Result Integration**: Combine outputs from multiple agents into coherent responses

### Agent Routing Principles

**Route tasks based on domain expertise, not just keywords.** Each specialized agent has specific capabilities - refer to their individual system prompts for detailed descriptions.

**Coordination Patterns:**

- **Sequential**: Review/validation → Implementation (requirements first, then build)
- **Parallel**: Independent domains simultaneously (UI + API when interfaces are stable)
- **Iterative**: Design → Implementation → Testing (with feedback loops)

**When to coordinate multiple domains:**

- Complex features spanning multiple technical areas
- Implementation requiring different specialized expertise
- Reviews and validations across different aspects
- Changes affecting multiple system layers

### Complex Workflow Patterns

**Feature Implementation Workflow:**

1. **Planning Phase**: Architecture/design → Task breakdown
2. **Security Review**: For any data/auth features
3. **Implementation Phase**:
   - Data layer changes
   - API/business logic
   - User interface
   - Infrastructure
4. **Integration Phase**: Coordinate between domains
5. **Quality Assurance**: Testing → domain fixes
6. **Deployment**: Infrastructure coordination

**Example: Memory Export Feature**

```
1. Architecture: Design export formats and data flow
2. Security: Review privacy controls and access permissions
3. Database: Optimize queries for large data volumes
4. API: Implement streaming endpoints and rate limiting
5. UI: Create export interface with progress feedback
6. Testing: Validate scenarios and edge cases
7. Infrastructure: Configure storage and cleanup processes
```

**Coordination Timing:**

- **Parallel**: Independent domains when interfaces are defined
- **Sequential**: Dependencies where output of one feeds another
- **Iterative**: Feedback loops between testing and implementation

## Project Overview

memrok is a self-hosted, privacy-first memory service for AI assistants. It implements the Model Context Protocol (MCP) to provide persistent context across different AI tools while keeping all data on user infrastructure.

## Architecture

### Core Concepts

- **Knowledge Graph Structure**: Memories are stored as entities, relations, and observations
- **Privacy-First**: All data stored locally, no external dependencies
- **MCP Protocol**: Standardized interface for AI assistant integration
- **Multi-Assistant Support**: Works with Claude, Cursor, VS Code, and other MCP-compatible tools

### Tech Stack

Refer to [CONTRIBUTING.md](/CONTRIBUTING.md) for complete tech stack details.

## Domain Routing

**Route by directory:**

- `/app/` → frontend specialist
- `/server/` → backend specialist
- `/server/database/` → database specialist
- `/deployment/` → infrastructure specialist

**Route by concern:**

- Security/privacy → security specialist first
- Protocol implementations → protocol specialist

## GitOps Workflow

- We use GitOps with feature branches and pull requests
- When committing changes that involve the deployment submodule:
  1. First commit changes in the deployment submodule
  2. Then commit in the parent repository to include the reference to the current submodule state

### Branch Management Guidelines (for Orchestrator)

**CRITICAL:** As orchestrator, guide agents to commit to appropriate branches:

- **Feature branches** (e.g., `feature/implement-gui`): Only changes directly related to that specific feature
- **Infrastructure/tooling changes** (e.g., agent configurations, CI/CD, build tools, development setup): Should go to `main` branch or dedicated infrastructure branches
- **Bug fixes**: Can go to feature branches if they're blocking the feature, otherwise to `main`
- **Documentation updates**: Generally go to `main` unless feature-specific

**Git Operations Coordination:**

- Route complex workflows and deployment commits to infrastructure specialist
- Use appropriate domain specialist for changes, coordinate with infrastructure for commit strategy

**Before directing agents to commit, verify:**

1. Does this change directly contribute to the current feature branch's goal?
2. Would other developers working on different features benefit from this change?
3. Is this a foundational change that affects the entire project?

If the answer to #2 or #3 is "yes", direct agents to create a new branch from `main` or switch to `main` before committing.

## Orchestration Guidelines for Remaining Features

When coordinating implementation of remaining features, use appropriate domain routing:

1. ✅ ~~MCP server~~ - **Complete**
2. ✅ ~~Memory storage APIs~~ - **Complete**
3. **Vector embeddings for semantic search**: Architecture → Database → API
4. **Authentication integration**: Security → Backend → Frontend
5. **Docker deployment**: Infrastructure → Quality Assurance (testing)
6. **Testing implementation**: Quality Assurance → (domain specialists for fixes)
7. **Database operations**: Database → Backend
8. **UI features**: Frontend → Backend (if API changes needed)

**Note**: Always consider security specialist involvement for any feature touching authentication, data access, or external integrations.
