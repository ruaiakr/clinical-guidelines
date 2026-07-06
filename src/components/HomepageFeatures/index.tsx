import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Evidence-Based Protocols',
    emoji: '🏥',
    description: (
      <>
        Comprehensive clinical guidance adapted for Kiribati&apos;s health
        system, medicine formulary, and cultural context — supporting safe
        care at every health centre.
      </>
    ),
  },
  {
    title: 'Emergency & Critical Care',
    emoji: '🚨',
    description: (
      <>
        Rapid-access protocols for BLS, shock, sepsis, trauma, cardiac
        emergencies, and other time-critical conditions requiring immediate
        action.
      </>
    ),
  },
  {
    title: 'Primary Care Reference',
    emoji: '📋',
    description: (
      <>
        Covers assessment, paediatrics, maternal health, infectious diseases,
        drug dosing tables, and nursing procedures — your daily clinical
        companion in the field.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <span className={styles.featureEmoji} role="img" aria-hidden="true">
          {emoji}
        </span>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
