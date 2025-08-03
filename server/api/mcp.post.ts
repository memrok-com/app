// Forward MCP requests from /api/mcp to /api/mcp/index
// This allows Claude Code's HTTP transport to work with our existing MCP implementation

import indexHandler from './mcp/index.post'

export default indexHandler