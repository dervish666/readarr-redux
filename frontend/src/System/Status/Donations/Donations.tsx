import React from 'react';
import FieldSet from 'Components/FieldSet';
import Link from 'Components/Link/Link';
import translate from 'Utilities/String/translate';
import styles from '../styles.css';

const PROJECTS = [
  { name: 'Radarr', slug: 'radarr' },
  { name: 'Lidarr', slug: 'lidarr' },
  { name: 'Prowlarr', slug: 'prowlarr' },
  { name: 'Sonarr', slug: 'sonarr' },
];

function Donations() {
  return (
    <FieldSet legend={translate('Donations')}>
      <div className={styles.logos}>
        {PROJECTS.map(({ name, slug }) => {
          return (
            <div key={slug} className={styles.logoContainer} title={name}>
              <Link to={`https://opencollective.com/${slug}`}>
                <img
                  className={styles.logo}
                  src={`${window.Readarr.urlBase}/Content/Images/Icons/logo-${slug}.png`}
                  alt={name}
                />
              </Link>
            </div>
          );
        })}
      </div>
    </FieldSet>
  );
}

export default Donations;
