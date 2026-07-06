const ADMIN_API_TARGET =
  process.env.ADMIN_API_TARGET ?? 'http://127.0.0.1:8787';

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function devApiProxyPlugin() {
  return {
    name: 'dev-api-proxy',
    configureWebpack(_config, isServer) {
      if (isServer || process.env.NODE_ENV !== 'development') {
        return {};
      }

      return {
        devServer: {
          host: '0.0.0.0',
          allowedHosts: 'all',
          client: {
            webSocketURL: 'auto://0.0.0.0:0/ws',
          },
          proxy: [
            {
              context: ['/api'],
              target: ADMIN_API_TARGET,
              changeOrigin: true,
              secure: false,
              logLevel: 'warn',
              pathRewrite: {
                '^/api': '',
              },
            },
          ],
        },
      };
    },
  };
};
