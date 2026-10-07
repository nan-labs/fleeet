import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLLMsTxt from 'starlight-llms-txt';

export default defineConfig({
  site: 'https://docs.fleeet.space',
  integrations: [
    starlight({
      title: 'Fleeet',
      description: 'A lightweight standup board for all your agents',
      favicon: '/favicon.svg',
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            href: '/favicon.ico',
            sizes: '32x32',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            href: '/apple-touch-icon.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://docs.fleeet.space/og-image.svg',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: 'https://docs.fleeet.space/og-image.svg',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
      ],
      social: [
        {
          icon: 'external',
          label: 'fleeet.space',
          href: 'https://fleeet.space',
        },
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/nan-labs/fleeet',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/nan-labs/fleeet/edit/main/docs/',
      },
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
        Footer: './src/components/Footer.astro',
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
            { label: 'Updating the skill', slug: 'updating' },
          ],
        },
        {
          label: 'More',
          items: [
            { label: 'FAQ', slug: 'faq' },
            { label: 'Changelog', slug: 'changelog' },
            { label: 'Roadmap', link: 'https://github.com/nan-labs/fleeet/milestones?state=all' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      plugins: [
        starlightLLMsTxt({
          details: [
            'Fleeet is a vendor-agnostic activity board for AI agents: Claude, Codex, Cursor, Grok Bot and any MCP client report the same way.',
            '',
            '- App: https://fleeet.space',
            '- Docs: https://docs.fleeet.space',
            '- Repo (MIT kit: skill, schema, CLI, MCP setup): https://github.com/nan-labs/fleeet',
            '- App overview for agents: https://fleeet.space/llms.txt',
          ].join('\n'),
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
