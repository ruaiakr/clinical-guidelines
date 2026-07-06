import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function SiteBrandBar(): ReactNode {
  return (
    <div className={styles.brandBar} role="banner">
      <div className={styles.brandBarInner}>
        <Link to="/" className={styles.brandEmblem} aria-label="Home">
          <img
            src="/img/kiribati-flag.png"
            alt="Republic of Kiribati coat of arms"
            className={styles.emblemImage}
            width={80}
            height={68}
          />
        </Link>

        <div className={styles.brandText}>
          <span className={styles.brandTitle}>
            Ministry of Health and Medical Services
          </span>
          <span className={styles.brandSubtitle}>Republic of Kiribati</span>
        </div>

        <div className={styles.brandLogo}>
          <img
            src="/img/mhms-logo.png"
            alt="MHMS Kiribati"
            className={styles.logoImage}
            width={68}
            height={68}
          />
        </div>
      </div>

      <div className={styles.brandAccent} aria-hidden="true">
        <span className={styles.accentRed} />
        <span className={styles.accentGold} />
        <span className={styles.accentBlue} />
      </div>
    </div>
  );
}
