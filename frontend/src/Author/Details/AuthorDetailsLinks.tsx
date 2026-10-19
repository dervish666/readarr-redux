import React from 'react';
import { Link as AuthorLink } from 'Author/Author';
import Link from 'Components/Link/Link';
import styles from './AuthorDetailsLinks.module.css';

interface AuthorDetailsLinksProps {
  links: AuthorLink[];
}

function AuthorDetailsLinks({ links }: AuthorDetailsLinksProps) {
  return (
    <div className={styles.links}>
      {links.map((link) => (
        <Link key={link.url} className={styles.link} to={link.url}>
          {link.name}
        </Link>
      ))}
    </div>
  );
}

export default AuthorDetailsLinks;
