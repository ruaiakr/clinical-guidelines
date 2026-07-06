import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <Heading as="h1" className="hero__title">
              {siteConfig.title}
            </Heading>
            <p className="hero__subtitle">{siteConfig.tagline}</p>
            <p className={styles.heroDescription}>
              Evidence-based clinical protocols for primary health care across
              Kiribati — accessible online for every health centre and
              clinician in the field.
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--secondary button--lg"
                to="/docs/intro">
                Open Clinical Manual
              </Link>
              <Link
                className={clsx(
                  'button button--outline button--secondary button--lg',
                  styles.emergencyButton,
                )}
                to="/docs/category/emergency">
                Emergency Protocols
              </Link>
            </div>
          </div>
          <div className={styles.heroCover}>
            <figure className={styles.coverFrame}>
              <img
                src="/img/cover.jpg"
                alt="Kiribati Ministry of Health and Medical Services clinical team"
                className={styles.coverImage}
              />
              <figcaption className={styles.coverCaption}>
                Ministry of Health and Medical Services — Kiribati
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Kiribati Primary Clinical Care Manual 2026 — evidence-based protocols for primary health care across Kiribati.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
