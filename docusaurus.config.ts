import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Kiribati Clinical Guidelines 2026',
  tagline: 'Primary Clinical Care Manual — Ministry of Health and Medical Services',
  favicon: 'img/favicon.ico',

  customFields: {
    adminApiUrl: process.env.ADMIN_API_URL ?? '/api',
  },

  future: {
    v4: true,
  },

  url: 'https://clinical-guidelines.mhms.gov.ki',
  baseUrl: '/',

  organizationName: 'mhms-kiribati',
  projectName: 'clinical-guidelines',

  onBrokenLinks: 'throw',

  markdown: {
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  clientModules: [require.resolve('./src/clientModules/pccmZoom.js')],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    require.resolve('./plugins/dev-api-proxy'),
    [
      require.resolve('@docusaurus/plugin-pwa'),
      {
        debug: false,
        offlineModeActivationStrategies: [
          'appInstalled',
          'standalone',
          'mobile',
          'queryString',
        ],
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: '/img/mhms-logo.png',
          },
          {
            tagName: 'link',
            rel: 'apple-touch-icon',
            href: '/img/mhms-logo.png',
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: '#003da5',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-capable',
            content: 'yes',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-status-bar-style',
            content: 'black-translucent',
          },
          {
            tagName: 'meta',
            name: 'application-name',
            content: 'Kiribati Clinical Guidelines',
          },
        ],
      },
    ],
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        indexDocs: true,
        indexPages: true,
        indexBlog: false,

        // Index pages marked noIndex (does not enable search in dev mode)
        forceIgnoreNoIndex: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Clinical Guidelines 2026',
      logo: {
        alt: 'MHMS Kiribati',
        src: 'img/mhms-logo.png',
        width: 36,
        height: 36,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guidelinesSidebar',
          position: 'left',
          label: 'Clinical Manual',
        },
        {
          href: 'mailto:pccmfeedback@mhms.gov.ki',
          label: 'Feedback',
          position: 'right',
        },
        {
          to: '/admin',
          label: 'Admin',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Clinical Manual',
          items: [
            {label: 'Home', to: '/docs/intro'},
            {label: 'Emergency', to: '/docs/category/emergency'},
            {label: 'Pediatrics', to: '/docs/category/Paediatrics'},
            {label: 'Appendix', to: '/docs/category/Appendix'},
          ],
        },
        {
          title: 'Ministry of Health',
          items: [
            {
              label: 'MHMS Kiribati',
              href: 'https://www.mhms.gov.ki',
            },
            {
              label: 'Provide Feedback',
              href: 'mailto:pccmfeedback@mhms.gov.ki',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'CC BY-NC-SA 4.0 License',
              href: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ministry of Health and Medical Services, Republic of Kiribati.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
