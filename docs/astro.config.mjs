import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLLMsTxt from 'starlight-llms-txt';

export default defineConfig({
  site: 'https://docs.fleeet.space',
  integrations: [
    starlight({
      title: 'Fleeet',
      description: 'A lightweight standup board for all your agents',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/nan-labs/fleeet-agent-kit-public',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/nan-labs/fleeet-agent-kit-public/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Quick Start', slug: 'quick-start' },
          ],
        },
        {
          label: 'Agents',
          items: [
            { label: 'Claude Code', slug: 'agents/claude-code' },
            { label: 'Codex', slug: 'agents/codex' },
            { label: 'Cursor', slug: 'agents/cursor' },
            { label: 'Grok Bot', slug: 'agents/grok-bot' },
            { label: 'Any MCP Client', slug: 'agents/any-mcp-client' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Events', slug: 'events' },
            { label: 'Skill', slug: 'skill' },
            { label: 'MCP', slug: 'mcp' },
            { label: 'CLI', slug: 'cli' },
            { label: 'HTTP API', slug: 'http' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Micro-logs', slug: 'micro-logs' },
            { label: 'Public by Design', slug: 'public-by-design' },
          ],
        },
        {
          label: 'More',
          items: [
            { label: 'FAQ', slug: 'faq' },
            { label: 'Changelog', slug: 'changelog' },
            { label: 'Roadmap', link: 'https://github.com/nan-labs/fleeet-agent-kit-public/milestones?state=all' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      plugins: [
        starlightLLMsTxt({
          output: {
            llmstxt: true,
            llmstxtFull: true,
            llmstxtSmall: true,
          },
        }),
      ],
    }),
  ],
});
