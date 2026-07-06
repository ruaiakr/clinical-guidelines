import type {ReactNode} from 'react';
import Layout from '@theme-original/Layout';
import SiteBrandBar from '@site/src/components/SiteBrandBar';

type Props = React.ComponentProps<typeof Layout>;

export default function LayoutWrapper(props: Props): ReactNode {
  return (
    <>
      <SiteBrandBar />
      <Layout {...props} />
    </>
  );
}
